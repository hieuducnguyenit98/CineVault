import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Film, KeyRound, Lock, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../types/movie';
import { verifyAccessCodeApi } from '../services/movieApi';
import { normalizeAccessCodeInput, validateAccessCodeInput } from '../utils/accessGate';

interface AccessGateProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onUnlocked: (token: string, remember?: boolean) => void;
}

export function AccessGate({ theme, onToggleTheme, onUnlocked }: AccessGateProps) {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validationError = validateAccessCodeInput(code);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const normalized = normalizeAccessCodeInput(code);
      const res = await verifyAccessCodeApi(normalized);
      if (res.unlocked && res.token) {
        onUnlocked(res.token, rememberMe);
      } else {
        setError('Mã truy cập không chính xác. Vui lòng kiểm tra lại.');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể xác thực mã truy cập. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#F6F5F2] text-zinc-900 dark:bg-[#070709] dark:text-zinc-100 transition-colors">
      {/* Ambient cinematic vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-36 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-[120px] dark:bg-[#D4AF37]/12" />
      </div>

      {/* Minimal Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#9A7418]/35 bg-gradient-to-br from-[#FBF6E6] to-[#EFE2B8] text-[#9A7418] shadow-sm dark:border-[#D4AF37]/40 dark:from-[#1B1710] dark:to-[#0F0D09] dark:text-[#F0D075]">
            <Film className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight whitespace-nowrap">
            <span className="text-zinc-950 dark:text-white">Cine</span>
            <span className="text-[#9A7418] dark:text-[#E6C25A]">Vault</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          className="btn-cinema-surface inline-flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-[#D4AF37]" />
          ) : (
            <Moon className="h-4 w-4 text-[#9A7418]" />
          )}
        </button>
      </header>

      {/* Centered Unlock Card */}
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 items-center px-4 py-8">
        <section
          aria-label="Xác thực quyền truy cập"
          className="w-full rounded-2xl border border-zinc-900/12 bg-white/95 p-6 sm:p-8 shadow-2xl shadow-black/10 backdrop-blur-md dark:border-white/12 dark:bg-[#101015]/95 dark:shadow-black/60"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#9A7418]/30 bg-[#9A7418]/10 text-[#9A7418] dark:border-[#D4AF37]/30 dark:bg-[#D4AF37]/10 dark:text-[#F0D075]">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold leading-[1.18] text-zinc-950 dark:text-white text-balance">
              Không gian chiếu phim riêng tư
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Vui lòng nhập mã truy cập được cấp để mở khóa toàn bộ kho phim. Mã hợp lệ sẽ được lưu cho những lần truy cập sau.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="cinevault-access-code"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                Mã truy cập
              </label>
              <div className="relative">
                <KeyRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                />
                <input
                  id="cinevault-access-code"
                  type={showCode ? 'text' : 'password'}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="Nhập mã truy cập..."
                  aria-invalid={Boolean(error)}
                  className="h-12 w-full rounded-xl border border-zinc-900/15 bg-[#F6F5F2] pl-10 pr-11 font-mono text-sm tracking-[0.14em] text-zinc-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-zinc-400 focus:border-[#9A7418] focus:outline-none dark:border-white/15 dark:bg-[#070709] dark:text-zinc-100 dark:focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={() => setShowCode((prev) => !prev)}
                  aria-label={showCode ? 'Ẩn mã truy cập' : 'Hiện mã truy cập'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#9A7418] focus:ring-[#9A7418] dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-[#D4AF37] accent-[#D4AF37] cursor-pointer"
              />
              <span>Ghi nhớ mở khóa trên trình duyệt này (không bắt nhập lại ở những lần truy cập sau)</span>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-cinema-gold flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              <span>{submitting ? 'Đang xác thực...' : 'Mở khóa rạp phim'}</span>
            </button>
          </form>
        </section>
      </main>

      <footer className="relative z-10 py-5 text-center text-xs text-zinc-500 dark:text-zinc-500">
        CineVault — Quyền truy cập dành riêng cho thành viên được cấp mã
      </footer>
    </div>
  );
}
