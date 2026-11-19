import assert from 'node:assert/strict';
import test from 'node:test';
import type { MovieSummary } from '../types/movie.ts';
import {
  getVietnamDateKey,
  selectDailyHeroMovies,
  type HeroCandidate,
} from './heroSelector.ts';

function makeMovie(overrides: Partial<MovieSummary> & { slug: string; name: string }): MovieSummary {
  return {
    id: overrides.slug,
    name: overrides.name,
    originName: overrides.originName ?? overrides.name,
    slug: overrides.slug,
    type: overrides.type ?? 'single',
    posterUrl: overrides.posterUrl ?? 'https://example.com/poster.webp',
    thumbUrl: overrides.thumbUrl ?? 'https://example.com/thumb.webp',
    year: overrides.year ?? 2026,
    quality: overrides.quality ?? 'FHD',
    lang: overrides.lang ?? 'Vietsub',
    time: overrides.time ?? '110 phút',
    episodeCurrent: overrides.episodeCurrent ?? 'Full',
    categories: overrides.categories ?? [{ id: '1', name: 'Hành Động', slug: 'hanh-dong' }],
    countries: overrides.countries ?? [{ id: '1', name: 'Âu Mỹ', slug: 'au-my' }],
    rating: overrides.rating ?? { voteAverage: 7.5, voteCount: 100 },
    modifiedAt: overrides.modifiedAt ?? '2026-11-19',
  };
}

test('selectDailyHeroMovies returns 10 movies prioritizing high-res landscape backdrops and recent years', () => {
  const candidates: HeroCandidate[] = [];
  for (let i = 1; i <= 12; i += 1) {
    candidates.push({
      movie: makeMovie({
        slug: `hd-movie-${i}`,
        name: `Phim HD ${i}`,
        year: i <= 10 ? 2026 : 2020,
      }),
      backdropWidth: 1280,
      backdropHeight: 720,
      source: 'nguonc',
    });
  }
  candidates.push({
    movie: makeMovie({
      slug: 'lowres-movie',
      name: 'Phim Mờ',
      year: 2026,
    }),
    backdropWidth: 780,
    backdropHeight: 439,
    source: 'phimapi',
  });

  const selected = selectDailyHeroMovies(candidates, '2026-11-19', 10);
  assert.equal(selected.length, 10);
  assert.equal(selected.some((m) => m.slug === 'lowres-movie'), false);
  assert.equal(selected.every((m) => m.year === 2026), true);
});

test('selectDailyHeroMovies deduplicates by slug/title and upgrades backdrop to HD when matched across sources', () => {
  const candidates: HeroCandidate[] = [
    {
      movie: makeMovie({
        slug: 'shared-hit',
        name: 'Shared Hit',
        thumbUrl: 'https://phimimg.com/small-780.webp',
      }),
      backdropWidth: 780,
      backdropHeight: 439,
      source: 'phimapi',
    },
    {
      movie: makeMovie({
        slug: 'shared-hit',
        name: 'Shared Hit',
        thumbUrl: 'https://img.nguonc.com/crisp-1280.webp',
      }),
      backdropWidth: 1280,
      backdropHeight: 720,
      source: 'nguonc',
    },
  ];

  const selected = selectDailyHeroMovies(candidates, '2026-11-19', 10);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].thumbUrl, 'https://img.nguonc.com/crisp-1280.webp');
});

test('getVietnamDateKey formats YYYY-MM-DD', () => {
  const key = getVietnamDateKey(new Date('2026-11-19T12:00:00Z'));
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
});
