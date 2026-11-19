import type { MovieSummary } from '../types/movie';

export interface HeroCandidate {
  movie: MovieSummary;
  backdropWidth?: number;
  backdropHeight?: number;
  source?: 'nguonc' | 'phimapi';
  hasPhimApiStream?: boolean;
}

export function getVietnamDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function isHighResLandscapeBackdrop(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  return width >= 1000 && width > height;
}

export function scoreHeroCandidate(candidate: HeroCandidate, dateKey: string): number {
  const { movie, backdropWidth, backdropHeight, source, hasPhimApiStream } = candidate;
  let score = 0;

  // Strongly prefer crisp HD landscape images (>= 1000px wide)
  if (isHighResLandscapeBackdrop(backdropWidth, backdropHeight)) {
    score += 120;
    if ((backdropWidth ?? 0) >= 1200) {
      score += 20;
    }
  } else if (source === 'nguonc' && movie.thumbUrl) {
    // NguonC backdrop posters are 1280x720 widescreen by default
    score += 110;
  } else if (backdropWidth && backdropWidth < 900) {
    score -= 40;
  }

  // Prefer movies backed by PhimAPI native HLS streaming alongside HD backdrop
  if (hasPhimApiStream || source === 'phimapi') {
    score += 45;
  }

  // Prefer newly released / updated films
  const currentYear = Number(dateKey.slice(0, 4)) || new Date().getFullYear();
  if (movie.year >= currentYear) {
    score += 45;
  } else if (movie.year === currentYear - 1) {
    score += 32;
  } else if (movie.year >= currentYear - 3) {
    score += 16;
  } else if (movie.year < 2015) {
    score -= 20;
  }

  // Prefer FHD / 4K / HD quality & rich rating
  const qualityUpper = movie.quality.toUpperCase();
  if (qualityUpper.includes('4K')) score += 16;
  else if (qualityUpper.includes('FHD')) score += 12;
  else if (qualityUpper.includes('HD')) score += 8;

  if (movie.rating.voteAverage > 0) {
    score += Math.min(18, movie.rating.voteAverage * 2);
  }

  // Deterministic daily variation so each day rotates fresh spotlights smoothly
  const dailyTie = (hashSeed(`${dateKey}:${movie.slug}`) % 1000) / 100;
  score += dailyTie;

  return score;
}

export function selectDailyHeroMovies(
  candidates: HeroCandidate[],
  dateKey: string,
  targetCount = 10
): MovieSummary[] {
  const bySlug = new Map<string, HeroCandidate>();
  const slugByTitle = new Map<string, string>();

  for (const cand of candidates) {
    const slug = cand.movie.slug.trim();
    if (!slug) continue;
    const titleKey = `${cand.movie.name.trim().toLowerCase()}::${cand.movie.year}`;
    const matchedKey = bySlug.has(slug) ? slug : slugByTitle.get(titleKey);

    if (matchedKey) {
      const existing = bySlug.get(matchedKey)!;
      const incomingIsBetterBackdrop =
        isHighResLandscapeBackdrop(cand.backdropWidth, cand.backdropHeight) &&
        !isHighResLandscapeBackdrop(existing.backdropWidth, existing.backdropHeight);
      const mergedHasPhimApi = Boolean(
        existing.hasPhimApiStream ||
          existing.source === 'phimapi' ||
          cand.hasPhimApiStream ||
          cand.source === 'phimapi'
      );

      bySlug.set(matchedKey, {
        ...existing,
        source: existing.source === 'phimapi' || cand.source === 'phimapi' ? 'phimapi' : existing.source,
        hasPhimApiStream: mergedHasPhimApi,
        backdropWidth: incomingIsBetterBackdrop ? cand.backdropWidth : existing.backdropWidth ?? cand.backdropWidth,
        backdropHeight: incomingIsBetterBackdrop ? cand.backdropHeight : existing.backdropHeight ?? cand.backdropHeight,
        movie: {
          ...existing.movie,
          slug: cand.source === 'phimapi' ? cand.movie.slug : existing.movie.slug,
          thumbUrl: incomingIsBetterBackdrop ? cand.movie.thumbUrl : existing.movie.thumbUrl || cand.movie.thumbUrl,
          rating: existing.movie.rating.voteAverage > 0 ? existing.movie.rating : cand.movie.rating,
          categories: existing.movie.categories.length > 0 ? existing.movie.categories : cand.movie.categories,
          countries: existing.movie.countries.length > 0 ? existing.movie.countries : cand.movie.countries,
        },
      });
      continue;
    }

    slugByTitle.set(titleKey, slug);
    bySlug.set(slug, {
      ...cand,
      hasPhimApiStream: Boolean(cand.hasPhimApiStream || cand.source === 'phimapi'),
    });
  }

  const ranked = Array.from(bySlug.values()).sort(
    (a, b) => scoreHeroCandidate(b, dateKey) - scoreHeroCandidate(a, dateKey)
  );

  return ranked.slice(0, targetCount).map((c) => c.movie);
}
