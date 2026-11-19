export const ACCESS_TOKEN_STORAGE_KEY = 'cinevault_access_token_v1';

export function normalizeAccessCodeInput(raw: string): string {
  return raw.trim().toUpperCase();
}

export function validateAccessCodeInput(raw: string): string | null {
  const normalized = normalizeAccessCodeInput(raw);
  if (!normalized) {
    return 'Vui lòng nhập mã truy cập trước khi tiếp tục.';
  }
  if (normalized.length < 4) {
    return 'Mã truy cập không hợp lệ. Vui lòng kiểm tra lại.';
  }
  return null;
}

export function loadStoredAccessToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    return token && token.trim().length > 0 ? token.trim() : null;
  } catch {
    return null;
  }
}

export function saveStoredAccessToken(token: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token.trim());
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function clearStoredAccessToken(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
