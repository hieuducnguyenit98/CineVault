import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLikelyValidTokenFormat,
  normalizeAccessCodeInput,
  parseBrowserCookie,
  validateAccessCodeInput,
} from './accessGate';

test('normalizeAccessCodeInput trims whitespace and uppercases code', () => {
  assert.equal(normalizeAccessCodeInput('  abcd-1234  '), 'ABCD-1234');
  assert.equal(normalizeAccessCodeInput(''), '');
});

test('validateAccessCodeInput rejects empty or overly short entries and accepts candidate codes', () => {
  assert.ok(validateAccessCodeInput(''));
  assert.ok(validateAccessCodeInput('   '));
  assert.ok(validateAccessCodeInput('AB'));
  assert.equal(validateAccessCodeInput('ABCD-1234-5678'), null);
});

test('parseBrowserCookie extracts matching cookie key and decodes values', () => {
  const cookieStr = 'theme=dark; cinevault_access_token=cv1.17000000.abc123; user_pref=active';
  assert.equal(parseBrowserCookie(cookieStr, 'cinevault_access_token'), 'cv1.17000000.abc123');
  assert.equal(parseBrowserCookie(cookieStr, 'theme'), 'dark');
  assert.equal(parseBrowserCookie(cookieStr, 'non_existent'), null);
  assert.equal(parseBrowserCookie('', 'theme'), null);
});

test('isLikelyValidTokenFormat validates token structure and rejects malformed values', () => {
  const validToken = 'cv1.1700000000000.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  assert.equal(isLikelyValidTokenFormat(validToken), true);
  assert.equal(isLikelyValidTokenFormat('cv2.123.abc'), false);
  assert.equal(isLikelyValidTokenFormat('invalid'), false);
  assert.equal(isLikelyValidTokenFormat(''), false);
  assert.equal(isLikelyValidTokenFormat(null), false);
});
