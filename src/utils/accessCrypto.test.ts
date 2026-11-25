import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashAccessCode,
  getStableAccessSecret,
  parseCookieHeader,
  signAccessToken,
  verifyAccessCode,
  verifySignedAccessToken,
} from './accessCrypto';

test('verifyAccessCode validates normalized code digest with constant-time comparison', () => {
  const sampleCode = 'TEST-1111-2222-3333-4444';
  const digest = hashAccessCode(sampleCode);

  assert.equal(verifyAccessCode(sampleCode, digest), true);
  assert.equal(verifyAccessCode('  test-1111-2222-3333-4444  ', digest), true);
  assert.equal(verifyAccessCode('TEST-1111-2222-3333-4445', digest), false);
  assert.equal(verifyAccessCode('', digest), false);
});

test('signAccessToken and verifySignedAccessToken validate genuine HMAC tokens and reject tampering', () => {
  const secret = 'unit-test-hmac-secret-key';
  const token = signAccessToken(secret, 1700000000000);

  assert.equal(verifySignedAccessToken(token, secret), true);
  assert.equal(verifySignedAccessToken(token, 'wrong-secret'), false);
  assert.equal(verifySignedAccessToken(token.slice(0, -2) + '00', secret), false);
  assert.equal(verifySignedAccessToken('invalid-token', secret), false);
});

test('getStableAccessSecret produces identical deterministic secrets and respects custom secret', () => {
  const s1 = getStableAccessSecret(undefined, '1111111111111111111111111111111111111111111111111111111111111111');
  const s2 = getStableAccessSecret(undefined, '1111111111111111111111111111111111111111111111111111111111111111');
  const s3 = getStableAccessSecret(undefined, '2222222222222222222222222222222222222222222222222222222222222222');

  assert.equal(s1, s2);
  assert.notEqual(s1, s3);
  assert.equal(getStableAccessSecret('my-custom-secret-key-1234'), 'my-custom-secret-key-1234');
});

test('parseCookieHeader extracts key-value pairs and handles URI decoding', () => {
  const parsed = parseCookieHeader('foo=bar; cinevault_access_token=cv1.12345.abc; other=hello%20world');
  assert.equal(parsed.foo, 'bar');
  assert.equal(parsed.cinevault_access_token, 'cv1.12345.abc');
  assert.equal(parsed.other, 'hello world');
  assert.deepEqual(parseCookieHeader(''), {});
  assert.deepEqual(parseCookieHeader(null), {});
});
