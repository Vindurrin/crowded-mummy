import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mini, at, check, block } from './helpers.mjs';
import { todayStr, weekday, mondayOf, addDays } from '../src/dates.js';
import { levelRule, levelInfo, computeXp, streak } from '../src/xp.js';
import { sessionForDate, workingWeight, nextWeight, missingBaselines, sessionDone } from '../src/training.js';
import { mergeItems, scaleItem, sumItems, dayTotals, weightAverage, weeklyChange, isStalled } from '../src/nutrition.js';
import { weekCounts, jobTargets, targetsMet, workSearchCount, toCsv } from '../src/jobs.js';
import { nextFiling, filingDates, buildIcs, sleepReviewDue } from '../src/admin.js';
import { bossMet } from '../src/week.js';

const config = mini();
const rule = levelRule(config.gamification.levelXp);

test('dates: weekday, Monday, and Chicago time', () => {
  assert.equal(weekday('2026-11-02'), 'Mon');
  assert.equal(mondayOf('2026-11-08'), '2026-11-02'); // Sunday belongs to the week before
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(todayStr(new Date('2026-11-03T03:00:00Z'), 'America/Chicago'), '2026-11-02');
});

test('levels: next level needs 100 + 50*(level-1)', () => {
  assert.deepEqual(rule, { base: 100, step: 50 });
  assert.deepEqual(levelInfo(0, rule), { level: 1, into: 0, need: 100 });
  assert.deepEqual(levelInfo(100, rule), { level: 2, into: 0, need: 150 });
  assert.deepEqual(levelInfo(249, rule), { level: 2, into: 149, need: 150 });
  assert.deepEqual(levelInfo(250, rule), { level: 3, into: 0, need: 200 });
});

test('xp: pills and sleep give nothing', () => {
  const entries = [check('2026-11-02', 'pills1'), at('sleep', '2026-11-02', { lightsOut: '22:00', wake: '06:00' })];
  assert.equal(computeXp(entries, config).total, 0);
});

test('xp: morning checklist does not need pills or the gym', () => {
  const xp = computeXp([check('2026-11-02', 'brush')], config);
  assert.equal(xp.byDomain.Routine, 10);
  assert.equal(xp.byDomain.Body, 0);
});

test('xp: blocks and gym give the spec points', () => {
  const entries = [
    check('2026-11-02', 'move'), block('2026-11-02', 'focus', 150), block('2026-11-02', 'log', 25),
    block('2026-11-02', 'jobSearch', 45, null),
  ];
  const { byDomain } = computeXp(entries, config);
  assert.deepEqual([byDomain.Body, byDomain.Cloud, byDomain.JobSearch], [20, 70, 30]);
});

test('xp: a passed cert gives 300 and a finished project gives 150', () => {
  const entries = [
    at('pathstate', '2026-11-05', { pathId: 'ccp', passed: true }),
    at('pathstate', '2026-11-20', { pathId: 'p-iam', readme: true, decisionNote: true, teardown: true }),
    at('pathstate', '2026-11-21', { pathId: 'p-cp', readme: true, decisionNote: false, teardown: true }),
  ];
  assert.equal(computeXp(entries, config).byDomain.Cloud, 450);
});

test('streak: counts days in a row and skips the day off', () => {
  assert.equal(streak(['2026-11-07', '2026-11-09'], '2026-11-09', 'Sun', 1), 2); // Sat, Mon
  assert.equal(streak([], '2026-11-09', 'Sun', 1), 0);
});

test('streak: today not done yet does not break it', () => {
  assert.equal(streak(['2026-11-02', '2026-11-03'], '2026-11-04', 'Sun', 1), 2);
});

test('streak: one grace day per week, a second miss breaks it', () => {
  assert.equal(streak(['2026-11-02', '2026-11-04'], '2026-11-04', 'Sun', 1), 2); // Tue missed
  assert.equal(streak(['2026-11-02', '2026-11-05'], '2026-11-05', 'Sun', 1), 1); // Tue and Wed missed
});

test('training: session by weekday', () => {
  assert.equal(sessionForDate('2026-11-02', config.training), 'A');
  assert.equal(sessionForDate('2026-11-03', config.training), null);
});

test('training: baseline, then newest log, sets the working weight', () => {
  assert.equal(workingWeight('Leg press', config.training, []).weight, 100);
  const log = at('setlog', '2026-11-02', { session: 'A', exercise: 'Leg press', weight: 110, reps: [9, 9, 8], prescribedSets: 3, prescribedReps: 9 });
  const now = workingWeight('Leg press', config.training, [log]);
  assert.deepEqual([now.weight, now.hit, now.source], [110, false, 'log']);
});

test('training: progression adds a step only when every rep was hit', () => {
  assert.deepEqual(nextWeight('Leg press', config.training, [], 5), { status: 'add', weight: 105 });
  assert.equal(nextWeight('Leg press', config.training, [], null).status, 'need-step');
  // Baseline was 9x2 but 3 sets are prescribed, so repeat.
  assert.deepEqual(nextWeight('Lat pulldown', config.training, [], 5), { status: 'repeat', weight: 50 });
  assert.equal(nextWeight('Leg extension', config.training, [], 5).status, 'no-baseline');
});

test('training: warn about exercises with no baseline', () => {
  assert.deepEqual(missingBaselines(config.training, []), ['Leg extension']);
  const log = at('setlog', '2026-11-04', { session: 'B', exercise: 'Leg extension', weight: 40, reps: [15, 15], prescribedSets: 2, prescribedReps: 15 });
  assert.deepEqual(missingBaselines(config.training, [log]), []);
});

test('training: session is done when every exercise has a log', () => {
  const mk = (exercise) => at('setlog', '2026-11-02', { session: 'A', exercise, weight: 1, reps: [9], prescribedSets: 1, prescribedReps: 9 });
  assert.equal(sessionDone('2026-11-02', 'A', config.training, [mk('Leg press')]), false);
  assert.equal(sessionDone('2026-11-02', 'A', config.training, [mk('Leg press'), mk('Lat pulldown')]), true);
});

test('nutrition: blank values are skipped and listed', () => {
  const { totals, missing } = sumItems(config.nutrition.items);
  assert.equal(totals.kcal, 240);
  assert.deepEqual(missing, ['sauce']);
});

test('nutrition: label values typed by Matt fill blanks only', () => {
  const items = mergeItems(config.nutrition.items, { sauce: { kcal: 15, protein: 0, carbs: 3, fat: 0, fiber: 0, sodiumMg: 600 }, banana: { kcal: 999 } });
  assert.equal(items[2].sodiumMg, 600);
  assert.equal(items[0].kcal, 100); // a real value is never replaced
  assert.deepEqual(sumItems(items).missing, []);
});

test('nutrition: salmon scales with the real weight', () => {
  const salmon = config.nutrition.items[1];
  assert.equal(scaleItem(salmon, 224).protein, 46);
  assert.equal(scaleItem(salmon, null).protein, 23);
  const totals = dayTotals(config.nutrition.items, [{ itemId: 'salmon', grams: 224 }, { itemId: 'banana' }]).totals;
  assert.equal(totals.protein, 47);
});

const weigh = (date, lb) => at('weight', date, { lb });

test('weight: 7-day average uses one reading per day', () => {
  const later = { ...at('weight', '2026-11-03', { lb: 156 }), createdAt: '2099-01-01T00:00:00Z' };
  const entries = [weigh('2026-11-02', 160), weigh('2026-11-03', 158), later];
  assert.equal(weightAverage(entries, '2026-11-03'), 158); // (160 + newest 156) / 2
  assert.equal(weightAverage(entries, '2026-12-25'), null);
});

test('weight: weekly change and stall check', () => {
  const week = (start, lb) => Array.from({ length: 7 }, (_, i) => weigh(addDays(start, i), lb));
  const flat = [...week('2026-11-02', 160), ...week('2026-11-09', 160), ...week('2026-11-16', 159.9)];
  assert.equal(weeklyChange(flat, '2026-11-22'), -0.1);
  assert.equal(isStalled(flat, '2026-11-22', 0.5), true);
  assert.equal(isStalled(flat, '2026-11-22', null), null); // no threshold yet: ask
  const falling = [...week('2026-11-02', 160), ...week('2026-11-09', 158.5), ...week('2026-11-16', 157)];
  assert.equal(isStalled(falling, '2026-11-22', 0.5), false);
});

const job = (date, fields) => at('joblog', date, { reviewed: true, ...fields });

test('jobs: only reviewed entries count, mock interviews count apart', () => {
  const entries = [
    job('2026-11-02', { type: 'application' }), job('2026-11-03', { type: 'application', reviewed: false }),
    job('2026-11-03', { type: 'interview', method: 'mock' }), job('2026-11-04', { type: 'interview', method: 'phone' }),
    job('2026-11-10', { type: 'application' }),
  ];
  assert.deepEqual(weekCounts(entries, '2026-11-02'), { applications: 1, outreach: 0, mockInterviews: 1, networkingEvents: 0 });
  assert.equal(workSearchCount(entries, '2026-11-02'), 2); // application + real interview
});

test('jobs: networking target can be switched off', () => {
  assert.ok('networkingEvents' in jobTargets(config, {}));
  assert.ok(!('networkingEvents' in jobTargets(config, { networkingOn: false })));
  assert.equal(targetsMet({ applications: 2, outreach: 1, mockInterviews: 1, networkingEvents: 0 }, jobTargets(config, { networkingOn: false })), true);
});

test('jobs: CSV follows the chosen columns and quotes commas', () => {
  const csv = toCsv([job('2026-11-02', { type: 'application', employer: 'Acme, Inc', role: 'Say "hi"' })], ['date', 'employer', 'role']);
  assert.equal(csv, 'date,employer,role\r\n2026-11-02,"Acme, Inc","Say ""hi"""\r\n');
});

test('admin: next filing is every second Wednesday', () => {
  assert.equal(nextFiling('2026-11-04', '2026-11-04').day, '2026-11-04');
  assert.equal(nextFiling('2026-11-04', '2026-11-05').day, '2026-11-18');
  assert.deepEqual(nextFiling('2026-11-04', '2026-11-02').fallback, ['2026-11-05', '2026-11-06', '2026-11-07']);
  assert.equal(nextFiling(null, '2026-11-02'), null);
  assert.deepEqual(filingDates('2026-11-04', 3), ['2026-11-04', '2026-11-18', '2026-12-02']);
});

test('admin: calendar file has two reminders per filing and no private data', () => {
  const ics = buildIcs(filingDates('2026-11-04', 3), config.unemployment.perFiling, new Date('2026-11-01T12:00:00Z'));
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 3);
  assert.equal(ics.match(/BEGIN:VALARM/g).length, 6);
  assert.match(ics, /TRIGGER:-PT6H/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261104/);
  assert.ok(ics.split('\r\n').every((l) => l.length <= 75));
});

test('admin: sleep trial asks for review after the trial days', () => {
  const a = { sleepMode: 'trial', sleepStart: '2026-11-02' };
  assert.equal(sleepReviewDue(a, '2026-11-15', 14), false);
  assert.equal(sleepReviewDue(a, '2026-11-16', 14), true);
  assert.equal(sleepReviewDue({}, '2026-11-16', 14), false);
});

test('week: the boss needs study hours and every job target', () => {
  const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'];
  const study = days.flatMap((d) => [block(d, 'review', 20), block(d, 'focus', 150), block(d, 'log', 25)]);
  const jobs = [job('2026-11-02', { type: 'application' }), job('2026-11-02', { type: 'application' }), job('2026-11-03', { type: 'outreach' }),
    job('2026-11-04', { type: 'interview', method: 'mock' })];
  assert.equal(bossMet(config, [...study, ...jobs], {}, '2026-11-02'), false); // no networking yet
  assert.equal(bossMet(config, [...study, ...jobs], { networkingOn: false }, '2026-11-02'), true);
  assert.equal(bossMet(config, [...study.slice(3), ...jobs], { networkingOn: false }, '2026-11-02'), false); // short on hours
});
