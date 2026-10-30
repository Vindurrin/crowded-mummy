import * as db from './db.js';
import { checkSeed, seedToConfig, findBlanks } from './seed.js';
import { buildBackup, parseBackup, backupFileName } from './backup.js';
import { findForbidden } from './privacy.js';

const app = document.getElementById('app');
let message = '';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function pickFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => resolve(input.files[0] ? input.files[0].text() : null);
    input.click();
  });
}

function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadSeed() {
  const text = await pickFile();
  if (text === null) return;
  let seed;
  try {
    seed = JSON.parse(text);
  } catch {
    message = 'error:This file is not valid JSON.';
    return;
  }
  const problems = [...checkSeed(seed), ...findForbidden(seed).map((p) => `Private field: ${p}.`)];
  if (problems.length) {
    message = 'error:' + problems.join(' ');
    return;
  }
  await db.saveSeedConfig(seedToConfig(seed));
  message = 'ok:Seed file loaded.';
}

async function exportData() {
  const config = await db.allConfig();
  const entries = await db.allEntries();
  download(backupFileName(), buildBackup(config, entries));
  message = 'ok:Backup saved to your downloads.';
}

async function importData() {
  const text = await pickFile();
  if (text === null) return;
  const { backup, errors } = parseBackup(text);
  if (errors) {
    message = 'error:' + errors.join(' ');
    return;
  }
  const ok = confirm('This replaces all data on this device with the backup. Continue?');
  if (!ok) return;
  await db.replaceAll(backup.config, backup.entries);
  message = `ok:Backup loaded. ${backup.entries.length} entries.`;
}

async function render() {
  const config = await db.allConfig();
  const entries = await db.allEntries();
  const hasSeed = 'seedLoadedAt' in config;
  const [kind, text] = message.split(/:(.*)/s);
  const note = message ? `<p class="${kind}">${esc(text)}</p>` : '';
  message = '';

  let body = '<p>No seed file yet. Load it to start.</p>';
  if (hasSeed) {
    const seed = Object.fromEntries(Object.entries(config).filter(([k]) => k !== 'answers' && k !== 'seedLoadedAt'));
    const blanks = findBlanks(seed);
    body = `
      <div class="box">
        <p>Owner: ${esc(config.meta.owner)}. Start date: ${esc(config.meta.startDate)}.</p>
        <p>Entries saved: ${entries.length}.</p>
      </div>
      <h2>Blanks to fill</h2>
      <p>These values are empty in the seed file. The app will ask for them. It will not guess.</p>
      <div class="box">${blanks.map((b) => `<code>${esc(b)}</code>`).join(' ')}</div>`;
  }

  app.innerHTML = `
    <h1>Life OS</h1>
    ${note}
    ${body}
    <h2>Data</h2>
    <p>All data stays on this device.</p>
    <button id="seed">${hasSeed ? 'Reload seed file' : 'Load seed file'}</button>
    <button id="export" class="plain">Export backup</button>
    <button id="import" class="plain">Import backup</button>`;

  const act = (id, fn) =>
    (document.getElementById(id).onclick = async () => {
      try { await fn(); } catch (e) { message = 'error:' + e.message; }
      render();
    });
  act('seed', loadSeed);
  act('export', exportData);
  act('import', importData);
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
render();
