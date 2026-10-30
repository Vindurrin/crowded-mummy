// First-run questions. Every answer can stay blank. The app never guesses.
import { esc, formValues, numOrNull } from '../ui.js';
import { weekday } from '../dates.js';
import { setAnswers } from '../state.js';

export function html(ctx, first) {
  const a = ctx.answers;
  const exam = a.examDates || {};
  return `<div class="box" data-form>
    <h2>${first ? 'A few questions' : 'Your answers'}</h2>
    <p>You can leave any answer blank. The app will not guess.</p>
    <label>Next filing Wednesday <input type="date" name="nextFilingWed" value="${esc(a.nextFilingWed)}"></label>
    <label>Weekly work-search minimum (from your TWC letter) <input type="number" min="0" name="countyWeeklyMinimum" value="${esc(a.countyWeeklyMinimum)}"></label>
    <label>CCP exam date <input type="date" name="ccp" value="${esc(exam.ccp)}"></label>
    <label>SAA exam date <input type="date" name="saa" value="${esc(exam.saa)}"></label>
    <label>Evening routine. One item per line. Leave blank for none.
      <textarea name="evening" rows="3">${esc((a.evening || []).map((i) => i.label).join('\n'))}</textarea></label>
    <button data-act="saveSetup">Save</button>
    ${first ? '<button class="plain" data-act="skipSetup">Ask me later</button>' : ''}
  </div>`;
}

export const acts = {
  async saveSetup(el, ctx) {
    const v = formValues(el);
    if (v.nextFilingWed && weekday(v.nextFilingWed) !== 'Wed') throw new Error('That date is not a Wednesday.');
    const lines = v.evening.split('\n').map((l) => l.trim()).filter(Boolean);
    await setAnswers(ctx, {
      firstRunDone: true,
      nextFilingWed: v.nextFilingWed || null,
      countyWeeklyMinimum: numOrNull(v.countyWeeklyMinimum),
      examDates: { ...(v.ccp ? { ccp: v.ccp } : {}), ...(v.saa ? { saa: v.saa } : {}) },
      evening: lines.map((label, i) => ({ id: `evening-${i + 1}`, label })),
    });
  },
  async skipSetup(el, ctx) {
    await setAnswers(ctx, { firstRunDone: true });
  },
};
