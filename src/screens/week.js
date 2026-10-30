import { esc, bar, num } from '../ui.js';
import { ofKind } from '../model.js';
import { mondayOf, addDays, longDate, weekday } from '../dates.js';
import { weekSummary, bossMet } from '../week.js';
import { workSearchCount } from '../jobs.js';
import { toggleEntry } from '../state.js';

const LABELS = { applications: 'Applications', outreach: 'Outreach messages', mockInterviews: 'Mock interviews', networkingEvents: 'Networking events' };

export const weekStartOf = (ctx) => ctx.weekStart || mondayOf(ctx.today);

function nav(ctx, start) {
  const next = start < mondayOf(ctx.today) ? `<button class="plain" data-act="goWeek" data-week="${addDays(start, 7)}">Next week ›</button>` : '';
  return `<div class="datenav"><button class="plain" data-act="goWeek" data-week="${addDays(start, -7)}">‹ Back</button>
    <strong>Week of ${esc(longDate(start))}</strong>${next}</div>`;
}

function writeups(ctx, start) {
  const done = (id) => ofKind(ctx.entries, 'check').some((e) => e.group === 'weekly' && e.itemId === `${id}-${start}`);
  const row = (id, text) => `<button class="row ${done(id) ? 'done' : ''}" data-act="weekly" data-id="${id}-${start}"><span class="tick">${done(id) ? '✓' : ''}</span><span>${text}</span></button>`;
  return `<h2>Write-ups</h2><p class="note">${esc(ctx.config.writeups.cadence)}. Repo: ${esc(ctx.config.writeups.repo)}.</p>
    ${row('medium', 'Medium post')}${row('linkedin', 'LinkedIn post, with a photo')}`;
}

export function html(ctx) {
  const start = weekStartOf(ctx);
  const s = weekSummary(ctx.config, ctx.entries, ctx.answers, start);
  const boss = bossMet(ctx.config, ctx.entries, ctx.answers, start);
  const jobRows = Object.entries(s.targets).map(([k, goal]) => `<p>${LABELS[k]}: <strong>${s.jobs[k]}</strong> of ${goal}${bar(s.jobs[k], goal)}</p>`).join('');
  const change = s.weightNow != null && s.weightBefore != null ? ` Change: ${num(s.weightNow - s.weightBefore)} lb.` : '';
  const review = weekday(ctx.today) === 'Sat' && start === mondayOf(ctx.today) ? '<p class="box">Today is review day. Check each part below.</p>' : '';
  return `${nav(ctx, start)}${review}
    <div class="box ${boss ? 'done' : ''}"><strong>${boss ? '🏆 Weekly boss beaten! +' + ctx.config.gamification.xp.weeklyBoss + ' XP' : 'Weekly boss'}</strong>
      <p class="note">Win by hitting the study hours and every job target.</p></div>
    <h2>Study hours</h2><p><strong>${num(s.studyMin / 60)}</strong> of ${s.studyTarget / 60} h${bar(s.studyMin, s.studyTarget)}</p>
    <h2>Job search</h2>${jobRows}
    <p class="note">Work searches for TWC: ${workSearchCount(ctx.entries, start)}.</p>
    <h2>Training</h2><p>${s.sessions} of ${s.sessionsPlanned} gym sessions.</p>
    <h2>Weight</h2><p>7-day average at week end: ${s.weightNow == null ? '–' : `${s.weightNow} lb`}.${change}</p>
    ${writeups(ctx, start)}`;
}

export const acts = {
  weekly: (el, ctx) => toggleEntry(ctx, (e) => e.kind === 'check' && e.group === 'weekly' && e.itemId === el.dataset.id,
    { kind: 'check', date: ctx.today, itemId: el.dataset.id, group: 'weekly' }),
};
