import { useState } from 'react';
import { Film, Mic, Play } from 'lucide-react';
import type { MovieSummary } from '../types/movie';
import { hasVietnameseNarration } from '../utils/movieNormalizer';

const FALLBACK_CINEMA_IMAGE = '/src/assets/images/cinema_backdrop_fallback_1795070532379.jpg';

interface MovieCardProps {
  movie: MovieSummary;
  onSelect: (slug: string) => void;
  progressRatio?: number;
  subtitleNote?: string;
  watchedEpisodeLabel?: string;
  matchPercent?: number;
  reason?: string;
}

export function MovieCard({
  movie,
  onSelect,
  progressRatio,
  subtitleNote,
  watchedEpisodeLabel,
  matchPercent,
  reason,
}: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const isNarrated = hasVietnameseNarration(movie);
  const imageSrc =
    !imgError && (movie.posterUrl || movie.thumbUrl)
      ? movie.posterUrl || movie.thumbUrl
      : FALLBACK_CINEMA_IMAGE;

  const metaParts = [
    movie.year ? String(movie.year) : '',
    movie.quality || '',
    movie.lang || '',
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => onSelect(movie.slug)}
      aria-label={`Xem phim ${movie.name}${isNarrated ? ' (Có Thuyết Minh)' : ''}`}
      className="group flex flex-col text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-xl"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-[#101015] border border-zinc-900/10 dark:border-white/10 transition-all duration-300 group-hover:border-[#9A7418]/60 dark:group-hover:border-[#D4AF37]/60 group-hover:shadow-xl group-hover:shadow-black/25">
        {!imgLoaded && !imgError && (
          <div aria-hidden="true" className="skeleton-shimmer absolute inset-0 h-full w-full" />
        )}
        <img
          src={imageSrc}
          alt={movie.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setImgError(true);
            setImgLoaded(true);
          }}
          className={`h-full w-full object-cover transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.05] ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {imgError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/85 p-3 text-center">
            <Film className="mb-2 h-6 w-6 text-[#D4AF37]" />
            <span className="text-xs font-medium text-zinc-200 line-clamp-2">{movie.name}</span>
          </div>
        )}

        {/* Vietnamese Narration Mask */}
        {isNarrated && (
          <div
            data-narration-mask="true"
            className="pointer-events-none absolute top-2.5 left-0 z-10 inline-flex items-center gap-1 rounded-r-md bg-[#D4AF37] px-2 py-1 text-[10px] font-bold tracking-wide text-[#09090B] shadow-md"
          >
            <Mic className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>Thuyết Minh</span>
          </div>
        )}

        {/* Measured cinema scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-70 transition-opacity duration-200 group-hover:opacity-95" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4AF37] text-[#09090B] shadow-xl transition-transform duration-200 group-hover:scale-105">
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </span>
        </div>

        {/* Bottom scrim caption (unboxed text, zero pills) */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 text-[11px] font-medium text-zinc-100">
          <span className="truncate">
            {watchedEpisodeLabel || movie.episodeCurrent || movie.time || 'Full'}
          </span>
          {movie.rating.voteAverage > 0 && (
            <span className="font-mono tabular-nums text-[#F0D075] shrink-0">
              {movie.rating.voteAverage.toFixed(1)}
            </span>
          )}
        </div>

        {/* Watch progress bar */}
        {typeof progressRatio === 'number' && progressRatio > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-[#D4AF37]"
              style={{ width: `${Math.min(100, Math.max(6, Math.round(progressRatio * 100)))}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-3 space-y-0.5 px-0.5">
        <h3 className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-[#9A7418] dark:group-hover:text-[#D4AF37] transition-colors">
          {movie.name}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
          {subtitleNote || movie.originName}
        </p>
        {typeof matchPercent === 'number' && reason ? (
          <p className="text-[11px] font-medium text-[#9A7418] dark:text-[#D4AF37] line-clamp-1 tabular-nums">
            {matchPercent}% hợp gu · {reason}
          </p>
        ) : (
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-500 tabular-nums line-clamp-1">
            {metaParts.join(' · ')}
          </p>
        )}
      </div>
    </button>
  );
}
