import type { GenreItem, SavedMovieSnapshot, ThemeMode, UserDataState, WatchHistoryEntry } from '../types/movie';
import { normalizeMediaUrl } from './movieNormalizer.ts';

// Augment types/movie.ts cleanly via re-export if needed; GenreItem also lives here for convenience
export type { GenreItem };

const STORAGE_KEY = 'cinevault_user_state_v1';

export function generateSyncKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars[Math.floor(Math.random() * chars.length)];
    part2 += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CINE-${part1}-${part2}`;
}

export function sanitizeSyncKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);
}

export function createDefaultUserState(syncKey?: string): UserDataState {
  return {
    version: 1,
    syncKey: syncKey ? sanitizeSyncKey(syncKey) || generateSyncKey() : generateSyncKey(),
    theme: 'dark',
    preferredGenres: ['hanh-dong', 'tam-ly', 'vien-tuong'],
    watchHistory: [],
    likedMovies: [],
    dislikedSlugs: [],
    watchlist: [],
    acknowledgedNewSlugs: [],
    updatedAt: Date.now(),
  };
}

export function loadLocalUserState(): UserDataState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createDefaultUserState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createDefaultUserState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<UserDataState>;
    return normalizeUserState(parsed);
  } catch {
    return createDefaultUserState();
  }
}

export function saveLocalUserState(state: UserDataState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota issues safely
  }
}

export function normalizeUserState(raw: Partial<UserDataState> | null | undefined): UserDataState {
  const fallback = createDefaultUserState();
  if (!raw || typeof raw !== 'object') return fallback;

  const theme: ThemeMode = raw.theme === 'light' ? 'light' : 'dark';
  const syncKey = typeof raw.syncKey === 'string' && raw.syncKey.trim()
    ? sanitizeSyncKey(raw.syncKey) || fallback.syncKey
    : fallback.syncKey;

  const preferredGenres = Array.isArray(raw.preferredGenres)
    ? Array.from(new Set(raw.preferredGenres.filter((g): g is string => typeof g === 'string' && g.length > 0))).slice(0, 20)
    : fallback.preferredGenres;

  const watchHistory: WatchHistoryEntry[] = Array.isArray(raw.watchHistory)
    ? raw.watchHistory
        .filter((h): h is WatchHistoryEntry => Boolean(h && typeof h === 'object' && typeof h.slug === 'string'))
        .map((h) => ({
          ...h,
          posterUrl: normalizeMediaUrl(h.posterUrl),
          thumbUrl: normalizeMediaUrl(h.thumbUrl),
          watchedEpisodes: Array.from(
            new Set([
              ...(Array.isArray(h.watchedEpisodes) ? h.watchedEpisodes.filter((s): s is string => typeof s === 'string' && s.length > 0) : []),
              ...(typeof h.episodeSlug === 'string' && h.episodeSlug ? [h.episodeSlug] : []),
            ])
          ).slice(0, 500),
          nextEpisodeSlug: typeof h.nextEpisodeSlug === 'string' ? h.nextEpisodeSlug : undefined,
          nextEpisodeName: typeof h.nextEpisodeName === 'string' ? h.nextEpisodeName : undefined,
          episodeTotal: Number(h.episodeTotal) || undefined,
          progressSeconds: Number(h.progressSeconds) || 0,
          durationSeconds: Number(h.durationSeconds) || 0,
          watchedAt: Number(h.watchedAt) || Date.now(),
          categories: Array.isArray(h.categories) ? h.categories : [],
          countries: Array.isArray(h.countries) ? h.countries : [],
        }))
        .sort((a, b) => b.watchedAt - a.watchedAt)
        .slice(0, 120)
    : [];

  const normalizeSaved = (arr: unknown): SavedMovieSnapshot[] =>
    Array.isArray(arr)
      ? arr
          .filter((item): item is SavedMovieSnapshot => Boolean(item && typeof item === 'object' && typeof item.slug === 'string'))
          .map((item) => ({
            ...item,
            posterUrl: normalizeMediaUrl(item.posterUrl),
            thumbUrl: normalizeMediaUrl(item.thumbUrl),
            updatedAt: Number(item.updatedAt) || Date.now(),
            categories: Array.isArray(item.categories) ? item.categories : [],
            countries: Array.isArray(item.countries) ? item.countries : [],
          }))
          .slice(0, 200)
      : [];

  const dislikedSlugs = Array.isArray(raw.dislikedSlugs)
    ? Array.from(new Set(raw.dislikedSlugs.filter((s): s is string => typeof s === 'string' && s.length > 0))).slice(0, 200)
    : [];

  const acknowledgedNewSlugs = Array.isArray(raw.acknowledgedNewSlugs)
    ? Array.from(
        new Set(raw.acknowledgedNewSlugs.filter((s): s is string => typeof s === 'string' && s.length > 0))
      ).slice(-400)
    : [];

  return {
    version: 1,
    syncKey,
    theme,
    preferredGenres,
    watchHistory,
    likedMovies: normalizeSaved(raw.likedMovies),
    dislikedSlugs,
    watchlist: normalizeSaved(raw.watchlist),
    acknowledgedNewSlugs,
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

/**
 * Conflict-free cross-platform merge (Last-Write-Wins per item + union of collections).
 * Ensures watching on mobile doesn't wipe out movies watched on desktop.
 */
export function mergeUserStates(local: UserDataState, remote: UserDataState): UserDataState {
  const historyMap = new Map<string, WatchHistoryEntry>();
  for (const item of [...local.watchHistory, ...remote.watchHistory]) {
    const existing = historyMap.get(item.slug);
    if (!existing) {
      historyMap.set(item.slug, item);
    } else {
      const winner = item.watchedAt >= existing.watchedAt ? item : existing;
      const unionWatched = Array.from(
        new Set([...(existing.watchedEpisodes ?? []), ...(item.watchedEpisodes ?? [])])
      ).slice(0, 500);
      historyMap.set(item.slug, {
        ...winner,
        watchedEpisodes: unionWatched,
      });
    }
  }

  const mergeSavedList = (a: SavedMovieSnapshot[], b: SavedMovieSnapshot[]) => {
    const map = new Map<string, SavedMovieSnapshot>();
    for (const item of [...a, ...b]) {
      const existing = map.get(item.slug);
      if (!existing || item.updatedAt >= existing.updatedAt) {
        map.set(item.slug, item);
      }
    }
    return Array.from(map.values()).sort((x, y) => y.updatedAt - x.updatedAt).slice(0, 200);
  };

  const newerState = remote.updatedAt > local.updatedAt ? remote : local;

  return {
    version: 1,
    syncKey: remote.syncKey || local.syncKey,
    theme: local.theme, // keep active device theme preference
    preferredGenres: Array.from(
      new Set([...newerState.preferredGenres])
    ).slice(0, 20),
    watchHistory: Array.from(historyMap.values())
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, 120),
    likedMovies: mergeSavedList(local.likedMovies, remote.likedMovies),
    dislikedSlugs: Array.from(new Set([...local.dislikedSlugs, ...remote.dislikedSlugs])).slice(0, 200),
    watchlist: mergeSavedList(local.watchlist, remote.watchlist),
    acknowledgedNewSlugs: Array.from(
      new Set([...(local.acknowledgedNewSlugs ?? []), ...(remote.acknowledgedNewSlugs ?? [])])
    ).slice(-400),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt, Date.now()),
  };
}

export function encodePortableToken(state: UserDataState): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

export function decodePortableToken(token: string): UserDataState | null {
  try {
    const cleaned = token.trim();
    if (!cleaned) return null;
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<UserDataState>;
    if (!parsed || typeof parsed !== 'object') return null;
    return normalizeUserState(parsed);
  } catch {
    return null;
  }
}
