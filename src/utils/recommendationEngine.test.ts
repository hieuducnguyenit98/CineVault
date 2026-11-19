import test from 'node:test';
import assert from 'node:assert/strict';
import type { MovieSummary, UserDataState } from '../types/movie';
import {
  computeTasteProfileSummary,
  extractFrequentlyWatchedGenres,
  generateRecommendations,
  getNextEpisodeInfo,
} from './recommendationEngine';
import { createDefaultUserState, decodePortableToken, encodePortableToken, mergeUserStates } from './syncStorage';

const SAMPLE_MOVIES: MovieSummary[] = [
  {
    id: '1',
    name: 'Mật Danh Bóng Đêm',
    originName: 'Shadow Protocol',
    slug: 'mat-danh-bong-dem',
    type: 'single',
    posterUrl: 'https://phimimg.com/1.webp',
    thumbUrl: 'https://phimimg.com/1t.webp',
    year: 2026,
    quality: 'FHD',
    lang: 'Vietsub',
    time: '120 phút',
    episodeCurrent: 'Full',
    categories: [
      { id: 'c1', name: 'Hành Động', slug: 'hanh-dong' },
      { id: 'c2', name: 'Hình Sự', slug: 'hinh-su' },
    ],
    countries: [{ id: 'kr', name: 'Hàn Quốc', slug: 'han-quoc' }],
    rating: { voteAverage: 8.2, voteCount: 300 },
    modifiedAt: '2026-11-18T00:00:00Z',
  },
  {
    id: '2',
    name: 'Bản Tình Ca Mùa Đông',
    originName: 'Winter Sonata',
    slug: 'ban-tinh-ca-mua-dong',
    type: 'series',
    posterUrl: 'https://phimimg.com/2.webp',
    thumbUrl: 'https://phimimg.com/2t.webp',
    year: 2024,
    quality: 'FHD',
    lang: 'Vietsub',
    time: '45 phút/tập',
    episodeCurrent: 'Hoàn Tất (16/16)',
    categories: [{ id: 'c3', name: 'Tình Cảm', slug: 'tinh-cam' }],
    countries: [{ id: 'kr', name: 'Hàn Quốc', slug: 'han-quoc' }],
    rating: { voteAverage: 7.4, voteCount: 150 },
    modifiedAt: '2026-11-10T00:00:00Z',
  },
  {
    id: '3',
    name: 'Hồ Sơ Tuyệt Mật',
    originName: 'Classified Files',
    slug: 'ho-so-tuyet-mat',
    type: 'single',
    posterUrl: 'https://phimimg.com/3.webp',
    thumbUrl: 'https://phimimg.com/3t.webp',
    year: 2026,
    quality: '4K',
    lang: 'Vietsub',
    time: '115 phút',
    episodeCurrent: 'Full',
    categories: [
      { id: 'c1', name: 'Hành Động', slug: 'hanh-dong' },
      { id: 'c4', name: 'Bí Ẩn', slug: 'bi-an' },
    ],
    countries: [{ id: 'us', name: 'Âu Mỹ', slug: 'au-my' }],
    rating: { voteAverage: 7.9, voteCount: 210 },
    modifiedAt: '2026-11-15T00:00:00Z',
  },
];

test('generateRecommendations ranks movies matching watch history & liked genres higher and excludes disliked', () => {
  const now = Date.UTC(2026, 10, 19);
  const state: UserDataState = {
    ...createDefaultUserState('CINE-TEST-0001'),
    preferredGenres: ['hanh-dong'],
    dislikedSlugs: ['ho-so-tuyet-mat'],
    watchHistory: [
      {
        slug: 'phim-da-xem',
        name: 'Điệp Vụ Tối Mật',
        originName: 'Top Secret',
        posterUrl: '',
        thumbUrl: '',
        year: 2026,
        quality: 'FHD',
        episodeSlug: 'full',
        episodeName: 'Full',
        serverName: 'Vietsub',
        watchedEpisodes: ['full'],
        progressSeconds: 3600,
        durationSeconds: 4000,
        categories: [
          { id: 'c1', name: 'Hành Động', slug: 'hanh-dong' },
          { id: 'c2', name: 'Hình Sự', slug: 'hinh-su' },
        ],
        countries: [{ id: 'kr', name: 'Hàn Quốc', slug: 'han-quoc' }],
        watchedAt: now - 1000 * 60 * 60,
      },
    ],
  };

  const recs = generateRecommendations(SAMPLE_MOVIES, state, [], { nowMs: now });
  assert.equal(recs.length, 2); // disliked movie excluded
  assert.equal(recs[0].movie.slug, 'mat-danh-bong-dem');
  assert.ok(recs[0].matchPercent > recs[1].matchPercent);
  assert.ok(recs[0].reason.includes('Hành Động'));
});

test('computeTasteProfileSummary aggregates watch minutes and top genre share', () => {
  const now = Date.UTC(2026, 10, 19);
  const state: UserDataState = {
    ...createDefaultUserState('CINE-TEST-0002'),
    preferredGenres: ['vien-tuong'],
    watchHistory: [
      {
        slug: 'w1',
        name: 'A',
        originName: 'A',
        posterUrl: '',
        thumbUrl: '',
        year: 2026,
        quality: 'FHD',
        episodeSlug: 'tap-1',
        episodeName: 'Tập 1',
        serverName: 'Vietsub',
        watchedEpisodes: ['tap-1'],
        progressSeconds: 1800,
        durationSeconds: 2400,
        categories: [{ id: 'c1', name: 'Hành Động', slug: 'hanh-dong' }],
        countries: [{ id: 'jp', name: 'Nhật Bản', slug: 'nhat-ban' }],
        watchedAt: now,
      },
    ],
  };

  const summary = computeTasteProfileSummary(state, [], now);
  assert.equal(summary.totalWatchMinutes, 30);
  assert.equal(summary.watchedCount, 1);
  assert.ok(summary.topGenres.length >= 2);
});

test('mergeUserStates merges watch history and watchedEpisodes across devices', () => {
  const desktop = createDefaultUserState('CINE-SYNC-9999');
  desktop.watchHistory = [
    {
      slug: 'movie-a',
      name: 'Movie A',
      originName: 'Movie A',
      posterUrl: '',
      thumbUrl: '',
      year: 2026,
      quality: 'FHD',
      episodeSlug: 'tap-01',
      episodeName: 'Tập 01',
      serverName: 'Vietsub',
      watchedEpisodes: ['tap-01'],
      progressSeconds: 300,
      durationSeconds: 2400,
      categories: [],
      countries: [],
      watchedAt: 1000,
    },
  ];

  const mobile = createDefaultUserState('CINE-SYNC-9999');
  mobile.watchHistory = [
    {
      slug: 'movie-a',
      name: 'Movie A',
      originName: 'Movie A',
      posterUrl: '',
      thumbUrl: '',
      year: 2026,
      quality: 'FHD',
      episodeSlug: 'tap-02',
      episodeName: 'Tập 02',
      serverName: 'Vietsub',
      watchedEpisodes: ['tap-02'],
      progressSeconds: 950,
      durationSeconds: 2400,
      categories: [],
      countries: [],
      watchedAt: 5000,
    },
    {
      slug: 'movie-b',
      name: 'Movie B',
      originName: 'Movie B',
      posterUrl: '',
      thumbUrl: '',
      year: 2025,
      quality: 'HD',
      episodeSlug: 'full',
      episodeName: 'Full',
      serverName: 'Vietsub',
      watchedEpisodes: ['full'],
      progressSeconds: 120,
      durationSeconds: 5400,
      categories: [],
      countries: [],
      watchedAt: 3000,
    },
  ];

  const merged = mergeUserStates(desktop, mobile);
  assert.equal(merged.watchHistory.length, 2);
  assert.equal(merged.watchHistory[0].slug, 'movie-a');
  assert.equal(merged.watchHistory[0].episodeSlug, 'tap-02');
  assert.deepEqual(merged.watchHistory[0].watchedEpisodes.sort(), ['tap-01', 'tap-02']);

  const token = encodePortableToken(merged);
  const decoded = decodePortableToken(token);
  assert.ok(decoded);
  assert.equal(decoded.watchHistory.length, 2);
  assert.equal(decoded.syncKey, 'CINE-SYNC-9999');
});

test('getNextEpisodeInfo resolves next sequential episode cleanly', () => {
  const episodes = [
    { name: 'Tập 01', slug: 'tap-01', filename: '', linkEmbed: 'e1', linkM3u8: '' },
    { name: 'Tập 02', slug: 'tap-02', filename: '', linkEmbed: 'e2', linkM3u8: '' },
    { name: 'Tập 03', slug: 'tap-03', filename: '', linkEmbed: 'e3', linkM3u8: '' },
  ];
  const info1 = getNextEpisodeInfo(episodes, 'tap-01', ['tap-01']);
  assert.equal(info1.nextEpisode?.slug, 'tap-02');
  assert.equal(info1.isLastEpisode, false);

  const infoLast = getNextEpisodeInfo(episodes, 'tap-03', ['tap-01', 'tap-02', 'tap-03']);
  assert.equal(infoLast.nextEpisode, null);
  assert.equal(infoLast.isLastEpisode, true);
});

test('extractFrequentlyWatchedGenres identifies top genres from watch history', () => {
  const now = Date.UTC(2026, 10, 19);
  const state: UserDataState = {
    ...createDefaultUserState('CINE-TEST-GENRES'),
    watchHistory: [
      {
        slug: 'm1',
        name: 'M1',
        originName: 'M1',
        posterUrl: '',
        thumbUrl: '',
        year: 2026,
        quality: 'FHD',
        episodeSlug: 'tap-04',
        episodeName: 'Tập 04',
        serverName: 'Vietsub',
        watchedEpisodes: ['tap-01', 'tap-02', 'tap-03', 'tap-04'],
        progressSeconds: 1200,
        durationSeconds: 2400,
        categories: [{ id: '1', name: 'Kinh Dị', slug: 'kinh-di' }],
        countries: [],
        watchedAt: now,
      },
      {
        slug: 'm2',
        name: 'M2',
        originName: 'M2',
        posterUrl: '',
        thumbUrl: '',
        year: 2026,
        quality: 'FHD',
        episodeSlug: 'tap-01',
        episodeName: 'Tập 01',
        serverName: 'Vietsub',
        watchedEpisodes: ['tap-01'],
        progressSeconds: 600,
        durationSeconds: 2400,
        categories: [{ id: '2', name: 'Tâm Lý', slug: 'tam-ly' }],
        countries: [],
        watchedAt: now - 86400000,
      },
    ],
  };

  const top = extractFrequentlyWatchedGenres(state, [], 2, now);
  assert.equal(top[0].slug, 'kinh-di');
  assert.equal(top[0].watchCount, 1);
  assert.equal(top.length, 2);
});
