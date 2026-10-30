import { loadState, makeCtx } from './state.js';
import { esc, blank } from './ui.js';
import * as today from './screens/today.js';
import * as train from './screens/train.js';
import * as meals from './screens/meals.js';
import * as path from './screens/path.js';
import * as jobs from './screens/jobs.js';
import * as admin from './screens/admin.js';
import * as week from './screens/week.js';
import * as setup from './screens/setup.js';

const SCREENS = { today, train, meals, path, jobs, admin, week };
const TABS = [['today', 'Today'], ['train', 'Train'], ['meals', 'Meals'], ['path', 'Path'], ['jobs', 'Jobs'], ['admin', 'Admin'], ['week', 'Week']];
const app = document.getElementById('app');
const view = { date: null, weekStart: null, error: '' };
let ctx;

const ACTS = {
  ...today.acts, ...train.acts, ...meals.acts, ...path.acts, ...jobs.acts, ...admin.acts, ...week.acts, ...setup.acts,
  goDate: (el) => { view.date = el.dataset.date; },
  goWeek: (el) => { view.weekStart = el.dataset.week; },
};

const tabName = () => (SCREENS[location.hash.slice(1)] ? location.hash.slice(1) : 'today');

async function render() {
  const state = await loadState();
  ctx = { ...makeCtx(state, view), weekStart: view.weekStart };
  const tab = tabName();
  const y = window.scrollY;
  const nav = TABS.map(([id, label]) => `<a href="#${id}" class="${id === tab ? 'on' : ''}">${label}</a>`).join('');
  const body = state.hasSeed
    ? SCREENS[tab].html(ctx)
    : `<h2>Welcome</h2><p>Load your seed file to start. It stays on this device.</p>${admin.dataHtml(ctx)}`;
  app.innerHTML = `${view.error ? `<div class="toast">${esc(view.error)}</div>` : ''}${body}${state.hasSeed ? `<nav>${nav}</nav>` : ''}`;
  window.scrollTo(0, y);
}

async function run(el, name) {
  view.error = '';
  try {
    await ACTS[name](el, ctx);
  } catch (e) {
    view.error = e.message;
  }
  await render();
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled) run(el, el.dataset.act);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el) run(el, el.dataset.change);
});
window.addEventListener('hashchange', () => { view.error = ''; render(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
render();
