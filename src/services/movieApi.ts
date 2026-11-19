import type {
  CatalogResponse,
  CountryItem,
  GenreItem,
  GenreShelf,
  MovieDetail,
  MovieSummary,
  UserDataState,
} from '../types/movie';

import {
  clearStoredAccessToken,
  loadStoredAccessToken,
} from '../utils/accessGate';

function getAccessHeaders(): Record<string, string> {
  const token = loadStoredAccessToken();
  return token ? { 'X-Access-Token': token } : {};
}

function handleUnauthorized(status: number, url: string): void {
  if (status === 401 && !url.startsWith('/api/access/')) {
    clearStoredAccessToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cinevault:access-revoked'));
    }
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAccessHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  handleUnauthorized(res.status, url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Lỗi máy chủ (${res.status})`);
  }
  return data as T;
}

export function verifyAccessCodeApi(code: string): Promise<{ unlocked: boolean; token: string }> {
  return requestJson<{ unlocked: boolean; token: string }>('/api/access/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function checkAccessSessionApi(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/access/session', {
      headers: {
        'X-Access-Token': token,
      },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { unlocked?: boolean };
    return Boolean(data?.unlocked);
  } catch {
    return false;
  }
}

export function fetchHeroMovies(): Promise<{ movies: MovieSummary[]; dateKey: string }> {
  return requestJson<{ movies: MovieSummary[]; dateKey: string }>('/api/movies/hero');
}

export function fetchLatestMovies(page = 1): Promise<CatalogResponse> {
  return requestJson<CatalogResponse>(`/api/movies/latest?page=${page}`);
}

export function fetchMoviesByList(
  type: 'phim-le' | 'phim-bo' | 'hoat-hinh' | 'tv-shows' | 'phim-chieu-rap',
  options: { page?: number; limit?: number; category?: string; country?: string } = {}
): Promise<CatalogResponse> {
  const qs = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 24),
  });
  if (options.category) qs.set('category', options.category);
  if (options.country) qs.set('country', options.country);
  return requestJson<CatalogResponse>(`/api/movies/list/${encodeURIComponent(type)}?${qs.toString()}`);
}

export function fetchTheaterReleaseMovies(
  options: { page?: number; limit?: number; category?: string; country?: string } = {}
): Promise<CatalogResponse> {
  const qs = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 24),
  });
  if (options.category) qs.set('category', options.category);
  if (options.country) qs.set('country', options.country);
  return requestJson<CatalogResponse>(`/api/movies/chieu-rap?${qs.toString()}`);
}

export function fetchThuyetMinhMovies(
  options: { page?: number; limit?: number; category?: string; country?: string } = {}
): Promise<CatalogResponse> {
  const qs = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 24),
  });
  if (options.category) qs.set('category', options.category);
  if (options.country) qs.set('country', options.country);
  return requestJson<CatalogResponse>(`/api/movies/thuyet-minh?${qs.toString()}`);
}

export function fetchMoviesByGenre(
  slug: string,
  page = 1,
  limit = 24,
  country = ''
): Promise<CatalogResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (country) qs.set('country', country);
  return requestJson<CatalogResponse>(
    `/api/movies/genre/${encodeURIComponent(slug)}?${qs.toString()}`
  );
}

export async function fetchGenreShelves(
  genres: string[],
  limit = 6,
  excludeSlugs: string[] = []
): Promise<GenreShelf[]> {
  const qs = new URLSearchParams({
    genres: genres.join(','),
    limit: String(limit),
  });
  if (excludeSlugs.length > 0) {
    qs.set('exclude', excludeSlugs.slice(0, 80).join(','));
  }
  const res = await requestJson<{ shelves: GenreShelf[] }>(
    `/api/movies/genre-shelves?${qs.toString()}`
  );
  return res.shelves;
}

export function fetchMoviesByCountry(
  slug: string,
  page = 1,
  limit = 24,
  category = ''
): Promise<CatalogResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (category) qs.set('category', category);
  return requestJson<CatalogResponse>(
    `/api/movies/country/${encodeURIComponent(slug)}?${qs.toString()}`
  );
}

export function searchMovies(keyword: string, page = 1, limit = 24): Promise<CatalogResponse> {
  return requestJson<CatalogResponse>(
    `/api/movies/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`
  );
}

export async function fetchGenres(): Promise<GenreItem[]> {
  const res = await requestJson<{ items: GenreItem[] }>('/api/movies/genres');
  return res.items;
}

export async function fetchCountries(): Promise<CountryItem[]> {
  const res = await requestJson<{ items: CountryItem[] }>('/api/movies/countries');
  return res.items;
}

export async function fetchMovieDetail(slug: string): Promise<MovieDetail> {
  const res = await requestJson<{ movie: MovieDetail }>(`/api/movies/detail/${encodeURIComponent(slug)}`);
  return res.movie;
}

export async function pullRemoteProfile(syncKey: string): Promise<UserDataState | null> {
  const url = `/api/sync/${encodeURIComponent(syncKey)}`;
  const res = await fetch(url, {
    headers: {
      ...getAccessHeaders(),
    },
  });
  handleUnauthorized(res.status, url);
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Không thể tải dữ liệu đồng bộ.');
  }
  return data.profile as UserDataState;
}

export async function pushAndMergeRemoteProfile(
  syncKey: string,
  localState: UserDataState
): Promise<{ profile: UserDataState; syncedAt: number }> {
  return requestJson<{ profile: UserDataState; syncedAt: number }>(
    `/api/sync/${encodeURIComponent(syncKey)}`,
    {
      method: 'PUT',
      body: JSON.stringify(localState),
    }
  );
}
