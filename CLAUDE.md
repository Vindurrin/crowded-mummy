# Life OS: Rules for Claude Code

Read `2026-10-30-life-os-spec.md` and `2026-10-30-life-os-seed-data.json` before you write code.

## Code style
- Short, clean, procedural code. Use plain functions and plain objects.
- Do not use classes. Do not add abstraction layers unless the code is clearly repeated three or more times.
- Keep dependencies few. Choose a small, boring stack. Local-first PWA. No backend. Store data in IndexedDB. Add JSON export and import.
- Write tests for date, gate, XP, and nutrition-total logic. Run them before you say a step is done.

## How to work with Matt
- Work in steps of 4 to 5 tasks. Stop after each step. Summarize what you did and what is next. Wait for approval.
- Explain the why for each design choice in one or two short sentences. Matt wants to learn.
- Before you delete, overwrite, or rename a file, show the change and wait for approval.
- Use simple words and short sentences in all text, comments, and user interface strings (ASD-STE100 style).
- Name new files `YYYY-MM-DD-descriptive-name`. `CLAUDE.md` keeps its name.
- At the end of each step, list the files you created or changed.

## Privacy rules (never break these)
- Do not store drug names. Use the label "Pills 1".
- Do not store SSN, TWC claim number, PIN, bank details, or account numbers.
- Do not commit the seed data file to a public repository. Add it to `.gitignore`. App code only may be public.
- The app never creates or guesses a job-log entry.

## Health and safety design
- Pills 1 and sleep: checkbox or plain fields only. No XP. No streak.
- Meals and weigh-ins: no streak loss.
- Use the 7-day average of weight for every decision.

## Source of truth
- The seed file holds the numbers. Do not retype them in code.
- Dates in the seed file are estimates. Recompute from real progress.
