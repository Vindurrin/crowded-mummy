// XP, levels, and streaks.
import { addDays, weekday, mondayOf } from './dates.js';
import { ofKind, onDate } from './model.js';
import { bossMet } from './week.js';
import { pathStates, isComplete } from './path.js';

// Seed says: "next level needs 100 + 50*(level-1) XP". Read both numbers from the text.
export function levelRule(text) {
  const m = /(\d+)\s*\+\s*(\d+)\s*\*/.exec(text);
  if (!m) throw new Error(`Cannot read level rule: ${text}`);
  return { base: Number(m[1]), step: Number(m[2]) };
}

export function levelInfo(xp, rule) {
  let level = 1;
  let left = xp;
  while (left >= rule.base + rule.step * (level - 1)) {
    left -= rule.base + rule.step * (level - 1);
    level++;
  }
  return { level, into: left, need: rule.base + rule.step * (level - 1) };
}

// Which items count toward the morning XP. Pills 1 and sleep never count.
export function routineIds(config) {
  const skip = config.gamification.noPenaltyOrXp;
  return config.routines.morning
    .filter((i) => i.gamify !== false && i.id !== 'move' && !skip.includes(i.id))
    .map((i) => i.id);
}

// What was finished on one day.
export function dayFlags(date, entries, config, answers = {}) {
  const day = onDate(entries, date);
  const checked = new Set(ofKind(day, 'check').filter((e) => e.group === 'morning').map((e) => e.itemId));
  const meals = new Set(ofKind(day, 'meal').map((e) => e.itemId));
  const blocks = new Set(ofKind(day, 'block').map((e) => e.block));
  const ids = routineIds(config);
  return {
    routine: ids.length > 0 && ids.every((id) => checked.has(id)),
    move: checked.has('move'),
    meals: config.nutrition.items.every((i) => meals.has(i.id)),
    review: blocks.has('review'),
    focus: blocks.has('focus'),
    log: blocks.has('log'),
    jobSearch: blocks.has('jobSearch'),
  };
}

// Each XP rule belongs to one domain.
const RULES = [
  ['routine', 'morningChecklist', 'Routine'],
  ['move', 'gymOrWalk', 'Body'],
  ['meals', 'mealsChecklist', 'Nutrition'],
  ['focus', 'focusBlock', 'Cloud'],
  ['log', 'logEntry', 'Cloud'],
  ['jobSearch', 'jobSearchBlock', 'JobSearch'],
];

export function computeXp(entries, config, answers = {}) {
  const gx = config.gamification.xp;
  const byDomain = Object.fromEntries(config.gamification.domains.map((d) => [d, 0]));
  const add = (domain, points) => { byDomain[domain] += points; };

  const dates = [...new Set(entries.map((e) => e.date))];
  for (const date of dates) {
    const flags = dayFlags(date, entries, config, answers);
    for (const [flag, xpKey, domain] of RULES) if (flags[flag]) add(domain, gx[xpKey]);
  }

  const states = pathStates(entries);
  for (const item of config.path) {
    if (!isComplete(item, states[item.id])) continue;
    add('Cloud', item.kind === 'cert' ? gx.examPass : gx.project);
  }

  const weeks = [...new Set(dates.map(mondayOf))];
  for (const week of weeks) if (bossMet(config, entries, answers, week)) add('Admin', gx.weeklyBoss);

  const total = Object.values(byDomain).reduce((a, b) => a + b, 0);
  return { total, byDomain };
}

// Streak: count days done in a row, back from today.
// Day off is skipped. Each week may have `grace` missed days.
export function streak(doneDates, today, dayOff, grace) {
  const done = new Set(doneDates);
  if (!done.size) return 0;
  const first = [...done].sort()[0];
  let count = 0;
  let d = done.has(today) ? today : addDays(today, -1);
  const graceUsed = {};
  while (d >= first) {
    if (weekday(d) !== dayOff) {
      if (done.has(d)) count++;
      else {
        const wk = mondayOf(d);
        graceUsed[wk] = (graceUsed[wk] || 0) + 1;
        if (graceUsed[wk] > grace) break;
      }
    }
    d = addDays(d, -1);
  }
  return count;
}

export function streakDates(entries, config, answers, flag) {
  return [...new Set(entries.map((e) => e.date))].filter((d) => dayFlags(d, entries, config, answers)[flag]);
}
