import { Check, Sparkles } from 'lucide-react';
import type { GenreItem, MovieSummary, RecommendedMovie, TasteProfileSummary } from '../types/movie';
import { MovieCard } from './MovieCard';
import { FilterChipListSkeleton, MovieGridSkeleton } from './Skeletons';

interface FrequentGenreStat {
  slug: string;
  name: string;
  watchCount: number;
  score: number;
}

interface RecommendationsViewProps {
  genres: GenreItem[];
  filtersLoading?: boolean;
  preferredGenres: string[];
  onTogglePreferredGenre: (slug: string) => void;
  tasteProfile: TasteProfileSummary;
  frequentGenres: FrequentGenreStat[];
  activeFrequentGenre: string;
  onSelectFrequentGenre: (slug: string) => void;
  frequentGenreMovies: MovieSummary[];
  frequentGenreLoading: boolean;
  recommendations: RecommendedMovie[];
  poolLoading?: boolean;
  onSelectMovie: (slug: string) => void;
}

export function RecommendationsView({
  genres,
  filtersLoading = false,
  preferredGenres,
  onTogglePreferredGenre,
  tasteProfile,
  frequentGenres,
  activeFrequentGenre,
  onSelectFrequentGenre,
  frequentGenreMovies,
  frequentGenreLoading,
  recommendations,
  poolLoading = false,
  onSelectMovie,
}: RecommendationsViewProps) {
  return (
    <div className="space-y-10">
      {/* Header + Personal Taste Metrics */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 text-balance">
            Gợi ý theo sở thích & thể loại hay xem
          </h1>
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Phân tích tự động các thể loại phim bạn xem nhiều nhất, thời lượng xem và phim đã thích để đề xuất danh sách phù hợp.
          </p>
        </div>

        {/* 4-column Taste Summary Metrics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-zinc-900/10 bg-white p-5 dark:border-white/10 dark:bg-[#101015]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Phim đã xem</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {tasteProfile.watchedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-900/10 bg-white p-5 dark:border-white/10 dark:bg-[#101015]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Thời lượng ghi nhận</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {tasteProfile.totalWatchMinutes} phút
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-900/10 bg-white p-5 dark:border-white/10 dark:bg-[#101015]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Phim yêu thích</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {tasteProfile.likedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-900/10 bg-white p-5 dark:border-white/10 dark:bg-[#101015]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Thể loại ưu tiên</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-[#9A7418] dark:text-[#D4AF37] tabular-nums">
              {preferredGenres.length}
            </p>
          </div>
        </div>
      </section>

      {/* Live Movies From Frequently Watched Genres */}
      {frequentGenres.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-zinc-900/10 bg-white p-6 dark:border-[#D4AF37]/20 dark:bg-[#101015]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Phim theo thể loại bạn hay xem
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Chọn một thể loại quen thuộc để xem thêm các phim mới cập nhật cùng gu
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {frequentGenres.map((fg) => {
                const active = fg.slug === activeFrequentGenre;
                return (
                  <button
                    key={fg.slug}
                    type="button"
                    onClick={() => onSelectFrequentGenre(fg.slug)}
                    className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#9A7418] text-white dark:bg-[#D4AF37] dark:text-[#09090B]'
                        : 'border border-zinc-900/12 bg-zinc-50 text-zinc-700 hover:bg-zinc-200/70 dark:border-white/12 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/12'
                    }`}
                  >
                    {fg.name}
                    {fg.watchCount > 0 ? ` (${fg.watchCount} phim đã xem)` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {frequentGenreLoading ? (
            <MovieGridSkeleton count={6} label="Đang tải phim theo thể loại hay xem" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {frequentGenreMovies.slice(0, 12).map((movie) => (
                <MovieCard key={movie.slug} movie={movie} onSelect={onSelectMovie} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Taste Profile Bars + Interactive Genre Calibration */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-4 rounded-2xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-[#101015] lg:col-span-5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Hồ sơ gu phim hiện tại
          </h2>

          {tasteProfile.topGenres.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Hãy chọn vài thể loại bên cạnh hoặc xem một bộ phim để hệ thống xây dựng hồ sơ gu phim cho bạn.
            </p>
          ) : (
            <div className="space-y-3">
              {tasteProfile.topGenres.map((item) => (
                <div key={item.slug} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.name}</span>
                    <span className="font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {item.sharePercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#9A7418] dark:bg-[#D4AF37]"
                      style={{ width: `${Math.max(8, item.sharePercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-[#101015] lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Chọn thể loại bạn yêu thích
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Tự động lưu vào bộ nhớ & đồng bộ
            </span>
          </div>

          {filtersLoading && genres.length === 0 ? (
            <FilterChipListSkeleton count={12} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => {
                const selected = preferredGenres.includes(genre.slug);
                return (
                  <button
                    key={genre.slug}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onTogglePreferredGenre(genre.slug)}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#9A7418] bg-[#9A7418] text-white dark:border-[#D4AF37] dark:bg-[#D4AF37] dark:text-[#09090B] font-semibold'
                        : 'border-zinc-900/12 bg-zinc-50 text-zinc-700 hover:bg-zinc-200/60 dark:border-white/12 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10'
                    }`}
                  >
                    {selected && <Check className="h-3.5 w-3.5" />}
                    <span>{genre.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Ranked Personalized Grid */}
      <section className="space-y-5">
        <div className="flex items-center gap-2 border-b border-zinc-900/10 pb-3 dark:border-white/10">
          <Sparkles className="h-5 w-5 text-[#9A7418] dark:text-[#D4AF37]" />
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Đề xuất tổng hợp hàng đầu
          </h2>
        </div>

        {poolLoading && recommendations.length === 0 ? (
          <MovieGridSkeleton count={12} label="Đang tải danh sách phim gợi ý" />
        ) : recommendations.length === 0 ? (
          <div className="rounded-2xl border border-zinc-900/10 bg-white p-10 text-center dark:border-white/10 dark:bg-[#101015]">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Chưa có phim phù hợp với bộ lọc hiện tại. Hãy chọn thêm thể loại yêu thích phía trên.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recommendations.map((rec) => (
              <MovieCard
                key={rec.movie.slug}
                movie={rec.movie}
                onSelect={onSelectMovie}
                matchPercent={rec.matchPercent}
                reason={rec.reason}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
