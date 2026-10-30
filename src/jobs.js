// Job log counts and exports. The app only counts and formats what Matt typed.
import { inWeek } from './dates.js';
import { ofKind } from './model.js';

export const reviewedJobs = (entries) => ofKind(entries, 'joblog').filter((e) => e.reviewed);
const isMock = (e) => e.type === 'interview' && e.method === 'mock';

export function weekCounts(entries, weekStart) {
  const jobs = reviewedJobs(entries).filter((e) => inWeek(e.date, weekStart));
  const count = (fn) => jobs.filter(fn).length;
  return {
    applications: count((e) => e.type === 'application'),
    outreach: count((e) => e.type === 'outreach'),
    mockInterviews: count(isMock),
    networkingEvents: count((e) => e.type === 'networking'),
  };
}

// Networking is a proposed target. Matt can switch it off.
export function jobTargets(config, answers) {
  const targets = { ...config.jobSearch.weeklyTargets };
  if (answers.networkingOn === false) delete targets.networkingEvents;
  return targets;
}

export const targetsMet = (counts, targets) =>
  Object.entries(targets).every(([key, goal]) => counts[key] >= goal);

// Work search count for TWC. Resume updates and mock interviews are not job searches.
export function workSearchCount(entries, weekStart) {
  return reviewedJobs(entries).filter((e) => inWeek(e.date, weekStart) && e.type !== 'resume-update' && !isMock(e)).length;
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(entries, columns) {
  const rows = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return [columns, ...rows.map((e) => columns.map((c) => e[c]))].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
