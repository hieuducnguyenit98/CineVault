import type {
  CatalogResponse,
  EpisodeServer,
  MovieDetail,
  MovieSummary,
  TaxonomyRef,
} from '../types/movie';

const DEFAULT_CDN_BASE = 'https://phimimg.com';

export function normalizeMediaUrl(rawUrl: unknown, cdnBase = DEFAULT_CDN_BASE): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  const cleanBase = cdnBase.replace(/\/+$/, '');
  const cleanPath = trimmed.replace(/^\/+/, '');
  return `${cleanBase}/${cleanPath}`;
}

export function stripHtmlTags(rawHtml: unknown): string {
  if (typeof rawHtml !== 'string') return '';
  return rawHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatDurationSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '00:00';
  const rounded = Math.floor(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

function normalizeTaxonomyList(list: unknown): TaxonomyRef[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => ({
      id: String(entry.id ?? entry._id ?? entry.slug ?? ''),
      name: String(entry.name ?? ''),
      slug: String(entry.slug ?? ''),
    }))
    .filter((item) => item.name.length > 0 && item.slug.length > 0);
}

export function normalizeMovieSummary(raw: Record<string, unknown>, cdnBase = DEFAULT_CDN_BASE): MovieSummary {
  const tmdb = (raw.tmdb && typeof raw.tmdb === 'object' ? raw.tmdb : {}) as Record<string, unknown>;
  const imdb = (raw.imdb && typeof raw.imdb === 'object' ? raw.imdb : {}) as Record<string, unknown>;
  const modified = (raw.modified && typeof raw.modified === 'object' ? raw.modified : {}) as Record<string, unknown>;

  const tmdbScore = Number(tmdb.vote_average ?? 0);
  const imdbScore = Number(imdb.vote_average ?? 0);
  const voteAverage = tmdbScore > 0 ? tmdbScore : imdbScore;
  const voteCount = Number(tmdb.vote_count ?? imdb.vote_count ?? 0);

  return {
    id: String(raw._id ?? raw.slug ?? ''),
    name: String(raw.name ?? 'Không rõ tiêu đề'),
    originName: String(raw.origin_name ?? raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    type: String(raw.type ?? 'single'),
    posterUrl: normalizeMediaUrl(raw.poster_url, cdnBase),
    thumbUrl: normalizeMediaUrl(raw.thumb_url, cdnBase),
    year: Number(raw.year) || new Date().getFullYear(),
    quality: String(raw.quality ?? 'HD'),
    lang: String(raw.lang ?? 'Vietsub'),
    time: String(raw.time ?? ''),
    episodeCurrent: String(raw.episode_current ?? ''),
    categories: normalizeTaxonomyList(raw.category),
    countries: normalizeTaxonomyList(raw.country),
    rating: {
      voteAverage: Number.isFinite(voteAverage) ? Number(voteAverage.toFixed(1)) : 0,
      voteCount: Number.isFinite(voteCount) ? voteCount : 0,
    },
    modifiedAt: String(modified.time ?? ''),
  };
}

export function normalizeCatalogResponse(payload: Record<string, unknown>): CatalogResponse {
  // v1 API wraps items in payload.data; v3 returns items directly at root
  const dataObj = (payload.data && typeof payload.data === 'object'
    ? payload.data
    : payload) as Record<string, unknown>;

  const cdnBase =
    typeof dataObj.APP_DOMAIN_CDN_IMAGE === 'string' && dataObj.APP_DOMAIN_CDN_IMAGE
      ? dataObj.APP_DOMAIN_CDN_IMAGE
      : DEFAULT_CDN_BASE;

  const rawItems = Array.isArray(dataObj.items) ? dataObj.items : [];
  const items = rawItems
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => normalizeMovieSummary(entry, cdnBase))
    .filter((m) => m.slug.length > 0);

  const params = (dataObj.params && typeof dataObj.params === 'object'
    ? dataObj.params
    : {}) as Record<string, unknown>;
  const rawPagination = (params.pagination ?? dataObj.pagination ?? {}) as Record<string, unknown>;

  const totalItems = Number(rawPagination.totalItems ?? items.length) || items.length;
  const totalItemsPerPage = Number(rawPagination.totalItemsPerPage ?? 24) || 24;
  const currentPage = Number(rawPagination.currentPage ?? 1) || 1;
  const totalPages =
    Number(rawPagination.totalPages) ||
    Math.max(1, Math.ceil(totalItems / Math.max(1, totalItemsPerPage)));

  return {
    items,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      totalItemsPerPage,
    },
    titlePage: typeof dataObj.titlePage === 'string' ? dataObj.titlePage : undefined,
  };
}

export function normalizeMovieDetail(payload: Record<string, unknown>): MovieDetail | null {
  const movieRaw = (payload.movie && typeof payload.movie === 'object'
    ? payload.movie
    : null) as Record<string, unknown> | null;

  if (!movieRaw) return null;

  const base = normalizeMovieSummary(movieRaw, DEFAULT_CDN_BASE);
  const rawEpisodes = Array.isArray(payload.episodes) ? payload.episodes : [];

  const servers: EpisodeServer[] = rawEpisodes
    .filter((srv): srv is Record<string, unknown> => Boolean(srv && typeof srv === 'object'))
    .map((srv) => {
      const serverData = Array.isArray(srv.server_data) ? srv.server_data : [];
      return {
        serverName: String(srv.server_name ?? 'Server #1'),
        episodes: serverData
          .filter((ep): ep is Record<string, unknown> => Boolean(ep && typeof ep === 'object'))
          .map((ep) => ({
            name: String(ep.name ?? 'Full'),
            slug: String(ep.slug ?? 'full'),
            filename: String(ep.filename ?? ''),
            linkEmbed: String(ep.link_embed ?? ''),
            linkM3u8: String(ep.link_m3u8 ?? ''),
          }))
          .filter((ep) => ep.linkEmbed.length > 0 || ep.linkM3u8.length > 0),
      };
    })
    .filter((srv) => srv.episodes.length > 0);

  const actors = Array.isArray(movieRaw.actor)
    ? movieRaw.actor.map(String).filter((s) => s.trim().length > 0 && s.trim() !== 'Đang cập nhật')
    : [];
  const directors = Array.isArray(movieRaw.director)
    ? movieRaw.director.map(String).filter((s) => s.trim().length > 0 && s.trim() !== 'Đang cập nhật')
    : [];

  return {
    ...base,
    content: stripHtmlTags(movieRaw.content) || 'Nội dung đang được cập nhật.',
    status: String(movieRaw.status ?? 'ongoing'),
    episodeTotal: Number(movieRaw.episode_total) || servers[0]?.episodes.length || 1,
    actors,
    directors,
    trailerUrl: typeof movieRaw.trailer_url === 'string' && movieRaw.trailer_url ? movieRaw.trailer_url : null,
    servers,
  };
}

function slugifyVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractNguonCTaxonomy(
  categoryObj: unknown
): { categories: TaxonomyRef[]; countries: TaxonomyRef[]; inferredType: string } {
  const categories: TaxonomyRef[] = [];
  const countries: TaxonomyRef[] = [];
  let inferredType = 'single';

  if (!categoryObj || typeof categoryObj !== 'object') {
    return { categories, countries, inferredType };
  }

  for (const groupEntry of Object.values(categoryObj as Record<string, unknown>)) {
    if (!groupEntry || typeof groupEntry !== 'object') continue;
    const grp = groupEntry as Record<string, unknown>;
    const groupInfo = (grp.group && typeof grp.group === 'object' ? grp.group : {}) as Record<string, unknown>;
    const groupName = String(groupInfo.name ?? '').toLowerCase();
    const list = Array.isArray(grp.list) ? grp.list : [];

    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const name = String(rec.name ?? '').trim();
      if (!name) continue;
      const slug = String(rec.slug ?? '') || slugifyVietnamese(name);
      const id = String(rec.id ?? slug);

      if (groupName.includes('quốc gia') || groupName.includes('quoc gia')) {
        countries.push({ id, name, slug: slug === 'my' ? 'au-my' : slug });
      } else if (groupName.includes('thể loại') || groupName.includes('the loai')) {
        const canonicalGenreSlug =
          slug === 'hai' || slug === 'phim-hai'
            ? 'hai-huoc'
            : slug === 'khoa-hoc-vien-tuong'
            ? 'vien-tuong'
            : slug === 'lang-man'
            ? 'tinh-cam'
            : slug;
        categories.push({ id, name, slug: canonicalGenreSlug });
      } else if (groupName.includes('định dạng') || groupName.includes('dinh dang')) {
        if (name.toLowerCase().includes('bộ')) inferredType = 'series';
        else if (name.toLowerCase().includes('hoạt hình')) inferredType = 'hoathinh';
        else if (name.toLowerCase().includes('tv')) inferredType = 'tvshows';
      }
    }
  }

  return { categories, countries, inferredType };
}

export function normalizeNguonCMovieSummary(
  raw: Record<string, unknown>,
  fallbackCategory?: TaxonomyRef
): MovieSummary {
  // Note: On NguonC, thumb_url is portrait (2:3) and poster_url is widescreen (16:9).
  const portraitUrl = String(raw.thumb_url_webp ?? raw.thumb_url ?? raw.poster_url ?? '').trim();
  const backdropUrl = String(raw.poster_url_webp ?? raw.poster_url ?? raw.thumb_url ?? '').trim();
  const totalEpisodes = Number(raw.total_episodes ?? 1) || 1;
  const currentEpisode = String(raw.current_episode ?? '').trim();
  const taxonomy = extractNguonCTaxonomy(raw.category);

  const categories = [...taxonomy.categories];
  if (categories.length === 0 && fallbackCategory && fallbackCategory.slug) {
    categories.push(fallbackCategory);
  }

  const inferredType =
    taxonomy.inferredType !== 'single'
      ? taxonomy.inferredType
      : totalEpisodes > 1 || currentEpisode.toLowerCase().includes('tập')
      ? 'series'
      : 'single';

  return {
    id: String(raw.id ?? raw.slug ?? ''),
    name: String(raw.name ?? 'Không rõ tiêu đề'),
    originName: String(raw.original_name ?? raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    type: inferredType,
    posterUrl: normalizeMediaUrl(portraitUrl),
    thumbUrl: normalizeMediaUrl(backdropUrl),
    year: Number(raw.year) || new Date().getFullYear(),
    quality: String(raw.quality ?? 'HD'),
    lang: String(raw.language ?? 'Vietsub'),
    time: String(raw.time ?? ''),
    episodeCurrent: currentEpisode,
    categories,
    countries: taxonomy.countries,
    rating: { voteAverage: 0, voteCount: 0 },
    modifiedAt: String(raw.modified ?? ''),
  };
}

export function normalizeNguonCListResponse(payload: Record<string, unknown>): CatalogResponse {
  const catObj = (payload.cat && typeof payload.cat === 'object' ? payload.cat : null) as Record<string, unknown> | null;
  const fallbackCat: TaxonomyRef | undefined =
    catObj && typeof catObj.slug === 'string' && typeof catObj.name === 'string'
      ? { id: catObj.slug, name: catObj.name, slug: catObj.slug }
      : undefined;

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => normalizeNguonCMovieSummary(entry, fallbackCat))
    .filter((m) => m.slug.length > 0);

  const paginate = (payload.paginate && typeof payload.paginate === 'object'
    ? payload.paginate
    : {}) as Record<string, unknown>;

  const currentPage = Number(paginate.current_page ?? 1) || 1;
  const totalPages = Math.max(1, Number(paginate.total_page ?? 1) || 1);
  const totalItems = Number(paginate.total_items ?? items.length) || items.length;
  const totalItemsPerPage = Number(paginate.items_per_page ?? 10) || 10;

  return {
    items,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      totalItemsPerPage,
    },
    titlePage: typeof catObj?.title === 'string' ? catObj.title : undefined,
  };
}

export function normalizeNguonCMovieDetail(payload: Record<string, unknown>): MovieDetail | null {
  const movieRaw = (payload.movie && typeof payload.movie === 'object'
    ? payload.movie
    : null) as Record<string, unknown> | null;

  if (!movieRaw) return null;

  const base = normalizeNguonCMovieSummary(movieRaw);
  const rawEpisodes = Array.isArray(movieRaw.episodes) ? movieRaw.episodes : [];

  const servers: EpisodeServer[] = rawEpisodes
    .filter((srv): srv is Record<string, unknown> => Boolean(srv && typeof srv === 'object'))
    .map((srv) => {
      const serverItems = Array.isArray(srv.items) ? srv.items : [];
      return {
        serverName: String(srv.server_name ?? 'Server Nguồn 2'),
        episodes: serverItems
          .filter((ep): ep is Record<string, unknown> => Boolean(ep && typeof ep === 'object'))
          .map((ep) => {
            const rawName = String(ep.name ?? 'Full').trim();
            const formattedName = /^\d+$/.test(rawName) ? `Tập ${rawName}` : rawName;
            return {
              name: formattedName,
              slug: String(ep.slug ?? 'full'),
              filename: '',
              linkEmbed: String(ep.embed ?? ''),
              linkM3u8: String(ep.m3u8 ?? ''),
            };
          })
          .filter((ep) => ep.linkEmbed.length > 0 || ep.linkM3u8.length > 0),
      };
    })
    .filter((srv) => srv.episodes.length > 0);

  const castsRaw = typeof movieRaw.casts === 'string' ? movieRaw.casts : '';
  const directorRaw = typeof movieRaw.director === 'string' ? movieRaw.director : '';

  const actors = castsRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== 'Đang cập nhật');
  const directors = directorRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== 'Đang cập nhật');

  return {
    ...base,
    content: stripHtmlTags(movieRaw.description) || 'Nội dung đang được cập nhật.',
    status: base.episodeCurrent.toLowerCase().includes('full') || base.episodeCurrent.toLowerCase().includes('hoàn tất')
      ? 'completed'
      : 'ongoing',
    episodeTotal: Number(movieRaw.total_episodes) || servers[0]?.episodes.length || 1,
    actors,
    directors,
    trailerUrl: null,
    servers,
  };
}

export function mergeCatalogResponses(
  primary: CatalogResponse,
  secondary: CatalogResponse
): CatalogResponse {
  const seenSlugs = new Set<string>();
  const seenTitles = new Set<string>();
  const merged: MovieSummary[] = [];

  for (const item of [...primary.items, ...secondary.items]) {
    const titleKey = `${item.name.trim().toLowerCase()}::${item.year}`;
    if (seenSlugs.has(item.slug) || seenTitles.has(titleKey)) {
      continue;
    }
    seenSlugs.add(item.slug);
    seenTitles.add(titleKey);
    merged.push(item);
  }

  return {
    items: merged,
    pagination: {
      currentPage: primary.pagination.currentPage,
      totalPages: Math.max(primary.pagination.totalPages, secondary.pagination.totalPages),
      totalItems: primary.pagination.totalItems + secondary.pagination.totalItems,
      totalItemsPerPage: Math.max(merged.length, primary.pagination.totalItemsPerPage),
    },
    titlePage: primary.titlePage ?? secondary.titlePage,
  };
}

export function isNarratedText(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalized.includes('thuyet minh');
}

export function hasVietnameseNarration(
  movie: { lang?: string; servers?: Array<{ serverName?: string }> } | null | undefined
): boolean {
  if (!movie) return false;
  if (isNarratedText(movie.lang)) return true;
  if (Array.isArray(movie.servers)) {
    return movie.servers.some((srv) => isNarratedText(srv.serverName));
  }
  return false;
}

export function findPreferredNarrationServerIndex(servers: EpisodeServer[]): number {
  return servers.findIndex((srv) => isNarratedText(srv.serverName));
}

export function mergeMovieDetails(
  primary: MovieDetail | null,
  secondary: MovieDetail | null
): MovieDetail | null {
  if (!primary) return secondary;
  if (!secondary) return primary;

  const existingServerNames = new Set(primary.servers.map((s) => s.serverName.toLowerCase()));
  const extraServers = secondary.servers.map((srv) => ({
    ...srv,
    serverName: existingServerNames.has(srv.serverName.toLowerCase())
      ? `${srv.serverName} (Nguồn 2)`
      : srv.serverName,
  }));

  const combinedServers = [...primary.servers, ...extraServers];
  const hasServerNarration = combinedServers.some((s) => isNarratedText(s.serverName));
  let mergedLang = primary.lang || secondary.lang;
  if ((hasServerNarration || isNarratedText(secondary.lang)) && !isNarratedText(mergedLang)) {
    mergedLang = mergedLang ? `${mergedLang} + Thuyết Minh` : 'Thuyết Minh';
  }

  return {
    ...primary,
    lang: mergedLang,
    categories: primary.categories.length > 0 ? primary.categories : secondary.categories,
    countries: primary.countries.length > 0 ? primary.countries : secondary.countries,
    actors: primary.actors.length > 0 ? primary.actors : secondary.actors,
    directors: primary.directors.length > 0 ? primary.directors : secondary.directors,
    servers: combinedServers,
  };
}

