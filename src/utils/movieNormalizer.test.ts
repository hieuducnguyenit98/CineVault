import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findPreferredNarrationServerIndex,
  formatDurationSeconds,
  hasVietnameseNarration,
  mergeCatalogResponses,
  mergeMovieDetails,
  normalizeCatalogResponse,
  normalizeMediaUrl,
  normalizeMovieDetail,
  normalizeNguonCListResponse,
  normalizeNguonCMovieDetail,
  stripHtmlTags,
} from './movieNormalizer';

test('normalizeMediaUrl handles relative uploads paths and full URLs', () => {
  assert.equal(
    normalizeMediaUrl('uploads/movies/20261119/film-poster.webp'),
    'https://phimimg.com/uploads/movies/20261119/film-poster.webp'
  );
  assert.equal(
    normalizeMediaUrl('https://phimimg.com/uploads/movies/poster.webp'),
    'https://phimimg.com/uploads/movies/poster.webp'
  );
  assert.equal(normalizeMediaUrl(''), '');
});

test('stripHtmlTags removes tags and decodes common HTML entities', () => {
  assert.equal(
    stripHtmlTags('<p>Câu chuyện &amp; hành trình <strong>đặc biệt</strong>.</p>'),
    'Câu chuyện & hành trình đặc biệt.'
  );
});

test('formatDurationSeconds formats mm:ss and hh:mm:ss cleanly', () => {
  assert.equal(formatDurationSeconds(0), '00:00');
  assert.equal(formatDurationSeconds(125), '02:05');
  assert.equal(formatDurationSeconds(3665), '1:01:05');
});

test('normalizeCatalogResponse normalizes v1 API payload with relative images', () => {
  const catalog = normalizeCatalogResponse({
    status: true,
    data: {
      APP_DOMAIN_CDN_IMAGE: 'https://phimimg.com',
      titlePage: 'Phim Lẻ',
      items: [
        {
          _id: 'abc123',
          name: 'Chiến Binh Bóng Đêm',
          origin_name: 'Shadow Warrior',
          slug: 'chien-binh-bong-dem',
          type: 'single',
          poster_url: 'uploads/movies/shadow-poster.webp',
          thumb_url: 'uploads/movies/shadow-thumb.webp',
          year: 2026,
          quality: 'FHD',
          lang: 'Vietsub',
          tmdb: { vote_average: 7.8, vote_count: 140 },
          category: [{ id: '1', name: 'Hành Động', slug: 'hanh-dong' }],
          country: [{ id: '1', name: 'Hàn Quốc', slug: 'han-quoc' }],
        },
      ],
      params: {
        pagination: {
          totalItems: 48,
          totalItemsPerPage: 24,
          currentPage: 1,
        },
      },
    },
  });

  assert.equal(catalog.items.length, 1);
  assert.equal(catalog.items[0].posterUrl, 'https://phimimg.com/uploads/movies/shadow-poster.webp');
  assert.equal(catalog.items[0].rating.voteAverage, 7.8);
  assert.equal(catalog.pagination.totalPages, 2);
});

test('normalizeMovieDetail extracts episodes and cleans cast/content', () => {
  const detail = normalizeMovieDetail({
    status: true,
    movie: {
      _id: 'm1',
      name: 'Hành Trình Bất Tận',
      origin_name: 'Endless Journey',
      slug: 'hanh-trinh-bat-tan',
      content: '<p>Một chuyến phiêu lưu kỳ thú.</p>',
      poster_url: 'https://phimimg.com/p.webp',
      thumb_url: 'https://phimimg.com/t.webp',
      year: 2025,
      actor: ['Diễn viên A', 'Đang cập nhật'],
      director: ['Đạo diễn B'],
      category: [{ id: '1', name: 'Phiêu Lưu', slug: 'phieu-luu' }],
      country: [],
    },
    episodes: [
      {
        server_name: 'Vietsub',
        server_data: [
          {
            name: 'Tập 01',
            slug: 'tap-01',
            link_embed: 'https://player.phimapi.com/player/?url=https://cdn.example/1.m3u8',
            link_m3u8: 'https://cdn.example/1.m3u8',
          },
        ],
      },
    ],
  });

  assert.ok(detail);
  assert.equal(detail.content, 'Một chuyến phiêu lưu kỳ thú.');
  assert.deepEqual(detail.actors, ['Diễn viên A']);
  assert.equal(detail.servers.length, 1);
  assert.equal(detail.servers[0].episodes[0].linkM3u8, 'https://cdn.example/1.m3u8');
});

test('normalizeNguonCListResponse maps NguonC portrait thumb_url to posterUrl and merges uniquely', () => {
  const nguoncCatalog = normalizeNguonCListResponse({
    status: 'success',
    paginate: { current_page: 1, total_page: 100, total_items: 1000, items_per_page: 10 },
    cat: { name: 'Hàn Quốc', title: 'Hàn Quốc', slug: 'han-quoc' },
    items: [
      {
        name: 'Dâu Tây Ngọt Ngào',
        original_name: 'Merry Berry Love',
        slug: 'dau-tay-ngot-ngao',
        year: '2026',
        total_episodes: 10,
        current_episode: 'Tập 7',
        quality: 'HD',
        language: 'Vietsub',
        thumb_url: 'https://img.nguonc.com/images/portrait.png',
        poster_url: 'https://img.nguonc.com/images/backdrop.png',
      },
      {
        name: 'Chiến Binh Bóng Đêm',
        original_name: 'Shadow Warrior',
        slug: 'chien-binh-bong-dem',
        year: '2026',
        total_episodes: 1,
        current_episode: 'FULL',
        thumb_url: 'https://img.nguonc.com/images/dup.png',
      },
    ],
  });

  assert.equal(nguoncCatalog.items.length, 2);
  assert.equal(nguoncCatalog.items[0].posterUrl, 'https://img.nguonc.com/images/portrait.png');
  assert.equal(nguoncCatalog.items[0].thumbUrl, 'https://img.nguonc.com/images/backdrop.png');
  assert.equal(nguoncCatalog.items[0].type, 'series');

  const primary = normalizeCatalogResponse({
    data: {
      items: [
        {
          _id: 'abc123',
          name: 'Chiến Binh Bóng Đêm',
          origin_name: 'Shadow Warrior',
          slug: 'chien-binh-bong-dem',
          type: 'single',
          poster_url: 'https://phimimg.com/shadow.webp',
          year: 2026,
        },
      ],
      params: { pagination: { totalItems: 24, totalItemsPerPage: 24, currentPage: 1 } },
    },
  });

  const merged = mergeCatalogResponses(primary, nguoncCatalog);
  assert.equal(merged.items.length, 2);
  assert.equal(merged.items[0].slug, 'chien-binh-bong-dem');
  assert.equal(merged.items[1].slug, 'dau-tay-ngot-ngao');
  assert.equal(merged.pagination.totalItems, 1024);
});

test('normalizeNguonCMovieDetail parses grouped taxonomy and episode servers and merges with primary', () => {
  const detail2 = normalizeNguonCMovieDetail({
    status: 'success',
    movie: {
      id: 'nc1',
      name: 'Dâu Tây Ngọt Ngào',
      original_name: 'Merry Berry Love',
      slug: 'dau-tay-ngot-ngao',
      year: 2026,
      description: 'Câu chuyện lãng mạn.',
      total_episodes: 10,
      current_episode: 'Tập 7',
      director: 'Đạo diễn Kim',
      casts: 'Ji Chang-wook, Mio Imada',
      thumb_url: 'https://img.nguonc.com/images/p.png',
      poster_url: 'https://img.nguonc.com/images/b.png',
      category: {
        '2': {
          group: { name: 'Thể loại' },
          list: [
            { id: 'g1', name: 'Tình Cảm' },
            { id: 'g2', name: 'Hài' },
          ],
        },
        '4': {
          group: { name: 'Quốc gia' },
          list: [{ id: 'c1', name: 'Hàn Quốc' }],
        },
      },
      episodes: [
        {
          server_name: 'Vietsub',
          items: [{ name: '1', slug: 'tap-1', embed: 'https://embed.example/1' }],
        },
      ],
    },
  });

  assert.ok(detail2);
  assert.equal(detail2.categories[0].slug, 'tinh-cam');
  assert.equal(detail2.categories[1].slug, 'hai-huoc');
  assert.equal(detail2.countries[0].slug, 'han-quoc');
  assert.equal(detail2.servers[0].episodes[0].name, 'Tập 1');

  const merged = mergeMovieDetails(
    {
      ...detail2,
      servers: [{ serverName: 'Vietsub', episodes: [{ name: 'Tập 01', slug: 'tap-01', filename: '', linkEmbed: 'https://p1.example/1', linkM3u8: '' }] }],
    },
    detail2
  );
  assert.ok(merged);
  assert.equal(merged.servers.length, 2);
  assert.equal(merged.servers[1].serverName, 'Vietsub (Nguồn 2)');
});

test('hasVietnameseNarration and findPreferredNarrationServerIndex detect Thuyết Minh reliably', () => {
  assert.equal(hasVietnameseNarration({ lang: 'Vietsub + Thuyết Minh' }), true);
  assert.equal(hasVietnameseNarration({ lang: 'Thuyet Minh' }), true);
  assert.equal(hasVietnameseNarration({ lang: 'Vietsub' }), false);
  assert.equal(
    hasVietnameseNarration({
      lang: 'Vietsub',
      servers: [{ serverName: '#Hà Nội (Vietsub)' }, { serverName: '#Hà Nội (Thuyết Minh)' }],
    }),
    true
  );

  assert.equal(
    findPreferredNarrationServerIndex([
      { serverName: 'Vietsub', episodes: [] },
      { serverName: '#HCM (Thuyết Minh)', episodes: [] },
    ]),
    1
  );
  assert.equal(findPreferredNarrationServerIndex([{ serverName: 'Vietsub', episodes: [] }]), -1);
});

