import type {
  MovieSummary,
  UserDataState,
  WatchHistoryEntry,
  WeeklyTopMovieEntry,
  WeeklyTopResponse,
  WeeklyWatchEventRecord,
} from '../types/movie';

export const WEEKLY_WINDOW_DAYS = 7;
export const WEEKLY_WINDOW_MS = WEEKLY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

interface ViewerSlugContribution {
  viewerKey: string;
  slug: string;
  movie: MovieSummary;
  episodes: Set<string>;
  explicitHits: number;
  progressSeconds: number;
  lastWatchedAt: number;
}

function historyEntryToSummary(entry: WatchHistoryEntry): MovieSummary {
  const isAiShort = entry.slug.startsWith('yt-ai--');
  return {
    id: entry.slug,
    name: entry.name,
    originName: entry.originName,
    slug: entry.slug,
    type: isAiShort ? 'ai-short' : 'series',
    posterUrl: entry.posterUrl,
    thumbUrl: entry.thumbUrl,
    year: entry.year,
    quality: entry.quality || (isAiShort ? 'HD' : 'FHD'),
    lang: isAiShort ? 'Phim Ngắn AI' : 'Vietsub',
    time: '',
    episodeCurrent: entry.episodeName || '',
    categories: Array.isArray(entry.categories) ? entry.categories : [],
    countries: Array.isArray(entry.countries) ? entry.countries : [],
    rating: { voteAverage: 0, voteCount: 0 },
    modifiedAt: '',
  };
}

function preferRicherMovieSummary(a: MovieSummary, b: MovieSummary): MovieSummary {
  const aPoster = a.posterUrl || a.thumbUrl;
  const bPoster = b.posterUrl || b.thumbUrl;
  return {
    ...a,
    name: b.name && b.name.length > 0 ? b.name : a.name,
    originName: b.originName || a.originName,
    posterUrl: bPoster && (!aPoster || b.posterUrl) ? b.posterUrl : a.posterUrl,
    thumbUrl: b.thumbUrl || a.thumbUrl,
    year: b.year || a.year,
    quality: b.quality || a.quality,
    lang: b.lang && b.lang !== 'Vietsub' ? b.lang : a.lang || b.lang,
    episodeCurrent: b.episodeCurrent || a.episodeCurrent,
    categories: b.categories.length > 0 ? b.categories : a.categories,
    countries: b.countries.length > 0 ? b.countries : a.countries,
    rating:
      b.rating.voteAverage > a.rating.voteAverage ? b.rating : a.rating,
  };
}

function addContribution(
  viewerSlugMap: Map<string, ViewerSlugContribution>,
  viewerKey: string,
  slug: string,
  movie: MovieSummary,
  episodes: string[],
  explicitHits: number,
  progressSeconds: number,
  lastWatchedAt: number,
  cutoffAt: number
): void {
  if (!slug || !viewerKey || lastWatchedAt < cutoffAt) return;

  const key = `${viewerKey}::${slug}`;
  const existing = viewerSlugMap.get(key);
  if (!existing) {
    viewerSlugMap.set(key, {
      viewerKey,
      slug,
      movie,
      episodes: new Set(episodes.filter(Boolean)),
      explicitHits: Math.max(1, explicitHits),
      progressSeconds: Math.max(0, Math.round(progressSeconds)),
      lastWatchedAt,
    });
    return;
  }

  for (const ep of episodes) {
    if (ep) existing.episodes.add(ep);
  }
  existing.explicitHits = Math.max(existing.explicitHits, explicitHits);
  existing.progressSeconds = Math.max(existing.progressSeconds, Math.round(progressSeconds));
  existing.lastWatchedAt = Math.max(existing.lastWatchedAt, lastWatchedAt);
  existing.movie = preferRicherMovieSummary(existing.movie, movie);
}

export interface AggregateWeeklyTopParams {
  profiles?: Record<string, Partial<UserDataState>> | UserDataState[];
  recordedEvents?: WeeklyWatchEventRecord[];
  localWatchHistory?: WatchHistoryEntry[];
  localViewerKey?: string;
  now?: number;
  limit?: number;
}

export function aggregateWeeklyTopFromSources({
  profiles = {},
  recordedEvents = [],
  localWatchHistory = [],
  localViewerKey = 'local-viewer',
  now = Date.now(),
  limit = 10,
}: AggregateWeeklyTopParams): WeeklyTopResponse {
  const cutoffAt = now - WEEKLY_WINDOW_MS;
  const viewerSlugMap = new Map<string, ViewerSlugContribution>();

  const profileList: Array<[string, Partial<UserDataState>]> = Array.isArray(profiles)
    ? profiles.map((p, idx) => [p.syncKey || `profile-${idx}`, p])
    : Object.entries(profiles);

  for (const [profileKey, profile] of profileList) {
    const viewerKey = (profile.syncKey || profileKey || '').trim().toUpperCase();
    const history = Array.isArray(profile.watchHistory) ? profile.watchHistory : [];
    for (const entry of history) {
      if (!entry?.slug || typeof entry.watchedAt !== 'number') continue;
      const eps = Array.from(
        new Set(
          [
            ...(Array.isArray(entry.watchedEpisodes) ? entry.watchedEpisodes : []),
            ...(entry.episodeSlug ? [entry.episodeSlug] : []),
          ].filter(Boolean)
        )
      );
      addContribution(
        viewerSlugMap,
        viewerKey,
        entry.slug,
        historyEntryToSummary(entry),
        eps,
        Math.max(1, eps.length),
        entry.progressSeconds || 0,
        entry.watchedAt,
        cutoffAt
      );
    }
  }

  for (const ev of recordedEvents) {
    if (!ev?.slug || !ev?.viewerKey || typeof ev.lastWatchedAt !== 'number') continue;
    const eps = Array.from(
      new Set((Array.isArray(ev.watchedEpisodes) ? ev.watchedEpisodes : []).filter(Boolean))
    );
    addContribution(
      viewerSlugMap,
      ev.viewerKey.trim().toUpperCase(),
      ev.slug,
      ev.movie,
      eps,
      Math.max(1, ev.viewHits || 1, eps.length),
      ev.progressSeconds || 0,
      ev.lastWatchedAt,
      cutoffAt
    );
  }

  const normalizedLocalViewer = localViewerKey.trim().toUpperCase() || 'LOCAL-VIEWER';
  for (const entry of localWatchHistory) {
    if (!entry?.slug || typeof entry.watchedAt !== 'number') continue;
    const eps = Array.from(
      new Set(
        [
          ...(Array.isArray(entry.watchedEpisodes) ? entry.watchedEpisodes : []),
          ...(entry.episodeSlug ? [entry.episodeSlug] : []),
        ].filter(Boolean)
      )
    );
    addContribution(
      viewerSlugMap,
      normalizedLocalViewer,
      entry.slug,
      historyEntryToSummary(entry),
      eps,
      Math.max(1, eps.length),
      entry.progressSeconds || 0,
      entry.watchedAt,
      cutoffAt
    );
  }

  const bySlug = new Map<
    string,
    {
      movie: MovieSummary;
      viewers: Set<string>;
      episodesWatchedCount: number;
      weeklyViews: number;
      totalSeconds: number;
      lastWatchedAt: number;
    }
  >();

  for (const contrib of viewerSlugMap.values()) {
    const episodeCount = Math.max(1, contrib.episodes.size);
    const hitsForViewer = Math.max(episodeCount, contrib.explicitHits);
    const existing = bySlug.get(contrib.slug);
    if (!existing) {
      bySlug.set(contrib.slug, {
        movie: contrib.movie,
        viewers: new Set([contrib.viewerKey]),
        episodesWatchedCount: episodeCount,
        weeklyViews: hitsForViewer,
        totalSeconds: contrib.progressSeconds,
        lastWatchedAt: contrib.lastWatchedAt,
      });
    } else {
      existing.viewers.add(contrib.viewerKey);
      existing.episodesWatchedCount += episodeCount;
      existing.weeklyViews += hitsForViewer;
      existing.totalSeconds += contrib.progressSeconds;
      existing.lastWatchedAt = Math.max(existing.lastWatchedAt, contrib.lastWatchedAt);
      existing.movie = preferRicherMovieSummary(existing.movie, contrib.movie);
    }
  }

  const ranked = Array.from(bySlug.values())
    .sort((a, b) => {
      // Score combines total weekly views, multi-viewer reach, watch time, and recency
      const aScore =
        a.weeklyViews * 10 +
        a.viewers.size * 15 +
        Math.min(120, Math.round(a.totalSeconds / 60)) * 0.25;
      const bScore =
        b.weeklyViews * 10 +
        b.viewers.size * 15 +
        Math.min(120, Math.round(b.totalSeconds / 60)) * 0.25;
      if (bScore !== aScore) return bScore - aScore;
      if (b.weeklyViews !== a.weeklyViews) return b.weeklyViews - a.weeklyViews;
      return b.lastWatchedAt - a.lastWatchedAt;
    });

  const totalTrackedViews = ranked.reduce((sum, item) => sum + item.weeklyViews, 0);

  const items: WeeklyTopMovieEntry[] = ranked.slice(0, limit).map((item, idx) => ({
    rank: idx + 1,
    movie: item.movie,
    weeklyViews: item.weeklyViews,
    uniqueViewers: item.viewers.size,
    episodesWatchedCount: item.episodesWatchedCount,
    totalMinutesWatched: Math.round(item.totalSeconds / 60),
    lastWatchedAt: item.lastWatchedAt,
  }));

  return {
    windowDays: WEEKLY_WINDOW_DAYS,
    weekStartAt: cutoffAt,
    generatedAt: now,
    totalTrackedViews,
    items,
  };
}

export function mergeLocalHistoryWithWeeklyTop(
  serverTop: WeeklyTopResponse | null,
  localWatchHistory: WatchHistoryEntry[],
  localViewerKey: string,
  now = Date.now(),
  limit = 10
): WeeklyTopResponse {
  const cutoffAt = now - WEEKLY_WINDOW_MS;
  const syntheticEvents: WeeklyWatchEventRecord[] = [];

  if (serverTop?.items) {
    for (const item of serverTop.items) {
      // Preserve server-only viewers without colliding with localViewerKey
      const otherViewers = Math.max(0, item.uniqueViewers - 1);
      const localMatch = localWatchHistory.find(
        (h) => h.slug === item.movie.slug && h.watchedAt >= cutoffAt
      );
      if (localMatch) {
        if (otherViewers > 0) {
          syntheticEvents.push({
            slug: item.movie.slug,
            viewerKey: `SERVER-AGG-${item.movie.slug}`,
            movie: item.movie,
            watchedEpisodes: [],
            viewHits: Math.max(
              1,
              item.weeklyViews - Math.max(1, localMatch.watchedEpisodes?.length || 1)
            ),
            progressSeconds: Math.max(
              0,
              item.totalMinutesWatched * 60 - (localMatch.progressSeconds || 0)
            ),
            lastWatchedAt: item.lastWatchedAt,
          });
        }
      } else {
        for (let i = 0; i < Math.max(1, item.uniqueViewers); i += 1) {
          syntheticEvents.push({
            slug: item.movie.slug,
            viewerKey: `SERVER-V${i}-${item.movie.slug}`,
            movie: item.movie,
            watchedEpisodes: [],
            viewHits:
              i === 0
                ? Math.max(1, item.weeklyViews - Math.max(0, item.uniqueViewers - 1))
                : 1,
            progressSeconds: i === 0 ? item.totalMinutesWatched * 60 : 0,
            lastWatchedAt: item.lastWatchedAt,
          });
        }
      }
    }
  }

  return aggregateWeeklyTopFromSources({
    recordedEvents: syntheticEvents,
    localWatchHistory,
    localViewerKey,
    now,
    limit,
  });
}

export function formatWeeklyWatchMetric(entry: WeeklyTopMovieEntry): string {
  const parts: string[] = [`${entry.weeklyViews} lượt xem tuần này`];
  if (entry.uniqueViewers > 1) {
    parts.push(`${entry.uniqueViewers} người xem`);
  } else if (entry.totalMinutesWatched > 0) {
    parts.push(`${entry.totalMinutesWatched} phút`);
  }
  return parts.join(' · ');
}
