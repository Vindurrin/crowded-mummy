// Dates are plain "YYYY-MM-DD" strings. We do math in UTC so time zones cannot shift a day.
const DAY = 86400000;
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toMs = (d) => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
};
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);

// Today in Matt's time zone.
export function todayStr(now = new Date(), tz = 'America/Chicago') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export const addDays = (d, n) => fromMs(toMs(d) + n * DAY);
export const diffDays = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY);
export const weekday = (d) => NAMES[new Date(toMs(d)).getUTCDay()];
export const isWorkDay = (d, dayOff) => weekday(d) !== dayOff;

// Weeks run Monday to Sunday.
export function mondayOf(d) {
  const back = (new Date(toMs(d)).getUTCDay() + 6) % 7;
  return addDays(d, -back);
}
export const weekDates = (d) => Array.from({ length: 7 }, (_, i) => addDays(mondayOf(d), i));
export const inWeek = (date, weekStart) => date >= weekStart && date <= addDays(weekStart, 6);

export function longDate(d) {
  return new Date(toMs(d)).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
