import { esc, num, bar, blank, formValues, numOrNull } from '../ui.js';
import { ofKind, newEntry } from '../model.js';
import { cloudAppsGate } from '../path.js';
import * as db from '../db.js';

const when = (d) => esc(d);

function gateBlock(g, label) {
  return `<p class="${g.open ? 'ok' : 'warn'}">${g.open ? '🔓' : '🔒'} ${esc(label)}: ${g.open ? 'open' : esc(g.reason)}
    ${g.open ? '' : `<br>Earliest open date: ${when(g.opensOn)}.`}</p>`;
}

function checks(item) {
  const s = item.state || {};
  const box = (field, text) => `<label class="inline"><input type="checkbox" data-change="pathState" data-path="${item.id}" data-field="${field}" ${s[field] ? 'checked' : ''}> ${text}</label>`;
  if (item.kind === 'cert') return box('passed', 'I passed the exam');
  return `${box('readme', 'README done')}${box('decisionNote', 'Decision note done')}${box('teardown', 'Teardown confirmed')}
    ${item.id === 'p-cp' ? box('published', 'Published on GitHub') : ''}`;
}

function examBlock(ctx, item) {
  const g = item.examGate;
  if (!g) return '';
  const date = item.examDate;
  return `<p class="${g.open ? 'ok' : 'note'}">${g.open ? '🔓' : '🔒'} ${esc(g.unlocks)}: ${g.have} of ${g.count} timed exams at ${g.minScore}% or higher.
    ${g.open ? '' : `Earliest open date: ${when(g.opensOn)}.`}</p>
    <p class="note">Exam date: ${date ? when(date) : blank('blank')}${item.examBeforeFinish ? ' <span class="warn">This is before the study hours are done.</span>' : ''}</p>`;
}

function card(ctx, item) {
  const state = item.complete ? 'done' : item.locked ? 'locked' : 'open';
  const drift = item.complete ? '' : item.driftDays === 0 ? 'On plan.' : item.driftDays > 0 ? `${item.driftDays} days later than plan.` : `${-item.driftDays} days earlier than plan.`;
  return `<div class="box ${state}">
    <strong>${item.complete ? '✓ ' : item.locked ? '🔒 ' : ''}${esc(item.name)}</strong>
    <span class="note">${item.kind}, ${item.hours} h</span>
    ${bar(item.hoursLogged, item.hours)}
    <p class="note">${num(item.hoursLogged)} of ${item.hours} h logged. Plan date ${when(item.targetDate)}.
      ${item.complete ? `Done ${when(item.projected)}.` : `Now ${when(item.projected)}. ${drift}`}</p>
    ${item.locked ? `<p class="warn">${esc(item.lockReason)}<br>Earliest open date: ${when(item.opensOn)}.</p>` : ''}
    ${item.locked ? '' : examBlock(ctx, item)}
    ${item.locked ? '' : `<div>${checks(item)}</div>`}
  </div>`;
}

function practice(ctx) {
  const log = ofKind(ctx.entries, 'exam').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  return `<h2>Practice exams</h2><p class="note">${esc(ctx.config.study.method)}</p>
    <div class="box" data-form>
      <label>Exam <select name="exam"><option value="ccp">CCP</option><option value="saa">SAA</option></select></label>
      <label>Score (%) <input type="number" min="0" max="100" name="score"></label>
      <label class="inline"><input type="checkbox" name="timed" checked> Timed, full exam</label>
      <label>Weak topics <input type="text" name="weakTopics" placeholder="IAM, VPC"></label>
      <label>Date <input type="date" name="date" value="${ctx.today}"></label>
      <button data-act="savePractice">Save practice exam</button></div>
    ${log.map((e) => `<p>${when(e.date)} · ${esc(e.exam.toUpperCase())} · ${e.score}% ${e.timed ? '(timed)' : '(not timed)'}
      ${e.weakTopics ? `· weak: ${esc(e.weakTopics)}` : ''} <button class="plain small" data-act="deleteEntry" data-id="${e.id}">Delete</button></p>`).join('')}`;
}

export function html(ctx) {
  const cloud = cloudAppsGate(ctx.config, ctx.entries, ctx.today, ctx.status);
  return `<h2>Path</h2><p class="note">Dates come from your real hours. Hours count when you check the Cloud blocks on Today.</p>
    ${gateBlock(cloud, cloud.unlocks)}<p class="note">${esc(cloud.note)}</p>
    ${ctx.status.items.map((i) => card(ctx, i)).join('')}${practice(ctx)}`;
}

export const acts = {
  async pathState(el, ctx) {
    const { path, field } = el.dataset;
    const item = ctx.status.items.find((i) => i.id === path);
    const keep = Object.fromEntries(['passed', 'readme', 'decisionNote', 'teardown', 'published'].map((f) => [f, !!item.state?.[f]]));
    await db.putEntry(newEntry('pathstate', ctx.today, { pathId: path, ...keep, [field]: el.checked }));
  },
  async savePractice(el, ctx) {
    const v = formValues(el);
    const score = numOrNull(v.score);
    if (score == null || score < 0 || score > 100) throw new Error('Enter a score from 0 to 100.');
    await db.putEntry(newEntry('exam', v.date || ctx.today, { exam: v.exam, score, timed: v.timed, weakTopics: v.weakTopics }));
  },
  deleteEntry: (el) => db.deleteEntry(el.dataset.id),
};
