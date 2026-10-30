// Data model. Plain objects only.
//
// Two stores in IndexedDB:
//   config:  key -> value. Seed sections, plus "answers" (what Matt typed).
//   entries: one object per thing Matt did. Shape: { id, kind, date, ...fields }
//
// Fields by kind:
//   check    itemId, group ('morning' | 'meal' | 'evening')
//   block    block ('review' | 'focus' | 'log' | 'jobSearch'), minutes, pathId?
//   setlog   session, exercise, weight, reps (array, one number per set)
//   weight   lb
//   meal     itemId, grams?
//   joblog   type, employer, role, source, contact, method, result, notes, reviewed
//   exam     exam, score, weakTopics, timed
//   filing   done
//   sleep    lightsOut, wake

export const KINDS = [
  'check', 'block', 'setlog', 'weight', 'meal', 'joblog', 'exam', 'filing', 'sleep',
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
