import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkSeed, seedToConfig, findBlanks } from '../src/seed.js';
import { findForbidden } from '../src/privacy.js';

const seed = JSON.parse(readFileSync(new URL('./fixtures/mini-seed.json', import.meta.url)));

test('a good seed has no problems', () => {
  assert.deepEqual(checkSeed(seed), []);
});

test('a seed with a missing section is refused', () => {
  const { path, ...bad } = seed;
  assert.match(checkSeed(bad).join(' '), /no "path" section/);
});

test('a seed that uses a reserved key is refused', () => {
  assert.match(checkSeed({ ...seed, answers: {} }).join(' '), /must not use the key "answers"/);
});

test('seedToConfig keeps every section and adds a load time', () => {
  const config = seedToConfig(seed, new Date('2026-11-01T12:00:00Z'));
  assert.equal(config.meta.owner, 'Test');
  assert.equal(config.seedLoadedAt, '2026-11-01T12:00:00.000Z');
});

test('findBlanks lists each null, with item ids in the path', () => {
  assert.deepEqual(findBlanks(seed).sort(), [
    'nutrition.items.sauce.kcal',
    'nutrition.items.sauce.protein',
    'routines.evening',
    'training.weeklyDirectSets',
    'unemployment.anchorDate',
  ]);
});

test('findForbidden catches private keys at any depth', () => {
  assert.deepEqual(findForbidden({ a: { ssn: '1' }, b: [{ claimNumber: 2 }], bankName: 'x' }).sort(),
    ['a.ssn', 'b.0.claimNumber', 'bankName']);
});

test('findForbidden ignores normal keys', () => {
  assert.deepEqual(findForbidden({ pills1: true, pinned: 1, neverStore: ['SSN'] }), []);
});
