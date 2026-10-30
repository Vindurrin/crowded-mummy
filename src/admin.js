// Unemployment schedule, calendar export, and the sleep trial.
import { addDays, diffDays, weekday } from './dates.js';

export const isFilingDay = (date, filingDay) => weekday(date) === filingDay;

// Every second filing day, starting at the anchor.
export function filingDates(anchor, count) {
  return Array.from({ length: count }, (_, i) => addDays(anchor, i * 14));
}

// The next filing day on or after `today`, with the Thu-Sat fallback days.
export function nextFiling(anchor, today) {
  if (!anchor) return null;
  const gap = diffDays(anchor, today);
  const turns = gap <= 0 ? 0 : Math.ceil(gap / 14);
  const day = addDays(anchor, turns * 14);
  return { day, fallback: [1, 2, 3].map((n) => addDays(day, n)) };
}

const fold = (line) => {
  const out = [];
  let rest = line;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ` ${rest.slice(74)}`; }
  out.push(rest);
  return out.join('\r\n');
};
const esc = (s) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
const stamp = (d) => d.replace(/-/g, '');

// All-day events. Alarms: 6 pm the evening before, and 8 am on the day.
export function buildIcs(dates, checklist, now = new Date()) {
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const description = `Before you certify:\n${checklist.map((c) => `- ${c}`).join('\n')}\nIf you miss Wednesday, file Thursday to Saturday.`;
  const alarm = (trigger, text) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${text}`, `TRIGGER:${trigger}`, 'END:VALARM'];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life OS//EN', 'CALSCALE:GREGORIAN'];
  for (const d of dates) {
    lines.push(
      'BEGIN:VEVENT', `UID:${stamp(d)}-twc-filing@life-os`, `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${stamp(d)}`, `DTEND;VALUE=DATE:${stamp(addDays(d, 1))}`,
      'SUMMARY:Request TWC payment', `DESCRIPTION:${esc(description)}`,
      ...alarm('-PT6H', 'Tomorrow: request TWC payment'),
      ...alarm('PT8H', 'Today: request TWC payment'),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// Sleep trial. After `reviewAfterDays`, ask Matt to keep it or remove it.
export function sleepReviewDue(answers, today, reviewAfterDays) {
  return answers.sleepMode === 'trial' && !!answers.sleepStart && diffDays(answers.sleepStart, today) >= reviewAfterDays;
}
