import { esc, num, blank, bar, dateNav, formValues, numOrNull } from '../ui.js';
import { ofKind, onDate } from '../model.js';
import { NUTRIENTS, mergeItems, planTotals, dayTotals, weightAverage, weeklyChange, isStalled } from '../nutrition.js';
import * as db from '../db.js';
import { toggleEntry, setAnswers, replaceEntry } from '../state.js';

const LABELS = { kcal: 'Calories', protein: 'Protein g', carbs: 'Carbs g', fat: 'Fat g', fiber: 'Fiber g', sodiumMg: 'Sodium mg' };

const items = (ctx) => mergeItems(ctx.config.nutrition.items, ctx.answers.nutritionOverrides);

function totalsTable(ctx, eaten, plan) {
  const old = ctx.config.nutrition.lockedTargetsOld;
  const official = ctx.answers.nutritionTarget;
  const sodium = ctx.answers.sodiumGoalMg;
  const cell = (v) => (v == null ? '–' : num(v, 0));
  const rows = NUTRIENTS.map((n) => {
    const goal = n === 'sodiumMg' ? sodium : official?.[n];
    return `<tr><td>${LABELS[n]}</td><td><strong>${cell(eaten.totals[n])}</strong></td><td>${cell(plan.totals[n])}</td>
      <td>${cell(old[n])}</td><td>${goal == null ? '–' : cell(goal)}</td></tr>`;
  }).join('');
  const miss = plan.missing.length ? `<p class="warn">Totals leave out blank values for: ${plan.missing.map(esc).join(', ')}. Enter them below.</p>` : '';
  return `<table><tr><th></th><th>Eaten</th><th>Plan</th><th>Old goal</th><th>Your goal</th></tr>${rows}</table>${miss}
    ${bar(eaten.totals.kcal, official?.kcal || old.kcal)}`;
}

function itemRows(ctx, list) {
  const meals = ofKind(onDate(ctx.entries, ctx.date), 'meal');
  return list.map((item) => {
    const m = meals.find((e) => e.itemId === item.id);
    const grams = item.scalesWithWeight
      ? `<label class="grams">Real weight (g) <input type="number" name="grams" data-change="mealGrams" value="${esc(m?.grams ?? item.labelWeightG)}"></label>` : '';
    const note = item.note ? ` <span class="note">${esc(item.note)}</span>` : '';
    return `<div class="meal" data-item="${esc(item.id)}"><button class="row ${m ? 'done' : ''}" data-act="meal" data-id="${esc(item.id)}">
      <span class="tick">${m ? '✓' : ''}</span><span>${esc(item.name)} <span class="note">${esc(item.qty)}</span>${note}</span></button>${grams}</div>`;
  }).join('');
}

function blankItems(ctx, list) {
  return list.filter((i) => NUTRIENTS.some((n) => i[n] == null)).map((item) => `
    <div class="box" data-form><strong>${esc(item.name)}</strong> <span class="note">${esc(item.qty)}. ${esc(item.note || '')}</span>
      <div class="reps">${NUTRIENTS.map((n) => `<label>${LABELS[n]} <input type="number" step="any" name="${n}" value="${esc(item[n])}"></label>`).join('')}</div>
      <button data-act="saveValues" data-id="${esc(item.id)}">Save label values</button></div>`).join('');
}

function targets(ctx) {
  const a = ctx.answers;
  const t = a.nutritionTarget || {};
  return `<div class="box" data-form><p>${esc(ctx.config.nutrition.decisionPending)}</p>
    <button class="plain" data-act="useOld">Use old goal</button> <button class="plain" data-act="usePlan">Use plan totals</button>
    <div class="reps">${['kcal', 'protein', 'carbs', 'fat'].map((n) => `<label>${LABELS[n]} <input type="number" name="${n}" value="${esc(t[n])}"></label>`).join('')}
    <label>Sodium goal mg <input type="number" name="sodiumGoalMg" value="${esc(a.sodiumGoalMg)}"></label></div>
    <button data-act="saveTarget">Save my goal</button></div>`;
}

export function weighIn(ctx) {
  const { entries, answers, config, date } = ctx;
  const today = ofKind(onDate(entries, date), 'weight')[0];
  const avg = weightAverage(entries, date);
  const change = weeklyChange(entries, date);
  const th = answers.flatThresholdLb ?? null;
  const stalled = isStalled(entries, date, th);
  const ladder = config.weighIn.stallLadder;
  const handled = answers.stallsHandled || 0;
  const step = ladder[Math.min(handled, ladder.length - 1)];
  return `<div class="box" data-form><strong>Weigh-in</strong>
    <p class="note">${esc(config.weighIn.note)} Goal: ${esc(config.weighIn.goal)}.</p>
    <label>Weight (lb) <input type="number" step="0.1" name="lb" value="${esc(today?.lb)}"></label>
    <button data-act="saveWeight">Save</button>
    <p>7-day average: <strong>${avg == null ? '–' : `${avg} lb`}</strong>.
      ${change == null ? 'Change since last week: needs two weeks of readings.' : `Change since last week: ${change > 0 ? '+' : ''}${change} lb.`}</p>
    <label>A flat week means the average fell less than (lb) ${th == null ? blank('blank') : ''}
      <input type="number" step="0.1" name="flat" value="${esc(th)}"></label>
    <button class="plain" data-act="saveFlat">Save</button>
    ${stalled ? `<p class="warn">Two flat weeks. Next change: ${esc(step)}</p>
      <button class="plain" data-act="stallHandled">I made this change</button>` : ''}
  </div>`;
}

export function html(ctx) {
  const list = items(ctx);
  const meals = ofKind(onDate(ctx.entries, ctx.date), 'meal');
  const eaten = dayTotals(list, meals);
  const plan = planTotals(list);
  return `${dateNav(ctx.date, ctx.today)}<h2>Meals</h2>
    <p>${meals.length} of ${list.length} checked.</p>
    ${itemRows(ctx, list)}${totalsTable(ctx, eaten, plan)}
    ${weighIn(ctx)}
    <h2>Your goal</h2>${targets(ctx)}
    ${blankItems(ctx, list) ? `<h2>Blank label values</h2>${blankItems(ctx, list)}` : ''}
    <h2>Prep guide</h2><div class="box"><p>Air fryer at ${esc(ctx.config.nutrition.recipes.temperature)}.</p>
      <ol>${ctx.config.nutrition.recipes.order.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>`;
}

const gramsOf = (el) => numOrNull(el.closest('[data-item]')?.querySelector('[name=grams]')?.value);

export const acts = {
  meal: (el, ctx) => toggleEntry(ctx, (e) => e.kind === 'meal' && e.date === ctx.date && e.itemId === el.dataset.id,
    { kind: 'meal', date: ctx.date, itemId: el.dataset.id, ...(gramsOf(el) ? { grams: gramsOf(el) } : {}) }),
  async mealGrams(el, ctx) {
    const id = el.closest('[data-item]').dataset.item;
    const found = ctx.entries.find((e) => e.kind === 'meal' && e.date === ctx.date && e.itemId === id);
    if (found) await db.putEntry({ ...found, grams: gramsOf(el) });
  },
  async saveWeight(el, ctx) {
    const lb = numOrNull(formValues(el).lb);
    if (lb == null) throw new Error('Enter your weight first.');
    await replaceEntry(ctx, (e) => e.kind === 'weight' && e.date === ctx.date, 'weight', ctx.date, { lb });
  },
  saveFlat: (el, ctx) => setAnswers(ctx, { flatThresholdLb: numOrNull(formValues(el).flat) }),
  stallHandled: (el, ctx) => setAnswers(ctx, { stallsHandled: (ctx.answers.stallsHandled || 0) + 1 }),
  async saveValues(el, ctx) {
    const v = formValues(el);
    const typed = Object.fromEntries(NUTRIENTS.map((n) => [n, numOrNull(v[n])]));
    await setAnswers(ctx, { nutritionOverrides: { ...ctx.answers.nutritionOverrides, [el.dataset.id]: typed } });
  },
  useOld: (el, ctx) => {
    const { kcal, protein, carbs, fat } = ctx.config.nutrition.lockedTargetsOld;
    return setAnswers(ctx, { nutritionTarget: { kcal, protein, carbs, fat } });
  },
  usePlan: (el, ctx) => {
    const { kcal, protein, carbs, fat } = planTotals(items(ctx)).totals;
    return setAnswers(ctx, { nutritionTarget: { kcal, protein, carbs, fat } });
  },
  saveTarget(el, ctx) {
    const v = formValues(el);
    const t = Object.fromEntries(['kcal', 'protein', 'carbs', 'fat'].map((n) => [n, numOrNull(v[n])]));
    return setAnswers(ctx, { nutritionTarget: t, sodiumGoalMg: numOrNull(v.sodiumGoalMg) });
  },
};
