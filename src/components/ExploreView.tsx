import { useState, type CSSProperties, type FormEvent, type RefObject } from 'react';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Film, Moon, RotateCcw, Search, Sparkles, Sun, TrendingUp, X } from 'lucide-react';
import type {
  CountryItem,
  GenreItem,
  GenreShelf,
  MovieSummary,
  RecommendedMovie,
  ThemeMode,
  WatchHistoryEntry,
  WeeklyTopResponse,
} from '../types/movie';
import { HeroSpotlight } from './HeroSpotlight';
import { MovieCard } from './MovieCard';
import { ScrollRevealShelf } from './ScrollRevealShelf';
import {
  FilterChipListSkeleton,
  GenreShelvesSkeleton,
  HeroSpotlightSkeleton,
  MovieGridSkeleton,
  SkeletonBlock,
} from './Skeletons';
import {
  computePosterRevealDelay,
  smoothScrollToElement,
  smoothScrollToY,
} from '../utils/scrollReveal';
import { formatWeeklyWatchMetric } from '../utils/weeklyTop';

export type CatalogCategory = 'latest' | 'phim-chieu-rap' | 'phim-le' | 'phim-bo' | 'hoat-hinh' | 'tv-shows';

interface FrequentGenreStat {
  slug: string;
  name: string;
  watchCount: number;
  score: number;
}

interface ExploreViewProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchDraft: string;
  activeSearch: string;
  onSearchDraftChange: (val: string) => void;
  onSearchSubmit: (e: FormEvent) => void;
  onClearFilters: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  category: CatalogCategory;
  onSelectCategory: (cat: CatalogCategory) => void;
  selectedGenre: string;
  onSelectGenre: (slug: string) => void;
  selectedCountry: string;
  onSelectCountry: (slug: string) => void;
  genres: GenreItem[];
  countries: CountryItem[];
  filtersLoading?: boolean;
  poolLoading?: boolean;
  movies: MovieSummary[];
  heroMovies: MovieSummary[];
  theaterReleases: MovieSummary[];
  theaterReleasesLoading: boolean;
  recommendations: RecommendedMovie[];
  frequentGenres: FrequentGenreStat[];
  activeFrequentGenre: string;
  onSelectFrequentGenre: (slug: string) => void;
  frequentGenreMovies: MovieSummary[];
  frequentGenreLoading: boolean;
  genreShelves: GenreShelf[];
  genreShelvesLoading: boolean;
  genreShelvesError: string | null;
  extraShelvesLoaded: boolean;
  extraShelvesLoading: boolean;
  onLoadExtraShelves: () => void;
  onRetryGenreShelves: () => void;
  watchHistory: WatchHistoryEntry[];
  weeklyTop: WeeklyTopResponse | null;
  weeklyTopLoading: boolean;
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelectMovie: (slug: string, episodeSlug?: string) => void;
  onViewAllRecommendations: () => void;
  isInWatchlist: (slug: string) => boolean;
  onToggleWatchlist: (movie: MovieSummary) => void;
}

const CATEGORY_TABS: Array<{ id: CatalogCategory; label: string }> = [
  { id: 'latest', label: 'Mới cập nhật' },
  { id: 'phim-chieu-rap', label: 'Phim chiếu rạp' },
  { id: 'phim-le', label: 'Phim lẻ' },
  { id: 'phim-bo', label: 'Phim bộ' },
  { id: 'hoat-hinh', label: 'Hoạt hình' },
  { id: 'tv-shows', label: 'TV Shows' },
];

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
  'phim-18',
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
    if (aRank !== bRank) return aRank - bRank;
    return 0;
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

export function ExploreView({
  searchInputRef,
  searchDraft,
  activeSearch,
  onSearchDraftChange,
  onSearchSubmit,
  onClearFilters,
  theme,
  onToggleTheme,
  category,
  onSelectCategory,
  selectedGenre,
  onSelectGenre,
  selectedCountry,
  onSelectCountry,
  genres,
  countries,
  filtersLoading = false,
  poolLoading = false,
  movies,
  heroMovies,
  theaterReleases,
  theaterReleasesLoading,
  recommendations,
  frequentGenres,
  activeFrequentGenre,
  onSelectFrequentGenre,
  frequentGenreMovies,
  frequentGenreLoading,
  genreShelves,
  genreShelvesLoading,
  genreShelvesError,
  extraShelvesLoaded,
  extraShelvesLoading,
  onLoadExtraShelves,
  onRetryGenreShelves,
  watchHistory,
  weeklyTop,
  weeklyTopLoading,
  loading,
  error,
  page,
  totalPages,
  totalItems = 0,
  onPageChange,
  onRetry,
  onSelectMovie,
  onViewAllRecommendations,
  isInWatchlist,
  onToggleWatchlist,
}: ExploreViewProps) {
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [showChronologicalAll, setShowChronologicalAll] = useState(false);

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

  const showHomeSections =
    !activeSearch && !selectedGenre && !selectedCountry && page === 1 && category === 'latest';
  const showCategorizedShelves = showHomeSections && !showChronologicalAll;

  const historyMap = new Map(watchHistory.map((h) => [h.slug, h]));

  const hasActiveFilter = Boolean(
    activeSearch || selectedGenre || selectedCountry || category !== 'latest'
  );
  const genreLabel = genres.find((g) => g.slug === selectedGenre)?.name || selectedGenre;
  const countryLabel = countries.find((c) => c.slug === selectedCountry)?.name || selectedCountry;
  const categoryLabel = CATEGORY_TABS.find((t) => t.id === category)?.label || 'Kho phim';

  const titleParts = [
    category !== 'latest' ? categoryLabel : null,
    selectedGenre ? genreLabel : null,
    selectedCountry ? countryLabel : null,
  ].filter(Boolean) as string[];

  const catalogTitle = activeSearch
    ? `Kết quả tìm kiếm: "${activeSearch}"`
    : titleParts.length > 0
    ? titleParts.length === 1 && selectedCountry
      ? `Phim ${countryLabel}`
      : titleParts.length === 1 && selectedGenre
      ? `Thể loại: ${genreLabel}`
      : titleParts.join(' · ')
    : categoryLabel;

  return (
    <div>
      {/* Full-Bleed Top Hero Spotlight */}
      {showHomeSections && (
        heroMovies.length > 0 ? (
          <HeroSpotlight
            movies={heroMovies}
            watchHistory={watchHistory}
            onWatch={onSelectMovie}
            isInWatchlist={isInWatchlist}
            onToggleWatchlist={onToggleWatchlist}
          />
        ) : (loading || poolLoading) ? (
          <HeroSpotlightSkeleton />
        ) : null
      )}

      <div className="mx-auto w-full max-w-7xl space-y-11 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Luxury Search + Format + Genre & Country Filter Workspace */}
        <section
          aria-label="Tìm kiếm và bộ lọc"
          className="space-y-4 rounded-2xl border border-zinc-900/10 bg-white/80 p-4 sm:p-5 backdrop-blur-sm dark:border-white/10 dark:bg-[#101015]/90"
        >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={onSearchSubmit} className="relative flex-1 max-w-xl">
            <label htmlFor="movie-search-input" className="sr-only">
              Tìm kiếm phim theo tên hoặc diễn viên
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            />
            <input
              ref={searchInputRef}
              id="movie-search-input"
              type="search"
              value={searchDraft}
              onChange={(e) => onSearchDraftChange(e.target.value)}
              placeholder="Tìm tên phim, tên gốc hoặc diễn viên..."
              className="h-11 w-full rounded-xl border border-zinc-900/12 bg-[#F6F5F2] pl-10 pr-24 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#9A7418] focus:outline-none dark:border-white/12 dark:bg-[#070709] dark:text-zinc-100 dark:focus:border-[#D4AF37]"
            />
            {searchDraft && (
              <button
                type="button"
                onClick={onClearFilters}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-16 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="btn-cinema-gold absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
            >
              Tìm
            </button>
          </form>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            {hasActiveFilter && (
              <button
                type="button"
                onClick={onClearFilters}
                className="btn-cinema-surface inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Đặt lại bộ lọc</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              className="btn-cinema-surface hidden md:inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-[#D4AF37]" />
                  <span>Giao diện Sáng</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-[#9A7418]" />
                  <span>Giao diện Tối</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Visual Filter Menu (Zero Droplists, One-Click Selection) */}
        <div className="space-y-3 border-t border-zinc-900/8 pt-4 dark:border-white/8">
          {/* Format Row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Định dạng
            </span>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo định dạng">
              {CATEGORY_TABS.map((tab) => {
                const active = category === tab.id && !activeSearch;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectCategory(tab.id)}
                    className={`min-h-[36px] rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      active
                        ? 'btn-cinema-gold'
                        : 'border border-zinc-900/12 bg-[#F6F5F2] text-zinc-700 hover:border-[#9A7418]/45 hover:text-zinc-950 dark:border-white/12 dark:bg-[#09090D] dark:text-zinc-300 dark:hover:border-[#D4AF37]/45 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Genre Visual Menu */}
          {filtersLoading && genres.length === 0 ? (
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
              <div className="flex flex-1 flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo thể loại">
                <button
                  type="button"
                  aria-pressed={!selectedGenre && !activeSearch}
                  onClick={() => onSelectGenre('')}
                  className={`min-h-[34px] rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    !selectedGenre && !activeSearch
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'border border-zinc-900/10 bg-[#F6F5F2] text-zinc-600 hover:text-zinc-950 dark:border-white/10 dark:bg-[#070709] dark:text-zinc-300 dark:hover:text-white'
                  }`}
                >
                  Tất cả
                </button>
                {visibleGenres.map((g) => {
                  const active = selectedGenre === g.slug && !activeSearch;
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

          {/* Country Visual Menu */}
          {filtersLoading && countries.length === 0 ? (
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
              <div className="flex flex-1 flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo quốc gia">
                <button
                  type="button"
                  aria-pressed={!selectedCountry && !activeSearch}
                  onClick={() => onSelectCountry('')}
                  className={`min-h-[34px] rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    !selectedCountry && !activeSearch
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'border border-zinc-900/10 bg-[#F6F5F2] text-zinc-600 hover:text-zinc-950 dark:border-white/10 dark:bg-[#070709] dark:text-zinc-300 dark:hover:text-white'
                  }`}
                >
                  Tất cả
                </button>
                {visibleCountries.map((c) => {
                  const active = selectedCountry === c.slug && !activeSearch;
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

      {/* Continue Watching Rail */}
      {showHomeSections && watchHistory.length > 0 && (
        <ScrollRevealShelf ariaLabel="Tiếp tục xem" className="space-y-4">
          <div className="reveal-shelf-header flex items-baseline justify-between">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50">
                Tiếp tục xem
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Bấm để mở ngay tập tiếp theo từ tiến độ đã lưu
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {watchHistory.length} phim gần đây
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {watchHistory.slice(0, 6).map((entry, idx) => {
              const ratio =
                entry.durationSeconds > 0
                  ? entry.progressSeconds / entry.durationSeconds
                  : 0.2;
              const summary: MovieSummary = {
                id: entry.slug,
                name: entry.name,
                originName: entry.originName,
                slug: entry.slug,
                type: 'series',
                posterUrl: entry.posterUrl,
                thumbUrl: entry.thumbUrl,
                year: entry.year,
                quality: entry.quality,
                lang: 'Vietsub',
                time: '',
                episodeCurrent: entry.episodeName,
                categories: entry.categories,
                countries: entry.countries,
                rating: { voteAverage: 0, voteCount: 0 },
                modifiedAt: '',
              };
              const resumeTarget = entry.nextEpisodeSlug || entry.episodeSlug;
              const subtitle = entry.nextEpisodeName
                ? `Đã xem ${entry.episodeName} · Tiếp: ${entry.nextEpisodeName}`
                : `Đã xem: ${entry.episodeName}`;

              return (
                <div
                  key={entry.slug}
                  className="reveal-poster-item"
                  style={{ '--reveal-delay': `${computePosterRevealDelay(idx)}ms` } as CSSProperties}
                >
                  <MovieCard
                    movie={summary}
                    onSelect={(s) => onSelectMovie(s, resumeTarget)}
                    progressRatio={ratio}
                    watchedEpisodeLabel={
                      entry.nextEpisodeName
                        ? `Tiếp: ${entry.nextEpisodeName}`
                        : entry.episodeName
                    }
                    subtitleNote={subtitle}
                  />
                </div>
              );
            })}
          </div>
        </ScrollRevealShelf>
      )}

      {/* Weekly Top Most-Watched Rail (based on rolling 7-day user watch history) */}
      {showHomeSections && (
        <ScrollRevealShelf
          ariaLabel="Top xem nhiều trong tuần"
          className="space-y-4"
        >
          <div className="reveal-shelf-header flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#9A7418] dark:text-[#D4AF37]" aria-hidden="true" />
                <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50">
                  Top xem nhiều trong tuần
                </h2>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Tổng hợp theo dữ liệu lịch sử xem phim thực tế của người dùng trong 7 ngày gần nhất
              </p>
            </div>
            {weeklyTop && weeklyTop.items.length > 0 && (
              <span className="shrink-0 whitespace-nowrap font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                Top {Math.min(6, weeklyTop.items.length)} tuần này · {weeklyTop.totalTrackedViews} lượt xem
              </span>
            )}
          </div>

          {weeklyTopLoading && (!weeklyTop || weeklyTop.items.length === 0) ? (
            <MovieGridSkeleton count={6} label="Đang tổng hợp bảng xếp hạng xem nhiều trong tuần" />
          ) : !weeklyTop || weeklyTop.items.length === 0 ? (
            <div className="rounded-2xl border border-zinc-900/10 bg-white/80 p-6 text-center dark:border-white/10 dark:bg-[#101015]/90">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Chưa có dữ liệu lượt xem trong 7 ngày qua
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Hãy mở xem một bộ phim bất kỳ để hệ thống ghi nhận vào bảng xếp hạng tuần này.
              </p>
            </div>
          ) : (
            <div
              data-testid="weekly-top-grid"
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            >
              {weeklyTop.items.slice(0, 6).map((entry, idx) => {
                const hist = historyMap.get(entry.movie.slug);
                return (
                  <div
                    key={`weekly-top-${entry.movie.slug}`}
                    className="reveal-poster-item"
                    style={{ '--reveal-delay': `${computePosterRevealDelay(idx)}ms` } as CSSProperties}
                  >
                    <MovieCard
                      movie={entry.movie}
                      rank={entry.rank}
                      onSelect={(s) => onSelectMovie(s, hist?.nextEpisodeSlug || hist?.episodeSlug)}
                      watchedEpisodeLabel={hist ? `Đã xem ${hist.episodeName}` : undefined}
                      subtitleNote={formatWeeklyWatchMetric(entry)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollRevealShelf>
      )}

      {/* Recommendations Based on Frequently Watched Genres */}
      {showHomeSections && frequentGenres.length > 0 && (
        <ScrollRevealShelf ariaLabel="Gợi ý theo thể loại bạn hay xem" className="space-y-4">
          <div className="reveal-shelf-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#9A7418] dark:text-[#D4AF37]" />
                <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50">
                  Dựa theo thể loại bạn hay xem
                </h2>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tuyển chọn phim mới nhất thuộc các thể loại xuất hiện nhiều nhất trong lịch sử xem của bạn
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {frequentGenres.map((fg) => {
                const isActive = fg.slug === activeFrequentGenre;
                return (
                  <button
                    key={fg.slug}
                    type="button"
                    onClick={() => onSelectFrequentGenre(fg.slug)}
                    className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#9A7418] text-white dark:bg-[#D4AF37] dark:text-[#09090B]'
                        : 'border border-zinc-900/12 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-white/12 dark:bg-[#101015] dark:text-zinc-300 dark:hover:bg-white/10'
                    }`}
                  >
                    {fg.name}
                    {fg.watchCount > 0 ? ` (${fg.watchCount})` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {frequentGenreLoading ? (
            <MovieGridSkeleton count={6} label="Đang tải phim theo thể loại bạn hay xem" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {frequentGenreMovies.slice(0, 6).map((item, idx) => {
                const hist = historyMap.get(item.slug);
                return (
                  <div
                    key={item.slug}
                    className="reveal-poster-item"
                    style={{ '--reveal-delay': `${computePosterRevealDelay(idx)}ms` } as CSSProperties}
                  >
                    <MovieCard
                      movie={item}
                      onSelect={(s) => onSelectMovie(s, hist?.nextEpisodeSlug || hist?.episodeSlug)}
                      watchedEpisodeLabel={hist ? `Đã xem ${hist.episodeName}` : undefined}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollRevealShelf>
      )}

      {/* Personalized Recommendations Rail */}
      {showHomeSections && (recommendations.length > 0 || poolLoading) && (
        <ScrollRevealShelf ariaLabel="Gợi ý dành riêng cho bạn" className="space-y-4">
          <div className="reveal-shelf-header flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50">
                Xếp hạng hợp gu cá nhân
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Kết hợp sở thích thể loại, phim đã thích và điểm đánh giá
              </p>
            </div>
            <button
              type="button"
              onClick={onViewAllRecommendations}
              className="text-xs font-semibold text-[#9A7418] hover:underline dark:text-[#D4AF37] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Xem hồ sơ gu phim →
            </button>
          </div>
          {poolLoading && recommendations.length === 0 ? (
            <MovieGridSkeleton count={6} label="Đang tải phim gợi ý cá nhân" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {recommendations.slice(0, 6).map((rec, idx) => {
                const hist = historyMap.get(rec.movie.slug);
                return (
                  <div
                    key={rec.movie.slug}
                    className="reveal-poster-item"
                    style={{ '--reveal-delay': `${computePosterRevealDelay(idx)}ms` } as CSSProperties}
                  >
                    <MovieCard
                      movie={rec.movie}
                      onSelect={(s) => onSelectMovie(s, hist?.nextEpisodeSlug || hist?.episodeSlug)}
                      watchedEpisodeLabel={hist ? `Đã xem ${hist.episodeName}` : undefined}
                      matchPercent={rec.matchPercent}
                      reason={rec.reason}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollRevealShelf>
      )}

      {/* Theater Releases Rail (Phim Chiếu Rạp) */}
      {showHomeSections && (theaterReleases.length > 0 || theaterReleasesLoading) && (
        <ScrollRevealShelf ariaLabel="Phim chiếu rạp tuyển chọn" className="space-y-4">
          <div className="reveal-shelf-header flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-[#9A7418] dark:text-[#D4AF37]" />
                <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50">
                  Phim chiếu rạp
                </h2>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Tuyển chọn phim điện ảnh chiếu rạp mới ra mắt và tác phẩm nổi bật
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectCategory('phim-chieu-rap');
                smoothScrollToY(420, { durationMs: 560 });
              }}
              className="btn-cinema-surface inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Xem tất cả phim chiếu rạp</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {theaterReleasesLoading && theaterReleases.length === 0 ? (
            <MovieGridSkeleton count={6} label="Đang tải phim chiếu rạp" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {theaterReleases.slice(0, 6).map((item, idx) => {
                const hist = historyMap.get(item.slug);
                return (
                  <div
                    key={`cr-${item.slug}`}
                    className="reveal-poster-item"
                    style={{ '--reveal-delay': `${computePosterRevealDelay(idx)}ms` } as CSSProperties}
                  >
                    <MovieCard
                      movie={item}
                      onSelect={(s) => onSelectMovie(s, hist?.nextEpisodeSlug || hist?.episodeSlug)}
                      watchedEpisodeLabel={hist ? `Đã xem ${hist.episodeName}` : undefined}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollRevealShelf>
      )}

      {/* Lower Body: Categorized Genre Showcase OR Focused Filtered Grid */}
      {showCategorizedShelves ? (
        <section aria-label="Phim phân theo từng thể loại" className="space-y-10">
          <div className="space-y-4 border-t border-zinc-900/10 pt-8 dark:border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50">
                  Phim phân theo từng thể loại
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Tách riêng từng thể loại để bạn dễ lướt chọn hoặc bấm xem toàn bộ từng mục
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChronologicalAll(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9A7418] hover:underline dark:text-[#D4AF37] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Xem toàn bộ mới cập nhật theo trang</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick-jump navigation across genre sections */}
            {genreShelvesLoading && genreShelves.length === 0 ? (
              <div className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Đi nhanh:
                </span>
                {Array.from({ length: 8 }).map((_, idx) => (
                  <SkeletonBlock key={idx} className="h-[34px] w-20 rounded-lg" />
                ))}
              </div>
            ) : genreShelves.length > 0 ? (
              <nav
                aria-label="Đi nhanh tới từng thể loại"
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Đi nhanh:
                </span>
                {genreShelves.map((shelf) => (
                  <button
                    key={shelf.slug}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`genre-shelf-${shelf.slug}`);
                      smoothScrollToElement(el, 88, 660);
                    }}
                    className="btn-cinema-surface min-h-[34px] rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {shelf.name}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>

          {genreShelvesLoading ? (
            <GenreShelvesSkeleton shelvesCount={4} />
          ) : genreShelvesError && genreShelves.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-900/10 bg-white p-10 text-center dark:border-white/10 dark:bg-[#101015]">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{genreShelvesError}</p>
              <button
                type="button"
                onClick={onRetryGenreShelves}
                className="btn-cinema-gold mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-5 py-2 text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Thử tải lại từng thể loại</span>
              </button>
            </div>
          ) : (
            <div className="space-y-11">
              {genreShelves.map((shelf) => (
                <ScrollRevealShelf
                  key={shelf.slug}
                  id={`genre-shelf-${shelf.slug}`}
                  ariaLabel={shelf.name.toLowerCase().startsWith('phim') ? shelf.name : `Phim ${shelf.name}`}
                  revealKey={shelf.slug}
                  className="scroll-mt-24 space-y-4 border-t border-zinc-900/10 pt-8 dark:border-white/10"
                >
                  <div className="reveal-shelf-header flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="font-display text-2xl sm:text-3xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50">
                        {shelf.name.toLowerCase().startsWith('phim') ? shelf.name : `Phim ${shelf.name}`}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {shelf.description}
                        {shelf.totalItems > 0 && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono tabular-nums">
                              {shelf.totalItems.toLocaleString('vi-VN')} phim
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectGenre(shelf.slug)}
                      aria-label={`Xem tất cả phim ${shelf.name}`}
                      className="btn-cinema-surface inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Xem tất cả {shelf.name}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {shelf.items.map((movie, idx) => {
                      const hist = historyMap.get(movie.slug);
                      return (
                        <div
                          key={`${shelf.slug}-${movie.slug}`}
                          className="reveal-poster-item"
                          style={{ '--reveal-delay': `${computePosterRevealDelay(idx)}ms` } as CSSProperties}
                        >
                          <MovieCard
                            movie={movie}
                            onSelect={(s) => onSelectMovie(s, hist?.nextEpisodeSlug || hist?.episodeSlug)}
                            watchedEpisodeLabel={hist ? `Đã xem ${hist.episodeName}` : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                </ScrollRevealShelf>
              ))}

              {extraShelvesLoading && <GenreShelvesSkeleton shelvesCount={2} />}

              {!extraShelvesLoaded && (
                <div className="flex justify-center border-t border-zinc-900/10 pt-8 dark:border-white/10">
                  <button
                    type="button"
                    disabled={extraShelvesLoading}
                    onClick={onLoadExtraShelves}
                    className="btn-cinema-surface inline-flex min-h-[44px] items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-semibold disabled:opacity-60 whitespace-nowrap cursor-pointer disabled:cursor-wait"
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span>
                      {extraShelvesLoading
                        ? 'Đang tải thêm các thể loại...'
                        : 'Xem thêm thể loại khác (Phiêu Lưu, Chính Kịch, Bí Ẩn, Gia Đình, Phim 18+)'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <section aria-label="Danh sách phim" className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-zinc-900/10 pb-3 dark:border-white/10">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {catalogTitle}
              </h2>
              {showHomeSections && showChronologicalAll && (
                <button
                  type="button"
                  onClick={() => setShowChronologicalAll(false)}
                  className="text-xs font-semibold text-[#9A7418] hover:underline dark:text-[#D4AF37] whitespace-nowrap cursor-pointer"
                >
                  ← Quay lại xem chia theo từng thể loại
                </button>
              )}
            </div>
            {loading ? (
              <SkeletonBlock className="h-4 w-36 rounded-md" />
            ) : !error ? (
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {totalItems > 0 ? `${totalItems.toLocaleString('vi-VN')} phim · ` : ''}
                Trang {page} / {totalPages}
              </span>
            ) : null}
          </div>

          {loading ? (
            <MovieGridSkeleton count={12} label="Đang tải danh sách phim" />
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
                Không tìm thấy phim phù hợp
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Hãy thử từ khóa khác hoặc đặt lại bộ lọc thể loại và quốc gia.
              </p>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="mt-4 min-h-[44px] rounded-lg border border-zinc-900/15 px-5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  Xem toàn bộ phim mới
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
      )}
      </div>
    </div>
  );
}
