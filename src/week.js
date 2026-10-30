// Week review and the weekly boss.
import { weekDates, inWeek, addDays } from './dates.js';
import { ofKind } from './model.js';
import { STUDY_BLOCKS } from './path.js';
import { weekCounts, jobTargets, targetsMet } from './jobs.js';
import { weightAverage } from './nutrition.js';

// Study hours per week. The spec says 19, so round down the plan (19.5) to whole hours.
export function studyTargetMinutes(config) {
  const perDay = STUDY_BLOCKS.reduce((sum, b) => sum + config.meta.dayBlocksMin[b], 0);
  return Math.floor((perDay * config.meta.daysPerWeek) / 60) * 60;
}

export function weekSummary(config, entries, answers, weekStart) {
  const inW = entries.filter((e) => inWeek(e.date, weekStart));
  const studyMin = ofKind(inW, 'block').filter((e) => STUDY_BLOCKS.includes(e.block)).reduce((s, e) => s + e.minutes, 0);
  const jobs = weekCounts(entries, weekStart);
  const targets = jobTargets(config, answers);
  const sessions = new Set(ofKind(inW, 'setlog').map((e) => `${e.date}${e.session}`)).size;
  const end = weekDates(weekStart)[6];
  return {
    weekStart, studyMin, studyTarget: studyTargetMinutes(config), jobs, targets,
    sessions, sessionsPlanned: Object.keys(config.training.schedule).length,
    weightNow: weightAverage(entries, end), weightBefore: weightAverage(entries, addDays(weekStart, -1)),
  };
}

export function bossMet(config, entries, answers, weekStart) {
  const s = weekSummary(config, entries, answers, weekStart);
  return s.studyMin >= s.studyTarget && targetsMet(s.jobs, s.targets);
}
