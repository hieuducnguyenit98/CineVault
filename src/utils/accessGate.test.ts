import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAccessCodeInput,
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
