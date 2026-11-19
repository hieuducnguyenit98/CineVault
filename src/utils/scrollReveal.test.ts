import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePosterRevealDelay,
  easeOutQuint,
  isElementNearOrAboveViewport,
} from './scrollReveal';

test('computePosterRevealDelay staggers poster cards up to max cap', () => {
  assert.equal(computePosterRevealDelay(0), 0);
  assert.equal(computePosterRevealDelay(1), 38);
  assert.equal(computePosterRevealDelay(3), 114);
  assert.equal(computePosterRevealDelay(5), 190);
  assert.equal(computePosterRevealDelay(9), 190);
  assert.equal(computePosterRevealDelay(-2), 0);
});

test('isElementNearOrAboveViewport triggers when section enters or passes viewport', () => {
  const vh = 900;
  // Far below viewport
  assert.equal(isElementNearOrAboveViewport(980, 1380, vh, -24), false);
  // Just below early reveal margin (900 - (-24) = 924)
  assert.equal(isElementNearOrAboveViewport(935, 1335, vh, -24), false);
  // Crossed early reveal margin (triggers right as it enters)
  assert.equal(isElementNearOrAboveViewport(915, 1315, vh, -24), true);
  // Already visible near top
  assert.equal(isElementNearOrAboveViewport(120, 520, vh, -24), true);
  // Already scrolled past above viewport
  assert.equal(isElementNearOrAboveViewport(-500, -100, vh, -24), true);
});

test('easeOutQuint clamps boundaries and monotonically accelerates to smooth settle', () => {
  assert.equal(easeOutQuint(-0.2), 0);
  assert.equal(easeOutQuint(0), 0);
  assert.equal(easeOutQuint(1), 1);
  assert.equal(easeOutQuint(1.5), 1);
  assert.ok(easeOutQuint(0.5) > 0.9);
  assert.ok(easeOutQuint(0.2) < easeOutQuint(0.6));
});
