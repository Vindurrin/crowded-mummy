import { esc, bar, blank, formValues } from '../ui.js';
import { ofKind, newEntry } from '../model.js';
import { mondayOf } from '../dates.js';
import { weekCounts, jobTargets } from '../jobs.js';
import { cloudAppsGate } from '../path.js';
import * as db from '../db.js';
import { setAnswers } from '../state.js';

const LABELS = { applications: 'Applications', outreach: 'Outreach messages', mockInterviews: 'Mock interviews', networkingEvents: 'Networking events' };

function targets(ctx) {
  const counts = weekCounts(ctx.entries, mondayOf(ctx.today));
  const goals = jobTargets(ctx.config, ctx.answers);
  const rows = Object.entries(goals).map(([key, goal]) => `<p>${LABELS[key]}: <strong>${counts[key]}</strong> of ${goal}${bar(counts[key], goal)}</p>`).join('');
  const note = ctx.config.jobSearch.networkingNote;
  return `<div class="box"><strong>This week</strong>${rows}
    <label class="inline"><input type="checkbox" data-change="networkingOn" ${ctx.answers.networkingOn === false ? '' : 'checked'}> Count networking events <span class="note">(${esc(note)})</span></label></div>`;
}

function form(ctx) {
  const { types } = ctx.config.jobLog;
  return `<div class="box" data-form><strong>Quick capture</strong>
    <p class="note">${esc(ctx.config.jobLog.rule)} You review each entry before it counts.</p>
    <label>Date <input type="date" name="date" value="${ctx.today}"></label>
    <label>Type <select name="type">${types.map((t) => `<option>${esc(t)}</option>`).join('')}</select></label>
    <label class="inline"><input type="checkbox" name="mock"> This was a mock interview</label>
    ${['employer', 'role', 'source', 'contact', 'method', 'result'].map((f) => `<label>${f[0].toUpperCase() + f.slice(1)} <input type="text" name="${f}"></label>`).join('')}
    <label>Notes <textarea name="notes" rows="2"></textarea></label>
    <button data-act="saveJob">Save to review</button></div>`;
}

function entryLine(e) {
  const bits = [e.date, e.type + (e.method === 'mock' ? ' (mock)' : ''), e.employer, e.role, e.source, e.contact, e.result, e.notes].filter(Boolean);
  return esc(bits.join(' · '));
}

function lists(ctx) {
  const all = ofKind(ctx.entries, 'joblog').sort((a, b) => b.date.localeCompare(a.date));
  const pending = all.filter((e) => !e.reviewed);
  const recent = all.filter((e) => e.reviewed).slice(0, 10);
  return `${pending.length ? `<h2>Review before it counts</h2>${pending.map((e) => `<div class="box"><p>${entryLine(e)}</p>
      <button data-act="reviewJob" data-id="${e.id}">It is right</button> <button class="plain" data-act="deleteJob" data-id="${e.id}">Delete</button></div>`).join('')}` : ''}
    <h2>Recent entries</h2>${recent.length ? recent.map((e) => `<p>${entryLine(e)} <button class="plain small" data-act="deleteJob" data-id="${e.id}">Delete</button></p>`).join('') : '<p class="note">None yet.</p>'}`;
}

function resumes(ctx) {
  const cpDone = ctx.status.items.find((i) => i.id === 'p-cp').complete;
  return `<h2>Resume versions</h2><ul>${ctx.config.jobSearch.resumeVersions.map((r) => {
    const toWrite = /TO WRITE/.test(r);
    return `<li>${esc(r.replace(/\s*\(TO WRITE[^)]*\)/, ''))}${toWrite ? ` <span class="note">${cpDone ? 'Write it now.' : 'Write it after CloudPipe is done.'}</span>` : ''}</li>`;
  }).join('')}</ul>
  <p class="note">Log each update as a "resume-update" entry.</p>`;
}

export function html(ctx) {
  const js = ctx.config.jobSearch;
  const cloud = cloudAppsGate(ctx.config, ctx.entries, ctx.today, ctx.status);
  return `<h2>Jobs</h2>
    <div class="box warn">⚠ ${esc(js.guardrail)}</div>
    ${targets(ctx)}
    <p class="${cloud.open ? 'ok' : 'warn'}">${cloud.open ? '🔓' : '🔒'} ${esc(cloud.unlocks)}: ${cloud.open ? 'open' : esc(cloud.reason)}
      ${cloud.open ? '' : `Earliest open date: ${esc(cloud.opensOn)}.`} <span class="note">${esc(cloud.note)}</span></p>
    <p class="note">Salary floor: $${js.salaryFloor.toLocaleString('en-US')}. Runway: ${esc(js.runwayMonths)} months.</p>
    ${form(ctx)}${lists(ctx)}${resumes(ctx)}
    <h2>Bridge targets</h2><p>${js.bridgeTargets.map(esc).join(', ')}.</p>`;
}

export const acts = {
  async saveJob(el, ctx) {
    const v = formValues(el);
    const { date, mock, ...fields } = v;
    if (mock && v.type !== 'interview') throw new Error('Mock interview only fits the "interview" type.');
    await db.putEntry(newEntry('joblog', date || ctx.today, { ...fields, ...(mock ? { method: 'mock' } : {}), reviewed: false }));
  },
  reviewJob: (el, ctx) => db.putEntry({ ...ctx.entries.find((e) => e.id === el.dataset.id), reviewed: true }),
  deleteJob: (el) => db.deleteEntry(el.dataset.id),
  networkingOn: (el, ctx) => setAnswers(ctx, { networkingOn: el.checked }),
};
