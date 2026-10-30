import { esc, blank, formValues, download, pickFile } from '../ui.js';
import { ofKind, onDate, newEntry } from '../model.js';
import { mondayOf, addDays, diffDays } from '../dates.js';
import { nextFiling, filingDates, buildIcs, sleepReviewDue } from '../admin.js';
import { workSearchCount, reviewedJobs, toCsv } from '../jobs.js';
import { buildBackup, parseBackup, backupFileName } from '../backup.js';
import { checkSeed, seedToConfig, findBlanks } from '../seed.js';
import { findForbidden } from '../privacy.js';
import * as db from '../db.js';
import { setAnswers } from '../state.js';
import * as setup from './setup.js';

function unemployment(ctx) {
  const { config, answers, today, entries } = ctx;
  const u = config.unemployment;
  const next = nextFiling(answers.nextFilingWed, today);
  const count = workSearchCount(entries, mondayOf(today));
  const min = answers.countyWeeklyMinimum;
  const filedToday = ofKind(onDate(entries, today), 'filing').length > 0;
  const list = u.perFiling.map((t, i) => `<label class="inline"><input type="checkbox" name="c${i}"> ${esc(t)}</label>`).join('');
  return `<h2>Unemployment</h2><div class="box" data-form>
    <p>Request payment ${esc(u.cadence)}, on ${esc(u.filingDay)}.</p>
    <p>Next filing: ${next ? `<strong>${esc(next.day)}</strong>. If you miss it, file ${next.fallback.map(esc).join(', ')}.` : blank('blank. Set it below.')}</p>
    <p>Work searches this week: <strong>${count}</strong> of ${min == null ? blank('minimum is blank') : min}.
      <span class="note">Mock interviews and resume updates do not count. Check TWC rules.</span></p>
    <p><strong>Before you file</strong></p>${list}
    <button data-act="markFiled" ${filedToday ? 'disabled' : ''}>${filedToday ? 'Marked as filed today' : 'I filed today'}</button>
    <button class="plain" data-act="downloadIcs">Save calendar file (.ics)</button></div>`;
}

function twc(ctx) {
  const fields = ctx.config.jobLog.fields;
  const chosen = ctx.answers.twcColumns || fields;
  return `<h2>Work search log (TWC)</h2><div class="box" data-form>
    <p class="note">Check these columns against the TWC blank Work Search Log. Pick the ones TWC needs.</p>
    <div class="reps">${fields.map((f) => `<label class="inline"><input type="checkbox" name="col_${f}" ${chosen.includes(f) ? 'checked' : ''}> ${esc(f)}</label>`).join('')}</div>
    <button class="plain" data-act="saveColumns">Save columns</button>
    <label>From <input type="date" name="from" value="${addDays(ctx.today, -13)}"></label>
    <label>To <input type="date" name="to" value="${ctx.today}"></label>
    <button data-act="downloadCsv">Save CSV</button></div>`;
}

function sleep(ctx) {
  const { answers, config, today, entries } = ctx;
  const s = config.sleep;
  if (answers.sleepMode === 'removed') return '';
  if (!answers.sleepMode) {
    return `<h2>Sleep (optional)</h2><div class="box"><p>Try a ${s.reviewAfterDays}-day sleep log. Two fields. No points.</p>
      <button data-act="sleepMode" data-mode="trial">Start the trial</button> <button class="plain" data-act="sleepMode" data-mode="removed">No thanks</button></div>`;
  }
  const todayLog = ofKind(onDate(entries, today), 'sleep')[0];
  const review = sleepReviewDue(answers, today, s.reviewAfterDays)
    ? `<p class="warn">The ${s.reviewAfterDays}-day trial is over. Keep it or remove it?</p>
       <button data-act="sleepMode" data-mode="kept">Keep</button> <button class="plain" data-act="sleepMode" data-mode="removed">Remove</button>` : '';
  const day = answers.sleepStart && answers.sleepMode === 'trial' ? ` Day ${diffDays(answers.sleepStart, today) + 1} of ${s.reviewAfterDays}.` : '';
  return `<h2>Sleep</h2><div class="box" data-form><p class="note">No points. No streak.${day}</p>
    <label>Lights out <input type="time" name="lightsOut" value="${esc(todayLog?.lightsOut)}"></label>
    <label>Wake <input type="time" name="wake" value="${esc(todayLog?.wake)}"></label>
    <button data-act="saveSleep">Save</button>${review}</div>`;
}

function data(ctx) {
  const blanks = ctx.hasSeed ? findBlanks(Object.fromEntries(Object.entries(ctx.config))) : [];
  return `<h2>Data</h2><p>All data stays on this device. ${ctx.entries.length} entries saved.</p>
    ${ctx.hasSeed ? `<p class="note">Blank values in the seed file: ${blanks.length}.</p>` : '<p>No seed file yet. Load it to start.</p>'}
    <button ${ctx.hasSeed ? 'class="plain"' : ''} data-act="loadSeed">${ctx.hasSeed ? 'Reload seed file' : 'Load seed file'}</button>
    <button class="plain" data-act="exportData">Export backup</button>
    <button class="plain" data-act="importData">Import backup</button>`;
}

export const dataHtml = data;

export function html(ctx) {
  return `${unemployment(ctx)}${setup.html(ctx, false)}${twc(ctx)}${sleep(ctx)}${data(ctx)}`;
}

export const acts = {
  async markFiled(el, ctx) {
    const boxes = [...el.closest('[data-form]').querySelectorAll('input[type=checkbox]')];
    if (!boxes.every((b) => b.checked)) throw new Error('Check every item before you file.');
    await db.putEntry(newEntry('filing', ctx.today, { done: true }));
  },
  downloadIcs(el, ctx) {
    const next = nextFiling(ctx.answers.nextFilingWed, ctx.today);
    if (!next) throw new Error('Set the next filing Wednesday first.');
    download(`${ctx.today}-twc-filing-dates.ics`, buildIcs(filingDates(next.day, 26), ctx.config.unemployment.perFiling), 'text/calendar');
  },
  saveColumns(el, ctx) {
    const v = formValues(el);
    return setAnswers(ctx, { twcColumns: ctx.config.jobLog.fields.filter((f) => v[`col_${f}`]) });
  },
  downloadCsv(el, ctx) {
    const v = formValues(el);
    const columns = ctx.config.jobLog.fields.filter((f) => v[`col_${f}`]);
    if (!columns.length) throw new Error('Pick at least one column.');
    const rows = reviewedJobs(ctx.entries).filter((e) => e.date >= v.from && e.date <= v.to && e.type !== 'resume-update' && e.method !== 'mock');
    download(`${ctx.today}-work-search-log.csv`, toCsv(rows, columns), 'text/csv');
  },
  sleepMode: (el, ctx) => setAnswers(ctx, { sleepMode: el.dataset.mode, ...(el.dataset.mode === 'trial' ? { sleepStart: ctx.today } : {}) }),
  async saveSleep(el, ctx) {
    const v = formValues(el);
    for (const old of ofKind(onDate(ctx.entries, ctx.today), 'sleep')) await db.deleteEntry(old.id);
    await db.putEntry(newEntry('sleep', ctx.today, { lightsOut: v.lightsOut, wake: v.wake }));
    if (!ctx.answers.sleepStart) await setAnswers(ctx, { sleepStart: ctx.today });
  },
  async loadSeed() {
    const text = await pickFile();
    if (text === null) return;
    let seed;
    try { seed = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
    const problems = [...checkSeed(seed), ...findForbidden(seed).map((p) => `Private field: ${p}.`)];
    if (problems.length) throw new Error(problems.join(' '));
    await db.saveSeedConfig(seedToConfig(seed));
  },
  async exportData(el, ctx) {
    const config = await db.allConfig();
    download(backupFileName(), JSON.stringify(buildBackup(config, await db.allEntries()), null, 2));
  },
  async importData() {
    const text = await pickFile();
    if (text === null) return;
    const { backup, errors } = parseBackup(text);
    if (errors) throw new Error(errors.join(' '));
    if (!confirm('This replaces all data on this device with the backup. Continue?')) return;
    await db.replaceAll(backup.config, backup.entries);
  },
};
