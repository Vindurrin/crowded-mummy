import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mini, at, block, real } from './helpers.mjs';
import { parseExamGate, projectDates, pathStatus, cloudAppsGate } from '../src/path.js';
import { levelRule } from '../src/xp.js';
import { sumItems, planTotals } from '../src/nutrition.js';
import { missingBaselines } from '../src/training.js';

const config = mini();
const TODAY = '2026-11-02'; // a Monday
const status = (entries = [], answers = {}, today = TODAY) => pathStatus(config, entries, answers, today);
const find = (s, id) => s.items.find((i) => i.id === id);
const done = (pathId, date, extra = {}) => at('pathstate', date, { pathId, ...extra });
const doc = { readme: true, decisionNote: true, teardown: true };

test('gate text: read the counts and scores from the seed text', () => {
  assert.deepEqual(parseExamGate('2 timed practice exams at 85% or higher'), { count: 2, minScore: 85 });
  assert.deepEqual(parseExamGate('3 timed full practice exams at 80% or higher'), { count: 3, minScore: 80 });
  assert.throws(() => parseExamGate('no numbers here'));
});

test('dates: with no progress, items fill 195 minutes per work day in order', () => {
  const s = status();
  assert.equal(find(s, 'ccp').projected, '2026-11-05'); // 600 min = 4 days (Mon..Thu)
  assert.equal(find(s, 'saa').projected, '2026-11-12'); // starts with the 180 min left on Thu; Sunday is skipped
});

test('dates: logged hours pull the dates in', () => {
  const s = status([block('2026-11-02', 'focus', 195, 'ccp'), block('2026-11-02', 'jobSearch', 45, null)], {}, '2026-11-03');
  assert.equal(find(s, 'ccp').hoursLogged, 3.25);
  assert.equal(find(s, 'ccp').projected, '2026-11-05'); // 405 min left from Tue: Tue, Wed, Thu
  const ahead = status([block('2026-11-02', 'focus', 600, 'ccp')], {}, '2026-11-03');
  assert.equal(find(ahead, 'ccp').projected, '2026-11-03');
});

test('dates: missed days push the dates out', () => {
  const s = status([], {}, '2026-11-09'); // a week passed with no work
  assert.equal(find(s, 'ccp').projected, '2026-11-12');
  assert.equal(find(s, 'ccp').driftDays, 7);
});

test('dates: time already logged today uses up today', () => {
  const s = status([block(TODAY, 'focus', 150, 'ccp')]);
  assert.equal(find(s, 'ccp').projected, '2026-11-05');
  const used = projectDates({ path: config.path.slice(0, 1), minutesLogged: {}, states: {}, today: TODAY, startDate: TODAY, minutesPerDay: 195, minutesToday: 195, dayOff: 'Sun' });
  assert.equal(used.ccp.finish, '2026-11-06'); // today is full: 600 min starts Tuesday and ends Friday
});

test('dates: a day off is skipped when today is Sunday', () => {
  const s = status([], {}, '2026-11-08');
  assert.equal(find(s, 'ccp').projected, '2026-11-12'); // Mon..Thu
});

test('dates: an exam date holds the next item back', () => {
  const s = status([], { examDates: { ccp: '2026-11-20' } });
  assert.equal(find(s, 'ccp').projected, '2026-11-20');
  assert.equal(find(s, 'saa').projected, '2026-11-28'); // 1200 min = 7 days from Mon 11-23 (Sunday skipped)
  const early = status([], { examDates: { ccp: '2026-11-03' } });
  assert.equal(find(early, 'ccp').examBeforeFinish, true);
});

test('locks: an item is locked until the one before it is done', () => {
  const s = status();
  assert.equal(find(s, 'ccp').locked, false);
  const saa = find(s, 'saa');
  assert.equal(saa.locked, true);
  assert.match(saa.lockReason, /Pass Cert one first/);
  assert.equal(saa.opensOn, find(s, 'ccp').projected);
  assert.equal(s.current.id, 'ccp');
});

test('locks: a project needs README, decision note, and teardown on the one before', () => {
  const base = [done('ccp', '2026-11-05', { passed: true }), done('saa', '2026-11-12', { passed: true })];
  assert.equal(find(status(base), 'p-iam').locked, false);
  assert.equal(find(status(base), 'p-cp').locked, true);
  assert.match(find(status(base), 'p-cp').lockReason, /README, a decision note, and a confirmed teardown/);
  const partial = [...base, done('p-iam', '2026-11-13', { readme: true, decisionNote: true, teardown: false })];
  assert.equal(find(status(partial), 'p-cp').locked, true);
  const full = [...base, done('p-iam', '2026-11-13', doc)];
  assert.equal(find(status(full), 'p-cp').locked, false);
  assert.equal(find(status(full), 'p-iam').complete, true);
  assert.equal(status(full).current.id, 'p-cp');
});

test('locks: the newest state wins', () => {
  const entries = [done('ccp', '2026-11-05', { passed: true }), done('ccp', '2026-11-06', { passed: false })];
  assert.equal(find(status(entries), 'ccp').complete, false);
});

test('locks: the last cert opens after the security project, not after the one before it', () => {
  const s = status();
  assert.match(find(s, 'secplus').lockReason, /Project security/);
  const entries = [done('ccp', '1', { passed: true }), done('saa', '1', { passed: true }), done('p-iam', '1', doc), done('p-cp', '1', doc), done('p-ss', '1', doc)]
    .map((e) => ({ ...e, date: '2026-11-20' }));
  assert.equal(find(status(entries), 'secplus').locked, false);
});

test('exam gates: count timed exams at or above the score', () => {
  const exam = (score, timed = true) => at('exam', '2026-11-03', { exam: 'ccp', score, timed });
  let gate = find(status([exam(90), exam(84), exam(88, false)]), 'ccp').examGate;
  assert.deepEqual([gate.have, gate.count, gate.open], [1, 2, false]);
  gate = find(status([exam(90), exam(85)]), 'ccp').examGate;
  assert.equal(gate.open, true);
  assert.equal(find(status(), 'saa').examGate.minScore, 80);
});

test('cloud applications: need SAA passed and CloudPipe published', () => {
  const gateFor = (entries) => cloudAppsGate(config, entries, TODAY, status(entries));
  assert.equal(gateFor([]).open, false);
  assert.match(gateFor([]).reason, /pass Cert two and publish Project two/);
  const entries = [done('ccp', '2026-11-05', { passed: true }), done('saa', '2026-11-12', { passed: true }), done('p-cp', '2026-11-20', { ...doc, published: true })];
  assert.equal(gateFor(entries).open, true);
  const unpublished = [entries[0], entries[1], done('p-cp', '2026-11-20', doc)];
  assert.match(gateFor(unpublished).reason, /publish Project two/);
});

// Tests below run on Matt's real seed. They are skipped when the file is not here.
const opts = { skip: !real && 'seed file not found' };

test('real seed: level rule and exam gates can be read', opts, () => {
  assert.deepEqual(levelRule(real.gamification.levelXp), { base: 100, step: 50 });
  for (const gate of real.gates.filter((g) => ['g-ccp', 'g-saa'].includes(g.id))) parseExamGate(gate.when);
});

test('real seed: plan totals match the totals written in the seed', opts, () => {
  const { totals, missing } = planTotals(real.nutrition.items);
  const want = real.nutrition.totalsFromLabelsExcludingSauces;
  for (const key of Object.keys(want)) assert.equal(totals[key], want[key], key);
  assert.deepEqual(missing, ['teriyaki', 'soy']);
});

test('real seed: with no progress, our dates land near the seed dates', opts, () => {
  const s = pathStatus(real, [], {}, real.meta.startDate);
  for (const item of s.items) assert.ok(Math.abs(item.driftDays) <= 7, `${item.id} is ${item.driftDays} days from plan`);
});

test('real seed: exercises with no baseline match the spec list', opts, () => {
  assert.deepEqual(missingBaselines(real.training, []).sort(),
    ['Ab crunch', 'Back extension', 'Biceps curl', 'Lateral raise', 'Leg extension', 'Pec fly', 'Shoulder press'].sort());
});
