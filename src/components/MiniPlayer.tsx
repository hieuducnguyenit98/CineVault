import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  GripHorizontal,
  Maximize2,
  Pause,
  PictureInPicture,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { EpisodeItem, PipPlayerSession, WatchHistoryEntry } from '../types/movie';
import { formatDurationSeconds } from '../utils/movieNormalizer';
import { clampSeekTime } from '../utils/playerShortcuts';
import { getNextEpisodeInfo } from '../utils/recommendationEngine';

interface MiniPlayerProps {
  session: PipPlayerSession;
  onExpand: (slug: string, episodeSlug?: string) => void;
  onClose: () => void;
  onProgressSave: (entry: Omit<WatchHistoryEntry, 'watchedAt'>) => void;
}

export function MiniPlayer({ session, onExpand, onClose, onProgressSave }: MiniPlayerProps) {
  const { movie } = session;
  const [currentEpisodeSlug, setCurrentEpisodeSlug] = useState<string>(session.episodeSlug);
  const [serverIdx, setServerIdx] = useState<number>(session.serverIdx ?? 0);
  const [playerMode, setPlayerMode] = useState<'hls' | 'embed' | 'trailer'>(session.playerMode);
  const [currentTime, setCurrentTime] = useState<number>(session.currentTime || 0);
  const [duration, setDuration] = useState<number>(session.duration || 0);
  const [isPlaying, setIsPlaying] = useState<boolean>(session.isPlaying ?? true);
  const [isMuted, setIsMuted] = useState<boolean>(session.isMuted ?? false);
  const [isNativePip, setIsNativePip] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Position state for optional dragging
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedAtRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(session.currentTime || 0);
  const durationRef = useRef<number>(session.duration || 0);

  const activeServer = movie.servers[serverIdx] ?? movie.servers[0];
  const activeEpisode: EpisodeItem | undefined = useMemo(() => {
    if (!activeServer) return undefined;
    return (
      activeServer.episodes.find((ep) => ep.slug === currentEpisodeSlug) ??
      activeServer.episodes[0]
    );
  }, [activeServer, currentEpisodeSlug]);

  const nextEpisodeInfo = useMemo(() => {
    if (!activeServer || !activeEpisode) {
      return { nextEpisode: null, isLastEpisode: true };
    }
    return getNextEpisodeInfo(
      activeServer.episodes,
      activeEpisode.slug,
      [activeEpisode.slug]
    );
  }, [activeServer, activeEpisode]);

  const saveProgress = useCallback(
    (progressSec: number, durationSec: number) => {
      if (!activeEpisode || !activeServer) return;
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
        watchedEpisodes: [activeEpisode.slug],
        nextEpisodeSlug: nextEpisodeInfo.nextEpisode?.slug,
        nextEpisodeName: nextEpisodeInfo.nextEpisode?.name,
        episodeTotal: activeServer.episodes.length,
        progressSeconds: Math.max(0, Math.floor(progressSec)),
        durationSeconds: Math.max(0, Math.floor(durationSec)),
        categories: movie.categories,
        countries: movie.countries,
      });
    },
    [activeEpisode, activeServer, movie, nextEpisodeInfo.nextEpisode, onProgressSave]
  );

  // HLS stream loader inside MiniPlayer
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || playerMode !== 'hls' || !activeEpisode?.linkM3u8) {
      return;
    }

    let hls: Hls | null = null;
    const proxiedUrl = `/api/stream/hls?url=${encodeURIComponent(activeEpisode.linkM3u8)}`;

    const resumePlayback = () => {
      if (session.currentTime > 2 && videoEl.duration > session.currentTime) {
        videoEl.currentTime = session.currentTime;
      }
      videoEl.muted = isMuted;
      videoEl.playbackRate = session.playbackRate || 1;
      videoEl.play().catch(() => {
        // Autoplay policy may require user interaction or mute
        videoEl.muted = true;
        setIsMuted(true);
        videoEl.play().catch(() => {});
      });
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hls.loadSource(proxiedUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        resumePlayback();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (activeEpisode.linkEmbed) {
            setPlayerMode('embed');
          }
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = proxiedUrl;
      videoEl.addEventListener('loadedmetadata', resumePlayback, { once: true });
    } else if (activeEpisode.linkEmbed) {
      setPlayerMode('embed');
    }

    const onEnterPip = () => setIsNativePip(true);
    const onLeavePip = () => setIsNativePip(false);
    videoEl.addEventListener('enterpictureinpicture', onEnterPip);
    videoEl.addEventListener('leavepictureinpicture', onLeavePip);

    return () => {
      if (hls) {
        hls.destroy();
      }
      videoEl.removeEventListener('enterpictureinpicture', onEnterPip);
      videoEl.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, [activeEpisode?.linkEmbed, activeEpisode?.linkM3u8, playerMode, session.currentTime, session.playbackRate]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow drag from header or grip
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position ? position.x : rect.left,
      startY: position ? position.y : rect.top,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const nextX = Math.max(12, Math.min(window.innerWidth - 340, dragStartRef.current.startX + dx));
      const nextY = Math.max(12, Math.min(window.innerHeight - 240, dragStartRef.current.startY + dy));
      setPosition({ x: nextX, y: nextY });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const cur = video.currentTime;
    const dur = Number.isFinite(video.duration) ? video.duration : 0;
    setCurrentTime(cur);
    setDuration(dur);
    currentTimeRef.current = cur;
    durationRef.current = dur;

    const now = Date.now();
    if (now - lastSavedAtRef.current >= 3000) {
      lastSavedAtRef.current = now;
      saveProgress(cur, dur);
    }
  };

  const handlePlayToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleSeek = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = clampSeekTime(video.currentTime, delta, video.duration);
    video.currentTime = next;
    setCurrentTime(next);
  };

  const handleNativePipToggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
        await video.requestPictureInPicture();
      }
    } catch {
      // Ignore PiP errors gracefully
    }
  };

  const handleExpandClick = () => {
    saveProgress(currentTimeRef.current, durationRef.current);
    onExpand(movie.slug, currentEpisodeSlug);
  };

  const handleCloseClick = () => {
    saveProgress(currentTimeRef.current, durationRef.current);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onClose();
  };

  const handleNextEpisode = () => {
    if (!nextEpisodeInfo.nextEpisode) return;
    setCurrentEpisodeSlug(nextEpisodeInfo.nextEpisode.slug);
    setCurrentTime(0);
  };

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

  const stylePosition = position
    ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
    : undefined;

  return (
    <div
      ref={containerRef}
      style={stylePosition}
      data-testid="mini-player"
      aria-label="Cửa sổ xem phim thu nhỏ (PiP)"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed z-50 w-[320px] sm:w-[380px] rounded-2xl border border-zinc-800/90 dark:border-[#D4AF37]/40 bg-[#09090B] text-zinc-100 shadow-2xl shadow-black/90 ring-1 ring-black/50 overflow-hidden backdrop-blur-xl transition-shadow ${
        position ? '' : 'bottom-4 right-4 sm:bottom-6 sm:right-6'
      } ${isDragging ? 'cursor-grabbing opacity-90' : ''}`}
    >
      {/* Mini Player Header Bar (Draggable) */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#121217] px-3 py-2 select-none cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]" />
            </span>
            <span className="truncate text-xs font-semibold text-zinc-100" title={movie.name}>
              {movie.name}
            </span>
            {activeEpisode && (
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.2 font-mono text-[10px] text-[#F0D075]">
                {activeEpisode.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Native Browser PiP Button (HLS mode) */}
          {playerMode === 'hls' && typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
            <button
              type="button"
              onClick={handleNativePipToggle}
              title={isNativePip ? 'Thoát PiP ngoài' : 'Bật PiP ngoài trình duyệt'}
              aria-label="Picture in Picture ngoài trình duyệt"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <PictureInPicture className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Expand to Full Theater Button */}
          <button
            type="button"
            onClick={handleExpandClick}
            title="Mở rộng xem rạp chiếu đầy đủ"
            aria-label="Mở rộng trình phát"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#F0D075] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>

          {/* Close Mini Player Button */}
          <button
            type="button"
            onClick={handleCloseClick}
            title="Đóng trình phát thu nhỏ"
            aria-label="Đóng PiP"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mini Video Player Screen (16:9 Aspect Ratio) */}
      <div className="relative aspect-video w-full bg-black overflow-hidden group">
        {playerMode === 'trailer' && trailerEmbed ? (
          <iframe
            src={trailerEmbed}
            title={`${movie.name} - Trailer`}
            allow="autoplay; fullscreen; picture-in-picture"
            className="h-full w-full border-0"
          />
        ) : activeEpisode ? (
          playerMode === 'hls' && activeEpisode.linkM3u8 ? (
            <video
              ref={videoRef}
              playsInline
              poster={movie.thumbUrl || movie.posterUrl}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                saveProgress(currentTimeRef.current, durationRef.current);
              }}
              onVolumeChange={() => {
                if (videoRef.current) {
                  setIsMuted(videoRef.current.muted || videoRef.current.volume === 0);
                }
              }}
              className="h-full w-full object-contain cursor-pointer"
              onClick={handlePlayToggle}
            />
          ) : activeEpisode.linkEmbed ? (
            <iframe
              src={activeEpisode.linkEmbed}
              title={`${movie.name} - ${activeEpisode.name}`}
              allow="autoplay; fullscreen; picture-in-picture"
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-zinc-400">
              Không có nguồn phát cho tập này.
            </div>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-zinc-400">
            Chưa có tập phát.
          </div>
        )}

        {/* HLS Hover Controls Overlay */}
        {playerMode === 'hls' && (
          <div
            className={`pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/85 via-transparent to-black/40 p-2.5 transition-opacity duration-200 ${
              isHovered || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0'
            }`}
          >
            {/* Top quick chip */}
            <div className="flex items-center justify-between text-[11px] text-zinc-300">
              <span className="font-mono tabular-nums text-xs font-semibold text-white">
                {formatDurationSeconds(currentTime)} / {formatDurationSeconds(duration)}
              </span>
              {nextEpisodeInfo.nextEpisode && (
                <button
                  type="button"
                  onClick={handleNextEpisode}
                  className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-[#D4AF37] hover:text-[#09090B] transition-colors cursor-pointer"
                >
                  <span>Tập tiếp</span>
                  <SkipForward className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Middle Quick Play Action */}
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => handleSeek(-5)}
                aria-label="Tua lùi 5 giây"
                title="Tua lùi 5s"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-white/20 transition-transform active:scale-95 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handlePlayToggle}
                aria-label={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D4AF37] text-[#09090B] hover:scale-105 active:scale-95 transition-transform shadow-lg cursor-pointer"
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleSeek(5)}
                aria-label="Tua tới 5 giây"
                title="Tua tới 5s"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-white/20 transition-transform active:scale-95 cursor-pointer"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>

            {/* Bottom Progress Bar & Volume */}
            <div className="space-y-1">
              {duration > 0 && (
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="Thanh tiến trình"
                  aria-valuemin={0}
                  aria-valuemax={duration}
                  aria-valuenow={currentTime}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const pct = Math.max(0, Math.min(1, clickX / rect.width));
                    const targetTime = pct * duration;
                    if (videoRef.current) {
                      videoRef.current.currentTime = targetTime;
                      setCurrentTime(targetTime);
                    }
                  }}
                  className="group/bar relative h-1.5 w-full rounded-full bg-white/25 cursor-pointer hover:h-2 transition-all"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full bg-[#D4AF37]"
                    style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-zinc-300">
                <button
                  type="button"
                  onClick={handleMuteToggle}
                  aria-label={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
                  className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-[#F0D075]" />
                  )}
                  <span>{isMuted ? 'Đã tắt tiếng' : 'Bật tiếng'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExpandClick}
                  className="font-medium text-[#F0D075] hover:underline cursor-pointer"
                >
                  Mở toàn màn hình
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mini Player Footer Info Bar (For Embed or Trailer mode) */}
      {playerMode !== 'hls' && (
        <div className="flex items-center justify-between border-t border-white/10 bg-[#0E0E13] px-3 py-1.5 text-[11px] text-zinc-400">
          <span className="truncate">Chế độ {playerMode === 'trailer' ? 'Trailer' : 'Embed'}</span>
          <button
            type="button"
            onClick={handleExpandClick}
            className="font-medium text-[#F0D075] hover:underline cursor-pointer"
          >
            Quay lại rạp xem chi tiết
          </button>
        </div>
      )}
    </div>
  );
}
