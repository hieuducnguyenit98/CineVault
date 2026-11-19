import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Mic, RotateCcw } from 'lucide-react';
import type { CountryItem, GenreItem, MovieSummary, WatchHistoryEntry } from '../types/movie';
import { MovieCard } from './MovieCard';
import { FilterChipListSkeleton, MovieGridSkeleton, SkeletonBlock } from './Skeletons';

interface DubbedMoviesViewProps {
  genres: GenreItem[];
  countries: CountryItem[];
  filtersLoading?: boolean;
  selectedGenre: string;
  selectedCountry: string;
  onSelectGenre: (slug: string) => void;
  onSelectCountry: (slug: string) => void;
  onClearFilters: () => void;
  movies: MovieSummary[];
  watchHistory: WatchHistoryEntry[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelectMovie: (slug: string, episodeSlug?: string) => void;
}

const FEATURED_GENRE_SLUGS = [
  'hanh-dong',
  'tinh-cam',
  'tam-ly',
  'co-trang',
  'vien-tuong',
  'kinh-di',
  'hai-huoc',
  'hinh-su',
  'phieu-luu',
  'chinh-kich',
];

const FEATURED_COUNTRY_SLUGS = [
  'han-quoc',
  'trung-quoc',
  'au-my',
  'nhat-ban',
  'thai-lan',
  'viet-nam',
  'hong-kong',
  'dai-loan',
  'anh',
  'phap',
];

function prioritizeOptions<T extends { slug: string }>(
  items: T[],
  featuredOrder: string[],
  selectedSlug: string,
  expanded: boolean
): { visible: T[]; hiddenCount: number } {
  const rankMap = new Map(featuredOrder.map((slug, idx) => [slug, idx]));
  const sorted = [...items].sort((a, b) => {
    const aRank = rankMap.get(a.slug) ?? 999;
    const bRank = rankMap.get(b.slug) ?? 999;
    return aRank - bRank;
  });

  if (expanded) {
    return { visible: sorted, hiddenCount: 0 };
  }

  const limit = 10;
  const base = sorted.slice(0, limit);
  if (selectedSlug && !base.some((item) => item.slug === selectedSlug)) {
    const picked = sorted.find((item) => item.slug === selectedSlug);
    if (picked) {
      return {
        visible: [...base.slice(0, limit - 1), picked],
        hiddenCount: Math.max(0, sorted.length - limit),
      };
    }
  }
  return {
    visible: base,
    hiddenCount: Math.max(0, sorted.length - base.length),
  };
}

export function DubbedMoviesView({
  genres,
  countries,
  filtersLoading = false,
  selectedGenre,
  selectedCountry,
  onSelectGenre,
  onSelectCountry,
  onClearFilters,
  movies,
  watchHistory,
  loading,
  error,
  page,
  totalPages,
  totalItems,
  onPageChange,
  onRetry,
  onSelectMovie,
}: DubbedMoviesViewProps) {
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);

  const { visible: visibleGenres, hiddenCount: hiddenGenreCount } = prioritizeOptions(
    genres,
    FEATURED_GENRE_SLUGS,
    selectedGenre,
    showAllGenres
  );
  const { visible: visibleCountries, hiddenCount: hiddenCountryCount } = prioritizeOptions(
    countries,
    FEATURED_COUNTRY_SLUGS,
    selectedCountry,
    showAllCountries
  );

  const historyMap = new Map(watchHistory.map((h) => [h.slug, h]));
  const hasFilter = Boolean(selectedGenre || selectedCountry);
  const genreName = genres.find((g) => g.slug === selectedGenre)?.name;
  const countryName = countries.find((c) => c.slug === selectedCountry)?.name;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section
        aria-label="Phim Thuyết Minh Tiếng Việt"
        className="space-y-4 rounded-2xl border border-zinc-900/10 bg-white/85 p-5 sm:p-7 backdrop-blur-sm dark:border-white/10 dark:bg-[#101015]/90"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-md bg-[#D4AF37] px-2.5 py-1 text-[11px] font-bold text-[#09090B]">
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Kho phim lồng giọng thuyết minh</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50 text-balance">
              Phim Thuyết Minh Tiếng Việt
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Tổng hợp phim bộ, phim lẻ và hoạt hình có bản thuyết minh tiếng Việt rõ nét từ PhimAPI và Nguồn C. Khi mở xem từ mục này, trình phát tự động ưu tiên server Thuyết Minh.
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
              <SkeletonBlock className="h-4 w-40 rounded-md" />
            ) : !error ? (
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                {totalItems.toLocaleString('vi-VN')} phim · Trang {page} / {totalPages}
              </span>
            ) : null}
          </div>
        </div>

        {/* Visual Genre & Country Filter Rows */}
        <div className="space-y-3 border-t border-zinc-900/8 pt-4 dark:border-white/8">
          {(filtersLoading && genres.length === 0) ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <span className="w-24 shrink-0 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Thể loại
              </span>
              <FilterChipListSkeleton count={10} />
            </div>
          ) : genres.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <span className="w-24 shrink-0 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Thể loại
              </span>
              <div className="flex flex-1 flex-wrap items-center gap-1.5" role="group" aria-label="Lọc phim thuyết minh theo thể loại">
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
                {visibleGenres.map((g) => {
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
                {(hiddenGenreCount > 0 || showAllGenres) && (
                  <button
                    type="button"
                    onClick={() => setShowAllGenres((prev) => !prev)}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-dashed border-zinc-900/20 px-3 py-1.5 text-xs font-medium text-[#9A7418] hover:bg-[#9A7418]/5 dark:border-white/20 dark:text-[#D4AF37] dark:hover:bg-[#D4AF37]/10 cursor-pointer whitespace-nowrap"
                  >
                    {showAllGenres ? (
                      <>
                        <span>Thu gọn</span>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        <span>+{hiddenGenreCount} thể loại</span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {(filtersLoading && countries.length === 0) ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <span className="w-24 shrink-0 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Quốc gia
              </span>
              <FilterChipListSkeleton count={10} />
            </div>
          ) : countries.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <span className="w-24 shrink-0 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Quốc gia
              </span>
              <div className="flex flex-1 flex-wrap items-center gap-1.5" role="group" aria-label="Lọc phim thuyết minh theo quốc gia">
                <button
                  type="button"
                  aria-pressed={!selectedCountry}
                  onClick={() => onSelectCountry('')}
                  className={`min-h-[34px] rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    !selectedCountry
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'border border-zinc-900/10 bg-[#F6F5F2] text-zinc-600 hover:text-zinc-950 dark:border-white/10 dark:bg-[#070709] dark:text-zinc-300 dark:hover:text-white'
                  }`}
                >
                  Tất cả
                </button>
                {visibleCountries.map((c) => {
                  const active = selectedCountry === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelectCountry(active ? '' : c.slug)}
                      className={`min-h-[34px] rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'bg-[#9A7418] text-white shadow-sm dark:bg-[#D4AF37] dark:text-[#09090B] font-semibold'
                          : 'border border-zinc-900/10 bg-[#F6F5F2] text-zinc-700 hover:border-[#9A7418]/40 hover:text-zinc-950 dark:border-white/10 dark:bg-[#070709] dark:text-zinc-300 dark:hover:border-[#D4AF37]/40 dark:hover:text-white'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
                {(hiddenCountryCount > 0 || showAllCountries) && (
                  <button
                    type="button"
                    onClick={() => setShowAllCountries((prev) => !prev)}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-dashed border-zinc-900/20 px-3 py-1.5 text-xs font-medium text-[#9A7418] hover:bg-[#9A7418]/5 dark:border-white/20 dark:text-[#D4AF37] dark:hover:bg-[#D4AF37]/10 cursor-pointer whitespace-nowrap"
                  >
                    {showAllCountries ? (
                      <>
                        <span>Thu gọn</span>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        <span>+{hiddenCountryCount} quốc gia</span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Catalog Grid */}
      <section aria-label="Danh sách phim thuyết minh" className="space-y-5">
        {(genreName || countryName) && (
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-900/10 pb-3 dark:border-white/10">
            {[genreName ? `Thể loại: ${genreName}` : null, countryName ? countryName : null]
              .filter(Boolean)
              .join(' · ')}
          </h2>
        )}

        {loading ? (
          <MovieGridSkeleton count={12} label="Đang tải danh sách phim thuyết minh" />
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
              Chưa tìm thấy phim thuyết minh khớp bộ lọc này
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Thử bỏ bớt điều kiện thể loại hoặc quốc gia để xem toàn bộ kho thuyết minh.
            </p>
            {hasFilter && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 min-h-[44px] rounded-lg border border-zinc-900/15 px-5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10 cursor-pointer"
              >
                Xem tất cả phim thuyết minh
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {movies.map((movie) => {
                const hist = historyMap.get(movie.slug);
                return (
                  <MovieCard
                    key={movie.slug}
                    movie={movie}
                    onSelect={(s) => onSelectMovie(s, hist?.nextEpisodeSlug || hist?.episodeSlug)}
                    watchedEpisodeLabel={hist ? `Đã xem ${hist.episodeName}` : undefined}
                  />
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
