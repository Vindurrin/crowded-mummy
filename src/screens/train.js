import { esc, dateNav, formValues, numOrNull, blank } from '../ui.js';
import { ofKind, onDate, newEntry } from '../model.js';
import * as db from '../db.js';
import { sessionForDate, workingWeight, nextWeight, sessionDone, prescribed } from '../training.js';
import { setAnswers, replaceEntry } from '../state.js';

const SUGGEST = {
  add: (n) => `Try ${n.weight} lb today. You hit every rep last time.`,
  repeat: (n) => `Repeat ${n.weight} lb. Hit every rep first.`,
  'need-step': () => 'Set the weight step below to see the next weight.',
};

function exerciseCard(ctx, sessionId, ex) {
  const { config, entries, answers, date } = ctx;
  const t = config.training;
  const now = workingWeight(ex.name, t, entries);
  const next = nextWeight(ex.name, t, entries, answers.weightStep ?? null);
  const logged = ofKind(onDate(entries, date), 'setlog').find((e) => e.exercise === ex.name && e.session === sessionId);
  const start = logged ? logged.weight : (next.weight ?? '');
  const reps = logged ? logged.reps : Array(ex.sets).fill(ex.reps);
  const warn = now ? '' : `<p class="warn">No baseline yet. Pick a weight you can lift for ${ex.sets} × ${ex.reps}, then log it.</p>`;
  const info = now
    ? `<p class="note">Working weight: ${now.weight} lb (${now.source === 'log' ? `logged ${esc(now.date)}` : 'baseline'})${now.note ? `, ${esc(now.note)}` : ''}.
       ${SUGGEST[next.status] ? esc(SUGGEST[next.status](next)) : ''}</p>` : '';
  return `<div class="box ${logged ? 'done' : ''}" data-form data-exercise="${esc(ex.name)}">
    <strong>${esc(ex.name)}</strong> <span class="note">${ex.sets} sets × ${ex.reps} reps</span>${logged ? ' ✓' : ''}
    ${info}${warn}
    <label>Weight (lb) <input type="number" step="any" name="weight" value="${esc(start)}"></label>
    <div class="reps">${reps.map((r, i) => `<label>Set ${i + 1} <input type="number" name="r${i}" value="${esc(r)}"></label>`).join('')}</div>
    <button data-act="logSets" data-session="${sessionId}" data-exercise="${esc(ex.name)}">${logged ? 'Update' : 'Log'}</button>
  </div>`;
}

export function html(ctx) {
  const { config, date, today, answers } = ctx;
  const t = config.training;
  const sessionId = sessionForDate(date, t);
  const cardio = `<p class="note">Cardio every day: ${t.cardio.minutes} min at ${t.cardio.mph} mph, incline ${t.cardio.incline}.</p>`;
  const body = sessionId
    ? `<h2>${esc(t.sessions[sessionId].name)} <span class="note">${t.sessions[sessionId].totalSets} sets</span></h2>${cardio}
       ${t.sessions[sessionId].exercises.map((ex) => exerciseCard(ctx, sessionId, ex)).join('')}`
    : `<h2>Walk day</h2><p>No lifting today.</p>${cardio}
       <p>Walk ${t.neat.milesMin} to ${t.neat.milesMax} miles in total.</p>`;
  return `${dateNav(date, today)}${body}
    <h2>Progression</h2>
    <p>${esc(t.progressionRule)}</p>
    <div class="box" data-form>
      <label>Smallest weight step (lb) ${answers.weightStep == null ? blank('blank') : ''}
        <input type="number" step="any" name="weightStep" value="${esc(answers.weightStep)}"></label>
      <label class="inline"><input type="checkbox" name="confirmed" ${answers.progressionConfirmed ? 'checked' : ''}> I confirm this rule</label>
      <button data-act="saveProgression">Save</button>
    </div>`;
}

export const acts = {
  async logSets(el, ctx) {
    const { session, exercise } = el.dataset;
    const v = formValues(el);
    const weight = numOrNull(v.weight);
    if (weight == null) throw new Error('Enter the weight first.');
    const want = prescribed(ctx.config.training, session, exercise);
    const reps = Array.from({ length: want.sets }, (_, i) => numOrNull(v[`r${i}`]) ?? 0);
    await replaceEntry(ctx, (e) => e.kind === 'setlog' && e.date === ctx.date && e.session === session && e.exercise === exercise,
      'setlog', ctx.date, { session, exercise, weight, reps, prescribedSets: want.sets, prescribedReps: want.reps });
    // When the last exercise is logged, check off "gym" for the day.
    const fresh = [...ctx.entries.filter((e) => !(e.kind === 'setlog' && e.date === ctx.date && e.exercise === exercise && e.session === session)),
      { kind: 'setlog', date: ctx.date, session, exercise }];
    const hasCheck = ctx.entries.some((e) => e.kind === 'check' && e.date === ctx.date && e.itemId === 'move');
    if (!hasCheck && sessionDone(ctx.date, session, ctx.config.training, fresh)) {
      await db.putEntry(newEntry('check', ctx.date, { itemId: 'move', group: 'morning' }));
    }
  },
  async saveProgression(el, ctx) {
    const v = formValues(el);
    await setAnswers(ctx, { weightStep: numOrNull(v.weightStep), progressionConfirmed: v.confirmed });
  },
};
