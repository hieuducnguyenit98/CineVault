import type {
  DailyMovieCategory,
  DailyNewMovieEntry,
  DailyUpdatesResponse,
  DailyUpdatesSnapshot,
  MovieSummary,
} from '../types/movie.ts';
import { YT_AI_SLUG_PREFIX } from './aiShortCatalog.ts';
import { hasVietnameseNarration } from './movieNormalizer.ts';

export const DAILY_AUTO_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function buildMovieUpdateSignature(movie: MovieSummary): string {
  return `${movie.episodeCurrent || ''}|${movie.year || ''}|${movie.lang || ''}`;
}

export function classifyDailyMovieCategory(movie: MovieSummary): DailyMovieCategory {
  if (movie.slug.startsWith(YT_AI_SLUG_PREFIX)) {
    return 'ai-short';
  }
  if (hasVietnameseNarration(movie)) {
    return 'dubbed';
  }
  return 'regular';
}

function mergeMovieCandidate(existing: MovieSummary | undefined, incoming: MovieSummary): MovieSummary {
  if (!existing) return incoming;
  const incomingHasDub = hasVietnameseNarration(incoming);
  const existingHasDub = hasVietnameseNarration(existing);
  const mergedLang =
    incomingHasDub && !existingHasDub
      ? existing.lang
        ? `${existing.lang} + Thuyết Minh`
        : 'Thuyết Minh'
      : existing.lang || incoming.lang;

  return {
    ...existing,
    posterUrl: existing.posterUrl || incoming.posterUrl,
    thumbUrl: existing.thumbUrl || incoming.thumbUrl,
    episodeCurrent: existing.episodeCurrent || incoming.episodeCurrent,
    lang: mergedLang,
    categories: existing.categories.length > 0 ? existing.categories : incoming.categories,
    countries: existing.countries.length > 0 ? existing.countries : incoming.countries,
    rating: existing.rating.voteAverage > 0 ? existing.rating : incoming.rating,
    modifiedAt: incoming.modifiedAt || existing.modifiedAt,
  };
}

function modifiedAtMatchesDateKey(modifiedAt: string, dateKey: string): boolean {
  if (!modifiedAt || !dateKey) return false;
  if (modifiedAt.startsWith(dateKey)) return true;
  const parsed = Date.parse(modifiedAt);
  if (!Number.isFinite(parsed)) return false;
  const vnKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(parsed));
  return vnKey === dateKey;
}

export interface BuildDailyUpdateParams {
  dateKey: string;
  previousSnapshot: DailyUpdatesSnapshot | null;
  phimApiLatest: MovieSummary[];
  nguonCLatest: MovieSummary[];
  dubbedLatest: MovieSummary[];
  aiShortMovies: MovieSummary[];
  now?: number;
}

export function buildDailyUpdateSnapshot(
  params: BuildDailyUpdateParams
): { snapshot: DailyUpdatesSnapshot; addedSinceLastRunCount: number } {
  const {
    dateKey,
    previousSnapshot,
    phimApiLatest,
    nguonCLatest,
    dubbedLatest,
    aiShortMovies,
    now = Date.now(),
  } = params;

  // Merge non-AI pools by slug first while preserving fresh order
  const regularMap = new Map<string, MovieSummary>();
  const orderedRegularBatches = [...phimApiLatest, ...nguonCLatest, ...dubbedLatest];
  for (const movie of orderedRegularBatches) {
    if (!movie?.slug) continue;
    regularMap.set(movie.slug, mergeMovieCandidate(regularMap.get(movie.slug), movie));
  }
  const regularMovies = Array.from(regularMap.values()).slice(0, 64);

  const aiMap = new Map<string, MovieSummary>();
  for (const movie of aiShortMovies) {
    if (!movie?.slug) continue;
    if (!aiMap.has(movie.slug)) {
      aiMap.set(movie.slug, movie);
    }
  }
  const aiMovies = Array.from(aiMap.values()).slice(0, 24);

  const combinedMovies = [...regularMovies, ...aiMovies];
  const prevSigs = previousSnapshot?.knownSignatures ?? {};
  const prevEntryMap = new Map(
    (previousSnapshot?.entries ?? []).map((entry) => [entry.movie.slug, entry])
  );
  const isFirstBoot = !previousSnapshot || Object.keys(prevSigs).length === 0;
  const isSameDay = Boolean(previousSnapshot && previousSnapshot.dateKey === dateKey);

  let initialRegularBudget = 18;
  let initialAiBudget = 6;
  let addedSinceLastRunCount = 0;

  const entries: DailyNewMovieEntry[] = combinedMovies.map((movie) => {
    const slug = movie.slug;
    const category = classifyDailyMovieCategory(movie);
    const sig = buildMovieUpdateSignature(movie);
    const prevSig = prevSigs[slug];
    const prevEntry = prevEntryMap.get(slug);

    let isNewToday = false;
    let discoveredAt = prevEntry?.discoveredAt ?? now;

    if (isFirstBoot) {
      if (category === 'ai-short' && initialAiBudget > 0) {
        isNewToday = true;
        initialAiBudget -= 1;
      } else if (category !== 'ai-short' && initialRegularBudget > 0) {
        isNewToday = true;
        initialRegularBudget -= 1;
      }
      if (isNewToday) {
        addedSinceLastRunCount += 1;
      }
    } else if (prevSig === undefined) {
      // Brand new movie slug that wasn't seen in prior snapshots
      isNewToday = true;
      discoveredAt = now;
      addedSinceLastRunCount += 1;
    } else if (prevSig !== sig) {
      // Existing series received a new episode or status update
      isNewToday = true;
      discoveredAt = now;
      addedSinceLastRunCount += 1;
    } else if (isSameDay && prevEntry?.isNewToday) {
      // Preserve today's newly discovered flag across intra-day checks
      isNewToday = true;
      discoveredAt = prevEntry.discoveredAt;
    } else if (!isSameDay && modifiedAtMatchesDateKey(movie.modifiedAt, dateKey)) {
      // On new day rollover, items stamped with today's Vietnam date are also new today
      isNewToday = true;
      discoveredAt = now;
      addedSinceLastRunCount += 1;
    }

    return {
      movie,
      sourceCategory: category,
      discoveredAt,
      isNewToday,
    };
  });

  // Sort: new today first, then most recently discovered
  entries.sort((a, b) => {
    if (a.isNewToday !== b.isNewToday) return a.isNewToday ? -1 : 1;
    return b.discoveredAt - a.discoveredAt;
  });

  // Update rolling knownSignatures (retain up to 600 recent entries to prevent unbounded growth)
  const nextKnownEntries: Array<[string, string]> = [];
  const seenSigKeys = new Set<string>();
  for (const entry of entries) {
    seenSigKeys.add(entry.movie.slug);
    nextKnownEntries.push([entry.movie.slug, buildMovieUpdateSignature(entry.movie)]);
  }
  for (const [slug, sig] of Object.entries(prevSigs)) {
    if (!seenSigKeys.has(slug)) {
      nextKnownEntries.push([slug, sig]);
    }
  }
  const knownSignatures = Object.fromEntries(nextKnownEntries.slice(0, 600));
  const newlyAddedCount = entries.filter((e) => e.isNewToday).length;

  return {
    snapshot: {
      dateKey,
      lastUpdatedAt: now,
      nextAutoCheckAt: now + DAILY_AUTO_CHECK_INTERVAL_MS,
      newlyAddedCount,
      entries,
      knownSignatures,
    },
    addedSinceLastRunCount,
  };
}

export function toPublicDailyUpdatesResponse(
  snapshot: DailyUpdatesSnapshot
): DailyUpdatesResponse {
  return {
    dateKey: snapshot.dateKey,
    lastUpdatedAt: snapshot.lastUpdatedAt,
    nextAutoCheckAt: snapshot.nextAutoCheckAt,
    newlyAddedCount: snapshot.newlyAddedCount,
    entries: snapshot.entries,
  };
}

export function computeUnreadNewMovies(
  entries: DailyNewMovieEntry[],
  acknowledgedSlugs: string[] = []
): {
  unreadCount: number;
  unreadSlugs: string[];
  newTodayCount: number;
} {
  const ackSet = new Set(acknowledgedSlugs);
  const newTodayEntries = entries.filter((e) => e.isNewToday);
  const unreadEntries = newTodayEntries.filter((e) => !ackSet.has(e.movie.slug));
  return {
    unreadCount: unreadEntries.length,
    unreadSlugs: unreadEntries.map((e) => e.movie.slug),
    newTodayCount: newTodayEntries.length,
  };
}

export function formatVietnamDateDisplay(dateKey: string): string {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatVietnamTimeHHMM(epochMs: number): string {
  if (!epochMs || !Number.isFinite(epochMs)) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(epochMs));
}
