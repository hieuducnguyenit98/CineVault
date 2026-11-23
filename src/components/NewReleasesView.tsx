import { useMemo, useState } from 'react';
import { BellDot, CheckCheck, Film, Layers, Mic, Play, RefreshCw, RotateCcw } from 'lucide-react';
import type {
  DailyNewMovieEntry,
  DailyUpdatesResponse,
  WatchHistoryEntry,
} from '../types/movie';
import { formatVietnamDateDisplay, formatVietnamTimeHHMM } from '../utils/dailyUpdates';
import { hasVietnameseNarration } from '../utils/movieNormalizer';
import { MovieCard } from './MovieCard';
import { MovieGridSkeleton } from './Skeletons';

export type NewReleasesFilter = 'all' | 'unread' | 'regular' | 'dubbed' | 'ai-short';

interface NewReleasesViewProps {
  data: DailyUpdatesResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshFeedback: string | null;
  acknowledgedSlugs: string[];
  unreadCount: number;
  watchHistory: WatchHistoryEntry[];
  onRefreshNow: () => void;
  onMarkAllRead: () => void;
  onRetry: () => void;
  onSelectMovie: (slug: string, episodeSlug?: string) => void;
}

export function NewReleasesView({
  data,
  loading,
  refreshing,
  error,
  refreshFeedback,
  acknowledgedSlugs,
  unreadCount,
  watchHistory,
  onRefreshNow,
  onMarkAllRead,
  onRetry,
  onSelectMovie,
}: NewReleasesViewProps) {
  const [filter, setFilter] = useState<NewReleasesFilter>('all');

  const ackSet = useMemo(() => new Set(acknowledgedSlugs), [acknowledgedSlugs]);
  const historyMap = useMemo(
    () => new Map(watchHistory.map((h) => [h.slug, h])),
    [watchHistory]
  );

  const entries = data?.entries ?? [];

  const counts = useMemo(() => {
    let unread = 0;
    let regular = 0;
    let dubbed = 0;
    let aiShort = 0;
    let newToday = 0;
    for (const entry of entries) {
      if (entry.isNewToday) {
        newToday += 1;
        if (!ackSet.has(entry.movie.slug)) unread += 1;
      }
      if (entry.sourceCategory === 'regular') regular += 1;
      else if (entry.sourceCategory === 'dubbed') dubbed += 1;
      else if (entry.sourceCategory === 'ai-short') aiShort += 1;
    }
    return { total: entries.length, unread, newToday, regular, dubbed, aiShort };
  }, [entries, ackSet]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filter === 'unread') {
        return entry.isNewToday && !ackSet.has(entry.movie.slug);
      }
      if (filter === 'regular') return entry.sourceCategory === 'regular';
      if (filter === 'dubbed') return entry.sourceCategory === 'dubbed';
      if (filter === 'ai-short') return entry.sourceCategory === 'ai-short';
      return true;
    });
  }, [entries, filter, ackSet]);

  const portraitEntries = useMemo(
    () => filteredEntries.filter((e) => e.sourceCategory !== 'ai-short'),
    [filteredEntries]
  );
  const aiEntries = useMemo(
    () => filteredEntries.filter((e) => e.sourceCategory === 'ai-short'),
    [filteredEntries]
  );

  const filterTabs: Array<{ id: NewReleasesFilter; label: string; count: number }> = [
    { id: 'all', label: 'Tất cả hôm nay', count: counts.total },
    { id: 'unread', label: 'Chưa xem thông báo', count: counts.unread },
    { id: 'regular', label: 'Phim Bộ & Lẻ', count: counts.regular },
    { id: 'dubbed', label: 'Thuyết Minh', count: counts.dubbed },
    { id: 'ai-short', label: 'Phim Ngắn AI', count: counts.aiShort },
  ];

  const dateLabel = data?.dateKey ? formatVietnamDateDisplay(data.dateKey) : 'Hôm nay';
  const lastUpdatedLabel = data?.lastUpdatedAt ? formatVietnamTimeHHMM(data.lastUpdatedAt) : '';

  const isEntryUnread = (entry: DailyNewMovieEntry): boolean =>
    entry.isNewToday && !ackSet.has(entry.movie.slug);

  return (
    <div className="space-y-8">
      {/* Editorial Auto-Update Header */}
      <section
        aria-label="Phim Mới Cập Nhật Mỗi Ngày"
        className="space-y-5 rounded-2xl border border-zinc-900/10 bg-white/85 p-5 sm:p-7 backdrop-blur-sm dark:border-white/10 dark:bg-[#101015]/90"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A7418] dark:text-[#D4AF37]">
              <BellDot className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Tự động cập nhật hằng ngày · {dateLabel}
                {lastUpdatedLabel ? ` · Đồng bộ lúc ${lastUpdatedLabel}` : ''}
              </span>
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold leading-[1.18] text-zinc-900 dark:text-zinc-50 text-balance">
              Phim Mới Cập Nhật Hôm Nay
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Hệ thống tự động quét phim mới phát hành, tập mới và phim ngắn AI Trung Quốc mỗi ngày để thông báo kịp thời ngay khi có tập mới.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={refreshing || loading}
              onClick={onRefreshNow}
              className="btn-cinema-gold inline-flex min-h-[40px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{refreshing ? 'Đang kiểm tra...' : 'Kiểm tra phim mới'}</span>
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="btn-cinema-surface inline-flex min-h-[40px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                <CheckCheck className="h-3.5 w-3.5 text-[#9A7418] dark:text-[#D4AF37]" aria-hidden="true" />
                <span>Đánh dấu đã xem ({unreadCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Unboxed Status & Feedback Line */}
        {!loading && data && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900/8 pt-3.5 text-xs text-zinc-600 dark:border-white/8 dark:text-zinc-400">
            <p className="font-mono tabular-nums">
              {counts.newToday} phim mới phát hiện hôm nay · {unreadCount} chưa xem · {counts.total} phim đang theo dõi
            </p>
            {refreshFeedback && (
              <p role="status" className="font-medium text-[#9A7418] dark:text-[#F0D075]">
                {refreshFeedback}
              </p>
            )}
          </div>
        )}

        {/* Interactive Filter Tabs */}
        <div
          className="flex flex-wrap items-center gap-1.5 border-t border-zinc-900/8 pt-4 dark:border-white/8"
          role="group"
          aria-label="Lọc danh sách phim mới theo nhóm nguồn"
        >
          {filterTabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(tab.id)}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                    : 'border border-zinc-900/10 bg-[#F6F5F2] text-zinc-700 hover:border-[#9A7418]/40 hover:text-zinc-950 dark:border-white/10 dark:bg-[#070709] dark:text-zinc-300 dark:hover:border-[#D4AF37]/40 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[11px] opacity-75 tabular-nums">{tab.count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Catalog Content */}
      {loading ? (
        <MovieGridSkeleton count={12} label="Đang tải danh sách phim mới cập nhật" />
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
      ) : filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-900/10 bg-white p-12 text-center dark:border-white/10 dark:bg-[#101015]">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {filter === 'unread'
              ? 'Bạn đã xem hết thông báo phim mới hôm nay'
              : 'Chưa có phim mới trong nhóm lọc này'}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {filter === 'unread'
              ? 'Hệ thống sẽ tự động kiểm tra lại trong ngày hoặc khi sang ngày mới.'
              : 'Thử chuyển sang Tất cả hôm nay hoặc bấm Kiểm tra phim mới.'}
          </p>
          {filter !== 'all' && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-4 min-h-[44px] rounded-lg border border-zinc-900/15 px-5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10 cursor-pointer"
            >
              Xem tất cả phim mới hôm nay
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {portraitEntries.length > 0 && (
            <section aria-label="Phim bộ, phim lẻ và thuyết minh mới" className="space-y-4">
              <div className="flex items-baseline justify-between gap-3 border-b border-zinc-900/10 pb-2.5 dark:border-white/10">
                <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Phim Bộ, Lẻ &amp; Thuyết Minh Mới
                </h2>
                <span className="shrink-0 whitespace-nowrap font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {portraitEntries.length} phim
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {portraitEntries.map((entry) => {
                  const hist = historyMap.get(entry.movie.slug);
                  return (
                    <MovieCard
                      key={entry.movie.slug}
                      movie={entry.movie}
                      isNew={isEntryUnread(entry)}
                      watchedEpisodeLabel={hist ? `Đã xem ${hist.episodeName}` : undefined}
                      onSelect={(s) =>
                        onSelectMovie(s, hist?.nextEpisodeSlug || hist?.episodeSlug)
                      }
                    />
                  );
                })}
              </div>
            </section>
          )}

          {aiEntries.length > 0 && (
            <section aria-label="Phim ngắn AI Trung Quốc mới" className="space-y-4">
              <div className="flex items-baseline justify-between gap-3 border-b border-zinc-900/10 pb-2.5 dark:border-white/10">
                <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Phim Ngắn AI Trung Quốc Mới
                </h2>
                <span className="shrink-0 whitespace-nowrap font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {aiEntries.length} phim
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {aiEntries.map((entry) => {
                  const movie = entry.movie;
                  const hist = historyMap.get(movie.slug);
                  const isNarrated = hasVietnameseNarration(movie);
                  const groupParts =
                    movie.groupParts && movie.groupParts.length > 1 ? movie.groupParts : null;
                  const unread = isEntryUnread(entry);
                  return (
                    <button
                      key={movie.slug}
                      type="button"
                      onClick={() =>
                        onSelectMovie(movie.slug, hist?.nextEpisodeSlug || hist?.episodeSlug)
                      }
                      aria-label={`Xem phim ${movie.name}${unread ? ' (Phim mới hôm nay)' : ''}`}
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

                          <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                            {unread && (
                              <span className="inline-flex items-center rounded-md bg-[#E11D48] px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-md">
                                Mới
                              </span>
                            )}
                            {groupParts && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-[#D4AF37]/50 bg-[#09090B]/85 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#F0D075] shadow-md backdrop-blur-sm">
                                <Layers className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span>Bộ {groupParts.length} phần</span>
                              </span>
                            )}
                          </div>

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
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
