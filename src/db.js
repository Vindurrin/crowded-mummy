// IndexedDB. Thin wrapper. Needs a browser, so it is not tested in Node.
const NAME = 'life-os';
let opened;

function open() {
  opened ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('config');
      const entries = db.createObjectStore('entries', { keyPath: 'id' });
      entries.createIndex('kind', 'kind');
      entries.createIndex('date', 'date');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opened;
}

const done = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// Run fn(stores) in one transaction. Resolve when the transaction commits.
async function run(mode, fn) {
  const db = await open();
  const tx = db.transaction(['config', 'entries'], mode);
  const result = fn({ config: tx.objectStore('config'), entries: tx.objectStore('entries') });
  return new Promise((resolve, reject) => {
    tx.oncomplete = async () => resolve(await result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const getConfig = (key) => run('readonly', (s) => done(s.config.get(key)));

export async function allConfig() {
  return run('readonly', async (s) => {
    const keys = await done(s.config.getAllKeys());
    const values = await done(s.config.getAll());
    return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  });
}

// Replace the seed sections. Keep "answers": Matt typed those.
export const saveSeedConfig = (config) =>
  run('readwrite', async (s) => {
    const keys = await done(s.config.getAllKeys());
    for (const key of keys) if (key !== 'answers') s.config.delete(key);
    for (const [key, value] of Object.entries(config)) s.config.put(value, key);
  });

export const putEntry = (entry) => run('readwrite', (s) => done(s.entries.put(entry)));
export const deleteEntry = (id) => run('readwrite', (s) => done(s.entries.delete(id)));
export const allEntries = () => run('readonly', (s) => done(s.entries.getAll()));
export const entriesByDate = (date) =>
  run('readonly', (s) => done(s.entries.index('date').getAll(date)));
export const entriesByKind = (kind) =>
  run('readonly', (s) => done(s.entries.index('kind').getAll(kind)));

// Import. Wipe both stores and write the backup, all in one transaction.
export const replaceAll = (config, entries) =>
  run('readwrite', (s) => {
    s.config.clear();
    s.entries.clear();
    for (const [key, value] of Object.entries(config)) s.config.put(value, key);
    for (const entry of entries) s.entries.put(entry);
  });
