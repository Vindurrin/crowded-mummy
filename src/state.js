// Load everything from the database and add the values every screen needs.
import * as db from './db.js';
import { newEntry } from './model.js';
import { todayStr } from './dates.js';
import { pathStatus } from './path.js';

export async function loadState() {
  const { answers = {}, seedLoadedAt, ...config } = await db.allConfig();
  const entries = await db.allEntries();
  return { hasSeed: !!seedLoadedAt, config, answers, entries };
}

export function makeCtx(state, view) {
  const today = todayStr(new Date(), state.config.meta?.timezone);
  const date = view.date || today;
  const status = state.hasSeed ? pathStatus(state.config, state.entries, state.answers, today) : null;
  return { ...state, today, date, status };
}

// Tap on: add the entry. Tap off: remove it.
export async function toggleEntry(ctx, match, fields) {
  const found = ctx.entries.find(match);
  if (found) await db.deleteEntry(found.id);
  else await db.putEntry(newEntry(fields.kind, fields.date, fields));
}

// Save one entry in place of the older ones that match.
export async function replaceEntry(ctx, match, kind, date, fields) {
  for (const old of ctx.entries.filter(match)) await db.deleteEntry(old.id);
  await db.putEntry(newEntry(kind, date, fields));
}

export const setAnswers = (ctx, patch) => db.setConfig('answers', { ...ctx.answers, ...patch });
