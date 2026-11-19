export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton-shimmer ${className}`} />;
}

export function MovieCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-zinc-900/10 dark:border-white/10">
        <SkeletonBlock className="h-full w-full" />
        <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
          <div className="h-3 w-14 rounded bg-black/15 dark:bg-white/10" />
          <div className="h-3 w-7 rounded bg-black/15 dark:bg-white/10" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5 px-0.5">
        <SkeletonBlock className="h-4 w-5/6 rounded-md" />
        <SkeletonBlock className="h-3 w-3/5 rounded-md" />
        <SkeletonBlock className="h-3 w-2/3 rounded-md" />
      </div>
    </div>
  );
}

export function MovieGridSkeleton({
  count = 12,
  label = 'Đang tải danh sách phim',
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-skeleton="movie-grid"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, idx) => (
        <MovieCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function FilterChipsRowSkeleton({ labelWidth = 'w-24' }: { labelWidth?: string }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SkeletonBlock className={`h-3.5 ${labelWidth} shrink-0 rounded`} />
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {[64, 82, 76, 70, 78, 92, 68, 74, 80, 86].map((w, i) => (
          <SkeletonBlock
            key={i}
            className="h-[34px] rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}

export function FilterChipListSkeleton({ count = 10 }: { count?: number }) {
  const widths = ['w-16', 'w-20', 'w-20', 'w-18', 'w-22', 'w-16', 'w-20', 'w-20', 'w-22', 'w-24'];
  return (
    <div aria-hidden="true" className="flex flex-1 flex-wrap items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={`h-[34px] ${widths[i % widths.length]} rounded-lg`}
        />
      ))}
    </div>
  );
}

export function HeroSpotlightSkeleton() {
  return (
    <section
      role="status"
      aria-busy="true"
      aria-label="Đang tải phim tiêu điểm"
      data-skeleton="hero-spotlight"
      className="relative w-full overflow-hidden border-b border-zinc-900/12 dark:border-white/10 bg-gradient-to-br from-[#EAE6DC] via-[#DFDBD0] to-[#D4CFC2] dark:from-[#15151C] dark:via-[#0D0D12] dark:to-[#070709]"
    >
      <span className="sr-only">Đang tải phim tiêu điểm</span>
      <div className="relative flex min-h-[430px] w-full items-end sm:min-h-[540px] lg:min-h-[620px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent dark:from-[#070709]/85 dark:via-[#070709]/40 dark:to-transparent"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-end px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
          <div className="max-w-2xl space-y-4">
            <SkeletonBlock className="h-3.5 w-64 rounded-md bg-zinc-900/12 dark:bg-white/12" />
            <div className="space-y-2.5">
              <SkeletonBlock className="h-10 sm:h-12 w-4/5 rounded-lg bg-zinc-900/14 dark:bg-white/14" />
              <SkeletonBlock className="h-10 sm:h-12 w-3/5 rounded-lg bg-zinc-900/14 dark:bg-white/14" />
            </div>
            <SkeletonBlock className="h-4 w-72 rounded-md bg-zinc-900/10 dark:bg-white/10" />
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <SkeletonBlock className="h-[46px] w-40 rounded-lg bg-[#9A7418]/25 dark:bg-[#D4AF37]/25" />
              <SkeletonBlock className="h-[46px] w-36 rounded-lg bg-zinc-900/12 dark:bg-white/12" />
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-zinc-900/10 dark:border-white/12 pt-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <SkeletonBlock className="h-1.5 w-10 sm:w-12 rounded-full bg-[#9A7418]/35 dark:bg-[#D4AF37]/40" />
              {Array.from({ length: 9 }).map((_, idx) => (
                <SkeletonBlock
                  key={idx}
                  className="h-1.5 w-2.5 sm:w-3.5 rounded-full bg-zinc-900/15 dark:bg-white/15"
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-10 w-10 rounded-lg bg-zinc-900/12 dark:bg-white/12" />
              <SkeletonBlock className="h-10 w-10 rounded-lg bg-zinc-900/12 dark:bg-white/12" />
              <SkeletonBlock className="h-10 w-10 rounded-lg bg-zinc-900/12 dark:bg-white/12" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function GenreShelvesSkeleton({ shelvesCount = 3 }: { shelvesCount?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Đang tải danh sách phim theo từng thể loại"
      data-skeleton="genre-shelves"
      className="space-y-10"
    >
      <span className="sr-only">Đang tải danh sách phim theo từng thể loại</span>
      {Array.from({ length: shelvesCount }).map((_, idx) => (
        <div
          key={idx}
          className="space-y-4 border-t border-zinc-900/10 pt-8 dark:border-white/10"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <SkeletonBlock className="h-8 w-48 rounded-lg" />
              <SkeletonBlock className="h-3.5 w-72 max-w-full rounded-md" />
            </div>
            <SkeletonBlock className="h-10 w-36 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((__, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TheaterDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Đang tải chi tiết phim và trình phát"
      data-skeleton="theater-detail"
      className="space-y-8"
    >
      <span className="sr-only">Đang tải chi tiết phim và trình phát</span>

      {/* Top Action Row Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SkeletonBlock className="h-[44px] w-44 rounded-lg" />
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonBlock className="h-[44px] w-44 rounded-lg" />
          <SkeletonBlock className="h-[44px] w-36 rounded-lg" />
        </div>
      </div>

      {/* Video Theater Stage Skeleton */}
      <div className="overflow-hidden rounded-2xl border border-zinc-900/12 bg-[#0D0D11] dark:border-[#D4AF37]/20 shadow-2xl shadow-black/25">
        <div className="relative aspect-video w-full bg-gradient-to-b from-[#17171F] via-[#101016] to-[#08080B]">
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <SkeletonBlock className="h-16 w-16 rounded-full border border-white/15 bg-white/10" />
            <SkeletonBlock className="h-3 w-36 rounded-md bg-white/10" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-[#0D0D11] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-4 w-56 rounded-md bg-white/10" />
            <SkeletonBlock className="h-3.5 w-24 rounded-md bg-white/10" />
          </div>
          <SkeletonBlock className="h-7 w-36 rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Movie Info + Episode List Grid Skeleton */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="space-y-2.5">
            <SkeletonBlock className="h-6 w-44 rounded-md" />
            <SkeletonBlock className="h-3.5 w-64 rounded-md" />
            <SkeletonBlock className="h-10 w-5/6 rounded-lg" />
            <SkeletonBlock className="h-4 w-56 rounded-md" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SkeletonBlock className="h-[44px] w-36 rounded-lg" />
            <SkeletonBlock className="h-[44px] w-32 rounded-lg" />
            <SkeletonBlock className="h-[44px] w-32 rounded-lg" />
          </div>

          <div className="space-y-4 border-t border-zinc-900/10 pt-5 dark:border-white/10">
            <SkeletonBlock className="h-5 w-32 rounded-md" />
            <div className="space-y-2">
              <SkeletonBlock className="h-3.5 w-full rounded" />
              <SkeletonBlock className="h-3.5 w-full rounded" />
              <SkeletonBlock className="h-3.5 w-11/12 rounded" />
              <SkeletonBlock className="h-3.5 w-3/4 rounded" />
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <SkeletonBlock className="h-3 w-16 rounded" />
                <SkeletonBlock className="h-4 w-44 rounded" />
              </div>
              <div className="space-y-1.5">
                <SkeletonBlock className="h-3 w-16 rounded" />
                <SkeletonBlock className="h-4 w-36 rounded" />
              </div>
              <div className="space-y-1.5">
                <SkeletonBlock className="h-3 w-16 rounded" />
                <SkeletonBlock className="h-4 w-40 rounded" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <SkeletonBlock className="h-3 w-20 rounded" />
                <SkeletonBlock className="h-4 w-3/4 rounded" />
              </div>
            </div>
          </div>
        </div>

        <div className="h-fit space-y-4 rounded-2xl border border-zinc-900/10 bg-white p-5 dark:border-white/10 dark:bg-[#101015] lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1.5">
              <SkeletonBlock className="h-5 w-36 rounded-md" />
              <SkeletonBlock className="h-3 w-48 rounded" />
            </div>
            <div className="flex items-center gap-1.5">
              <SkeletonBlock className="h-7 w-20 rounded-md" />
              <SkeletonBlock className="h-7 w-24 rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 12 }).map((_, idx) => (
              <SkeletonBlock key={idx} className="h-[40px] rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Similar Movies Skeleton */}
      <section className="space-y-4 border-t border-zinc-900/10 pt-8 dark:border-white/10">
        <SkeletonBlock className="h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <MovieCardSkeleton key={idx} />
          ))}
        </div>
      </section>
    </div>
  );
}
