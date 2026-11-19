import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashAccessCode,
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
