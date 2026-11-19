export type PlayerShortcutAction =
  | 'toggle_play'
  | 'seek_backward_5'
  | 'seek_forward_5'
  | 'seek_backward_10'
  | 'seek_forward_10'
  | 'toggle_mute'
  | 'volume_up'
  | 'volume_down'
  | 'toggle_fullscreen'
  | 'toggle_pip'
  | 'next_episode'
  | 'toggle_help';

export interface ShortcutKeyEventLike {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface ShortcutHintItem {
  keys: string[];
  label: string;
  description: string;
}

export const PLAYER_SHORTCUT_HINTS: ShortcutHintItem[] = [
  { keys: ['Space', 'K'], label: 'Phát / Tạm dừng', description: 'Chuyển trạng thái phát hoặc tạm dừng video' },
  { keys: ['←', '→'], label: 'Tua ±5 giây', description: 'Tua lùi hoặc tua tới nhanh 5 giây' },
  { keys: ['J', 'L'], label: 'Tua ±10 giây', description: 'Tua lùi hoặc tua tới 10 giây' },
  { keys: ['M'], label: 'Tắt / Bật tiếng', description: 'Tắt tiếng hoặc khôi phục âm lượng' },
  { keys: ['↑', '↓'], label: 'Âm lượng ±10%', description: 'Tăng hoặc giảm âm lượng trình phát' },
  { keys: ['F'], label: 'Toàn màn hình', description: 'Bật hoặc thoát chế độ rạp toàn màn hình' },
  { keys: ['P'], label: 'Picture-in-Picture', description: 'Thu nhỏ video thành cửa sổ nổi góc màn hình để vừa xem vừa duyệt phim' },
  { keys: ['N'], label: 'Tập tiếp theo', description: 'Chuyển nhanh sang tập kế tiếp (nếu có)' },
  { keys: ['?'], label: 'Bảng phím tắt', description: 'Hiện hoặc ẩn hướng dẫn phím tắt' },
];

export function isEditableEventTarget(
  target: { tagName?: string; isContentEditable?: boolean } | null | undefined
): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = (target.tagName ?? '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION';
}

export function parsePlayerShortcut(event: ShortcutKeyEventLike): PlayerShortcutAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }

  const key = event.key;
  const code = event.code;

  if (key === ' ' || key === 'Spacebar' || code === 'Space') {
    return 'toggle_play';
  }

  if (key === 'ArrowLeft') return 'seek_backward_5';
  if (key === 'ArrowRight') return 'seek_forward_5';
  if (key === 'ArrowUp') return 'volume_up';
  if (key === 'ArrowDown') return 'volume_down';
  if (key === '?' || (code === 'Slash' && event.shiftKey)) return 'toggle_help';

  const lower = key.toLowerCase();
  if (lower === 'k') return 'toggle_play';
  if (lower === 'j') return 'seek_backward_10';
  if (lower === 'l') return 'seek_forward_10';
  if (lower === 'm') return 'toggle_mute';
  if (lower === 'f') return 'toggle_fullscreen';
  if (lower === 'p') return 'toggle_pip';
  if (lower === 'n') return 'next_episode';

  return null;
}

export function clampSeekTime(
  currentTime: number,
  deltaSeconds: number,
  duration?: number
): number {
  const safeCurrent = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0;
  const target = Math.max(0, safeCurrent + deltaSeconds);
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    return Math.min(duration, target);
  }
  return target;
}

export function clampVolume(currentVolume: number, delta: number): number {
  const safeCurrent = Number.isFinite(currentVolume) ? currentVolume : 1;
  const next = Math.min(1, Math.max(0, safeCurrent + delta));
  return Math.round(next * 100) / 100;
}
