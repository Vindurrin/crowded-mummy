import { readFileSync, existsSync } from 'node:fs';
import { newEntry } from '../src/model.js';

export const mini = () => JSON.parse(readFileSync(new URL('./fixtures/mini-seed.json', import.meta.url)));

// Matt's real seed file is private. Real-data tests run only when it is here.
const realUrl = new URL('../2026-10-30-life-os-seed-data.json', import.meta.url);
export const real = existsSync(realUrl) ? JSON.parse(readFileSync(realUrl)) : null;

export const at = (kind, date, fields) => newEntry(kind, date, fields);
export const check = (date, itemId, group = 'morning') => at('check', date, { itemId, group });
export const block = (date, name, minutes, pathId = 'ccp') => at('block', date, { block: name, minutes, pathId });
