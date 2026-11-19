import crypto from 'node:crypto';

export const ACCESS_CODE_SALT = 'cinevault-private-gate-v1';
export const DEFAULT_ACCESS_CODE_DIGEST =
  'deb8b4055e998fcda1747d58d77e4677531bf4fe3d99822cc10bada841aede76';

export function normalizeAccessCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function hashAccessCode(code: string, salt = ACCESS_CODE_SALT): string {
  const normalized = normalizeAccessCode(code);
  return crypto
    .createHash('sha256')
    .update(`${salt}:${normalized}`)
    .digest('hex');
}

export function verifyAccessCode(
  candidate: string,
  expectedDigestHex = DEFAULT_ACCESS_CODE_DIGEST,
  salt = ACCESS_CODE_SALT
): boolean {
  const normalized = normalizeAccessCode(candidate);
  if (!normalized || !/^[a-f0-9]{64}$/i.test(expectedDigestHex)) {
    return false;
  }
  const actualBuf = Buffer.from(hashAccessCode(normalized, salt), 'hex');
  const expectedBuf = Buffer.from(expectedDigestHex.toLowerCase(), 'hex');
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function signAccessToken(secret: string, issuedAt = Date.now()): string {
  const payload = `cv1.${issuedAt}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

export function verifySignedAccessToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'cv1') {
    return false;
  }
  const issuedAt = Number(parts[1]);
  const providedSig = parts[2];
  if (!Number.isFinite(issuedAt) || issuedAt <= 0 || !/^[a-f0-9]{64}$/i.test(providedSig)) {
    return false;
  }
  const payload = `${parts[0]}.${parts[1]}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  const providedBuf = Buffer.from(providedSig.toLowerCase(), 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}
