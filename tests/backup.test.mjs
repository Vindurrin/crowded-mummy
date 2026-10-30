import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, parseBackup, backupFileName } from '../src/backup.js';
import { newEntry, checkEntry } from '../src/model.js';

const entry = () => newEntry('weight', '2026-11-02', { lb: 159.2 });

test('export then import returns the same data', () => {
  const config = { meta: { owner: 'Test' }, answers: { ccpExamDate: '2026-11-11' } };
  const entries = [entry(), newEntry('check', '2026-11-02', { itemId: 'brush', group: 'morning' })];
  const text = JSON.stringify(buildBackup(config, entries));
  const { backup, errors } = parseBackup(text);
  assert.equal(errors, undefined);
  assert.deepEqual(backup.config, config);
  assert.deepEqual(backup.entries, entries);
});

test('bad JSON is refused', () => {
  assert.match(parseBackup('{nope').errors[0], /not valid JSON/);
});

test('a file from another app is refused', () => {
  assert.match(parseBackup('{"app":"other"}').errors.join(' '), /not a Life OS backup/);
});

test('an entry with a bad date is refused', () => {
  const bad = { ...entry(), date: '11/02/2026' };
  const { errors } = parseBackup(JSON.stringify(buildBackup({}, [bad])));
  assert.match(errors.join(' '), /Entry 1: Bad date/);
});

test('a backup that holds a private field is refused', () => {
  const text = JSON.stringify(buildBackup({ answers: { ssn: '123' } }, []));
  assert.match(parseBackup(text).errors.join(' '), /private field: config.answers.ssn/);
});

test('checkEntry catches an unknown kind', () => {
  assert.match(checkEntry({ ...entry(), kind: 'pills' }).join(' '), /Unknown kind/);
});

test('backup file name starts with the date', () => {
  assert.equal(backupFileName(new Date('2026-11-02T09:00:00Z')), '2026-11-02-life-os-backup.json');
});
