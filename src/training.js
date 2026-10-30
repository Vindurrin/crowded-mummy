// Training: sessions, working weights, and the progression rule.
import { weekday } from './dates.js';
import { ofKind, newestFirst } from './model.js';

export const sessionForDate = (date, training) => training.schedule[weekday(date)] || null;

// "9x3" -> { reps: 9, sets: 3 }
export function parseDone(done) {
  const m = /^(\d+)x(\d+)$/.exec(done || '');
  return m ? { reps: Number(m[1]), sets: Number(m[2]) } : null;
}

export function prescribed(training, sessionId, exercise) {
  return training.sessions[sessionId]?.exercises.find((e) => e.name === exercise) || null;
}

const hitAll = (reps, sets, wanted) => reps.length >= sets && reps.every((r) => r >= wanted);

// The working weight is one number per exercise, from the newest log or the baseline.
export function workingWeight(exercise, training, entries) {
  const log = ofKind(entries, 'setlog').filter((e) => e.exercise === exercise).sort(newestFirst)[0];
  if (log) {
    return { weight: log.weight, hit: hitAll(log.reps, log.prescribedSets, log.prescribedReps), source: 'log', date: log.date };
  }
  const base = training.baselines[exercise];
  if (!base) return null;
  const done = parseDone(base.done);
  const want = prescribed(training, training.baselineSession, exercise);
  return {
    weight: base.w, source: 'baseline', date: training.baselineDate, note: base.note,
    hit: !!(done && want && hitAll(Array(done.sets).fill(done.reps), want.sets, want.reps)),
  };
}

// Proposed rule: all reps on all sets hit -> add the smallest step. Otherwise repeat.
export function nextWeight(exercise, training, entries, step) {
  const now = workingWeight(exercise, training, entries);
  if (!now) return { status: 'no-baseline', weight: null };
  if (!now.hit) return { status: 'repeat', weight: now.weight };
  if (step == null) return { status: 'need-step', weight: now.weight };
  return { status: 'add', weight: now.weight + step };
}

// Exercises with no baseline and no log. Show a warning for each.
export function missingBaselines(training, entries) {
  const names = new Set(Object.values(training.sessions).flatMap((s) => s.exercises.map((e) => e.name)));
  return [...names].filter((name) => !workingWeight(name, training, entries));
}

export function sessionDone(date, sessionId, training, entries) {
  const logged = new Set(ofKind(entries, 'setlog').filter((e) => e.date === date && e.session === sessionId).map((e) => e.exercise));
  return training.sessions[sessionId].exercises.every((e) => logged.has(e.name));
}
