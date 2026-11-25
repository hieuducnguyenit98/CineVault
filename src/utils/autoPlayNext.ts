import type { EpisodeItem, MovieSummary } from '../types/movie';

export const AUTO_PLAY_COUNTDOWN_SECONDS = 10;
export const AUTO_PLAY_STORAGE_KEY = 'cinevault_autoplay_next_v1';

export interface AutoPlayEligibilityParams {
  movieType: string;
  episodes: EpisodeItem[];
  currentEpisodeSlug: string;
  autoPlayEnabled: boolean;
  playerMode: 'hls' | 'embed' | 'trailer';
}

export interface AutoPlayEligibilityResult {
  eligible: boolean;
  isSeries: boolean;
  nextEpisode: EpisodeItem | null;
  reason?: 'trailer' | 'not-series' | 'last-episode' | 'disabled';
}

/**
 * Determines whether a title behaves as an episodic series eligible for
 * sequential auto-play. Single films ('single') and 1-episode items return false.
 */
export function isSeriesMovie(
  movie: Pick<MovieSummary, 'type'> | null | undefined,
  totalEpisodes: number
): boolean {
  if (!movie || !Number.isFinite(totalEpisodes) || totalEpisodes <= 1) {
    return false;
  }
  const normalizedType = (movie.type || '').trim().toLowerCase();
  if (normalizedType === 'single') {
    return false;
  }
  return true;
}

/**
 * Resolves the immediate sequential next episode strictly following currentSlug.
 * Unlike getNextEpisodeInfo, this never loops backward to Episode 1 when finishing
 * the final episode of a series.
 */
export function resolveSequentialNextEpisode(
  episodes: EpisodeItem[],
  currentSlug: string
): EpisodeItem | null {
  if (!Array.isArray(episodes) || episodes.length <= 1) {
    return null;
  }
  const currentIdx = episodes.findIndex((ep) => ep.slug === currentSlug);
  if (currentIdx < 0 || currentIdx + 1 >= episodes.length) {
    return null;
  }
  return episodes[currentIdx + 1] ?? null;
}

export function canAutoPlayNextEpisode({
  movieType,
  episodes,
  currentEpisodeSlug,
  autoPlayEnabled,
  playerMode,
}: AutoPlayEligibilityParams): AutoPlayEligibilityResult {
  const isSeries = isSeriesMovie({ type: movieType }, episodes.length);
  const nextEpisode = isSeries
    ? resolveSequentialNextEpisode(episodes, currentEpisodeSlug)
    : null;

  if (playerMode === 'trailer') {
    return { eligible: false, isSeries, nextEpisode, reason: 'trailer' };
  }
  if (!isSeries) {
    return { eligible: false, isSeries: false, nextEpisode: null, reason: 'not-series' };
  }
  if (!nextEpisode) {
    return { eligible: false, isSeries: true, nextEpisode: null, reason: 'last-episode' };
  }
  if (!autoPlayEnabled) {
    return { eligible: false, isSeries: true, nextEpisode, reason: 'disabled' };
  }
  return { eligible: true, isSeries: true, nextEpisode };
}

export function computeCountdownProgress(
  remainingSeconds: number,
  totalSeconds = AUTO_PLAY_COUNTDOWN_SECONDS
): number {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return 100;
  const clampedRemaining = Math.max(0, Math.min(totalSeconds, remainingSeconds));
  const elapsed = totalSeconds - clampedRemaining;
  return Math.round((elapsed / totalSeconds) * 100);
}

/**
 * Ensures YouTube embed URLs have enablejsapi=1 so postMessage state changes
 * (including state === 0 for video ended) are emitted to the parent player.
 */
export function appendYoutubeJsApiParams(embedUrl: string, origin?: string): string {
  if (!embedUrl) return embedUrl;
  try {
    const parsed = new URL(embedUrl);
    const host = parsed.hostname.toLowerCase();
    const isYoutube =
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtube-nocookie.com' ||
      host.endsWith('.youtube-nocookie.com');
    if (!isYoutube || !parsed.pathname.includes('/embed/')) {
      return embedUrl;
    }
    parsed.searchParams.set('enablejsapi', '1');
    if (!parsed.searchParams.has('rel')) {
      parsed.searchParams.set('rel', '0');
    }
    if (origin && /^https?:\/\//i.test(origin)) {
      parsed.searchParams.set('origin', origin);
    }
    return parsed.toString();
  } catch {
    return embedUrl;
  }
}

export function isYoutubeEndedPostMessage(data: unknown, origin?: string): boolean {
  if (origin) {
    try {
      const host = new URL(origin).hostname.toLowerCase();
      const isYoutubeHost =
        host === 'youtube.com' ||
        host.endsWith('.youtube.com') ||
        host === 'youtube-nocookie.com' ||
        host.endsWith('.youtube-nocookie.com');
      if (!isYoutubeHost) return false;
    } catch {
      return false;
    }
  }

  let payload: unknown = data;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed.startsWith('{')) return false;
    try {
      payload = JSON.parse(trimmed);
    } catch {
      return false;
    }
  }

  if (!payload || typeof payload !== 'object') return false;
  const rec = payload as Record<string, unknown>;

  if (rec.event === 'onStateChange' && rec.info === 0) {
    return true;
  }

  if (rec.event === 'infoDelivery' && rec.info && typeof rec.info === 'object') {
    const info = rec.info as Record<string, unknown>;
    if (info.playerState === 0) {
      return true;
    }
  }

  return false;
}

export function loadAutoPlayPreference(defaultValue = true): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultValue;
    }
    const raw = window.localStorage.getItem(AUTO_PLAY_STORAGE_KEY);
    if (raw === '0' || raw === 'false') return false;
    if (raw === '1' || raw === 'true') return true;
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveAutoPlayPreference(enabled: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(AUTO_PLAY_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}
