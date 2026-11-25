export const ACCESS_TOKEN_STORAGE_KEY = 'cinevault_access_token_v1';
export const ACCESS_TOKEN_COOKIE_NAME = 'cinevault_access_token';

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

export function parseBrowserCookie(cookieString: string, name: string): string | null {
  if (!cookieString || !name) return null;
  const match = cookieString.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function isLikelyValidTokenFormat(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== 'cv1') return false;
  const ts = Number(parts[1]);
  return Number.isFinite(ts) && ts > 0 && /^[a-f0-9]{64}$/i.test(parts[2]);
}

export function loadStoredAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  let token: string | null = null;

  // 1. Check localStorage first
  try {
    if (window.localStorage) {
      const stored = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
      if (stored && stored.trim().length > 0) {
        token = stored.trim();
      }
    }
  } catch {
    // Ignore storage errors
  }

  // 2. Check 1-year browser cookie
  if (!token && typeof document !== 'undefined' && document.cookie) {
    const cookieToken = parseBrowserCookie(document.cookie, ACCESS_TOKEN_COOKIE_NAME);
    if (cookieToken && cookieToken.trim().length > 0) {
      token = cookieToken.trim();
      // Re-hydrate localStorage if available
      try {
        window.localStorage?.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
      } catch {
        // Ignore
      }
    }
  }

  // 3. Check sessionStorage fallback
  if (!token) {
    try {
      if (window.sessionStorage) {
        const sessionToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (sessionToken && sessionToken.trim().length > 0) {
          token = sessionToken.trim();
        }
      }
    } catch {
      // Ignore
    }
  }

  return token;
}

export function saveStoredAccessToken(token: string, remember = true): void {
  if (typeof window === 'undefined') {
    return;
  }
  const cleanToken = token.trim();
  if (!cleanToken) return;

  // 1. Save to localStorage
  try {
    window.localStorage?.setItem(ACCESS_TOKEN_STORAGE_KEY, cleanToken);
  } catch {
    // Ignore
  }

  // 2. Save to sessionStorage
  try {
    window.sessionStorage?.setItem(ACCESS_TOKEN_STORAGE_KEY, cleanToken);
  } catch {
    // Ignore
  }

  // 3. Save to 1-year persistent cookie if remember is true
  try {
    if (typeof document !== 'undefined') {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const maxAge = remember ? 365 * 24 * 60 * 60 : 86400; // 1 year vs 1 day
      document.cookie = `${ACCESS_TOKEN_COOKIE_NAME}=${encodeURIComponent(cleanToken)}; path=/; max-age=${maxAge}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
    }
  } catch {
    // Ignore
  }
}

export function clearStoredAccessToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage?.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore
  }
  try {
    window.sessionStorage?.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore
  }
  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${ACCESS_TOKEN_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  } catch {
    // Ignore
  }
}

