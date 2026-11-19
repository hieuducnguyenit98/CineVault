import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Mic, Pause, Play } from 'lucide-react';
import type { MovieSummary, WatchHistoryEntry } from '../types/movie';
import { hasVietnameseNarration } from '../utils/movieNormalizer';

const FALLBACK_CINEMA_IMAGE = '/src/assets/images/cinema_backdrop_fallback_1795070532379.jpg';
const AUTO_SLIDE_INTERVAL_MS = 4800;
const HERO_LIMIT = 10;

interface HeroSpotlightProps {
  movies: MovieSummary[];
  watchHistory: WatchHistoryEntry[];
  onWatch: (slug: string, episodeSlug?: string) => void;
  onToggleWatchlist: (movie: MovieSummary) => void;
  isInWatchlist: (slug: string) => boolean;
}

export function HeroSpotlight({
  movies,
  watchHistory,
  onWatch,
  onToggleWatchlist,
  isInWatchlist,
}: HeroSpotlightProps) {
  const slides = movies.slice(0, HERO_LIMIT);
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [controlsHovered, setControlsHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [failedSlugs, setFailedSlugs] = useState<Record<string, boolean>>({});
  const [loadedSlugs, setLoadedSlugs] = useState<Record<string, boolean>>({});

  const slidesCount = slides.length;
  const safeIndex = slidesCount > 0 ? index % slidesCount : 0;
  const isAutoPlaying = slidesCount > 1 && !controlsHovered && !userPaused;

  const goToSlide = (targetIdx: number) => {
    if (slidesCount <= 1) return;
    const normalized = ((targetIdx % slidesCount) + slidesCount) % slidesCount;
    if (normalized === safeIndex) return;
    setPrevIndex(safeIndex);
    setIndex(normalized);
  };

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = window.setInterval(() => {
      setPrevIndex((prev) => (prev === safeIndex ? prev : safeIndex));
      setIndex((prev) => (prev + 1) % slidesCount);
    }, AUTO_SLIDE_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [isAutoPlaying, slidesCount, safeIndex]);

  if (slidesCount === 0) return null;

  const featured = slides[safeIndex];
  const historyMatch = watchHistory.find((h) => h.slug === featured.slug);
  const isBackdropLoaded = Boolean(loadedSlugs[featured.slug] || failedSlugs[featured.slug]);

  const genresText = featured.categories.slice(0, 3).map((c) => c.name).join(' · ');
  const countriesText = featured.countries.slice(0, 2).map((c) => c.name).join(' · ');
  const metaLine = [
    String(featured.year),
    featured.quality,
    featured.lang,
    countriesText,
    featured.episodeCurrent || featured.time,
    featured.rating.voteAverage > 0 ? `TMDB ${featured.rating.voteAverage}/10` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const saved = isInWatchlist(featured.slug);

  const handlePrev = () => goToSlide(safeIndex - 1);
  const handleNext = () => goToSlide(safeIndex + 1);

  return (
    <section
      aria-label="Phim tiêu điểm hôm nay"
      data-active-slide={safeIndex}
      data-total-slides={slidesCount}
      data-active-slug={featured.slug}
      data-autoplay={isAutoPlaying ? 'running' : 'paused'}
      className="relative w-full overflow-hidden border-b border-zinc-900/12 dark:border-white/10 bg-[#070709]"
    >
      <div className="relative flex min-h-[460px] w-full items-end sm:min-h-[560px] lg:min-h-[640px]">
        {!isBackdropLoaded && (
          <div aria-hidden="true" className="skeleton-shimmer absolute inset-0 h-full w-full" />
        )}

        {/* Dual-layer overlapping cinema cross-dissolve + gentle Ken Burns motion */}
        {slides.map((item, idx) => {
          const isActive = idx === safeIndex;
          const isExiting = idx === prevIndex && idx !== safeIndex;
          const imgSrc =
            !failedSlugs[item.slug] && (item.thumbUrl || item.posterUrl)
              ? item.thumbUrl || item.posterUrl
              : FALLBACK_CINEMA_IMAGE;
          const loaded = Boolean(loadedSlugs[item.slug] || failedSlugs[item.slug]);

          return (
            <img
              key={`${item.slug}-${isActive ? 'in' : isExiting ? 'out' : 'idle'}`}
              src={imgSrc}
              alt={isActive ? item.name : ''}
              aria-hidden={!isActive}
              referrerPolicy="no-referrer"
              decoding="async"
              onLoad={() => setLoadedSlugs((prev) => ({ ...prev, [item.slug]: true }))}
              onError={() => setFailedSlugs((prev) => ({ ...prev, [item.slug]: true }))}
              className={`absolute inset-0 h-full w-full object-cover object-[center_26%] brightness-[1.03] contrast-[1.05] saturate-[1.06] ${
                isActive && loaded
                  ? 'z-[2] opacity-100 animate-hero-backdrop-in'
                  : isExiting && loaded
                  ? 'z-[1] opacity-0 animate-hero-backdrop-out pointer-events-none'
                  : 'z-0 opacity-0 pointer-events-none'
              }`}
            />
          );
        })}

        {/* Directional legibility scrims: stronger mobile bottom floor, bright right half on desktop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-[#070709] via-[#070709]/72 via-52% to-transparent to-78% sm:via-[#070709]/45 sm:via-35% sm:to-70%"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-r from-[#070709]/92 via-[#070709]/55 via-55% to-transparent to-82% sm:via-[#070709]/45 sm:via-45% sm:to-75%"
        />

        {/* Content container aligned to page max-width */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-end px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div key={featured.slug} className="animate-hero-text max-w-2xl space-y-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
                Tiêu điểm hôm nay · {String(safeIndex + 1).padStart(2, '0')}/{String(slidesCount).padStart(2, '0')}
              </span>
              {hasVietnameseNarration(featured) && (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-gradient-to-b from-[#EDD174] to-[#C8A02A] px-2.5 py-0.5 text-[11px] font-bold text-[#09090B] shadow">
                  <Mic className="h-3 w-3" aria-hidden="true" />
                  <span>Thuyết Minh</span>
                </span>
              )}
            </div>

            <p className="font-mono text-xs tracking-wide text-[#F0D075] tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
              {metaLine}
            </p>
            <h1 className="font-display text-3xl sm:text-5xl lg:text-[54px] font-bold leading-[1.16] tracking-tight text-white text-balance drop-shadow-[0_2px_18px_rgba(0,0,0,0.68)]">
              {featured.name}
            </h1>
            <p className="text-sm sm:text-base text-zinc-200/95 line-clamp-1 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
              {featured.originName}
              {genresText ? ` — ${genresText}` : ''}
            </p>

            {historyMatch && (
              <p className="text-xs font-medium text-[#F0D075]">
                Đã xem tới {historyMatch.episodeName}
                {historyMatch.nextEpisodeName ? ` · Tiếp theo: ${historyMatch.nextEpisodeName}` : ''}
              </p>
            )}

            <div
              onMouseEnter={() => setControlsHovered(true)}
              onMouseLeave={() => setControlsHovered(false)}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              <button
                type="button"
                onClick={() =>
                  onWatch(
                    featured.slug,
                    historyMatch?.nextEpisodeSlug || historyMatch?.episodeSlug
                  )
                }
                className="btn-cinema-gold inline-flex min-h-[46px] items-center gap-2.5 rounded-xl px-6 py-2.5 text-sm font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>
                  {historyMatch?.nextEpisodeName
                    ? `Xem tiếp ${historyMatch.nextEpisodeName}`
                    : historyMatch
                    ? `Xem tiếp ${historyMatch.episodeName}`
                    : 'Xem phim ngay'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onToggleWatchlist(featured)}
                className="btn-cinema-glass inline-flex min-h-[46px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              >
                <Heart className={`h-4 w-4 ${saved ? 'fill-[#D4AF37] text-[#D4AF37]' : ''}`} />
                <span>{saved ? 'Đã lưu xem sau' : 'Lưu xem sau'}</span>
              </button>
            </div>
          </div>

          {slidesCount > 1 && (
            <div
              onMouseEnter={() => setControlsHovered(true)}
              onMouseLeave={() => setControlsHovered(false)}
              className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-4"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
                {slides.map((item, idx) => {
                  const active = idx === safeIndex;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      title={item.name}
                      aria-label={`Chọn phim tiêu điểm ${idx + 1}: ${item.name}`}
                      onClick={() => goToSlide(idx)}
                      className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 cursor-pointer ${
                        active ? 'w-10 sm:w-12 bg-white/30' : 'w-2.5 sm:w-3.5 bg-white/30 hover:bg-white/65'
                      }`}
                    >
                      {active && (
                        <span
                          key={`progress-${safeIndex}-${isAutoPlaying ? 'run' : 'pause'}`}
                          className={`block h-full w-full bg-[#D4AF37] ${
                            isAutoPlaying ? 'animate-hero-progress' : ''
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUserPaused((p) => !p)}
                  aria-label={userPaused ? 'Tiếp tục chuyển tự động' : 'Tạm dừng chuyển tự động'}
                  className="btn-cinema-glass inline-flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer"
                >
                  {userPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Phim tiêu điểm trước"
                  className="btn-cinema-glass inline-flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Phim tiêu điểm tiếp theo"
                  className="btn-cinema-glass inline-flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
