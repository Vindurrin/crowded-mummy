// Export and import. Pure functions, so tests can run them in Node.
import { checkEntry } from './model.js';
import { findForbidden } from './privacy.js';

const APP = 'life-os';
const VERSION = 1;

export function buildBackup(config, entries, now = new Date()) {
  return { app: APP, version: VERSION, exportedAt: now.toISOString(), config, entries };
}

// Returns { backup } or { errors }. Nothing is saved here.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { errors: ['This file is not valid JSON.'] };
  }
  const errors = [];
  if (data?.app !== APP) errors.push('This file is not a Life OS backup.');
  if (data?.version !== VERSION) errors.push(`Backup version ${data?.version} is not supported.`);
  if (!data?.config || typeof data.config !== 'object') errors.push('Backup has no config.');
  if (!Array.isArray(data?.entries)) errors.push('Backup has no entry list.');
  if (errors.length) return { errors };

  data.entries.forEach((entry, i) => {
    for (const problem of checkEntry(entry)) errors.push(`Entry ${i + 1}: ${problem}`);
  });
  for (const path of findForbidden(data)) errors.push(`Backup holds a private field: ${path}.`);
  return errors.length ? { errors } : { backup: data };
}

export function backupFileName(now = new Date()) {
  return `${now.toISOString().slice(0, 10)}-life-os-backup.json`;
}
