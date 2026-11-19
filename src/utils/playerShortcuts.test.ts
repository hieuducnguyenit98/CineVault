import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampSeekTime,
  clampVolume,
  isEditableEventTarget,
  parsePlayerShortcut,
} from './playerShortcuts.ts';

test('parsePlayerShortcut maps Space, arrows, M, F, N and ignores modifier combos', () => {
  assert.equal(parsePlayerShortcut({ key: ' ', code: 'Space' }), 'toggle_play');
  assert.equal(parsePlayerShortcut({ key: 'k' }), 'toggle_play');
  assert.equal(parsePlayerShortcut({ key: 'ArrowLeft' }), 'seek_backward_5');
  assert.equal(parsePlayerShortcut({ key: 'ArrowRight' }), 'seek_forward_5');
  assert.equal(parsePlayerShortcut({ key: 'J' }), 'seek_backward_10');
  assert.equal(parsePlayerShortcut({ key: 'l' }), 'seek_forward_10');
  assert.equal(parsePlayerShortcut({ key: 'm' }), 'toggle_mute');
  assert.equal(parsePlayerShortcut({ key: 'M' }), 'toggle_mute');
  assert.equal(parsePlayerShortcut({ key: 'ArrowUp' }), 'volume_up');
  assert.equal(parsePlayerShortcut({ key: 'ArrowDown' }), 'volume_down');
  assert.equal(parsePlayerShortcut({ key: 'f' }), 'toggle_fullscreen');
  assert.equal(parsePlayerShortcut({ key: 'p' }), 'toggle_pip');
  assert.equal(parsePlayerShortcut({ key: 'P' }), 'toggle_pip');
  assert.equal(parsePlayerShortcut({ key: 'n' }), 'next_episode');
  assert.equal(parsePlayerShortcut({ key: '?' }), 'toggle_help');
  assert.equal(parsePlayerShortcut({ key: 'm', ctrlKey: true }), null);
  assert.equal(parsePlayerShortcut({ key: 'p', altKey: true }), null);
  assert.equal(parsePlayerShortcut({ key: ' ', metaKey: true }), null);
});

test('isEditableEventTarget detects form fields and contentEditable elements', () => {
  assert.equal(isEditableEventTarget({ tagName: 'INPUT' }), true);
  assert.equal(isEditableEventTarget({ tagName: 'textarea' }), true);
  assert.equal(isEditableEventTarget({ tagName: 'SELECT' }), true);
  assert.equal(isEditableEventTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isEditableEventTarget({ tagName: 'DIV', isContentEditable: false }), false);
  assert.equal(isEditableEventTarget(null), false);
});

test('clampSeekTime clamps cleanly between 0 and duration', () => {
  assert.equal(clampSeekTime(2, -5, 120), 0);
  assert.equal(clampSeekTime(25, 5, 120), 30);
  assert.equal(clampSeekTime(118, 5, 120), 120);
  assert.equal(clampSeekTime(15, 5, 0), 20);
});

test('clampVolume clamps cleanly between 0 and 1 with floating precision safety', () => {
  assert.equal(clampVolume(0.95, 0.1), 1);
  assert.equal(clampVolume(0.05, -0.1), 0);
  assert.equal(clampVolume(0.3, 0.1), 0.4);
  assert.equal(clampVolume(0.8, -0.1), 0.7);
});
