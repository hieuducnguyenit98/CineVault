import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ExternalLink,
  Keyboard,
  Maximize2,
  Mic,
  Minimize2,
  MonitorPlay,
  Pause,
  PictureInPicture,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { EpisodeItem, MovieDetail, MovieSummary, PipPlayerSession, WatchHistoryEntry } from '../types/movie';
import {
  findPreferredNarrationServerIndex,
  formatDurationSeconds,
  hasVietnameseNarration,
  isNarratedText,
} from '../utils/movieNormalizer';
import {
  PLAYER_SHORTCUT_HINTS,
  clampSeekTime,
  clampVolume,
  isEditableEventTarget,
  parsePlayerShortcut,
} from '../utils/playerShortcuts';
import { getNextEpisodeInfo } from '../utils/recommendationEngine';
import { MovieCard } from './MovieCard';

interface TheaterViewProps {
  movie: MovieDetail;
  initialHistory?: WatchHistoryEntry;
  requestedEpisodeSlug?: string;
  preferNarration?: boolean;
  similarMovies: MovieSummary[];
  isLiked: boolean;
  isDisliked: boolean;
  isInWatchlist: boolean;
  onBack: () => void;
  onTogglePip?: (session: PipPlayerSession) => void;
  onSelectMovie: (slug: string, episodeSlug?: string) => void;
  onSelectGenre: (slug: string) => void;
  onSelectCountry: (slug: string) => void;
  onProgressSave: (entry: Omit<WatchHistoryEntry, 'watchedAt'>) => void;
  onToggleLike: () => void;
  onToggleDislike: () => void;
  onToggleWatchlist: () => void;
}

export function TheaterView({
  movie,
  initialHistory,
  requestedEpisodeSlug,
  preferNarration = false,
  similarMovies,
  isLiked,
  isDisliked,
  isInWatchlist,
  onBack,
  onTogglePip,
  onSelectMovie,
  onSelectGenre,
  onSelectCountry,
  onProgressSave,
  onToggleLike,
  onToggleDislike,
  onToggleWatchlist,
}: TheaterViewProps) {
  const getInitialServerIdx = () => {
    if (preferNarration) {
      const narratedIdx = findPreferredNarrationServerIndex(movie.servers);
      if (narratedIdx >= 0) return narratedIdx;
    }
    if (initialHistory?.serverName) {
      const histIdx = movie.servers.findIndex((s) => s.serverName === initialHistory.serverName);
      if (histIdx >= 0) return histIdx;
    }
    return 0;
  };

  const [serverIdx, setServerIdx] = useState(getInitialServerIdx);
  const [episodeSlug, setEpisodeSlug] = useState<string>(() => {
    const startIdx = getInitialServerIdx();
    return (
      requestedEpisodeSlug ||
      initialHistory?.episodeSlug ||
      movie.servers[startIdx]?.episodes[0]?.slug ||
      movie.servers[0]?.episodes[0]?.slug ||
      ''
    );
  });
  const [playerMode, setPlayerMode] = useState<'hls' | 'embed' | 'trailer'>('embed');
  const [hlsAvailable, setHlsAvailable] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [markedComplete, setMarkedComplete] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isInNativePip, setIsInNativePip] = useState<boolean>(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState<boolean>(false);
  const [osdNotice, setOsdNotice] = useState<{
    id: number;
    kind: 'play' | 'pause' | 'rewind' | 'forward' | 'mute' | 'unmute' | 'volume' | 'fullscreen' | 'next' | 'info';
    label: string;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedAtRef = useRef<number>(0);
  const osdTimerRef = useRef<number | null>(null);

  const triggerOsd = useCallback(
    (
      kind: 'play' | 'pause' | 'rewind' | 'forward' | 'mute' | 'unmute' | 'volume' | 'fullscreen' | 'next' | 'info',
      label: string
    ) => {
      if (osdTimerRef.current) {
        window.clearTimeout(osdTimerRef.current);
      }
      setOsdNotice({ id: Date.now(), kind, label });
      osdTimerRef.current = window.setTimeout(() => {
        setOsdNotice(null);
      }, 1250);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (osdTimerRef.current) {
        window.clearTimeout(osdTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const onEnterPip = () => {
      setIsInNativePip(true);
      triggerOsd('fullscreen', 'Đã bật PiP trình duyệt');
    };
    const onLeavePip = () => {
      setIsInNativePip(false);
      triggerOsd('fullscreen', 'Đã thoát PiP trình duyệt');
    };
    videoEl.addEventListener('enterpictureinpicture', onEnterPip);
    videoEl.addEventListener('leavepictureinpicture', onLeavePip);
    return () => {
      videoEl.removeEventListener('enterpictureinpicture', onEnterPip);
      videoEl.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, [triggerOsd]);

  useEffect(() => {
    const nextIdx = getInitialServerIdx();
    setServerIdx(nextIdx);

    const targetEpSlug =
      requestedEpisodeSlug ||
      initialHistory?.episodeSlug ||
      movie.servers[nextIdx]?.episodes[0]?.slug ||
      movie.servers[0]?.episodes[0]?.slug ||
      '';
    setEpisodeSlug(targetEpSlug);
    setStatusNotice(null);
    setMarkedComplete(false);
    setPlayerMode('embed');
  }, [movie.slug, requestedEpisodeSlug, preferNarration]);

  const activeServer = movie.servers[serverIdx] ?? movie.servers[0];
  const activeEpisode: EpisodeItem | undefined = useMemo(() => {
    if (!activeServer) return undefined;
    return (
      activeServer.episodes.find((ep) => ep.slug === episodeSlug) ??
      activeServer.episodes[0]
    );
  }, [activeServer, episodeSlug]);

  const watchedSet = useMemo(() => {
    const list = initialHistory?.watchedEpisodes ?? [];
    return new Set([...list, ...(activeEpisode ? [activeEpisode.slug] : [])]);
  }, [initialHistory?.watchedEpisodes, activeEpisode?.slug]);

  const nextEpisodeInfo = useMemo(() => {
    if (!activeServer || !activeEpisode) {
      return { nextEpisode: null, isLastEpisode: true, watchedCount: watchedSet.size };
    }
    return getNextEpisodeInfo(
      activeServer.episodes,
      activeEpisode.slug,
      Array.from(watchedSet)
    );
  }, [activeServer, activeEpisode, watchedSet]);

  const saveProgress = (progressSec: number, durationSec: number) => {
    if (!activeEpisode || !activeServer) return;
    const mergedWatched = Array.from(new Set([...watchedSet, activeEpisode.slug]));
    const nextInfo = getNextEpisodeInfo(
      activeServer.episodes,
      activeEpisode.slug,
      mergedWatched
    );
    onProgressSave({
      slug: movie.slug,
      name: movie.name,
      originName: movie.originName,
      posterUrl: movie.posterUrl,
      thumbUrl: movie.thumbUrl,
      year: movie.year,
      quality: movie.quality,
      episodeSlug: activeEpisode.slug,
      episodeName: activeEpisode.name,
      serverName: activeServer.serverName,
      watchedEpisodes: mergedWatched,
      nextEpisodeSlug: nextInfo.nextEpisode?.slug,
      nextEpisodeName: nextInfo.nextEpisode?.name,
      episodeTotal: activeServer.episodes.length,
      progressSeconds: Math.max(0, Math.floor(progressSec)),
      durationSeconds: Math.max(0, Math.floor(durationSec)),
      categories: movie.categories,
      countries: movie.countries,
    });
  };

  useEffect(() => {
    if (!activeEpisode) return;
    const resumeSeconds =
      initialHistory && initialHistory.episodeSlug === activeEpisode.slug
        ? initialHistory.progressSeconds
        : 0;
    const resumeDuration =
      initialHistory && initialHistory.episodeSlug === activeEpisode.slug
        ? initialHistory.durationSeconds
        : 0;
    saveProgress(resumeSeconds, resumeDuration);
    setMarkedComplete(false);
  }, [movie.slug, activeEpisode?.slug, activeServer?.serverName]);

  // Probe HLS stream via backend so CORS errors don't fire in browser
  useEffect(() => {
    let cancelled = false;
    setHlsAvailable(false);
    if (!activeEpisode?.linkM3u8) return;

    fetch(`/api/stream/probe?url=${encodeURIComponent(activeEpisode.linkM3u8)}`)
      .then((r) => r.json())
      .then((data: { playable?: boolean }) => {
        if (cancelled) return;
        if (data.playable) {
          setHlsAvailable(true);
          setPlayerMode('hls');
          setStatusNotice(null);
        } else {
          setHlsAvailable(false);
          setPlayerMode(activeEpisode.linkEmbed ? 'embed' : 'hls');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHlsAvailable(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeEpisode?.linkM3u8]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || playerMode !== 'hls' || !activeEpisode?.linkM3u8 || !hlsAvailable) {
      return;
    }

    setStatusNotice(null);
    let hls: Hls | null = null;
    const proxiedUrl = `/api/stream/hls?url=${encodeURIComponent(activeEpisode.linkM3u8)}`;

    const resumeIfMatching = () => {
      if (
        initialHistory &&
        initialHistory.episodeSlug === activeEpisode.slug &&
        initialHistory.progressSeconds > 5 &&
        videoEl.duration > initialHistory.progressSeconds + 10
      ) {
        videoEl.currentTime = initialHistory.progressSeconds;
      }
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hls.loadSource(proxiedUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        resumeIfMatching();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setStatusNotice('Đã chuyển sang trình phát Embed tương thích.');
          setPlayerMode('embed');
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = proxiedUrl;
      videoEl.addEventListener('loadedmetadata', resumeIfMatching, { once: true });
    } else {
      setPlayerMode('embed');
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [activeEpisode?.linkM3u8, playerMode, hlsAvailable]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);

    const now = Date.now();
    if (now - lastSavedAtRef.current >= 3000) {
      lastSavedAtRef.current = now;
      saveProgress(video.currentTime, Number.isFinite(video.duration) ? video.duration : 0);
    }
  };

  const handlePauseOrEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    saveProgress(video.currentTime, Number.isFinite(video.duration) ? video.duration : 0);
  };

  const handleMarkEpisodeComplete = () => {
    saveProgress(2700, 2700);
    setMarkedComplete(true);
  };

  const handleJumpNextEpisode = useCallback(() => {
    if (!nextEpisodeInfo.nextEpisode) return;
    setEpisodeSlug(nextEpisodeInfo.nextEpisode.slug);
    setStatusNotice(null);
    setMarkedComplete(false);
  }, [nextEpisodeInfo.nextEpisode]);

  const handleToggleFullscreen = useCallback(() => {
    const target = stageRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      triggerOsd('fullscreen', 'Thoát toàn màn hình');
    } else if (typeof target.requestFullscreen === 'function') {
      target.requestFullscreen().catch(() => {});
      triggerOsd('fullscreen', 'Toàn màn hình');
    }
  }, [triggerOsd]);

  const handleEnterInAppPip = useCallback(() => {
    if (!onTogglePip) return;
    const video = videoRef.current;
    const cur = video ? video.currentTime : currentTime;
    const dur = video && Number.isFinite(video.duration) ? video.duration : duration;
    const playing = video ? !video.paused : true;
    const muted = video ? video.muted : isMuted;

    saveProgress(cur, dur);
    triggerOsd('fullscreen', 'Đang thu nhỏ cửa sổ nổi (PiP)');
    onTogglePip({
      movie,
      episodeSlug,
      serverIdx,
      playerMode,
      currentTime: cur,
      duration: dur,
      isPlaying: playing,
      isMuted: muted,
      playbackRate,
    });
  }, [currentTime, duration, episodeSlug, isMuted, movie, onTogglePip, playbackRate, playerMode, saveProgress, serverIdx, triggerOsd]);

  const handleToggleNativePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        triggerOsd('fullscreen', 'Đã thoát PiP ngoài trình duyệt');
      } else if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
        await video.requestPictureInPicture();
        triggerOsd('fullscreen', 'Đã bật PiP ngoài trình duyệt');
      }
    } catch {
      triggerOsd('info', 'Trình duyệt không hỗ trợ PiP cho nguồn này');
    }
  }, [triggerOsd]);

  // Global Theater Keyboard Shortcuts (Space/K, Left/Right ±5s, J/L ±10s, M, Up/Down Volume, F, P, N, ?)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (isEditableEventTarget(target)) return;

      const action = parsePlayerShortcut(e);
      if (!action) return;

      // Preserve standard Space/Enter button activation when focus is explicitly on an unrelated UI button
      if (
        action === 'toggle_play' &&
        target &&
        target.tagName === 'BUTTON' &&
        !stageRef.current?.contains(target)
      ) {
        return;
      }

      e.preventDefault();

      if (action === 'toggle_help') {
        setShowShortcutHelp((prev) => !prev);
        return;
      }

      if (action === 'toggle_fullscreen') {
        handleToggleFullscreen();
        return;
      }

      if (action === 'toggle_pip') {
        if (onTogglePip) {
          handleEnterInAppPip();
        } else if (playerMode === 'hls' && videoRef.current) {
          handleToggleNativePip();
        }
        return;
      }

      if (action === 'next_episode') {
        if (nextEpisodeInfo.nextEpisode) {
          triggerOsd('next', `Chuyển tới ${nextEpisodeInfo.nextEpisode.name}`);
          handleJumpNextEpisode();
        } else {
          triggerOsd('info', 'Đang ở tập cuối cùng');
        }
        return;
      }

      const video = videoRef.current;
      if (playerMode !== 'hls' || !video) {
        triggerOsd('info', 'Embed: Nhấp vào khung phát để điều khiển phím tắt');
        return;
      }

      if (action === 'toggle_play') {
        if (video.paused) {
          video.play().catch(() => {});
          triggerOsd('play', 'Đang phát');
        } else {
          video.pause();
          triggerOsd('pause', 'Tạm dừng');
        }
        return;
      }

      if (action === 'seek_backward_5' || action === 'seek_backward_10') {
        const delta = action === 'seek_backward_5' ? -5 : -10;
        const nextTime = clampSeekTime(video.currentTime, delta, video.duration);
        video.currentTime = nextTime;
        setCurrentTime(nextTime);
        triggerOsd(
          'rewind',
          `Tua lùi ${Math.abs(delta)}s · ${formatDurationSeconds(nextTime)}`
        );
        return;
      }

      if (action === 'seek_forward_5' || action === 'seek_forward_10') {
        const delta = action === 'seek_forward_5' ? 5 : 10;
        const nextTime = clampSeekTime(video.currentTime, delta, video.duration);
        video.currentTime = nextTime;
        setCurrentTime(nextTime);
        triggerOsd(
          'forward',
          `Tua tới +${delta}s · ${formatDurationSeconds(nextTime)}`
        );
        return;
      }

      if (action === 'toggle_mute') {
        const nextMuted = !video.muted;
        video.muted = nextMuted;
        setIsMuted(nextMuted);
        triggerOsd(nextMuted ? 'mute' : 'unmute', nextMuted ? 'Đã tắt tiếng' : 'Đã bật tiếng');
        return;
      }

      if (action === 'volume_up' || action === 'volume_down') {
        const delta = action === 'volume_up' ? 0.1 : -0.1;
        const nextVol = clampVolume(video.muted ? 0 : video.volume, delta);
        video.muted = nextVol === 0;
        video.volume = nextVol;
        setIsMuted(video.muted);
        triggerOsd('volume', `Âm lượng ${Math.round(nextVol * 100)}%`);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleEnterInAppPip,
    handleJumpNextEpisode,
    handleToggleFullscreen,
    handleToggleNativePip,
    nextEpisodeInfo.nextEpisode,
    onTogglePip,
    playerMode,
    triggerOsd,
  ]);

  const getYoutubeEmbedUrl = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtube.com')) {
        const v = parsed.searchParams.get('v');
        if (v) return `https://www.youtube.com/embed/${v}`;
      }
      if (parsed.hostname === 'youtu.be') {
        const id = parsed.pathname.slice(1);
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    } catch {
      return null;
    }
    return null;
  };

  const trailerEmbed = getYoutubeEmbedUrl(movie.trailerUrl);
  const youtubeEmbedIdMatch = activeEpisode?.linkEmbed?.match(
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,20})/
  );
  const isYoutubeDirectPlayer = Boolean(youtubeEmbedIdMatch);
  const activeYoutubeWatchUrl = youtubeEmbedIdMatch
    ? `https://www.youtube.com/watch?v=${youtubeEmbedIdMatch[1]}`
    : movie.trailerUrl;

  const metaLine = [
    String(movie.year),
    movie.quality,
    movie.lang,
    movie.time,
    movie.episodeCurrent,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-8">
      {/* Top Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="btn-cinema-surface inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách</span>
          </button>

          {onTogglePip && (
            <button
              type="button"
              onClick={handleEnterInAppPip}
              title="Thu nhỏ video góc màn hình để duyệt phim khác (Phím P)"
              className="btn-cinema-gold inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer shadow-md"
            >
              <PictureInPicture2 className="h-4 w-4" />
              <span>Thu nhỏ PiP (P)</span>
            </button>
          )}
        </div>

        {activeEpisode && (
          <div className="flex flex-wrap items-center gap-2">
            {nextEpisodeInfo.nextEpisode && (
              <button
                type="button"
                onClick={handleJumpNextEpisode}
                className="btn-cinema-gold inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                <span>Xem tập tiếp theo ({nextEpisodeInfo.nextEpisode.name})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {hlsAvailable && (
              <button
                type="button"
                onClick={() => setPlayerMode(playerMode === 'hls' ? 'embed' : 'hls')}
                className="btn-cinema-surface inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium cursor-pointer"
              >
                <MonitorPlay className="h-4 w-4 text-[#9A7418] dark:text-[#D4AF37]" />
                <span>
                  {playerMode === 'hls' ? 'Chuyển sang Embed' : 'Chuyển sang HLS'}
                </span>
              </button>
            )}

            {isYoutubeDirectPlayer && activeYoutubeWatchUrl ? (
              <a
                href={activeYoutubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cinema-surface inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium"
              >
                <ExternalLink className="h-4 w-4 text-[#9A7418] dark:text-[#D4AF37]" />
                <span>Mở trên YouTube</span>
              </a>
            ) : (
              trailerEmbed && (
                <button
                  type="button"
                  onClick={() => setPlayerMode(playerMode === 'trailer' ? 'embed' : 'trailer')}
                  className="btn-cinema-surface inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium cursor-pointer"
                >
                  <span>{playerMode === 'trailer' ? 'Quay lại phim chính' : 'Xem Trailer'}</span>
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Video Player Theater Stage */}
      <div
        ref={stageRef}
        tabIndex={-1}
        aria-label="Khung trình phát phim"
        className="overflow-hidden rounded-2xl border border-zinc-900/12 bg-black shadow-2xl shadow-black/30 dark:border-[#D4AF37]/20 focus:outline-none"
      >
        <div className="relative">
          {playerMode === 'trailer' && trailerEmbed ? (
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={trailerEmbed}
                title={`${movie.name} - Trailer`}
                allow="autoplay; fullscreen; picture-in-picture"
                className="h-full w-full border-0"
              />
            </div>
          ) : activeEpisode ? (
            playerMode === 'hls' && hlsAvailable && activeEpisode.linkM3u8 ? (
              <div className="relative aspect-video w-full bg-black">
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  poster={movie.thumbUrl || movie.posterUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onPause={handlePauseOrEnded}
                  onEnded={handlePauseOrEnded}
                  onVolumeChange={() => {
                    if (videoRef.current) {
                      setIsMuted(videoRef.current.muted || videoRef.current.volume === 0);
                    }
                  }}
                  className="h-full w-full"
                />
              </div>
            ) : activeEpisode.linkEmbed ? (
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={activeEpisode.linkEmbed}
                  title={`${movie.name} - ${activeEpisode.name}`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  className="h-full w-full border-0"
                />
              </div>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center text-sm text-zinc-400">
                Chưa có nguồn phát khả dụng cho tập này.
              </div>
            )
          ) : (
            <div className="flex aspect-video w-full items-center justify-center text-sm text-zinc-400">
              Phim hiện chưa có tập phát trực tuyến.
            </div>
          )}

          {/* Ephemeral Keyboard Shortcut OSD Feedback Overlay */}
          {osdNotice && (
            <div
              key={osdNotice.id}
              data-testid="player-osd"
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4"
            >
              <div className="animate-osd-pop inline-flex items-center gap-2.5 rounded-xl border border-[#D4AF37]/40 bg-[#09090B]/88 px-4 py-2.5 text-sm font-semibold text-white shadow-2xl backdrop-blur-md">
                {osdNotice.kind === 'play' && <Play className="h-4 w-4 text-[#F0D075] fill-current" />}
                {osdNotice.kind === 'pause' && <Pause className="h-4 w-4 text-[#F0D075]" />}
                {osdNotice.kind === 'rewind' && <RotateCcw className="h-4 w-4 text-[#F0D075]" />}
                {osdNotice.kind === 'forward' && <RotateCw className="h-4 w-4 text-[#F0D075]" />}
                {osdNotice.kind === 'mute' && <VolumeX className="h-4 w-4 text-rose-400" />}
                {(osdNotice.kind === 'unmute' || osdNotice.kind === 'volume') && (
                  <Volume2 className="h-4 w-4 text-[#F0D075]" />
                )}
                {osdNotice.kind === 'fullscreen' && <Maximize2 className="h-4 w-4 text-[#F0D075]" />}
                {osdNotice.kind === 'next' && <SkipForward className="h-4 w-4 text-[#F0D075]" />}
                {osdNotice.kind === 'info' && <Keyboard className="h-4 w-4 text-[#F0D075]" />}
                <span className="tabular-nums">{osdNotice.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Player status / episode memory / completion bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-[#0D0D11] px-5 py-3.5 text-xs text-zinc-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-white">
              {movie.name} — {activeEpisode?.name || 'Trailer'}
            </span>
            {activeServer && activeServer.episodes.length > 1 && (
              <span className="font-mono text-[11px] text-[#F0D075] tabular-nums">
                Đã lưu {watchedSet.size}/{activeServer.episodes.length} tập
              </span>
            )}
            {statusNotice && <span className="text-amber-400">{statusNotice}</span>}
            {playerMode === 'hls' && duration > 0 && (
              <span className="font-mono tabular-nums text-zinc-400">
                {formatDurationSeconds(currentTime)} / {formatDurationSeconds(duration)}
              </span>
            )}
            {playerMode === 'hls' && isMuted && (
              <span className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] text-rose-300">
                <VolumeX className="h-3 w-3" /> Đang tắt tiếng
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {playerMode === 'hls' && hlsAvailable && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">Tốc độ:</span>
                {[1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={`rounded px-2 py-1 font-mono text-[11px] tabular-nums cursor-pointer ${
                      playbackRate === rate
                        ? 'bg-[#D4AF37] text-[#09090B] font-semibold'
                        : 'bg-white/10 text-zinc-300 hover:bg-white/20'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}

            {onTogglePip && (
              <button
                type="button"
                onClick={handleEnterInAppPip}
                title="Thu nhỏ video thành cửa sổ nổi để duyệt phim khác (Phím P)"
                aria-label="Thu nhỏ PiP"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-[#D4AF37] hover:text-[#09090B] transition-colors cursor-pointer"
              >
                <PictureInPicture2 className="h-3.5 w-3.5 text-[#F0D075]" />
                <span className="hidden sm:inline">Thu nhỏ PiP (P)</span>
              </button>
            )}

            {playerMode === 'hls' && hlsAvailable && typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled && (
              <button
                type="button"
                onClick={handleToggleNativePip}
                title={isInNativePip ? 'Thoát PiP ngoài trình duyệt' : 'Bật PiP ngoài màn hình hệ thống'}
                aria-label="Picture in Picture ngoài trình duyệt"
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isInNativePip
                    ? 'bg-[#D4AF37] text-[#09090B] font-semibold'
                    : 'bg-white/10 text-zinc-200 hover:bg-white/20'
                }`}
              >
                <PictureInPicture className="h-3.5 w-3.5" />
                <span className="hidden md:inline">PiP Ngoài</span>
              </button>
            )}

            {isYoutubeDirectPlayer && activeYoutubeWatchUrl && (
              <a
                href={activeYoutubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/20 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#F0D075]" />
                <span className="hidden sm:inline">Mở trên YouTube</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleToggleFullscreen}
              aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/20 cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShortcutHelp((prev) => !prev)}
              aria-expanded={showShortcutHelp}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                showShortcutHelp
                  ? 'bg-[#D4AF37] text-[#09090B] font-semibold'
                  : 'bg-white/10 text-zinc-200 hover:bg-white/20'
              }`}
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>Phím tắt</span>
            </button>

            {activeEpisode && (
              <button
                type="button"
                onClick={handleMarkEpisodeComplete}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  markedComplete
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/10 text-zinc-200 hover:bg-white/20'
                }`}
              >
                {markedComplete ? 'Đã lưu hoàn thành tập' : 'Đánh dấu đã xem xong'}
              </button>
            )}
          </div>
        </div>

        {/* Compact shortcut hint bar & expandable guide */}
        <div className="border-t border-white/[0.07] bg-[#08080B] px-5 py-2.5 text-[11px] text-zinc-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-300">
              <Keyboard className="h-3.5 w-3.5 text-[#D4AF37]" />
              Phím nhanh:
            </span>
            <span>
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                Space
              </kbd>{' '}
              Phát/Dừng
            </span>
            <span>
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                ←
              </kbd>{' '}
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                →
              </kbd>{' '}
              Tua ±5s
            </span>
            <span>
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                M
              </kbd>{' '}
              Tắt tiếng
            </span>
            <span>
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                F
              </kbd>{' '}
              Toàn màn hình
            </span>
            <span>
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                P
              </kbd>{' '}
              PiP
            </span>
            <span>
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                ?
              </kbd>{' '}
              Xem tất cả
            </span>
          </div>

          {showShortcutHelp && (
            <div
              data-testid="shortcut-guide-panel"
              className="mt-3 grid grid-cols-1 gap-2 border-t border-white/10 pt-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              {PLAYER_SHORTCUT_HINTS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-zinc-200">{item.label}</p>
                    <p className="text-[10px] text-zinc-400">{item.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#F0D075]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Movie Info + Episode List */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="space-y-2">
            {hasVietnameseNarration(movie) && (
              <div className="inline-flex w-fit items-center gap-1.5 rounded-md bg-[#D4AF37] px-2.5 py-1 text-[11px] font-bold text-[#09090B]">
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Có Thuyết Minh Tiếng Việt</span>
              </div>
            )}
            <p className="font-mono text-xs text-[#9A7418] dark:text-[#D4AF37] tabular-nums">
              {metaLine}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50 text-balance">
              {movie.name}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{movie.originName}</p>
          </div>

          {/* Personal Preference Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onToggleLike}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                isLiked
                  ? 'border-[#9A7418] bg-[#9A7418] text-white dark:border-[#D4AF37] dark:bg-[#D4AF37] dark:text-[#09090B]'
                  : 'border-zinc-900/15 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:bg-[#101015] dark:text-zinc-200 dark:hover:bg-white/10'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>{isLiked ? 'Đã thích (Tăng gợi ý)' : 'Thích phim này'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleWatchlist}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                isInWatchlist
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-900/15 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:bg-[#101015] dark:text-zinc-200 dark:hover:bg-white/10'
              }`}
            >
              <Bookmark className="h-4 w-4" />
              <span>{isInWatchlist ? 'Đã lưu xem sau' : 'Lưu xem sau'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleDislike}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                isDisliked
                  ? 'border-rose-600 bg-rose-600 text-white'
                  : 'border-zinc-900/15 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-white/15 dark:bg-[#101015] dark:text-zinc-400 dark:hover:bg-white/10'
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              <span>{isDisliked ? 'Đã ẩn khỏi gợi ý' : 'Không hợp gu'}</span>
            </button>
          </div>

          <div className="space-y-4 border-t border-zinc-900/10 pt-5 dark:border-white/10">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Nội dung phim
            </h2>
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
              {movie.content}
            </p>

            <dl className="grid grid-cols-1 gap-4 pt-2 text-sm sm:grid-cols-2">
              {movie.categories.length > 0 && (
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">Thể loại</dt>
                  <dd className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                    {movie.categories.map((cat, idx) => (
                      <span key={cat.slug} className="inline-flex items-center">
                        <button
                          type="button"
                          onClick={() => onSelectGenre(cat.slug)}
                          className="font-medium text-zinc-900 underline decoration-zinc-400/40 underline-offset-4 hover:text-[#9A7418] dark:text-zinc-100 dark:hover:text-[#D4AF37] cursor-pointer"
                        >
                          {cat.name}
                        </button>
                        {idx < movie.categories.length - 1 && (
                          <span className="ml-2 text-zinc-400">·</span>
                        )}
                      </span>
                    ))}
                  </dd>
                </div>
              )}

              {movie.countries.length > 0 && (
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">Quốc gia</dt>
                  <dd className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                    {movie.countries.map((c, idx) => (
                      <span key={c.slug} className="inline-flex items-center">
                        <button
                          type="button"
                          onClick={() => onSelectCountry(c.slug)}
                          className="font-medium text-zinc-900 underline decoration-zinc-400/40 underline-offset-4 hover:text-[#9A7418] dark:text-zinc-100 dark:hover:text-[#D4AF37] cursor-pointer"
                        >
                          {c.name}
                        </button>
                        {idx < movie.countries.length - 1 && (
                          <span className="ml-2 text-zinc-400">·</span>
                        )}
                      </span>
                    ))}
                  </dd>
                </div>
              )}

              {movie.directors.length > 0 && (
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">Đạo diễn</dt>
                  <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                    {movie.directors.join(', ')}
                  </dd>
                </div>
              )}

              {movie.actors.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">Diễn viên</dt>
                  <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                    {movie.actors.slice(0, 10).join(', ')}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Episode & Server Switcher with Watched Episode Memory */}
        <div className="space-y-4 rounded-2xl border border-zinc-900/10 bg-white p-5 dark:border-white/10 dark:bg-[#101015] lg:col-span-5 h-fit">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Danh sách tập ({activeServer?.episodes.length ?? 0})
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Các tập có dấu kiểm là tập bạn đã xem
              </p>
            </div>

            {movie.servers.length > 1 && (
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-white/5">
                {movie.servers.map((srv, idx) => {
                  const narratedServer = isNarratedText(srv.serverName);
                  return (
                    <button
                      key={srv.serverName}
                      type="button"
                      onClick={() => setServerIdx(idx)}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        serverIdx === idx
                          ? 'bg-white text-zinc-900 shadow-sm dark:bg-[#D4AF37] dark:text-[#09090B]'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                      }`}
                    >
                      {narratedServer && <Mic className="h-3 w-3 shrink-0" aria-hidden="true" />}
                      <span>{srv.serverName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid max-h-[340px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
            {activeServer?.episodes.map((ep) => {
              const isCurrent = ep.slug === activeEpisode?.slug;
              const isWatched = watchedSet.has(ep.slug);
              const isNext = ep.slug === nextEpisodeInfo.nextEpisode?.slug;

              return (
                <button
                  key={ep.slug}
                  type="button"
                  onClick={() => {
                    setEpisodeSlug(ep.slug);
                    setStatusNotice(null);
                  }}
                  className={`inline-flex min-h-[40px] items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium tabular-nums truncate transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#9A7418] text-white dark:bg-[#D4AF37] dark:text-[#09090B] font-semibold'
                      : isNext
                      ? 'border border-[#9A7418]/70 bg-[#9A7418]/10 text-[#9A7418] dark:border-[#D4AF37]/70 dark:bg-[#D4AF37]/10 dark:text-[#F0D075]'
                      : isWatched
                      ? 'border border-zinc-900/12 bg-zinc-100 text-zinc-600 dark:border-white/15 dark:bg-white/10 dark:text-zinc-300'
                      : 'border border-zinc-900/10 bg-zinc-50 text-zinc-800 hover:bg-zinc-200/70 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/15'
                  }`}
                >
                  {!isCurrent && isWatched && (
                    <Check className="h-3 w-3 shrink-0 text-[#9A7418] dark:text-[#D4AF37]" />
                  )}
                  <span className="truncate">{ep.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Similar Movies */}
      {similarMovies.length > 0 && (
        <section className="space-y-4 border-t border-zinc-900/10 pt-8 dark:border-white/10">
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Có thể bạn cũng muốn xem
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {similarMovies.slice(0, 6).map((item) => (
              <MovieCard key={item.slug} movie={item} onSelect={(s) => onSelectMovie(s)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
