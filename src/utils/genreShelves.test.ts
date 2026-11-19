import test from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogResponse, MovieSummary } from '../types/movie';
import { assembleGenreShelves, CORE_GENRE_SHELF_DEFS } from './genreShelves';

function makeMovie(slug: string, name = slug): MovieSummary {
  return {
    id: slug,
    name,
    originName: name,
    slug,
    type: 'single',
    posterUrl: `https://example.com/${slug}.jpg`,
    thumbUrl: `https://example.com/${slug}-thumb.jpg`,
    year: 2026,
    quality: 'FHD',
    lang: 'Vietsub',
    time: '110 phút',
    episodeCurrent: 'Full',
    categories: [],
    countries: [],
    rating: { voteAverage: 7.5, voteCount: 10 },
    modifiedAt: '',
  };
}

function makeCatalog(slugs: string[], totalItems = 120): CatalogResponse {
  return {
    items: slugs.map((s) => makeMovie(s)),
    pagination: {
      currentPage: 1,
      totalPages: 5,
      totalItems,
      totalItemsPerPage: 24,
    },
  };
}

test('assembleGenreShelves prioritizes unique movies per genre and falls back only when needed', () => {
  const shelves = assembleGenreShelves(
    [
      {
        def: CORE_GENRE_SHELF_DEFS[0],
        catalog: makeCatalog(['m1', 'm2', 'm3', 'm4'], 450),
      },
      {
        def: CORE_GENRE_SHELF_DEFS[1],
        catalog: makeCatalog(['m1', 'm2', 'm5', 'm6', 'm7'], 310),
      },
      {
        def: CORE_GENRE_SHELF_DEFS[2],
        catalog: null,
      },
    ],
    3
  );

  assert.equal(shelves.length, 2);
  assert.equal(shelves[0].slug, 'hanh-dong');
  assert.deepEqual(
    shelves[0].items.map((m) => m.slug),
    ['m1', 'm2', 'm3']
  );
  assert.equal(shelves[0].totalItems, 450);

  // Second shelf skips m1, m2 already displayed in first shelf and selects unique m5, m6, m7
  assert.equal(shelves[1].slug, 'tinh-cam');
  assert.deepEqual(
    shelves[1].items.map((m) => m.slug),
    ['m5', 'm6', 'm7']
  );
});

test('assembleGenreShelves respects initialSeenSlugs and fills up to limit using fallback items if unique pool is small', () => {
  const shelves = assembleGenreShelves(
    [
      {
        def: CORE_GENRE_SHELF_DEFS[0],
        catalog: makeCatalog(['m1', 'm2', 'm3'], 50),
      },
    ],
    3,
    ['m1', 'm2']
  );

  assert.equal(shelves.length, 1);
  // m3 is picked first (unseen), then m1, m2 fill up to limit 3
  assert.deepEqual(
    shelves[0].items.map((m) => m.slug),
    ['m3', 'm1', 'm2']
  );
});
