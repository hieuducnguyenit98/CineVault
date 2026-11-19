import { useState } from 'react';
import { ArrowRight, Clock, Play, Trash2 } from 'lucide-react';
import type { MovieSummary, SavedMovieSnapshot, WatchHistoryEntry } from '../types/movie';
import { formatDurationSeconds } from '../utils/movieNormalizer';
import { MovieCard } from './MovieCard';

interface HistoryViewProps {
  mode: 'history' | 'favorites';
  watchHistory: WatchHistoryEntry[];
  likedMovies: SavedMovieSnapshot[];
  watchlist: SavedMovieSnapshot[];
  onSelectMovie: (slug: string, episodeSlug?: string) => void;
  onRemoveHistoryItem: (slug: string) => void;
  onClearHistory: () => void;
  onRemoveFromWatchlist: (slug: string) => void;
  onExploreClick: () => void;
}

export function HistoryView({
  mode,
  watchHistory,
  likedMovies,
  watchlist,
  onSelectMovie,
  onRemoveHistoryItem,
  onClearHistory,
  onRemoveFromWatchlist,
  onExploreClick,
}: HistoryViewProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  if (mode === 'favorites') {
    const combinedSaved = [
      ...watchlist.map((w) => ({ ...w, sourceLabel: 'Xem sau' })),
      ...likedMovies
        .filter((l) => !watchlist.some((w) => w.slug === l.slug))
        .map((l) => ({ ...l, sourceLabel: 'Đã thích' })),
    ];

    return (
      <div className="space-y-8">
        <div className="space-y-2 border-b border-zinc-900/10 pb-4 dark:border-white/10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50">
            Bộ sưu tập Yêu thích & Xem sau
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Các bộ phim bạn đã đánh dấu yêu thích hoặc lưu để xem sau trên mọi thiết bị.
          </p>
        </div>

        {combinedSaved.length === 0 ? (
          <div className="rounded-2xl border border-zinc-900/10 bg-white p-12 text-center dark:border-white/10 dark:bg-[#101015]">
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Danh sách yêu thích đang trống
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Nhấn "Lưu xem sau" hoặc "Thích phim này" khi xem để lưu vào thư viện cá nhân.
            </p>
            <button
              type="button"
              onClick={onExploreClick}
              className="btn-cinema-gold mt-5 min-h-[44px] rounded-xl px-6 py-2.5 text-xs font-semibold cursor-pointer"
            >
              Khám phá kho phim
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {combinedSaved.map((item) => {
              const summary: MovieSummary = {
                id: item.slug,
                name: item.name,
                originName: item.originName,
                slug: item.slug,
                type: 'single',
                posterUrl: item.posterUrl,
                thumbUrl: item.thumbUrl,
                year: item.year,
                quality: item.quality,
                lang: item.sourceLabel,
                time: '',
                episodeCurrent: item.sourceLabel,
                categories: item.categories,
                countries: item.countries,
                rating: { voteAverage: 0, voteCount: 0 },
                modifiedAt: '',
              };
              return (
                <div key={item.slug} className="space-y-2">
                  <MovieCard movie={summary} onSelect={(s) => onSelectMovie(s)} />
                  {watchlist.some((w) => w.slug === item.slug) && (
                    <button
                      type="button"
                      onClick={() => onRemoveFromWatchlist(item.slug)}
                      aria-label={`Bỏ lưu phim ${item.name}`}
                      className="w-full rounded-lg border border-zinc-900/10 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-rose-600 dark:border-white/10 dark:text-zinc-400 dark:hover:text-rose-400 cursor-pointer"
                    >
                      Bỏ khỏi danh sách
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-900/10 pb-4 dark:border-white/10">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50">
            Lịch sử các bộ phim đã xem
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tự động ghi nhớ từng tập đã xem để bạn quay lại xem tiếp tập tiếp theo chỉ với một chạm.
          </p>
        </div>

        {watchHistory.length > 0 && (
          <div className="flex items-center gap-2">
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-zinc-900/12 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:border-rose-500/40 hover:text-rose-600 dark:border-white/12 dark:text-zinc-400 dark:hover:text-rose-400 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa tất cả lịch sử</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setConfirmClear(false);
                  }}
                  className="min-h-[40px] rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
                >
                  Xác nhận xóa
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[40px] rounded-lg border border-zinc-900/12 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:border-white/12 dark:text-zinc-300 cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {watchHistory.length === 0 ? (
        <div className="rounded-2xl border border-zinc-900/10 bg-white p-12 text-center dark:border-white/10 dark:bg-[#101015]">
          <Clock className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Chưa có lịch sử xem phim
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Khi bạn mở xem một bộ phim, tập đang xem và tập tiếp theo sẽ tự động lưu tại đây.
          </p>
          <button
            type="button"
            onClick={onExploreClick}
            className="mt-5 min-h-[44px] rounded-lg bg-[#9A7418] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#826112] dark:bg-[#D4AF37] dark:text-[#09090B] cursor-pointer"
          >
            Chọn phim để xem
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {watchHistory.map((entry) => {
            const pct =
              entry.durationSeconds > 0
                ? Math.min(100, Math.round((entry.progressSeconds / entry.durationSeconds) * 100))
                : 0;
            const dateLabel = new Date(entry.watchedAt).toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
            const watchedEpCount = entry.watchedEpisodes?.length || 1;
            const totalEpsText =
              entry.episodeTotal && entry.episodeTotal > 1
                ? `${watchedEpCount}/${entry.episodeTotal} tập`
                : `${watchedEpCount} tập`;

            return (
              <div
                key={entry.slug}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-900/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-[#101015]"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="skeleton-shimmer relative h-24 w-16 shrink-0 overflow-hidden rounded-lg">
                    <img
                      src={entry.posterUrl || entry.thumbUrl}
                      alt={entry.name}
                      referrerPolicy="no-referrer"
                      className="relative z-10 h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {entry.name}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      Đã xem tới <span className="font-semibold text-zinc-800 dark:text-zinc-200">{entry.episodeName}</span> · {totalEpsText} · {entry.serverName} · {dateLabel}
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-1.5 w-36 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                        <div
                          className="h-full bg-[#9A7418] dark:bg-[#D4AF37]"
                          style={{ width: `${Math.max(8, pct)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {entry.durationSeconds > 0
                          ? `${formatDurationSeconds(entry.progressSeconds)} / ${formatDurationSeconds(entry.durationSeconds)}`
                          : 'Đã lưu tiến độ'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {entry.nextEpisodeSlug && entry.nextEpisodeName ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectMovie(entry.slug, entry.nextEpisodeSlug)}
                        className="btn-cinema-gold inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
                      >
                        <span>Xem tiếp {entry.nextEpisodeName}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectMovie(entry.slug, entry.episodeSlug)}
                        className="btn-cinema-surface inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>{entry.episodeName}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectMovie(entry.slug, entry.episodeSlug)}
                      className="btn-cinema-gold inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Xem tiếp {entry.episodeName}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label={`Xóa ${entry.name} khỏi lịch sử`}
                    onClick={() => onRemoveHistoryItem(entry.slug)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-900/12 text-zinc-500 hover:border-rose-500/40 hover:text-rose-600 dark:border-white/12 dark:text-zinc-400 dark:hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
