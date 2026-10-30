# Life OS: Specification

Owner: Matt. Date: 2026-10-30. Timezone: America/Chicago.
Companion files: `2026-10-30-life-os-seed-data.json` (all tasks, dates, numbers), `CLAUDE.md` (rules), `2026-10-30-life-os-first-run-prompt.md`.

## 1. Purpose

One phone-first app that holds Matt's daily and weekly obligations. It turns them into a game with levels and quests. It also enforces dates and gates.

The main goal is a cloud engineer job. The app supports that goal, and it also supports the daily routine, training, meals, and unemployment filing.

## 2. Hard rules

1. Local-first. No backend. Data lives on the device (IndexedDB). Add JSON export and import for backup.
2. Procedural code. Short functions. No classes. No abstraction layers without a clear need.
3. No health penalties. "Pills 1" and sleep have no XP and no streak. Meals and weigh-ins give no streak loss. Use plain checkmarks.
4. Do not store drug names. The label is "Pills 1".
5. Never store SSN, TWC claim number, PIN, bank details, or account numbers.
6. The job log never creates or guesses an entry. It formats only what Matt types.
7. All text shown to the user uses simple words and short sentences (ASD-STE100 style).
8. Dates are estimates. The app recomputes them from real progress.

## 3. Screens

1. **Today.** The list of what is due today, grouped by domain. One tap to check an item.
2. **Train.** Today's session, sets, last weights, and a quick log.
3. **Meals.** The daily checklist with live totals against targets.
4. **Path.** Certs and projects in order, with gates and target dates.
5. **Jobs.** Weekly targets, the quick-capture log, resume versions.
6. **Admin.** Unemployment schedule and weekly work-search count. Optional sleep trial.
7. **Week.** Saturday review and the weekly "boss" check.

## 4. Daily structure

Morning checklist, in order: brush, floss, mouthwash, Pills 1, then walk or gym, then shave, shower, skincare.

Gym is Mon (A), Wed (B), Fri (C). Walk on other days. Cardio is 30 min at 3.2 mph and 8 incline. Daily walking target is 5 to 6 miles in total.

Work block, 4 h per day, 6 days a week (Sunday off): review 20 min, focus 150 min, log 25 min, job search 45 min.

## 5. Training

Three full-body sessions. The seed file has every exercise, set, and rep. Set totals: A 15, B 15, C 19.

Baselines come from Friday 2026-10-30 (session C). Use one working weight per exercise across all days.

**Proposed progression rule (confirm with Matt):** if all prescribed reps are hit on all sets, add the smallest weight step next session. If not, repeat the weight.

The app must show a warning if an exercise has no baseline yet (for example Leg extension, Shoulder press, Pec fly, Biceps curl, Back extension, Lateral raise, Ab crunch).

## 6. Weigh-in

Daily. Show the 7-day average. Use the average, not one reading, for all decisions.

Stall ladder (from Matt's earlier rule): after two flat weeks, add 10 min treadmill and cut 200 kcal from carbs on rest days. Then make the cut daily. Then alternate a 200 kcal cut and +10 min cardio, one change per stall.

## 7. Nutrition

Items, quantities, and label values are in the seed file. The list covers: energy drink, banana, peas, mixed vegetables, pasta, salmon, chicken, creatine, olive oil, teriyaki, soy sauce.

Totals from the labels, without sauces: about 1,904 kcal, 176 g protein, 207 g carbs, 43 g fat, 35 g fiber, 961 mg sodium.

Matt's old locked target was 1,716 kcal, 151 g protein, 172 g carbs, 48 g fat. The new list is higher. **Open decision:** Matt sets the official target. Show both until he does. Confirm the sodium goal of 2,100 mg. Teriyaki and soy sauce add sodium; Matt enters their label values.

Salmon and chicken scale with weight. Let Matt enter the real weight. Keep the recipes in the seed file as a read-only prep guide.

## 8. Path and gates

Order: CCP, SAA, then nine projects, then optional Security+. Hours and estimated dates are in the seed file. Build hours are 19 per week.

Gates:
- **CCP exam window:** two timed practice exams at 85% or higher.
- **SAA exam:** three timed full exams at 80% or higher.
- **Cloud-engineer applications:** SAA passed and the CloudPipe Terraform project published. Bridge applications are always open.
- **Each project:** needs the one before it finished, with a README, a decision note, and a confirmed teardown.
- **Security+:** after the SwiftSupport security project.

Show a locked item as locked, with the reason and the date it could open.

## 9. Jobs and the job log

Weekly targets: 8 applications, 3 outreach messages, 1 mock interview, 1 networking event (proposed; confirm).

Resume versions to track: Base A, Base B, generic sysadmin/cloud support, and a new cloud-engineer resume (write after the CloudPipe project).

Quick capture: Matt types a short note. The app saves a structured entry with these fields: date, type, employer, role, source, contact, method, result, notes. Matt reviews each entry before it counts.

Show this guardrail on the Jobs screen: Matt must not solicit Momentum Telecom customers or employees until about 2027-09-01.

## 10. Unemployment (Texas)

- Request payment every second Wednesday. If he misses it, he can file Thursday to Saturday of the same week.
- First run asks for the next filing Wednesday and the weekly work-search minimum from the TWC letter. Both are blank in the seed file.
- At each filing the app shows a checklist: report all hours and gross pay from any work; check the work-search log is complete; certify the answers.
- Export an `.ics` calendar file with the filing dates, with reminders the evening before and the morning of.
- The TWC log export must match TWC's blank Work Search Log. Make the columns configurable. Matt verifies them.

## 11. Gamification

Domains: Cloud, JobSearch, Body, Nutrition, Routine, Admin.

Level rule: next level needs 100 + 50 x (level - 1) XP.

XP: morning checklist 10, gym or walk 20, meals 20, focus block 60, job-search block 30, log entry 10, project 150, exam pass 300, weekly boss 200. Pills 1 and sleep give none.

Streaks have one grace day per week. A streak never applies to pills, meals, weigh-ins, or sleep.

Daily quests are the Today list. The weekly boss is hitting the Jobs targets and the study hours.

## 12. Optional sleep trial

Two fields: lights-out time and wake time. Run for 14 days, then ask Matt to keep it or remove it. No points.

## 13. Open decisions

1. Official nutrition target and sodium goal.
2. Progression rule confirmation.
3. Evening routine (none listed).
4. TWC filing date, county minimum, CCP and SAA exam dates.
5. Networking target.
6. Whether to keep the sleep trial.
