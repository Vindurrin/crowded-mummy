import { esc, bar, dateNav, blank } from '../ui.js';
import { ofKind, onDate } from '../model.js';
import { isWorkDay, weekday } from '../dates.js';
import { computeXp, levelRule, levelInfo, streak, streakDates } from '../xp.js';
import { sessionForDate } from '../training.js';
import { nextFiling } from '../admin.js';
import { toggleEntry } from '../state.js';
import * as setup from './setup.js';

const BLOCK_LABELS = { review: 'Review', focus: 'Focus', log: 'Log', jobSearch: 'Job search' };
const STREAKS = [['routine', 'Morning'], ['move', 'Gym or walk'], ['focus', 'Focus'], ['jobSearch', 'Job search']];

function header(ctx) {
  const { config, entries, answers, today } = ctx;
  const rule = levelRule(config.gamification.levelXp);
  const xp = computeXp(entries, config, answers);
  const all = levelInfo(xp.total, rule);
  const grace = config.gamification.streakGraceDaysPerWeek;
  const chips = Object.entries(xp.byDomain).map(([d, v]) => `<span class="chip">${esc(d)} ${levelInfo(v, rule).level}</span>`).join('');
  const streaks = STREAKS.map(([flag, label]) =>
    `<span class="chip">${label}: ${streak(streakDates(entries, config, answers, flag), today, config.meta.dayOff, grace)} days</span>`).join('');
  return `<div class="box"><strong>Level ${all.level}</strong> · ${all.into} / ${all.need} XP
    ${bar(all.into, all.need)}<div class="chips">${chips}</div><div class="chips">${streaks}</div></div>`;
}

function row(done, label, data, extra = '') {
  return `<button class="row ${done ? 'done' : ''}" ${data}><span class="tick">${done ? '✓' : ''}</span><span>${label}${extra}</span></button>`;
}

function checkRow(ctx, group, item, extra = '') {
  const done = ofKind(onDate(ctx.entries, ctx.date), 'check').some((e) => e.group === group && e.itemId === item.id);
  return row(done, esc(item.label), `data-act="check" data-group="${group}" data-id="${esc(item.id)}"`, extra);
}

function morning(ctx) {
  const { config, date } = ctx;
  const sessionId = sessionForDate(date, config.training);
  const items = config.routines.morning.map((item) => {
    if (item.id === 'move') {
      const label = sessionId ? `Gym: ${config.training.sessions[sessionId].name}` : 'Walk';
      const link = sessionId ? ' <a href="#train">Open Train</a>' : '';
      return checkRow(ctx, 'morning', { id: 'move', label }, link);
    }
    return checkRow(ctx, 'morning', item, item.gamify === false ? ' <span class="note">no points</span>' : '');
  });
  return `<h2>Routine and body</h2>${items.join('')}
    <p class="note">Cardio: ${config.training.cardio.minutes} min at ${config.training.cardio.mph} mph, incline ${config.training.cardio.incline}.
    Walk ${config.training.neat.milesMin} to ${config.training.neat.milesMax} miles in total.</p>`;
}

function evening(ctx) {
  const items = ctx.answers.evening || [];
  return items.length ? `<h2>Evening</h2>${items.map((i) => checkRow(ctx, 'evening', i)).join('')}` : '';
}

function nutrition(ctx) {
  const eaten = ofKind(onDate(ctx.entries, ctx.date), 'meal').length;
  const total = ctx.config.nutrition.items.length;
  const weighed = ofKind(onDate(ctx.entries, ctx.date), 'weight')[0];
  return `<h2>Nutrition</h2>
    <a class="row ${eaten === total ? 'done' : ''}" href="#meals"><span class="tick">${eaten === total ? '✓' : ''}</span><span>Meals: ${eaten} of ${total}</span></a>
    <a class="row ${weighed ? 'done' : ''}" href="#meals"><span class="tick">${weighed ? '✓' : ''}</span><span>Weigh-in${weighed ? `: ${weighed.lb} lb` : ''}</span></a>`;
}

function blocks(ctx, names, title) {
  const { config, date, status } = ctx;
  if (!isWorkDay(date, config.meta.dayOff)) return '';
  const day = ofKind(onDate(ctx.entries, date), 'block');
  const rows = names.map((name) => {
    const minutes = config.meta.dayBlocksMin[name];
    const where = name !== 'jobSearch' && status.current ? ` <span class="note">for ${esc(status.current.name)}</span>` : '';
    return row(day.some((e) => e.block === name), `${BLOCK_LABELS[name]}, ${minutes} min${where}`, `data-act="block" data-name="${name}"`);
  });
  return `<h2>${title}</h2>${rows.join('')}`;
}

function admin(ctx) {
  const next = nextFiling(ctx.answers.nextFilingWed, ctx.date);
  if (!ctx.answers.nextFilingWed) return `<h2>Admin</h2><p>${blank('Next filing Wednesday is blank.')} <a href="#admin">Set it</a></p>`;
  const days = [next.day, ...next.fallback];
  if (!days.includes(ctx.date)) return '';
  const filed = ofKind(onDate(ctx.entries, ctx.date), 'filing').length > 0;
  return `<h2>Admin</h2><a class="row ${filed ? 'done' : ''}" href="#admin"><span class="tick">${filed ? '✓' : ''}</span>
    <span>${ctx.date === next.day ? 'Request TWC payment today' : `You can still file. ${esc(weekday(ctx.date))}.`}</span></a>`;
}

export function html(ctx) {
  const dayOff = !isWorkDay(ctx.date, ctx.config.meta.dayOff);
  return `${header(ctx)}${ctx.answers.firstRunDone ? '' : setup.html(ctx, true)}
    ${dateNav(ctx.date, ctx.today)}
    ${dayOff ? '<p class="box">Day off. Rest.</p>' : ''}
    ${morning(ctx)}${evening(ctx)}${nutrition(ctx)}
    ${blocks(ctx, ['review', 'focus', 'log'], 'Cloud')}
    ${blocks(ctx, ['jobSearch'], 'Job search')}
    ${admin(ctx)}`;
}

export const acts = {
  check: (el, ctx) => {
    const { group, id } = el.dataset;
    return toggleEntry(ctx, (e) => e.kind === 'check' && e.date === ctx.date && e.group === group && e.itemId === id,
      { kind: 'check', date: ctx.date, itemId: id, group });
  },
  block: (el, ctx) => {
    const name = el.dataset.name;
    const pathId = name === 'jobSearch' ? null : ctx.status.current?.id ?? null;
    return toggleEntry(ctx, (e) => e.kind === 'block' && e.date === ctx.date && e.block === name,
      { kind: 'block', date: ctx.date, block: name, minutes: ctx.config.meta.dayBlocksMin[name], pathId });
  },
};
