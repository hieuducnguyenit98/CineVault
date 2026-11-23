import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEEKLY_WINDOW_MS,
  aggregateWeeklyTopFromSources,
  formatWeeklyWatchMetric,
  mergeLocalHistoryWithWeeklyTop,
} from './weeklyTop';
import type { UserDataState, WatchHistoryEntry, WeeklyWatchEventRecord } from '../types/movie';

const NOW = Date.UTC(2026, 10, 23, 14, 0, 0);

function makeHistory(
  slug: string,
  name: string,
  watchedAt: number,
  watchedEpisodes: string[] = ['tap-1'],
  progressSeconds = 300
): WatchHistoryEntry {
  return {
    slug,
    name,
    originName: name,
    posterUrl: `https://example.com/${slug}.jpg`,
    thumbUrl: `https://example.com/${slug}-thumb.jpg`,
    year: 2026,
    quality: 'FHD',
    episodeSlug: watchedEpisodes[watchedEpisodes.length - 1] || 'tap-1',
    episodeName: 'Tập 1',
    serverName: 'Vietsub',
    watchedEpisodes,
    progressSeconds,
    durationSeconds: 1800,
    categories: [{ id: '1', name: 'Hành Động', slug: 'hanh-dong' }],
    countries: [{ id: '1', name: 'Trung Quốc', slug: 'trung-quoc' }],
    watchedAt,
  };
}

test('aggregateWeeklyTopFromSources ranks movies watched in the past 7 days and excludes expired watches', () => {
  const profiles: Record<string, Partial<UserDataState>> = {
    'CINE-AAA1': {
      syncKey: 'CINE-AAA1',
      watchHistory: [
        makeHistory('movie-a', 'Phim A', NOW - 2 * 60 * 60 * 1000, ['tap-1', 'tap-2'], 1200),
        makeHistory('movie-old', 'Phim Quá Hạn', NOW - WEEKLY_WINDOW_MS - 10_000, ['tap-1', 'tap-2', 'tap-3'], 2400),
      ],
    },
    'CINE-BBB2': {
      syncKey: 'CINE-BBB2',
      watchHistory: [
        makeHistory('movie-a', 'Phim A', NOW - 5 * 60 * 60 * 1000, ['tap-1'], 600),
        makeHistory('movie-b', 'Phim B', NOW - 24 * 60 * 60 * 1000, ['tap-1', 'tap-2', 'tap-3'], 900),
      ],
    },
  };

  const events: WeeklyWatchEventRecord[] = [
    {
      slug: 'movie-c',
      viewerKey: 'GUEST-1',
      movie: {
        id: 'movie-c',
        name: 'Phim C',
        originName: 'Movie C',
        slug: 'movie-c',
        type: 'single',
        posterUrl: 'https://example.com/movie-c.jpg',
        thumbUrl: '',
        year: 2026,
        quality: 'FHD',
        lang: 'Vietsub',
        time: '100 phút',
        episodeCurrent: 'Full',
        categories: [],
        countries: [],
        rating: { voteAverage: 8.1, voteCount: 10 },
        modifiedAt: '',
      },
      watchedEpisodes: ['full'],
      viewHits: 1,
      progressSeconds: 420,
      lastWatchedAt: NOW - 1000,
    },
  ];

  const result = aggregateWeeklyTopFromSources({
    profiles,
    recordedEvents: events,
    now: NOW,
    limit: 10,
  });

  assert.equal(result.windowDays, 7);
  assert.equal(result.items.length, 3);
  assert.equal(result.items.some((i) => i.movie.slug === 'movie-old'), false);

  // movie-a has 2 unique viewers and 3 total episode views -> ranks #1
  assert.equal(result.items[0].rank, 1);
  assert.equal(result.items[0].movie.slug, 'movie-a');
  assert.equal(result.items[0].uniqueViewers, 2);
  assert.equal(result.items[0].weeklyViews, 3);
  assert.equal(result.items[0].totalMinutesWatched, 30);

  // movie-b has 3 episode views from 1 viewer -> ranks #2 above movie-c (1 view)
  assert.equal(result.items[1].rank, 2);
  assert.equal(result.items[1].movie.slug, 'movie-b');
  assert.equal(result.items[2].rank, 3);
  assert.equal(result.items[2].movie.slug, 'movie-c');
});

test('mergeLocalHistoryWithWeeklyTop integrates local browser history immediately without double counting', () => {
  const serverTop = aggregateWeeklyTopFromSources({
    profiles: {
      'CINE-USER1': {
        syncKey: 'CINE-USER1',
        watchHistory: [
          makeHistory('movie-x', 'Phim X', NOW - 3600_000, ['tap-1'], 300),
          makeHistory('movie-y', 'Phim Y', NOW - 7200_000, ['tap-1', 'tap-2'], 900),
        ],
      },
    },
    now: NOW,
  });

  // Same user watches 4 more episodes of movie-x locally before syncing
  const localHistory = [
    makeHistory('movie-x', 'Phim X', NOW - 60_000, ['tap-1', 'tap-2', 'tap-3', 'tap-4', 'tap-5'], 1800),
    makeHistory('movie-new-local', 'Phim Mới Xem', NOW - 10_000, ['tap-1'], 120),
  ];

  const merged = mergeLocalHistoryWithWeeklyTop(
    serverTop,
    localHistory,
    'CINE-USER1',
    NOW,
    10
  );

  assert.equal(merged.items[0].movie.slug, 'movie-x');
  assert.equal(merged.items[0].weeklyViews, 5);
  assert.equal(merged.items.some((i) => i.movie.slug === 'movie-new-local'), true);
  assert.match(formatWeeklyWatchMetric(merged.items[0]), /5 lượt xem tuần này/);
});
