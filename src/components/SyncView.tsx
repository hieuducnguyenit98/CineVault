import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, CloudUpload, Copy, Download, Link2, RefreshCw, Upload } from 'lucide-react';
import type { UserDataState } from '../types/movie';
import { decodePortableToken, encodePortableToken, sanitizeSyncKey } from '../utils/syncStorage';

interface SyncViewProps {
  userState: UserDataState;
  lastSyncedAt: number | null;
  syncBusy: boolean;
  syncFeedback: string | null;
  onPushSync: () => Promise<void>;
  onConnectSyncKey: (code: string) => Promise<void>;
  onImportState: (incoming: UserDataState) => void;
}

export function SyncView({
  userState,
  lastSyncedAt,
  syncBusy,
  syncFeedback,
  onPushSync,
  onConnectSyncKey,
  onImportState,
}: SyncViewProps) {
  const [targetCode, setTargetCode] = useState('');
  const [portableInput, setPortableInput] = useState('');
  const [copiedField, setCopiedField] = useState<'code' | 'link' | 'token' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?sync=${encodeURIComponent(userState.syncKey)}`
      : '';

  const copyText = async (text: string, field: 'code' | 'link' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2200);
    } catch {
      setLocalError('Trình duyệt không cho phép sao chép tự động, vui lòng sao chép thủ công.');
    }
  };

  const handleLinkSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const cleaned = sanitizeSyncKey(targetCode);
    if (cleaned.length < 4) {
      setLocalError('Vui lòng nhập mã đồng bộ hợp lệ (ít nhất 4 ký tự).');
      return;
    }
    await onConnectSyncKey(cleaned);
    setTargetCode('');
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(userState, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinevault-backup-${userState.syncKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as UserDataState;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.watchHistory)) {
        setLocalError('Tệp sao lưu JSON không đúng định dạng CineVault.');
        return;
      }
      onImportState(parsed);
    } catch {
      setLocalError('Không thể đọc tệp JSON này.');
    } finally {
      e.target.value = '';
    }
  };

  const handleImportToken = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const decoded = decodePortableToken(portableInput);
    if (!decoded) {
      setLocalError('Mã dữ liệu di động không hợp lệ hoặc bị thiếu ký tự.');
      return;
    }
    onImportState(decoded);
    setPortableInput('');
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-2 border-b border-zinc-900/10 pb-4 dark:border-white/10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
          Đồng bộ dữ liệu đa nền tảng
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Dữ liệu được lưu tức thì trong <span className="font-mono">localStorage</span> của thiết bị và có thể đồng bộ giữa Máy tính, Điện thoại hoặc sao lưu tệp JSON.
        </p>
      </div>

      {/* Feedback Banner */}
      {(syncFeedback || localError) && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            localError
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : 'border-[#9A7418]/40 bg-[#9A7418]/10 text-zinc-900 dark:border-[#D4AF37]/40 dark:bg-[#D4AF37]/10 dark:text-zinc-100'
          }`}
        >
          {localError || syncFeedback}
        </div>
      )}

      {/* Active Device Sync Code Card */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-[#121216]">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Mã đồng bộ của thiết bị này
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Dùng mã này hoặc liên kết nhanh để đồng bộ lịch sử xem sang điện thoại / máy tính khác.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-900/10 bg-zinc-50 px-4 py-3 dark:border-white/10 dark:bg-[#09090B]">
            <span className="font-mono text-lg font-semibold tracking-wider text-[#9A7418] dark:text-[#D4AF37] tabular-nums">
              {userState.syncKey}
            </span>
            <button
              type="button"
              onClick={() => copyText(userState.syncKey, 'code')}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-zinc-900/12 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-white/12 dark:bg-white/10 dark:text-zinc-100 cursor-pointer"
            >
              {copiedField === 'code' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedField === 'code' ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={syncBusy}
              onClick={onPushSync}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#9A7418] px-4 py-2 text-xs font-semibold text-white hover:bg-[#826112] disabled:opacity-50 dark:bg-[#D4AF37] dark:text-[#09090B] cursor-pointer"
            >
              <CloudUpload className="h-4 w-4" />
              <span>{syncBusy ? 'Đang đồng bộ...' : 'Đồng bộ lên máy chủ'}</span>
            </button>

            <button
              type="button"
              onClick={() => copyText(shareUrl, 'link')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-900/12 bg-white px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-white/12 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10 cursor-pointer"
            >
              <Link2 className="h-4 w-4" />
              <span>{copiedField === 'link' ? 'Đã chép liên kết' : 'Sao chép liên kết đồng bộ'}</span>
            </button>
          </div>

          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            Đang lưu cục bộ: {userState.watchHistory.length} phim đã xem · {userState.likedMovies.length} yêu thích · {userState.preferredGenres.length} thể loại
            {lastSyncedAt
              ? ` · Đồng bộ lúc ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}`
              : ''}
          </p>
        </div>

        {/* Connect to Existing Sync Key */}
        <form
          onSubmit={handleLinkSubmit}
          className="space-y-4 rounded-2xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-[#121216]"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Kết nối từ thiết bị khác
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Nhập mã đồng bộ từ thiết bị cũ để tải và gộp lịch sử xem mà không làm mất dữ liệu hiện tại.
            </p>
          </div>

          <div>
            <label htmlFor="connect-sync-code" className="sr-only">
              Nhập mã đồng bộ
            </label>
            <input
              id="connect-sync-code"
              type="text"
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value)}
              placeholder="Ví dụ: CINE-7K9P-2026"
              className="h-11 w-full rounded-xl border border-zinc-900/12 bg-zinc-50 px-3.5 font-mono text-sm uppercase text-zinc-900 placeholder:normal-case placeholder:text-zinc-400 focus:border-[#9A7418] focus:outline-none dark:border-white/12 dark:bg-[#09090B] dark:text-zinc-100 dark:focus:border-[#D4AF37]"
            />
          </div>

          <button
            type="submit"
            disabled={syncBusy}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Tải & Hợp nhất dữ liệu</span>
          </button>
        </form>
      </section>

      {/* Portable Offline Backup & Import */}
      <section className="space-y-5 rounded-2xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-[#121216]">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Sao lưu & Di chuyển dữ liệu ngoại tuyến
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Xuất tệp JSON hoặc sao chép chuỗi mã hóa để khôi phục dữ liệu bất kỳ lúc nào.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-900/12 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/12 dark:text-zinc-200 dark:hover:bg-white/10 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Xuất bản sao lưu (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-900/12 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/12 dark:text-zinc-200 dark:hover:bg-white/10 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>Nhập từ tệp (.json)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => copyText(encodePortableToken(userState), 'token')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-900/12 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/12 dark:text-zinc-200 dark:hover:bg-white/10 cursor-pointer"
          >
            <Copy className="h-4 w-4" />
            <span>
              {copiedField === 'token' ? 'Đã chép mã di động' : 'Sao chép mã dữ liệu di động'}
            </span>
          </button>
        </div>

        <form onSubmit={handleImportToken} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="portable-token-input" className="sr-only">
            Dán mã dữ liệu di động
          </label>
          <input
            id="portable-token-input"
            type="text"
            value={portableInput}
            onChange={(e) => setPortableInput(e.target.value)}
            placeholder="Dán mã dữ liệu di động vào đây để khôi phục..."
            className="h-11 flex-1 rounded-xl border border-zinc-900/12 bg-zinc-50 px-3.5 font-mono text-xs text-zinc-900 placeholder:font-sans placeholder:text-zinc-400 focus:border-[#9A7418] focus:outline-none dark:border-white/12 dark:bg-[#09090B] dark:text-zinc-100 dark:focus:border-[#D4AF37]"
          />
          <button
            type="submit"
            className="min-h-[44px] rounded-xl border border-zinc-900/15 px-5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-100 dark:hover:bg-white/10 cursor-pointer whitespace-nowrap"
          >
            Khôi phục từ mã
          </button>
        </form>
      </section>
    </div>
  );
}
