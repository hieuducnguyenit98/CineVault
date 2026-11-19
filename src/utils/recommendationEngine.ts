import type {
  EpisodeItem,
  GenreItem,
  MovieSummary,
  RecommendedMovie,
  TasteProfileSummary,
  UserDataState,
} from '../types/movie';

export type GenreLookup = Pick<GenreItem, 'slug' | 'name'>;

const GENRE_LABELS_FALLBACK: Record<string, string> = {
  'hanh-dong': 'Hành Động',
  'tinh-cam': 'Tình Cảm',
  'hai-huoc': 'Hài Hước',
  'co-trang': 'Cổ Trang',
  'tam-ly': 'Tâm Lý',
  'hinh-su': 'Hình Sự',
  'chien-tranh': 'Chiến Tranh',
  'the-thao': 'Thể Thao',
  'vo-thuat': 'Võ Thuật',
  'vien-tuong': 'Viễn Tưởng',
  'phieu-luu': 'Phiêu Lưu',
  'khoa-hoc': 'Khoa Học',
  'kinh-di': 'Kinh Dị',
  'am-nhac': 'Âm Nhạc',
  'than-thoai': 'Thần Thoại',
  'tai-lieu': 'Tài Liệu',
  'gia-dinh': 'Gia Đình',
  'chinh-kich': 'Chính Kịch',
  'bi-an': 'Bí Ẩn',
  'hoc-duong': 'Học Đường',
  'kinh-dien': 'Kinh Điển',
  'phim-18': '18+',
};

export interface GenreWeightMap {
  [slug: string]: { name: string; weight: number };
}

export interface NextEpisodeInfo {
  nextEpisode: EpisodeItem | null;
  isLastEpisode: boolean;
  watchedCount: number;
}

export function getNextEpisodeInfo(
  episodes: EpisodeItem[],
  currentSlug: string,
  watchedSlugs: string[] = []
): NextEpisodeInfo {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return { nextEpisode: null, isLastEpisode: true, watchedCount: 0 };
  }
  const watchedSet = new Set([...watchedSlugs, currentSlug].filter(Boolean));
  const currentIdx = episodes.findIndex((ep) => ep.slug === currentSlug);

  if (currentIdx >= 0 && currentIdx + 1 < episodes.length) {
    return {
      nextEpisode: episodes[currentIdx + 1],
      isLastEpisode: false,
      watchedCount: watchedSet.size,
    };
  }

  const firstUnwatched = episodes.find((ep) => !watchedSet.has(ep.slug)) ?? null;
  return {
    nextEpisode: firstUnwatched,
    isLastEpisode: firstUnwatched === null,
    watchedCount: watchedSet.size,
  };
}

export function buildGenreWeights(
  userState: UserDataState,
  genreCatalog: GenreLookup[] = [],
  nowMs = Date.now()
): { genreWeights: GenreWeightMap; countryWeights: GenreWeightMap } {
  const genreWeights: GenreWeightMap = {};
  const countryWeights: GenreWeightMap = {};

  const resolveGenreName = (slug: string, providedName?: string): string => {
    if (providedName) return providedName;
    const found = genreCatalog.find((g) => g.slug === slug);
    if (found) return found.name;
    return GENRE_LABELS_FALLBACK[slug] || slug;
  };

  const addGenreWeight = (slug: string, name: string | undefined, delta: number) => {
    if (!slug) return;
    const current = genreWeights[slug] ?? { name: resolveGenreName(slug, name), weight: 0 };
    current.weight += delta;
    if (name) current.name = name;
    genreWeights[slug] = current;
  };

  const addCountryWeight = (slug: string, name: string, delta: number) => {
    if (!slug) return;
    const current = countryWeights[slug] ?? { name: name || slug, weight: 0 };
    current.weight += delta;
    countryWeights[slug] = current;
  };

  // 1. Explicit personal genre preferences (+3.5 each)
  for (const slug of userState.preferredGenres) {
    addGenreWeight(slug, undefined, 3.5);
  }

  // 2. Liked movies (+5.0 per genre, +2.0 per country)
  for (const liked of userState.likedMovies) {
    for (const cat of liked.categories) {
      addGenreWeight(cat.slug, cat.name, 5.0);
    }
    for (const c of liked.countries) {
      addCountryWeight(c.slug, c.name, 2.0);
    }
  }

  // 3. Watchlist movies (+2.5 per genre)
  for (const item of userState.watchlist) {
    for (const cat of item.categories) {
      addGenreWeight(cat.slug, cat.name, 2.5);
    }
  }

  // 4. Watch history (weighted by episodes watched, completion ratio, and recency decay)
  for (const entry of userState.watchHistory) {
    const daysAgo = Math.max(0, (nowMs - entry.watchedAt) / (1000 * 60 * 60 * 24));
    const recencyMultiplier = Math.max(0.35, Math.exp(-daysAgo / 21));
    const completionRatio =
      entry.durationSeconds > 0
        ? Math.min(1, Math.max(0.25, entry.progressSeconds / entry.durationSeconds))
        : 0.5;
    const episodeDepthBoost = Math.min(1.8, 1 + Math.max(0, (entry.watchedEpisodes?.length ?? 1) - 1) * 0.25);
    const weight = (1.8 + completionRatio * 3.0) * episodeDepthBoost * recencyMultiplier;

    for (const cat of entry.categories) {
      addGenreWeight(cat.slug, cat.name, weight);
    }
    for (const c of entry.countries) {
      addCountryWeight(c.slug, c.name, weight * 0.45);
    }
  }

  return { genreWeights, countryWeights };
}

export function extractFrequentlyWatchedGenres(
  userState: UserDataState,
  genreCatalog: GenreLookup[] = [],
  limit = 3,
  nowMs = Date.now()
): Array<{ slug: string; name: string; watchCount: number; score: number }> {
  const counts = new Map<string, { name: string; watchCount: number; score: number }>();

  const resolveName = (slug: string, name?: string) => {
    if (name) return name;
    return genreCatalog.find((g) => g.slug === slug)?.name || GENRE_LABELS_FALLBACK[slug] || slug;
  };

  for (const entry of userState.watchHistory) {
    const daysAgo = Math.max(0, (nowMs - entry.watchedAt) / (1000 * 60 * 60 * 24));
    const recency = Math.max(0.4, Math.exp(-daysAgo / 30));
    const epCount = Math.max(1, entry.watchedEpisodes?.length ?? 1);
    for (const cat of entry.categories) {
      if (!cat.slug) continue;
      const cur = counts.get(cat.slug) ?? {
        name: resolveName(cat.slug, cat.name),
        watchCount: 0,
        score: 0,
      };
      cur.watchCount += 1;
      cur.score += (1 + Math.min(3, epCount * 0.4)) * recency;
      counts.set(cat.slug, cur);
    }
  }

  for (const liked of userState.likedMovies) {
    for (const cat of liked.categories) {
      if (!cat.slug) continue;
      const cur = counts.get(cat.slug) ?? {
        name: resolveName(cat.slug, cat.name),
        watchCount: 0,
        score: 0,
      };
      cur.score += 2.2;
      counts.set(cat.slug, cur);
    }
  }

  // Fall back to explicit preferredGenres when history is empty
  if (counts.size === 0) {
    for (const slug of userState.preferredGenres) {
      counts.set(slug, {
        name: resolveName(slug),
        watchCount: 0,
        score: 1,
      });
    }
  }

  return Array.from(counts.entries())
    .map(([slug, data]) => ({
      slug,
      name: data.name,
      watchCount: data.watchCount,
      score: Number(data.score.toFixed(2)),
    }))
    .sort((a, b) => b.score - a.score || b.watchCount - a.watchCount)
    .slice(0, limit);
}

export function computeTasteProfileSummary(
  userState: UserDataState,
  genreCatalog: GenreLookup[] = [],
  nowMs = Date.now()
): TasteProfileSummary {
  const { genreWeights, countryWeights } = buildGenreWeights(userState, genreCatalog, nowMs);

  const positiveGenres = Object.entries(genreWeights)
    .filter(([, v]) => v.weight > 0)
    .map(([slug, v]) => ({ slug, name: v.name, weight: Number(v.weight.toFixed(2)) }))
    .sort((a, b) => b.weight - a.weight);

  const totalWeight = positiveGenres.reduce((acc, g) => acc + g.weight, 0) || 1;
  const topGenres = positiveGenres.slice(0, 6).map((g) => ({
    ...g,
    sharePercent: Math.round((g.weight / totalWeight) * 100),
  }));

  const topCountries = Object.entries(countryWeights)
    .filter(([, v]) => v.weight > 0)
    .map(([slug, v]) => ({ slug, name: v.name, weight: Number(v.weight.toFixed(2)) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);

  const totalSeconds = userState.watchHistory.reduce(
    (sum, item) => sum + Math.max(0, item.progressSeconds),
    0
  );

  return {
    topGenres,
    topCountries,
    totalWatchMinutes: Math.round(totalSeconds / 60),
    watchedCount: userState.watchHistory.length,
    likedCount: userState.likedMovies.length,
    watchlistCount: userState.watchlist.length,
  };
}

export function generateRecommendations(
  candidates: MovieSummary[],
  userState: UserDataState,
  genreCatalog: GenreLookup[] = [],
  options: { excludeWatched?: boolean; limit?: number; nowMs?: number } = {}
): RecommendedMovie[] {
  const { excludeWatched = false, limit = 18, nowMs = Date.now() } = options;
  const dislikedSet = new Set(userState.dislikedSlugs);
  const watchedSet = new Set(userState.watchHistory.map((w) => w.slug));
  const likedSet = new Set(userState.likedMovies.map((l) => l.slug));

  const { genreWeights, countryWeights } = buildGenreWeights(userState, genreCatalog, nowMs);
  const maxGenreWeight = Math.max(
    1,
    ...Object.values(genreWeights).map((g) => g.weight)
  );
  const hasPersonalSignal =
    userState.preferredGenres.length > 0 ||
    userState.watchHistory.length > 0 ||
    userState.likedMovies.length > 0 ||
    userState.watchlist.length > 0;

  const scored: RecommendedMovie[] = [];

  for (const movie of candidates) {
    if (dislikedSet.has(movie.slug)) continue;
    if (excludeWatched && watchedSet.has(movie.slug)) continue;

    let genreScore = 0;
    const matchedGenreNames: string[] = [];

    for (const cat of movie.categories) {
      const w = genreWeights[cat.slug]?.weight ?? 0;
      if (w > 0) {
        genreScore += w / maxGenreWeight;
        matchedGenreNames.push(cat.name);
      }
    }

    let countryScore = 0;
    for (const c of movie.countries) {
      const cw = countryWeights[c.slug]?.weight ?? 0;
      if (cw > 0) {
        countryScore += Math.min(1, cw / maxGenreWeight) * 0.45;
      }
    }

    const qualityBonus = movie.rating.voteAverage > 0 ? (movie.rating.voteAverage / 10) * 0.85 : 0.4;
    const currentYear = new Date(nowMs).getFullYear();
    const recencyBonus = movie.year >= currentYear - 1 ? 0.45 : movie.year >= currentYear - 3 ? 0.25 : 0.1;
    const likedSelfBoost = likedSet.has(movie.slug) ? 0.3 : 0;

    const totalScore = genreScore * 3.2 + countryScore + qualityBonus + recencyBonus + likedSelfBoost;

    let matchPercent: number;
    let reason: string;

    if (hasPersonalSignal && matchedGenreNames.length > 0) {
      const normalized = Math.min(99, Math.max(76, Math.round(72 + Math.min(27, totalScore * 3.4))));
      matchPercent = normalized;
      reason = matchedGenreNames.slice(0, 2).join(' · ');
    } else if (movie.rating.voteAverage >= 7.0) {
      matchPercent = Math.min(95, Math.round(76 + movie.rating.voteAverage * 1.7));
      reason = `Đánh giá ${movie.rating.voteAverage}/10`;
    } else {
      matchPercent = Math.min(90, Math.round(72 + recencyBonus * 25));
      reason = movie.year >= currentYear - 1 ? `Phát hành ${movie.year}` : 'Tuyển chọn nổi bật';
    }

    scored.push({
      movie,
      score: Number(totalScore.toFixed(3)),
      matchPercent,
      reason,
      matchedGenres: matchedGenreNames,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || b.movie.rating.voteAverage - a.movie.rating.voteAverage)
    .slice(0, limit);
}
