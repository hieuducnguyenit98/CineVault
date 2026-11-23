import test from 'node:test';
import assert from 'node:assert/strict';
import type { MovieSummary } from '../types/movie';
import {
  buildDailyUpdateSnapshot,
  computeUnreadNewMovies,
  formatVietnamDateDisplay,
} from './dailyUpdates';

function makeMovie(overrides: Partial<MovieSummary> & { slug: string; name: string }): MovieSummary {
  return {
    id: overrides.slug,
    originName: overrides.name,
    type: 'series',
    posterUrl: `https://example.com/${overrides.slug}.jpg`,
    thumbUrl: `https://example.com/${overrides.slug}-thumb.jpg`,
    year: 2026,
    quality: 'FHD',
    lang: 'Vietsub',
    time: '45 phút',
    episodeCurrent: 'Tập 1',
    categories: [{ id: 'hanh-dong', name: 'Hành Động', slug: 'hanh-dong' }],
    countries: [{ id: 'trung-quoc', name: 'Trung Quốc', slug: 'trung-quoc' }],
    rating: { voteAverage: 8.5, voteCount: 100 },
    modifiedAt: '2026-11-23T06:00:00.000Z',
    ...overrides,
  };
}

test('buildDailyUpdateSnapshot marks initial batch cleanly and detects incremental additions & new episodes', () => {
  const m1 = makeMovie({ slug: 'phim-1', name: 'Phim Một', episodeCurrent: 'Tập 5' });
  const m2 = makeMovie({ slug: 'phim-2', name: 'Phim Hai', lang: 'Vietsub + Thuyết Minh' });
  const ai1 = makeMovie({ slug: 'yt-ai--abc12345', name: 'Phim AI 1', lang: 'Vietsub AI' });

  const day1 = buildDailyUpdateSnapshot({
    dateKey: '2026-11-23',
    previousSnapshot: null,
    phimApiLatest: [m1],
    nguonCLatest: [],
    dubbedLatest: [m2],
    aiShortMovies: [ai1],
    now: 1000,
  });

  assert.equal(day1.snapshot.dateKey, '2026-11-23');
  assert.equal(day1.snapshot.newlyAddedCount, 3);
  assert.equal(day1.addedSinceLastRunCount, 3);
  assert.equal(day1.snapshot.entries.find((e) => e.movie.slug === 'phim-2')?.sourceCategory, 'dubbed');
  assert.equal(day1.snapshot.entries.find((e) => e.movie.slug === 'yt-ai--abc12345')?.sourceCategory, 'ai-short');

  // Same-day auto-refresh with 1 brand new movie + 1 episode bump on phim-1
  const m1Updated = makeMovie({ slug: 'phim-1', name: 'Phim Một', episodeCurrent: 'Tập 6' });
  const m3 = makeMovie({ slug: 'phim-3', name: 'Phim Ba Mới' });

  const sameDayRefresh = buildDailyUpdateSnapshot({
    dateKey: '2026-11-23',
    previousSnapshot: day1.snapshot,
    phimApiLatest: [m1Updated, m3],
    nguonCLatest: [],
    dubbedLatest: [m2],
    aiShortMovies: [ai1],
    now: 2000,
  });

  assert.equal(sameDayRefresh.addedSinceLastRunCount, 2); // m1Updated (new episode) + m3 (new slug)
  assert.equal(sameDayRefresh.snapshot.entries.find((e) => e.movie.slug === 'phim-3')?.isNewToday, true);
  assert.equal(sameDayRefresh.snapshot.entries.find((e) => e.movie.slug === 'phim-1')?.isNewToday, true);
  // m2 was already discovered earlier on 2026-11-23 so remains isNewToday=true during the same day
  assert.equal(sameDayRefresh.snapshot.entries.find((e) => e.movie.slug === 'phim-2')?.isNewToday, true);

  // Next-day rollover (2026-11-24): yesterday's unchanged items drop isNewToday, only truly new arrivals are flagged
  const m4Tomorrow = makeMovie({
    slug: 'phim-4-ngay-moi',
    name: 'Phim Ngày Mới',
    modifiedAt: '2026-11-24T01:00:00.000Z',
  });
  const day2 = buildDailyUpdateSnapshot({
    dateKey: '2026-11-24',
    previousSnapshot: sameDayRefresh.snapshot,
    phimApiLatest: [m4Tomorrow, m1Updated, m3],
    nguonCLatest: [],
    dubbedLatest: [m2],
    aiShortMovies: [ai1],
    now: 86400_000,
  });

  assert.equal(day2.addedSinceLastRunCount, 1);
  assert.equal(day2.snapshot.newlyAddedCount, 1);
  assert.equal(day2.snapshot.entries[0].movie.slug, 'phim-4-ngay-moi');
  assert.equal(day2.snapshot.entries[0].isNewToday, true);
  assert.equal(day2.snapshot.entries.find((e) => e.movie.slug === 'phim-3')?.isNewToday, false);
});

test('computeUnreadNewMovies counts only unacknowledged new movies and formats dates cleanly', () => {
  const m1 = makeMovie({ slug: 'new-1', name: 'Mới 1' });
  const m2 = makeMovie({ slug: 'new-2', name: 'Mới 2' });
  const m3 = makeMovie({ slug: 'old-1', name: 'Cũ 1' });

  const { unreadCount, unreadSlugs, newTodayCount } = computeUnreadNewMovies(
    [
      { movie: m1, sourceCategory: 'regular', discoveredAt: 100, isNewToday: true },
      { movie: m2, sourceCategory: 'dubbed', discoveredAt: 100, isNewToday: true },
      { movie: m3, sourceCategory: 'regular', discoveredAt: 50, isNewToday: false },
    ],
    ['new-1']
  );

  assert.equal(newTodayCount, 2);
  assert.equal(unreadCount, 1);
  assert.deepEqual(unreadSlugs, ['new-2']);
  assert.equal(formatVietnamDateDisplay('2026-11-23'), '23/11/2026');
});
