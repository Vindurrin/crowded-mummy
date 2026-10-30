// Data model. Plain objects only.
//
// Two stores in IndexedDB:
//   config:  key -> value. Seed sections, plus "answers" (what Matt typed).
//   entries: one object per thing Matt did. Shape: { id, kind, date, ...fields }
//
// Fields by kind:
//   check      itemId, group ('morning' | 'weekly' | 'evening')
//   block      block ('review' | 'focus' | 'log' | 'jobSearch'), minutes, pathId
//   setlog     session, exercise, weight, reps (one number per set), prescribedSets, prescribedReps
//   weight     lb  (one per day)
//   meal       itemId, grams?
//   joblog     type, employer, role, source, contact, method, result, notes, reviewed
//   exam       exam ('ccp' | 'saa'), score, weakTopics, timed
//   pathstate  pathId, passed | readme + decisionNote + teardown + published   (newest wins)
//   filing     done
//   sleep      lightsOut, wake
//
// Answers (config key "answers"): firstRunDone, nextFilingWed, countyWeeklyMinimum,
//   examDates {ccp, saa}, evening [{id,label}], nutritionTarget, sodiumGoalMg,
//   nutritionOverrides {itemId: {...}}, weightStep, progressionConfirmed, flatThresholdLb,
//   stallsHandled, networkingOn, twcColumns, sleepMode, sleepStart

export const KINDS = [
  'check', 'block', 'setlog', 'weight', 'meal', 'joblog', 'exam', 'pathstate', 'filing', 'sleep',
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function newEntry(kind, date, fields = {}) {
  return { id: crypto.randomUUID(), kind, date, ...fields, createdAt: new Date().toISOString() };
}

// Return a list of problems. An empty list means the entry is fine.
export function checkEntry(entry) {
  const problems = [];
  if (!entry || typeof entry !== 'object') return ['Entry is not an object.'];
  if (typeof entry.id !== 'string' || !entry.id) problems.push('Entry has no id.');
  if (!KINDS.includes(entry.kind)) problems.push(`Unknown kind: ${entry.kind}.`);
  if (!DATE.test(entry.date || '')) problems.push(`Bad date: ${entry.date}.`);
  return problems;
}

export const ofKind = (entries, kind) => entries.filter((e) => e.kind === kind);
export const onDate = (entries, date) => entries.filter((e) => e.date === date);

// Newest entry wins. Sort by date, then by creation time.
export const newestFirst = (a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt);

export function latestBy(entries, keyFn) {
  const latest = {};
  for (const e of [...entries].sort(newestFirst).reverse()) latest[keyFn(e)] = e;
  return latest;
}
