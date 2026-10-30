# First-run prompt for Claude Code

Paste this into Claude Code, in the folder that holds the four Life OS files.

---

Read `CLAUDE.md`, `2026-10-30-life-os-spec.md`, and `2026-10-30-life-os-seed-data.json`.

Build the Life OS app in five steps. Stop after each step. Summarize what you did, list the files you created or changed, and wait for my approval.

**Step 1: Scaffold and data.**
Create a small local-first PWA. Define the data model in plain objects. Write a loader for the seed file and a JSON export and import. Show me the folder layout and explain your stack choice in two sentences.

**Step 2: Today screen.**
Build the morning checklist, the work-block list, and the check-off flow. Add XP and levels with the rules from the spec. Pills 1 and sleep give no XP and no streak.

**Step 3: Train and Meals.**
Build the Train screen with the three sessions, baselines, and the progression rule. Build the Meals screen with the checklist and live totals against both the old target and the plan totals. Add the daily weigh-in with a 7-day average.

**Step 4: Path, gates, and dates.**
Build the Path screen. Write the gate and date engine with tests. It must recompute target dates from real hours logged. Locked items show the reason and the earliest open date.

**Step 5: Jobs, job log, and Admin.**
Build the quick-capture job log, the weekly targets, and the resume list. Build the unemployment schedule with an `.ics` export. On first run, ask for: next filing Wednesday, weekly work-search minimum, CCP exam date, SAA exam date, and any evening routine. Then build the Week review screen.

Rules for every step:
- Follow `CLAUDE.md`.
- Ask me before you change the spec.
- If a number is missing, show a clear blank and ask. Do not guess.
- Optional later: deploy the app as a static site with Terraform and GitHub Actions. Keep my data on the device. Do not put seed data in a public repo.
