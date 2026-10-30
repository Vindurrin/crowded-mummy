// Small helpers shared by the screens.
import { addDays, longDate } from './dates.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const num = (n, digits = 1) => (n == null ? '–' : String(Math.round(n * 10 ** digits) / 10 ** digits));
export const blank = (text) => `<span class="blank">${esc(text)}</span>`;

export function bar(value, max) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return `<div class="bar"><span style="width:${pct}%"></span></div>`;
}

export function dateNav(date, today) {
  const next = date < today ? `<button class="plain" data-act="goDate" data-date="${addDays(date, 1)}">Next day ›</button>` : '';
  const jump = date !== today ? `<button class="plain" data-act="goDate" data-date="${today}">Today</button>` : '';
  return `<div class="datenav"><button class="plain" data-act="goDate" data-date="${addDays(date, -1)}">‹ Back</button>
    <strong>${esc(longDate(date))}</strong>${next}${jump}</div>`;
}

// Read every named input inside the closest [data-form].
export function formValues(el) {
  const root = el.closest('[data-form]');
  const out = {};
  for (const input of root.querySelectorAll('[name]')) {
    out[input.name] = input.type === 'checkbox' ? input.checked : input.value.trim();
  }
  return out;
}

export const numOrNull = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

export function pickFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => resolve(input.files[0] ? input.files[0].text() : null);
    input.click();
  });
}

export function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
