import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  Film,
  Layers,
  Mic,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { GenreItem, MovieSummary, WatchHistoryEntry } from '../types/movie';
import type { AiShortFormatFilter } from '../utils/aiShortCatalog';
import { hasVietnameseNarration } from '../utils/movieNormalizer';
import { FilterChipListSkeleton, MovieGridSkeleton, SkeletonBlock } from './Skeletons';

interface AiShortMoviesViewProps {
  genres: GenreItem[];
  filtersLoading?: boolean;
  selectedGenre: string;
  selectedFormat: AiShortFormatFilter;
  onSelectGenre: (slug: string) => void;
  onSelectFormat: (format: AiShortFormatFilter) => void;
  onClearFilters: () => void;
  movies: MovieSummary[];
  watchHistory: WatchHistoryEntry[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalItems: number;
  totalSourceVideos?: number;
  groupedSeriesCount?: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelectMovie: (slug: string, episodeSlug?: string) => void;
}

const FORMAT_OPTIONS: Array<{ id: AiShortFormatFilter; label: string }> = [
  { id: 'all', label: 'Tất cả phim AI' },
  { id: 'series', label: 'Bộ nhiều phần' },
  { id: 'vi-sub', label: 'Vietsub / Thuyết minh' },
  { id: 'ultra-short', label: 'Tập ngắn ≤ 25 phút' },
  { id: 'cn-raw', label: 'AI短剧 / 漫剧 Trung Quốc' },
];

export function AiShortMoviesView({
  genres,
  filtersLoading = false,
  selectedGenre,
  selectedFormat,
  onSelectGenre,
  onSelectFormat,
  onClearFilters,
  movies,
  watchHistory,
  loading,
  error,
  page,
  totalPages,
  totalItems,
  totalSourceVideos = 0,
  groupedSeriesCount = 0,
  onPageChange,
  onRetry,
  onSelectMovie,
}: AiShortMoviesViewProps) {
  const historyMap = new Map(watchHistory.map((h) => [h.slug, h]));
  const hasFilter = Boolean(selectedGenre || selectedFormat !== 'all');
  const genreName = genres.find((g) => g.slug === selectedGenre)?.name;
  const formatName =
    selectedFormat !== 'all'
      ? FORMAT_OPTIONS.find((item) => item.id === selectedFormat)?.label
      : undefined;

  const externalSearchTerm = genreName
    ? `phim ngắn AI Trung Quốc ${genreName}`
    : 'phim ngắn AI Trung Quốc vietsub';
  const facebookWatchSearchUrl = `https://www.facebook.com/watch/search/?q=${encodeURIComponent(externalSearchTerm)}`;
  const facebookVideoSearchUrl = `https://www.facebook.com/search/videos/?q=${encodeURIComponent(externalSearchTerm)}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(externalSearchTerm)}`;

  return (
    <div className="space-y-8">
      {/* Editorial Header & Full Genre Filter Matrix */}
      <section
        aria-label="Phim Ngắn AI Trung Quốc"
        className="space-y-5 rounded-2xl border border-zinc-900/10 bg-white/85 p-5 sm:p-7 backdrop-blur-sm dark:border-white/10 dark:bg-[#101015]/90"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-start sm:items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A7418] dark:text-[#D4AF37]">
              <Clapperboard className="h-3.5 w-3.5 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <span>YouTube AI · AI短剧 · AI漫剧 · Toàn bộ thể loại</span>
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50 text-balance">
              Phim Ngắn AI Trung Quốc
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Tổng hợp trực tiếp các bộ phim ngắn làm bằng AI (Sora, Kling, Seedance, AIGC, AI短剧 / AI漫剧) từ các kênh YouTube Vietsub, Thuyết minh &amp; bản gốc Trung Quốc. Hỗ trợ mở nhanh nguồn Facebook Watch &amp; Reels theo từng thể loại.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {hasFilter && (
              <button
                type="button"
                onClick={onClearFilters}
                className="btn-cinema-surface inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Đặt lại bộ lọc</span>
              </button>
            )}
            {loading ? (
              <SkeletonBlock className="h-4 w-48 rounded-md" />
            ) : !error ? (
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                {totalItems.toLocaleString('vi-VN')} bộ phim AI
                {totalSourceVideos > totalItems
                  ? ` (${totalSourceVideos.toLocaleString('vi-VN')} video · ${groupedSeriesCount} bộ nhiều phần)`
                  : ''}
                {' · '}Trang {page} / {totalPages}
              </span>
            ) : null}
          </div>
        </div>

        {/* Format, All-Genres Filter Matrix & Facebook/YouTube Quick Discovery */}
        <div className="space-y-3.5 border-t border-zinc-900/8 pt-4 dark:border-white/8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Định dạng
            </span>
            <div
              className="flex flex-1 flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Lọc theo định dạng phim ngắn AI"
            >
              {FORMAT_OPTIONS.map((opt) => {
                const active = selectedFormat === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectFormat(opt.id)}
                    className={`min-h-[34px] rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                        : 'border border-zinc-900/10 bg-[#F6F5F2] text-zinc-700 hover:border-[#9A7418]/40 hover:text-zinc-950 dark:border-white/10 dark:bg-[#070709] dark:text-zinc-300 dark:hover:border-[#D4AF37]/40 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filtersLoading && genres.length === 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <span className="w-24 shrink-0 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Thể loại
              </span>
              <FilterChipListSkeleton count={18} />
            </div>
          ) : genres.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <span className="w-24 shrink-0 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Thể loại ({genres.length})
              </span>
              <div
                className="flex flex-1 flex-wrap items-center gap-1.5"
                role="group"
                aria-label="Lọc phim ngắn AI Trung Quốc theo toàn bộ thể loại"
              >
                <button
                  type="button"
                  aria-pressed={!selectedGenre}
                  onClick={() => onSelectGenre('')}
                  className={`min-h-[34px] rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    !selectedGenre
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'border border-zinc-900/10 bg-[#F6F5F2] text-zinc-600 hover:text-zinc-950 dark:border-white/10 dark:bg-[#070709] dark:text-zinc-300 dark:hover:text-white'
                  }`}
                >
                  Tất cả
                </button>
                {genres.map((g) => {
                  const active = selectedGenre === g.slug;
                  return (
                    <button
                      key={g.slug}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelectGenre(active ? '' : g.slug)}
                      className={`min-h-[34px] rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'bg-[#9A7418] text-white shadow-sm dark:bg-[#D4AF37] dark:text-[#09090B] font-semibold'
                          : 'border border-zinc-900/10 bg-[#F6F5F2] text-zinc-700 hover:border-[#9A7418]/40 hover:text-zinc-950 dark:border-white/10 dark:bg-[#070709] dark:text-zinc-300 dark:hover:border-[#D4AF37]/40 dark:hover:text-white'
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-zinc-900/6 pt-3 sm:flex-row sm:items-center dark:border-white/6">
            <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Nguồn MXH
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={facebookWatchSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-zinc-900/12 bg-[#F6F5F2] px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-[#9A7418]/50 hover:text-[#9A7418] dark:border-white/12 dark:bg-[#070709] dark:text-zinc-200 dark:hover:border-[#D4AF37]/50 dark:hover:text-[#D4AF37] whitespace-nowrap transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tìm trên Facebook Watch</span>
              </a>
              <a
                href={facebookVideoSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-zinc-900/12 bg-[#F6F5F2] px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-[#9A7418]/50 hover:text-[#9A7418] dark:border-white/12 dark:bg-[#070709] dark:text-zinc-200 dark:hover:border-[#D4AF37]/50 dark:hover:text-[#D4AF37] whitespace-nowrap transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tìm Facebook Video / Reels</span>
              </a>
              <a
                href={youtubeSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-zinc-900/12 bg-[#F6F5F2] px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-[#9A7418]/50 hover:text-[#9A7418] dark:border-white/12 dark:bg-[#070709] dark:text-zinc-200 dark:hover:border-[#D4AF37]/50 dark:hover:text-[#D4AF37] whitespace-nowrap transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Mở trên YouTube</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid (16:9 Cinema Frame optimized for YouTube AI short films) */}
      <section aria-label="Danh sách phim ngắn AI Trung Quốc" className="space-y-5">
        {(genreName || formatName) && (
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-900/10 pb-3 dark:border-white/10">
            {[genreName ? `Thể loại: ${genreName}` : null, formatName ?? null]
              .filter(Boolean)
              .join(' · ')}
          </h2>
        )}

        {loading ? (
          <MovieGridSkeleton count={12} label="Đang tải danh sách phim ngắn AI Trung Quốc" />
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-900/10 bg-white p-10 text-center dark:border-white/10 dark:bg-[#101015]">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#9A7418] px-5 py-2 text-xs font-semibold text-white hover:bg-[#826112] dark:bg-[#D4AF37] dark:text-[#09090B] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Thử tải lại</span>
            </button>
          </div>
        ) : movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-900/10 bg-white p-12 text-center dark:border-white/10 dark:bg-[#101015]">
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Chưa tìm thấy phim ngắn AI khớp bộ lọc này
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Thử đổi định dạng hoặc đặt lại thể loại để duyệt toàn bộ kho phim ngắn AI Trung Quốc.
            </p>
            {hasFilter && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 min-h-[44px] rounded-lg border border-zinc-900/15 px-5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10 cursor-pointer"
              >
                Xem tất cả phim ngắn AI
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {movies.map((movie) => {
                const hist = historyMap.get(movie.slug);
                const isNarrated = hasVietnameseNarration(movie);
                const groupParts = movie.groupParts && movie.groupParts.length > 1 ? movie.groupParts : null;
                return (
                  <button
                    key={movie.slug}
                    type="button"
                    onClick={() =>
                      onSelectMovie(movie.slug, hist?.nextEpisodeSlug || hist?.episodeSlug)
                    }
                    aria-label={`Xem phim ${movie.name}`}
                    className="group flex flex-col text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-xl"
                  >
                    <div className="relative w-full pt-1.5">
                      {groupParts && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute top-0 left-2 right-2 h-1.5 rounded-t-lg border-x border-t border-zinc-900/15 bg-zinc-300/70 dark:border-[#D4AF37]/30 dark:bg-[#1B1B24]"
                        />
                      )}
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-[#101015] border border-zinc-900/10 dark:border-white/10 transition-all duration-300 group-hover:border-[#9A7418]/60 dark:group-hover:border-[#D4AF37]/60 group-hover:shadow-xl group-hover:shadow-black/25">
                        {movie.posterUrl ? (
                          <img
                            src={movie.posterUrl}
                            alt={movie.name}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-500">
                            <Film className="h-7 w-7 text-[#D4AF37]" />
                          </div>
                        )}

                        {isNarrated && (
                          <div className="pointer-events-none absolute top-2.5 left-0 z-10 inline-flex items-center gap-1 rounded-r-md bg-[#D4AF37] px-2 py-1 text-[10px] font-bold tracking-wide text-[#09090B] shadow-md">
                            <Mic className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>Thuyết Minh</span>
                          </div>
                        )}

                        {groupParts && (
                          <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-md border border-[#D4AF37]/50 bg-[#09090B]/85 px-2 py-1 text-[10px] font-bold tracking-wide text-[#F0D075] shadow-md backdrop-blur-sm">
                            <Layers className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>Bộ {groupParts.length} phần</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-70 transition-opacity duration-200 group-hover:opacity-95" />

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4AF37] text-[#09090B] shadow-xl transition-transform duration-200 group-hover:scale-105">
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                          </span>
                        </div>

                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 text-[11px] font-medium text-zinc-100">
                          <span className="truncate">
                            {hist
                              ? `Đã xem ${hist.episodeName}`
                              : movie.episodeCurrent || movie.time || 'Phim AI'}
                          </span>
                          {movie.rating.voteAverage > 0 && (
                            <span className="font-mono tabular-nums text-[#F0D075] shrink-0">
                              {movie.rating.voteAverage.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1 px-0.5">
                      <h3 className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-2 group-hover:text-[#9A7418] dark:group-hover:text-[#D4AF37] transition-colors">
                        {movie.name}
                      </h3>
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums line-clamp-1">
                        {[movie.originName, movie.lang].filter(Boolean).join(' · ')}
                      </p>
                      {groupParts && (
                        <p className="text-[11px] font-medium text-[#9A7418] dark:text-[#F0D075] line-clamp-1">
                          Gồm: {groupParts.map((p) => p.label).slice(0, 4).join(' · ')}
                          {groupParts.length > 4 ? ` (+${groupParts.length - 4})` : ''}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="btn-cinema-surface inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Trang trước</span>
                </button>
                <span className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-400 tabular-nums px-2">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="btn-cinema-surface inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Trang sau</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
