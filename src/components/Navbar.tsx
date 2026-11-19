import { Compass, History, Heart, Mic, RefreshCw, Search, Sparkles, Sun, Moon } from 'lucide-react';
import type { ThemeMode } from '../types/movie';

export type ActiveTab = 'explore' | 'dubbed' | 'recommendations' | 'history' | 'favorites' | 'sync';

interface NavbarProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onFocusSearch: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  historyCount: number;
  favoritesCount: number;
}

export function Navbar({
  activeTab,
  onNavigate,
  onFocusSearch,
  theme,
  onToggleTheme,
  historyCount,
  favoritesCount,
}: NavbarProps) {
  const navItems: Array<{ id: ActiveTab; label: string; count?: number }> = [
    { id: 'explore', label: 'Khám phá' },
    { id: 'dubbed', label: 'Thuyết minh' },
    { id: 'recommendations', label: 'Gợi ý' },
    { id: 'history', label: 'Lịch sử', count: historyCount },
    { id: 'favorites', label: 'Yêu thích', count: favoritesCount },
  ];

  return (
    <>
      {/* Desktop Top Bar (Refined Luxury 3-Zone Header) */}
      <header className="sticky top-0 z-40 border-b border-zinc-900/10 bg-[#F5F3EE]/88 backdrop-blur-xl shadow-[0_8px_28px_-18px_rgba(24,24,27,0.22)] dark:border-white/[0.09] dark:bg-[#08080C]/85 dark:shadow-[0_14px_38px_-18px_rgba(0,0,0,0.85)]">
        {/* Subtle top champagne gold hairline */}
        <div
          aria-hidden="true"
          className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#9A7418]/50 to-transparent dark:via-[#D4AF37]/60"
        />

        <div className="mx-auto flex h-14 md:h-[62px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Custom Monogram + Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="group inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 rounded-lg py-1 pr-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#9A7418]/35 bg-gradient-to-br from-[#9A7418]/12 to-transparent text-[#9A7418] transition-colors group-hover:border-[#9A7418]/65 dark:border-[#D4AF37]/35 dark:from-[#D4AF37]/15 dark:text-[#D4AF37] dark:group-hover:border-[#D4AF37]/70">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="4.5"
                  width="18"
                  height="15"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <path
                  d="M10.25 9.25L15.25 12L10.25 14.75V9.25Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="font-display text-[24px] font-bold tracking-tight text-zinc-950 dark:text-zinc-50 leading-none">
              Cine<span className="text-[#9A7418] dark:text-[#D4AF37]">Vault</span>
            </span>
          </button>

          {/* Zone 2: 5 Clean Editorial Nav Links */}
          <nav
            className="hidden md:flex items-center gap-1 lg:gap-2"
            aria-label="Điều hướng chính"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`group relative inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13.5px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                    isActive
                      ? 'text-[#9A7418] dark:text-[#F0D075]'
                      : 'text-zinc-600 hover:bg-zinc-900/[0.045] hover:text-zinc-950 dark:text-zinc-300/85 dark:hover:bg-white/[0.05] dark:hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span
                      className={`font-mono text-[11px] tabular-nums transition-colors ${
                        isActive
                          ? 'text-[#9A7418] dark:text-[#D4AF37]'
                          : 'text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-3 -bottom-[9px] h-[2px] rounded-full bg-gradient-to-r from-[#9A7418]/70 via-[#9A7418] to-[#9A7418]/70 dark:from-[#D4AF37]/60 dark:via-[#F0D075] dark:to-[#D4AF37]/60 dark:shadow-[0_0_12px_rgba(212,175,55,0.65)] transition-all duration-250 ease-out origin-center ${
                      isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0 group-hover:scale-x-50 group-hover:opacity-40'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Metallic Primary CTA on Desktop + >=44px Mobile Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onFocusSearch}
              aria-label="Tìm kiếm phim"
              className="md:hidden inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('sync')}
              aria-label="Đồng bộ đa nền tảng"
              className={`md:hidden inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg ${
                activeTab === 'sync'
                  ? 'text-[#9A7418] dark:text-[#D4AF37]'
                  : 'text-zinc-700 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/5'
              }`}
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              className="md:hidden inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('sync')}
              className={`hidden md:inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                activeTab === 'sync'
                  ? 'border border-zinc-900/20 bg-zinc-900 text-white shadow-sm dark:border-white/25 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'btn-cinema-gold'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Đồng bộ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation */}
      <nav
        aria-label="Điều hướng di động"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-900/10 bg-[#F5F3EE]/95 backdrop-blur-xl dark:border-white/10 dark:bg-[#08080C]/95"
      >
        <div className="grid grid-cols-5 h-[58px]">
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium whitespace-nowrap ${
              activeTab === 'explore'
                ? 'text-[#9A7418] dark:text-[#D4AF37]'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Compass className="h-5 w-5" />
            <span>Khám phá</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dubbed')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium whitespace-nowrap ${
              activeTab === 'dubbed'
                ? 'text-[#9A7418] dark:text-[#D4AF37]'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Mic className="h-5 w-5" />
            <span>Thuyết minh</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('recommendations')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium whitespace-nowrap ${
              activeTab === 'recommendations'
                ? 'text-[#9A7418] dark:text-[#D4AF37]'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span>Gợi ý</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium whitespace-nowrap ${
              activeTab === 'history'
                ? 'text-[#9A7418] dark:text-[#D4AF37]'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <History className="h-5 w-5" />
            <span>Lịch sử</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('favorites')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'text-[#9A7418] dark:text-[#D4AF37]'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Heart className="h-5 w-5" />
            <span>Yêu thích</span>
          </button>
        </div>
      </nav>
    </>
  );
}
