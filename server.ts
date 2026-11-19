import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogResponse, GenreItem, UserDataState } from './src/types/movie.ts';
import {
  DEFAULT_ACCESS_CODE_DIGEST,
  hashAccessCode,
  signAccessToken,
  verifyAccessCode,
  verifySignedAccessToken,
} from './src/utils/accessCrypto.ts';
import {
  ALL_GENRE_SHELF_DEFS,
  CORE_GENRE_SHELF_DEFS,
  assembleGenreShelves,
  findGenreShelfDefinition,
} from './src/utils/genreShelves.ts';
import {
  hasVietnameseNarration,
  mergeCatalogResponses,
  mergeMovieDetails,
  normalizeCatalogResponse,
  normalizeMovieDetail,
  normalizeNguonCListResponse,
  normalizeNguonCMovieDetail,
} from './src/utils/movieNormalizer.ts';
import {
  getVietnamDateKey,
  selectDailyHeroMovies,
  type HeroCandidate,
} from './src/utils/heroSelector.ts';
import {
  mergeUserStates,
  normalizeUserState,
  sanitizeSyncKey,
} from './src/utils/syncStorage.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PHIMAPI_BASE = 'https://phimapi.com';
const NGUONC_BASE = 'https://phim.nguonc.com';
const DATA_DIR = path.join(__dirname, '.data');
const SYNC_FILE = path.join(DATA_DIR, 'sync-profiles.json');
const ACCESS_SECRET_FILE = path.join(DATA_DIR, '.access-secret');

function getOrCreateAccessSecret(): string {
  const envSecret = process.env.ACCESS_TOKEN_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  try {
    if (fs.existsSync(ACCESS_SECRET_FILE)) {
      const existing = fs.readFileSync(ACCESS_SECRET_FILE, 'utf-8').trim();
      if (existing.length >= 32) {
        return existing;
      }
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(ACCESS_SECRET_FILE, generated, { encoding: 'utf-8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.createHash('sha256').update(DEFAULT_ACCESS_CODE_DIGEST).digest('hex');
  }
}

function getExpectedAccessDigest(): string {
  const override = process.env.ACCESS_CODE?.trim();
  return override ? hashAccessCode(override) : DEFAULT_ACCESS_CODE_DIGEST;
}

const accessFailures = new Map<string, { count: number; resetAt: number }>();
const ACCESS_WINDOW_MS = 10 * 60 * 1000;
const ACCESS_MAX_FAILURES = 12;

const NGUONC_GENRE_SLUGS: Record<string, string> = {
  'vien-tuong': 'khoa-hoc-vien-tuong',
  'khoa-hoc': 'khoa-hoc-vien-tuong',
  'hai-huoc': 'phim-hai',
  hai: 'phim-hai',
  'vo-thuat': 'hanh-dong',
};

const PHIMAPI_GENRE_SLUGS: Record<string, string> = {
  hai: 'hai-huoc',
  'phim-hai': 'hai-huoc',
  'khoa-hoc-vien-tuong': 'vien-tuong',
  'lang-man': 'tinh-cam',
};

const NGUONC_COUNTRY_SLUGS: Record<string, string> = {
  'au-my': 'my',
};

function mapPhimApiGenreSlug(slug: string): string {
  return PHIMAPI_GENRE_SLUGS[slug] ?? slug;
}

function mapNguonCGenreSlug(slug: string): string {
  return NGUONC_GENRE_SLUGS[slug] ?? slug;
}

function mapNguonCCountrySlug(slug: string): string {
  return NGUONC_COUNTRY_SLUGS[slug] ?? slug;
}

interface CacheEntry {
  expiresAt: number;
  data: unknown;
}

const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function readSyncStore(): Record<string, UserDataState> {
  try {
    if (!fs.existsSync(SYNC_FILE)) return {};
    const raw = fs.readFileSync(SYNC_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, Partial<UserDataState>>;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, UserDataState>) : {};
  } catch {
    return {};
  }
}

function writeSyncStore(store: Record<string, UserDataState>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SYNC_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist sync profiles:', err);
  }
}

function parseImageDimensionsFromBuffer(
  buf: Buffer
): { width: number; height: number } | null {
  if (buf.length < 30) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8X') {
      return {
        width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
        height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
      };
    }
    if (chunk === 'VP8 ') {
      return {
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    if (chunk === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

async function probeImageDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Range: 'bytes=0-4095' },
    });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return parseImageDimensionsFromBuffer(Buffer.from(arr));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithCache<T>(url: string, ttlMs = CACHE_TTL_MS): Promise<T> {
  const now = Date.now();
  const cached = apiCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CineVault/1.0',
      },
    });
    if (!response.ok) {
      throw new Error(`Upstream API returned ${response.status}`);
    }
    const json = (await response.json()) as T;
    apiCache.set(url, { data: json, expiresAt: now + ttlMs });
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  const accessSecret = getOrCreateAccessSecret();
  const expectedAccessDigest = getExpectedAccessDigest();

  const extractAccessToken = (req: express.Request): string => {
    const headerToken = req.header('x-access-token')?.trim();
    if (headerToken) return headerToken;
    const auth = req.header('authorization')?.trim();
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      return auth.slice(7).trim();
    }
    return '';
  };

  const requireAccess: express.RequestHandler = (req, res, next) => {
    const token = extractAccessToken(req);
    if (!verifySignedAccessToken(token, accessSecret)) {
      res.status(401).json({ error: 'Yêu cầu nhập mã truy cập hợp lệ.' });
      return;
    }
    next();
  };

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'cinevault' });
  });

  // Private Access Gate endpoints
  app.get('/api/access/session', (req, res) => {
    const token = extractAccessToken(req);
    if (verifySignedAccessToken(token, accessSecret)) {
      res.json({ unlocked: true });
    } else {
      res.status(401).json({ unlocked: false });
    }
  });

  app.post('/api/access/verify', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = accessFailures.get(clientIp);
    if (record && record.resetAt > now && record.count >= ACCESS_MAX_FAILURES) {
      res.status(429).json({
        error: 'Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.',
      });
      return;
    }

    const code = typeof req.body?.code === 'string' ? req.body.code : '';
    if (!verifyAccessCode(code, expectedAccessDigest)) {
      const nextCount = record && record.resetAt > now ? record.count + 1 : 1;
      accessFailures.set(clientIp, {
        count: nextCount,
        resetAt: record && record.resetAt > now ? record.resetAt : now + ACCESS_WINDOW_MS,
      });
      res.status(401).json({
        error: 'Mã truy cập không chính xác. Vui lòng kiểm tra lại.',
      });
      return;
    }

    accessFailures.delete(clientIp);
    res.json({
      unlocked: true,
      token: signAccessToken(accessSecret, now),
    });
  });

  app.use('/api/movies', requireAccess);
  app.use('/api/sync', requireAccess);

  // 0. Daily Hero Spotlight (10 newly updated movies refreshed daily with sharp HD backdrops)
  app.get('/api/movies/hero', async (_req, res) => {
    const dateKey = getVietnamDateKey();
    const heroCacheKey = `daily-hero:${dateKey}`;
    const cachedHero = apiCache.get(heroCacheKey);
    if (cachedHero && cachedHero.expiresAt > Date.now()) {
      res.json(cachedHero.data);
      return;
    }

    const [p1, p2, p3, pCr, n1, n2, n3, n4] = await Promise.allSettled([
      fetchJsonWithCache<Record<string, unknown>>(`${PHIMAPI_BASE}/danh-sach/phim-moi-cap-nhat-v3?page=1`),
      fetchJsonWithCache<Record<string, unknown>>(`${PHIMAPI_BASE}/danh-sach/phim-moi-cap-nhat-v3?page=2`),
      fetchJsonWithCache<Record<string, unknown>>(`${PHIMAPI_BASE}/danh-sach/phim-moi-cap-nhat-v3?page=3`),
      fetchJsonWithCache<Record<string, unknown>>(`${PHIMAPI_BASE}/v1/api/danh-sach/phim-chieu-rap?page=1&limit=12`),
      fetchJsonWithCache<Record<string, unknown>>(`${NGUONC_BASE}/api/films/phim-moi-cap-nhat?page=1`),
      fetchJsonWithCache<Record<string, unknown>>(`${NGUONC_BASE}/api/films/phim-moi-cap-nhat?page=2`),
      fetchJsonWithCache<Record<string, unknown>>(`${NGUONC_BASE}/api/films/phim-moi-cap-nhat?page=3`),
      fetchJsonWithCache<Record<string, unknown>>(`${NGUONC_BASE}/api/films/phim-moi-cap-nhat?page=4`),
    ]);

    const phimApiItems = [
      ...(p1.status === 'fulfilled' ? normalizeCatalogResponse(p1.value).items : []),
      ...(p2.status === 'fulfilled' ? normalizeCatalogResponse(p2.value).items : []),
      ...(p3.status === 'fulfilled' ? normalizeCatalogResponse(p3.value).items : []),
      ...(pCr.status === 'fulfilled' ? normalizeCatalogResponse(pCr.value).items : []),
    ];
    const nguonCItems = [
      ...(n1.status === 'fulfilled' ? normalizeNguonCListResponse(n1.value).items : []),
      ...(n2.status === 'fulfilled' ? normalizeNguonCListResponse(n2.value).items : []),
      ...(n3.status === 'fulfilled' ? normalizeNguonCListResponse(n3.value).items : []),
      ...(n4.status === 'fulfilled' ? normalizeNguonCListResponse(n4.value).items : []),
    ];

    // Probe top recent PhimAPI items to detect >=1000px crisp widescreen backdrops
    const probeTargets = phimApiItems.slice(0, 10);
    const probedDims = await Promise.allSettled(
      probeTargets.map((item) => probeImageDimensions(item.thumbUrl))
    );

    const candidates: HeroCandidate[] = [];
    // Put PhimAPI items with stream flag, and NguonC items with 1280x720 sharp backdrops
    phimApiItems.forEach((movie, idx) => {
      const dimRes = idx < probedDims.length ? probedDims[idx] : null;
      const dims = dimRes && dimRes.status === 'fulfilled' ? dimRes.value : null;
      candidates.push({
        movie,
        backdropWidth: dims?.width,
        backdropHeight: dims?.height,
        source: 'phimapi',
        hasPhimApiStream: true,
      });
    });
    for (const movie of nguonCItems) {
      candidates.push({
        movie,
        backdropWidth: 1280,
        backdropHeight: 720,
        source: 'nguonc',
        hasPhimApiStream: false,
      });
    }

    const selected = selectDailyHeroMovies(candidates, dateKey, 10);
    if (selected.length === 0) {
      res.status(502).json({ error: 'Không thể tải danh sách phim tiêu điểm hôm nay.' });
      return;
    }

    // Enrich missing categories/countries/narration tags for the 10 daily hero items
    const enriched = await Promise.all(
      selected.map(async (item) => {
        if (item.categories.length > 0 && item.countries.length > 0) {
          return item;
        }
        try {
          const [ncRes, paRes] = await Promise.allSettled([
            fetchJsonWithCache<Record<string, unknown>>(
              `${NGUONC_BASE}/api/film/${encodeURIComponent(item.slug)}`,
              60 * 60 * 1000
            ),
            fetchJsonWithCache<Record<string, unknown>>(
              `${PHIMAPI_BASE}/phim/${encodeURIComponent(item.slug)}`,
              60 * 60 * 1000
            ),
          ]);
          const ncDet = ncRes.status === 'fulfilled' ? normalizeNguonCMovieDetail(ncRes.value) : null;
          const paDet = paRes.status === 'fulfilled' ? normalizeMovieDetail(paRes.value) : null;
          const merged = mergeMovieDetails(paDet, ncDet);
          if (!merged) return item;
          return {
            ...item,
            categories: merged.categories.length > 0 ? merged.categories : item.categories,
            countries: merged.countries.length > 0 ? merged.countries : item.countries,
            rating: merged.rating.voteAverage > 0 ? merged.rating : item.rating,
            lang: hasVietnameseNarration(merged) && !hasVietnameseNarration(item)
              ? item.lang
                ? `${item.lang} + Thuyết Minh`
                : 'Thuyết Minh'
              : item.lang,
            thumbUrl: item.thumbUrl || merged.thumbUrl,
          };
        } catch {
          return item;
        }
      })
    );

    const payload = { movies: enriched, dateKey };
    apiCache.set(heroCacheKey, { data: payload, expiresAt: Date.now() + 2 * 60 * 60 * 1000 });
    res.json(payload);
  });

  // 1. Latest updated movies (PhimAPI v3 + NguonC)
  app.get('/api/movies/latest', async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const [r1, r2] = await Promise.allSettled([
      fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/danh-sach/phim-moi-cap-nhat-v3?page=${page}`
      ),
      fetchJsonWithCache<Record<string, unknown>>(
        `${NGUONC_BASE}/api/films/phim-moi-cap-nhat?page=${page}`
      ),
    ]);

    const c1 = r1.status === 'fulfilled' ? normalizeCatalogResponse(r1.value) : null;
    const c2 = r2.status === 'fulfilled' ? normalizeNguonCListResponse(r2.value) : null;

    if (c1 && c2) {
      res.json(mergeCatalogResponses(c1, c2));
    } else if (c1) {
      res.json(c1);
    } else if (c2) {
      res.json(c2);
    } else {
      res.status(502).json({ error: 'Không thể tải danh sách phim mới từ các nguồn dữ liệu.' });
    }
  });

  // 2. Categorized lists (phim-le, phim-bo, hoat-hinh, tv-shows, phim-chieu-rap, phim-thuyet-minh, phim-long-tieng)
  app.get('/api/movies/list/:type', async (req, res) => {
    const allowedTypes = new Set([
      'phim-le',
      'phim-bo',
      'hoat-hinh',
      'tv-shows',
      'phim-chieu-rap',
      'phim-moi-cap-nhat',
      'phim-thuyet-minh',
      'phim-long-tieng',
    ]);
    const type = allowedTypes.has(req.params.type) ? req.params.type : 'phim-le';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(36, Math.max(6, Number(req.query.limit) || 24));
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const country = typeof req.query.country === 'string' ? req.query.country.trim() : '';
    const year = typeof req.query.year === 'string' ? req.query.year.trim() : '';

    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (category) qs.set('category', category);
    if (country) qs.set('country', country);
    if (year) qs.set('year', year);

    const nguonCSupported =
      !category &&
      !country &&
      !year &&
      type !== 'phim-chieu-rap' &&
      type !== 'phim-thuyet-minh' &&
      type !== 'phim-long-tieng';
    const nguonCType = type === 'phim-moi-cap-nhat' ? 'phim-moi-cap-nhat' : type;
    const nguonCUrl =
      nguonCType === 'phim-moi-cap-nhat'
        ? `${NGUONC_BASE}/api/films/phim-moi-cap-nhat?page=${page}`
        : `${NGUONC_BASE}/api/films/danh-sach/${encodeURIComponent(nguonCType)}?page=${page}`;

    const [r1, r2] = await Promise.allSettled([
      fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/v1/api/danh-sach/${encodeURIComponent(type)}?${qs.toString()}`
      ),
      nguonCSupported
        ? fetchJsonWithCache<Record<string, unknown>>(nguonCUrl)
        : Promise.reject(new Error('skip')),
    ]);

    const c1 = r1.status === 'fulfilled' ? normalizeCatalogResponse(r1.value) : null;
    const c2 = r2.status === 'fulfilled' ? normalizeNguonCListResponse(r2.value) : null;

    if (c1 && c2) {
      res.json(mergeCatalogResponses(c1, c2));
    } else if (c1) {
      res.json(c1);
    } else if (c2) {
      res.json(c2);
    } else {
      res.status(502).json({ error: 'Không thể tải danh sách phim.' });
    }
  });

  // 2a. Dedicated Theater Releases (Phim Chiếu Rạp)
  app.get('/api/movies/chieu-rap', async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(36, Math.max(6, Number(req.query.limit) || 24));
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const country = typeof req.query.country === 'string' ? req.query.country.trim() : '';
    const year = typeof req.query.year === 'string' ? req.query.year.trim() : '';

    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (category) qs.set('category', category);
    if (country) qs.set('country', country);
    if (year) qs.set('year', year);

    try {
      const raw = await fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/v1/api/danh-sach/phim-chieu-rap?${qs.toString()}`
      );
      res.json(normalizeCatalogResponse(raw));
    } catch {
      res.status(502).json({ error: 'Không thể tải danh sách phim chiếu rạp lúc này.' });
    }
  });

  // 2b. Dedicated Vietnamese Thuyết Minh Movies (PhimAPI phim-thuyet-minh + filtered NguonC/long-tieng)
  app.get('/api/movies/thuyet-minh', async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(36, Math.max(6, Number(req.query.limit) || 24));
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const country = typeof req.query.country === 'string' ? req.query.country.trim() : '';
    const year = typeof req.query.year === 'string' ? req.query.year.trim() : '';

    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (category) qs.set('category', category);
    if (country) qs.set('country', country);
    if (year) qs.set('year', year);

    const canScanExtra = !category && !country && !year;
    const [tmRes, ltRes, nc1, nc2, nc3] = await Promise.allSettled([
      fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/v1/api/danh-sach/phim-thuyet-minh?${qs.toString()}`
      ),
      fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/v1/api/danh-sach/phim-long-tieng?${qs.toString()}`
      ),
      canScanExtra
        ? fetchJsonWithCache<Record<string, unknown>>(
            `${NGUONC_BASE}/api/films/phim-moi-cap-nhat?page=${page}`
          )
        : Promise.reject(new Error('skip')),
      canScanExtra
        ? fetchJsonWithCache<Record<string, unknown>>(
            `${NGUONC_BASE}/api/films/phim-moi-cap-nhat?page=${page + 1}`
          )
        : Promise.reject(new Error('skip')),
      canScanExtra
        ? fetchJsonWithCache<Record<string, unknown>>(
            `${NGUONC_BASE}/api/films/danh-sach/phim-bo?page=${page}`
          )
        : Promise.reject(new Error('skip')),
    ]);

    const primary = tmRes.status === 'fulfilled' ? normalizeCatalogResponse(tmRes.value) : null;
    if (primary) {
      primary.items = primary.items.map((item) => ({
        ...item,
        lang: hasVietnameseNarration(item)
          ? item.lang
          : item.lang
          ? `${item.lang} + Thuyết Minh`
          : 'Thuyết Minh',
      }));
    }

    const extraItems = [];
    if (ltRes.status === 'fulfilled') {
      const ltCat = normalizeCatalogResponse(ltRes.value);
      extraItems.push(...ltCat.items.filter((item) => hasVietnameseNarration(item)));
    }
    for (const nc of [nc1, nc2, nc3]) {
      if (nc.status === 'fulfilled') {
        const ncCat = normalizeNguonCListResponse(nc.value);
        extraItems.push(...ncCat.items.filter((item) => hasVietnameseNarration(item)));
      }
    }

    if (primary) {
      const merged =
        extraItems.length > 0
          ? mergeCatalogResponses(primary, {
              items: extraItems,
              pagination: {
                currentPage: page,
                totalPages: primary.pagination.totalPages,
                totalItems: extraItems.length,
                totalItemsPerPage: extraItems.length,
              },
            })
          : primary;
      res.json(merged);
    } else if (extraItems.length > 0) {
      res.json({
        items: extraItems.slice(0, limit),
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalItems: extraItems.length,
          totalItemsPerPage: limit,
        },
        titlePage: 'Phim Thuyết Minh',
      });
    } else {
      res.status(502).json({ error: 'Không thể tải danh sách phim thuyết minh lúc này.' });
    }
  });

  // 3. Genre list
  app.get('/api/movies/genres', async (_req, res) => {
    try {
      const raw = await fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/v1/api/the-loai`,
        30 * 60 * 1000
      );
      const dataObj = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, unknown>;
      const rawItems = Array.isArray(dataObj.items)
        ? dataObj.items
        : Array.isArray(raw)
        ? raw
        : [];
      const genres: GenreItem[] = rawItems
        .filter((g): g is Record<string, unknown> => Boolean(g && typeof g === 'object'))
        .map((g) => ({
          id: String(g._id ?? g.id ?? g.slug ?? ''),
          name: String(g.name ?? ''),
          slug: String(g.slug ?? ''),
        }))
        .filter((g) => Boolean(g.name && g.slug));
      res.json({ items: genres });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch genres';
      res.status(502).json({ error: message });
    }
  });

  async function fetchMergedGenreCatalog(
    rawSlug: string,
    page: number,
    limit: number,
    country: string
  ): Promise<CatalogResponse | null> {
    const slug = rawSlug.replace(/[^a-z0-9-]/gi, '');
    if (!slug) return null;

    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (country) qs.set('country', country);

    const phimApiSlug = mapPhimApiGenreSlug(slug);
    const nguonCSlug = mapNguonCGenreSlug(slug);
    const [r1, r2] = await Promise.allSettled([
      fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/v1/api/the-loai/${encodeURIComponent(phimApiSlug)}?${qs.toString()}`
      ),
      !country
        ? fetchJsonWithCache<Record<string, unknown>>(
            `${NGUONC_BASE}/api/films/the-loai/${encodeURIComponent(nguonCSlug)}?page=${page}`
          )
        : Promise.reject(new Error('skip')),
    ]);

    const c1 = r1.status === 'fulfilled' ? normalizeCatalogResponse(r1.value) : null;
    const c2 = r2.status === 'fulfilled' ? normalizeNguonCListResponse(r2.value) : null;

    if (c1 && c2) return mergeCatalogResponses(c1, c2);
    if (c1) return c1;
    if (c2) return c2;
    return null;
  }

  // 4. Movies by genre (supports optional country filter + NguonC aggregation)
  app.get('/api/movies/genre/:slug', async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(36, Math.max(6, Number(req.query.limit) || 24));
    const country = typeof req.query.country === 'string' ? req.query.country.trim() : '';

    const catalog = await fetchMergedGenreCatalog(req.params.slug, page, limit, country);
    if (catalog) {
      res.json(catalog);
    } else {
      res.status(502).json({ error: 'Không thể tải phim theo thể loại.' });
    }
  });

  // 4a. Batched Genre Showcase Shelves (returns movies cleanly separated by genre)
  app.get('/api/movies/genre-shelves', async (req, res) => {
    const rawGenres = typeof req.query.genres === 'string' ? req.query.genres : '';
    const requestedSlugs = rawGenres
      .split(',')
      .map((s) => s.replace(/[^a-z0-9-]/gi, '').trim())
      .filter(Boolean)
      .slice(0, 12);
    const slugs =
      requestedSlugs.length > 0
        ? requestedSlugs
        : CORE_GENRE_SHELF_DEFS.map((def) => def.slug);
    const limit = Math.min(12, Math.max(4, Number(req.query.limit) || 6));
    const rawExclude = typeof req.query.exclude === 'string' ? req.query.exclude : '';
    const excludeSlugs = rawExclude
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const defs = slugs.map((slug) => {
      const known = ALL_GENRE_SHELF_DEFS.find((d) => d.slug === slug);
      return known ?? findGenreShelfDefinition(slug);
    });

    const settled = await Promise.allSettled(
      defs.map((def) => fetchMergedGenreCatalog(def.slug, 1, Math.max(12, limit * 2), ''))
    );

    const entries = defs.map((def, idx) => {
      const result = settled[idx];
      return {
        def,
        catalog: result && result.status === 'fulfilled' ? result.value : null,
      };
    });

    const shelves = assembleGenreShelves(entries, limit, excludeSlugs);
    if (shelves.length === 0) {
      res.status(502).json({ error: 'Không thể tải danh sách phim theo từng thể loại.' });
      return;
    }
    res.json({ shelves });
  });

  // 4b. Country list
  app.get('/api/movies/countries', async (_req, res) => {
    try {
      const raw = await fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/v1/api/quoc-gia`,
        30 * 60 * 1000
      );
      const dataObj = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, unknown>;
      const rawItems = Array.isArray(dataObj.items)
        ? dataObj.items
        : Array.isArray(raw)
        ? raw
        : [];
      const countries: GenreItem[] = rawItems
        .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
        .map((c) => ({
          id: String(c._id ?? c.id ?? c.slug ?? ''),
          name: String(c.name ?? ''),
          slug: String(c.slug ?? ''),
        }))
        .filter((c) => c.name && c.slug);
      res.json({ items: countries });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch countries';
      res.status(502).json({ error: message });
    }
  });

  // 4c. Movies by country (supports optional category/genre filter + NguonC aggregation)
  app.get('/api/movies/country/:slug', async (req, res) => {
    const slug = req.params.slug.replace(/[^a-z0-9-]/gi, '');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(36, Math.max(6, Number(req.query.limit) || 24));
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (category) qs.set('category', category);

    const nguonCSlug = mapNguonCCountrySlug(slug);
    const [r1, r2] = await Promise.allSettled([
      fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/v1/api/quoc-gia/${encodeURIComponent(slug)}?${qs.toString()}`
      ),
      !category
        ? fetchJsonWithCache<Record<string, unknown>>(
            `${NGUONC_BASE}/api/films/quoc-gia/${encodeURIComponent(nguonCSlug)}?page=${page}`
          )
        : Promise.reject(new Error('skip')),
    ]);

    const c1 = r1.status === 'fulfilled' ? normalizeCatalogResponse(r1.value) : null;
    const c2 = r2.status === 'fulfilled' ? normalizeNguonCListResponse(r2.value) : null;

    if (c1 && c2) {
      res.json(mergeCatalogResponses(c1, c2));
    } else if (c1) {
      res.json(c1);
    } else if (c2) {
      res.json(c2);
    } else {
      res.status(502).json({ error: 'Không thể tải phim theo quốc gia.' });
    }
  });

  // 5. Search movies (PhimAPI + NguonC combined)
  app.get('/api/movies/search', async (req, res) => {
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(36, Math.max(6, Number(req.query.limit) || 24));
    if (!keyword) {
      res.json({
        items: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, totalItemsPerPage: limit },
      });
      return;
    }

    const [r1, r2] = await Promise.allSettled([
      fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`
      ),
      fetchJsonWithCache<Record<string, unknown>>(
        `${NGUONC_BASE}/api/films/search?keyword=${encodeURIComponent(keyword)}&page=${page}`
      ),
    ]);

    const c1 = r1.status === 'fulfilled' ? normalizeCatalogResponse(r1.value) : null;
    const c2 = r2.status === 'fulfilled' ? normalizeNguonCListResponse(r2.value) : null;

    if (c1 && c2) {
      res.json(mergeCatalogResponses(c1, c2));
    } else if (c1) {
      res.json(c1);
    } else if (c2) {
      res.json(c2);
    } else {
      res.status(502).json({ error: 'Không thể tìm kiếm phim lúc này.' });
    }
  });

  // 6. Movie details & episodes (PhimAPI + NguonC fallback & server merge)
  app.get('/api/movies/detail/:slug', async (req, res) => {
    const slug = req.params.slug.replace(/[^a-z0-9-]/gi, '');
    if (!slug) {
      res.status(400).json({ error: 'Invalid movie slug' });
      return;
    }

    const [r1, r2] = await Promise.allSettled([
      fetchJsonWithCache<Record<string, unknown>>(
        `${PHIMAPI_BASE}/phim/${encodeURIComponent(slug)}`
      ),
      fetchJsonWithCache<Record<string, unknown>>(
        `${NGUONC_BASE}/api/film/${encodeURIComponent(slug)}`
      ),
    ]);

    let d1 = r1.status === 'fulfilled' ? normalizeMovieDetail(r1.value) : null;
    const d2 = r2.status === 'fulfilled' ? normalizeNguonCMovieDetail(r2.value) : null;

    if (!d1 && d2 && d2.name) {
      try {
        const searchRaw = await fetchJsonWithCache<Record<string, unknown>>(
          `${PHIMAPI_BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(d2.name)}&page=1&limit=6`
        );
        const searchCatalog = normalizeCatalogResponse(searchRaw);
        const match = searchCatalog.items.find(
          (item) =>
            item.name.trim().toLowerCase() === d2.name.trim().toLowerCase() ||
            (d2.originName &&
              item.originName.trim().toLowerCase() === d2.originName.trim().toLowerCase())
        );
        if (match && match.slug !== slug) {
          const altRaw = await fetchJsonWithCache<Record<string, unknown>>(
            `${PHIMAPI_BASE}/phim/${encodeURIComponent(match.slug)}`
          );
          d1 = normalizeMovieDetail(altRaw);
        }
      } catch {
        // Keep NguonC-only detail cleanly if cross-source search finds nothing
      }
    }

    const merged = mergeMovieDetails(d1, d2);

    if (!merged) {
      res.status(404).json({ error: 'Không tìm thấy phim này.' });
      return;
    }
    if (hasVietnameseNarration(merged) && !hasVietnameseNarration({ lang: merged.lang })) {
      merged.lang = merged.lang ? `${merged.lang} + Thuyết Minh` : 'Thuyết Minh';
    }
    res.json({ movie: merged });
  });

  // 7. Cross-platform User Data Sync (server-backed profile store by personal syncKey)
  app.get('/api/sync/:syncKey', (req, res) => {
    const syncKey = sanitizeSyncKey(req.params.syncKey);
    if (!syncKey || syncKey.length < 4) {
      res.status(400).json({ error: 'Mã đồng bộ không hợp lệ (tối thiểu 4 ký tự).' });
      return;
    }
    const store = readSyncStore();
    const profile = store[syncKey];
    if (!profile) {
      res.status(404).json({ error: 'Chưa có dữ liệu đồng bộ cho mã này.' });
      return;
    }
    res.json({ profile: normalizeUserState(profile) });
  });

  app.put('/api/sync/:syncKey', (req, res) => {
    const syncKey = sanitizeSyncKey(req.params.syncKey);
    if (!syncKey || syncKey.length < 4) {
      res.status(400).json({ error: 'Mã đồng bộ không hợp lệ (tối thiểu 4 ký tự).' });
      return;
    }
    const incoming = normalizeUserState({
      ...(req.body as Partial<UserDataState>),
      syncKey,
    });
    const store = readSyncStore();
    const existing = store[syncKey] ? normalizeUserState(store[syncKey]) : null;
    const merged = existing ? mergeUserStates(existing, incoming) : incoming;
    merged.syncKey = syncKey;
    store[syncKey] = merged;
    writeSyncStore(store);
    res.json({ profile: merged, syncedAt: Date.now() });
  });

  // 8. HLS Stream Probe & Proxy (prevents CORS errors in browser when upstream supports streaming)
  app.get('/api/stream/probe', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl || (!rawUrl.startsWith('https://') && !rawUrl.startsWith('http://'))) {
      res.json({ playable: false, status: 400 });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const upstream = await fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://player.phimapi.com/',
        },
      });
      const contentType = upstream.headers.get('content-type') || '';
      const text = upstream.ok ? await upstream.text() : '';
      const isM3u8 = upstream.ok && (text.includes('#EXTM3U') || contentType.includes('mpegurl'));
      res.json({ playable: isM3u8, status: upstream.status });
    } catch {
      res.json({ playable: false, status: 502 });
    } finally {
      clearTimeout(timeout);
    }
  });

  app.get('/api/stream/hls', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl || (!rawUrl.startsWith('https://') && !rawUrl.startsWith('http://'))) {
      res.status(400).send('Invalid stream URL');
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const upstream = await fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://player.phimapi.com/',
        },
      });
      if (!upstream.ok) {
        res.status(upstream.status).send('Upstream stream unavailable');
        return;
      }
      const contentType = upstream.headers.get('content-type') || '';
      if (rawUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
        const body = await upstream.text();
        const baseUrl = new URL(rawUrl);
        const rewritten = body
          .split('\n')
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
              return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
                const abs = new URL(uri, baseUrl).toString();
                return `URI="/api/stream/hls?url=${encodeURIComponent(abs)}"`;
              });
            }
            const abs = new URL(trimmed, baseUrl).toString();
            return `/api/stream/hls?url=${encodeURIComponent(abs)}`;
          })
          .join('\n');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(rewritten);
      } else {
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.setHeader('Content-Type', contentType || 'video/mp2t');
        res.send(buf);
      }
    } catch {
      res.status(502).send('Stream proxy error');
    } finally {
      clearTimeout(timeout);
    }
  });

  // Return JSON 404 for unknown API routes instead of falling through to SPA HTML
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Vite dev middleware or static production build
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      if (!fs.existsSync(indexHtmlPath)) {
        res.status(503).send('Production build not found. Run "npm run build" before starting in production mode.');
        return;
      }
      res.sendFile(indexHtmlPath);
    });
  } else {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(disableHmr ? { hmr: false, ws: false } : { hmr: { server: httpServer } }),
      },
      plugins: [
        {
          name: 'safe-vite-client-hmr',
          enforce: 'post',
          transform(code, id) {
            const cleanId = id.split('?')[0];
            if (!cleanId.endsWith('/client.mjs') && !cleanId.endsWith('\\client.mjs')) {
              return null;
            }
            if (disableHmr) {
              return code
                .replace(
                  'transport.connect(createHMRHandler(handleMessage));',
                  '/* HMR disabled via DISABLE_HMR=true */'
                )
                .replace(
                  'setupForwardConsoleHandler(transport, forwardConsole);',
                  '/* forwardConsole disabled with HMR */'
                );
            }
            return code.replace(
              'transport.connect(createHMRHandler(handleMessage));',
              'transport.connect(createHMRHandler(handleMessage)).catch(() => {});'
            );
          },
        },
      ],
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`CineVault server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CineVault server:', err);
  process.exit(1);
});
