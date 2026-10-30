// Meal totals and weigh-ins.
import { addDays } from './dates.js';
import { ofKind, onDate, latestBy } from './model.js';

export const NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodiumMg'];
const round1 = (n) => Math.round(n * 10) / 10;

// Fill blank values from what Matt typed (label values for the sauces).
export function mergeItems(items, overrides = {}) {
  return items.map((item) => {
    const typed = overrides[item.id];
    if (!typed) return item;
    const merged = { ...item };
    for (const n of NUTRIENTS) if (merged[n] == null && typed[n] != null) merged[n] = typed[n];
    return merged;
  });
}

// Salmon and chicken scale with the real weight.
export function scaleItem(item, grams) {
  if (!item.scalesWithWeight || !grams) return item;
  const factor = grams / item.labelWeightG;
  const scaled = { ...item };
  for (const n of NUTRIENTS) if (item[n] != null) scaled[n] = item[n] * factor;
  return scaled;
}

// Add up items. A blank value is skipped, and the item is listed in `missing`.
export function sumItems(items) {
  const totals = Object.fromEntries(NUTRIENTS.map((n) => [n, 0]));
  const missing = [];
  for (const item of items) {
    if (NUTRIENTS.some((n) => item[n] == null)) missing.push(item.id);
    for (const n of NUTRIENTS) if (item[n] != null) totals[n] += item[n];
  }
  for (const n of NUTRIENTS) totals[n] = round1(totals[n]);
  return { totals, missing };
}

// The plan: every item at its label amount.
export const planTotals = (items) => sumItems(items);

// What Matt ate: the checked items, with real weights.
export function dayTotals(items, meals) {
  const eaten = meals.map((m) => {
    const item = items.find((i) => i.id === m.itemId);
    return item && scaleItem(item, m.grams);
  }).filter(Boolean);
  return sumItems(eaten);
}

// One reading per day: the newest one.
function dailyWeights(entries) {
  return Object.values(latestBy(ofKind(entries, 'weight'), (e) => e.date));
}

// Average of the readings in the 7 days that end on `date`. Null if there are none.
export function weightAverage(entries, date) {
  const from = addDays(date, -6);
  const days = dailyWeights(entries).filter((e) => e.date >= from && e.date <= date);
  if (!days.length) return null;
  return round1(days.reduce((s, e) => s + e.lb, 0) / days.length);
}

// Change in the 7-day average since one week ago. Negative means weight went down.
export function weeklyChange(entries, date) {
  const now = weightAverage(entries, date);
  const before = weightAverage(entries, addDays(date, -7));
  return now == null || before == null ? null : round1(now - before);
}

// Stalled: two weeks in a row where the average fell by less than `threshold` lb.
export function isStalled(entries, date, threshold) {
  if (threshold == null) return null;
  const weeks = [weeklyChange(entries, date), weeklyChange(entries, addDays(date, -7))];
  if (weeks.includes(null)) return false;
  return weeks.every((change) => -change < threshold);
}
