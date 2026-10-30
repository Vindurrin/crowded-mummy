// Path, gates, and dates. Dates come from real hours logged, not from the seed dates.
import { addDays, diffDays, isWorkDay } from './dates.js';
import { ofKind, onDate, latestBy } from './model.js';

// Time in these blocks counts toward the path. Job search does not.
export const STUDY_BLOCKS = ['review', 'focus', 'log'];
const EXAM_GATE = { ccp: 'g-ccp', saa: 'g-saa' };
const DEPENDS_ON = { secplus: 'p-ss' }; // other items depend on the item before them

export const pathStates = (entries) => latestBy(ofKind(entries, 'pathstate'), (e) => e.pathId);

export function pathMinutes(entries) {
  const out = {};
  for (const e of ofKind(entries, 'block')) {
    if (STUDY_BLOCKS.includes(e.block) && e.pathId) out[e.pathId] = (out[e.pathId] || 0) + e.minutes;
  }
  return out;
}

// A cert is done when passed. A project is done with README, decision note, and teardown.
export function isComplete(item, state) {
  if (!state) return false;
  return item.kind === 'cert' ? !!state.passed : !!(state.readme && state.decisionNote && state.teardown);
}

// Read "2 timed practice exams at 85% or higher" into { count: 2, minScore: 85 }.
export function parseExamGate(when) {
  const m = /(\d+)\s+timed\b.*?(\d+)%/.exec(when);
  if (!m) throw new Error(`Cannot read exam gate: ${when}`);
  return { count: Number(m[1]), minScore: Number(m[2]) };
}

export const practiceCount = (entries, exam, minScore) =>
  ofKind(entries, 'exam').filter((e) => e.exam === exam && e.timed && e.score >= minScore).length;

// Walk forward over work days and fill each item in order.
// Returns { itemId: { finish, examBeforeFinish } }.
export function projectDates({ path, minutesLogged, states, today, startDate, minutesPerDay, minutesToday, dayOff, examDates = {} }) {
  let cursor = today < startDate ? startDate : today;
  let capLeft = cursor === today ? Math.max(0, minutesPerDay - minutesToday) : minutesPerDay;
  const nextDay = () => {
    do cursor = addDays(cursor, 1); while (!isWorkDay(cursor, dayOff));
    capLeft = minutesPerDay;
  };
  if (!isWorkDay(cursor, dayOff)) nextDay();

  const out = {};
  for (const item of path) {
    const state = states[item.id];
    if (isComplete(item, state)) {
      out[item.id] = { finish: state.date };
      continue;
    }
    let need = Math.max(0, item.hours * 60 - (minutesLogged[item.id] || 0));
    while (need > 0) {
      if (capLeft === 0) { nextDay(); continue; }
      const take = Math.min(need, capLeft);
      need -= take;
      capLeft -= take;
    }
    let finish = cursor;
    const exam = examDates[item.id];
    const examBeforeFinish = !!exam && exam < finish;
    if (exam && exam > finish) {
      finish = exam;
      cursor = exam;
      capLeft = 0;
    }
    out[item.id] = { finish, examBeforeFinish };
  }
  return out;
}

export function pathStatus(config, entries, answers, today) {
  const { path, gates, meta } = config;
  const states = pathStates(entries);
  const logged = pathMinutes(entries);
  const minutesPerDay = STUDY_BLOCKS.reduce((sum, b) => sum + meta.dayBlocksMin[b], 0);
  const minutesToday = ofKind(onDate(entries, today), 'block')
    .filter((e) => STUDY_BLOCKS.includes(e.block)).reduce((sum, e) => sum + e.minutes, 0);
  const dates = projectDates({
    path, minutesLogged: logged, states, today, startDate: meta.startDate,
    minutesPerDay, minutesToday, dayOff: meta.dayOff, examDates: answers.examDates || {},
  });

  const items = path.map((item, i) => {
    const complete = isComplete(item, states[item.id]);
    const depId = DEPENDS_ON[item.id] || (i > 0 ? path[i - 1].id : null);
    const dep = path.find((p) => p.id === depId);
    const depDone = !dep || isComplete(dep, states[dep.id]);
    const locked = !complete && !depDone;
    const finish = dates[item.id].finish;
    const row = {
      ...item, complete, locked, state: states[item.id] || null,
      hoursLogged: (logged[item.id] || 0) / 60,
      hoursLeft: complete ? 0 : Math.max(0, item.hours - (logged[item.id] || 0) / 60),
      projected: finish, driftDays: diffDays(item.targetDate, finish),
      examDate: (answers.examDates || {})[item.id] || null,
      examBeforeFinish: !!dates[item.id].examBeforeFinish,
    };
    if (locked) {
      row.lockReason = dep.kind === 'cert'
        ? `Pass ${dep.name} first.`
        : `Finish ${dep.name} first. It needs a README, a decision note, and a confirmed teardown.`;
      row.opensOn = dates[dep.id].finish;
    }
    const gate = gates.find((g) => g.id === EXAM_GATE[item.id]);
    if (gate && !complete) {
      const { count, minScore } = parseExamGate(gate.when);
      const have = practiceCount(entries, item.id, minScore);
      row.examGate = {
        unlocks: gate.unlocks, count, minScore, have, open: have >= count,
        opensOn: have >= count ? today : (finish > today ? finish : today),
      };
    }
    return row;
  });

  const current = items.find((i) => !i.complete && !i.locked) || null;
  return { items, current, minutesPerDay };
}

// Cloud-engineer applications: SAA passed AND CloudPipe published.
export function cloudAppsGate(config, entries, today, status) {
  const gate = config.gates.find((g) => g.id === 'g-cloudapps');
  const states = pathStates(entries);
  const saa = status.items.find((i) => i.id === 'saa');
  const cp = status.items.find((i) => i.id === 'p-cp');
  const missing = [];
  if (!saa.complete) missing.push(`pass ${saa.name}`);
  if (!states['p-cp']?.published) missing.push(`publish ${cp.name} on GitHub`);
  const later = saa.projected > cp.projected ? saa.projected : cp.projected;
  return {
    unlocks: gate.unlocks, note: gate.note, open: missing.length === 0,
    reason: missing.length ? `You must ${missing.join(' and ')}.` : '',
    opensOn: missing.length ? (later > today ? later : today) : today,
  };
}
