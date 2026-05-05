# Session log

A folder of dated entries — one per coding session — that act as a build journal. The point is to make it easy to remember what got done, what got decided, and where you left off, weeks or months after the fact.

## Convention

- One file per session: `YYYY-MM-DD-short-slug.md` (e.g. `2026-05-04-foundation.md`).
- ISO dates so the files sort chronologically in any file browser.
- The slug is a short hint at the theme of the session (e.g. `auth-flow`, `discover-screen`, `seed-dataset`).
- If you do more than one session in a day, suffix with `-2`, `-3` (e.g. `2026-06-12-discover-screen-2.md`).

## How to start a new entry

Copy the template:

```bash
cp docs/sessions/_template.md docs/sessions/$(date +%Y-%m-%d)-<slug>.md
```

Fill it in as you go. Don't try to write it all at the end of the session — you'll forget the small stuff. Jot decisions and "huh, that was unexpected" moments while they're fresh.

## What to include

Each entry should answer four things, briefly:

1. **Goal of the session** — what you set out to do.
2. **What got done** — plain prose, not a heroic list. If something got skipped or hit a wall, say so.
3. **Decisions made** — anything where you considered options and picked one. Link to an ADR in `docs/DECISIONS/` if it's a big call.
4. **Where to pick up** — the first thing you should do next session. Even if it's "decide between option A and B," writing it down beats remembering.

Keep entries short. A session log isn't a design doc — if something needs deep explanation, write it in `DESIGN.md` or as an ADR and link to it from the session log.

## Index

The most recent entry is the most useful. Newest first:

- [2026-05-05 — Onboarding: capture profile + children](./2026-05-05-onboarding-2.md)
- [2026-05-05 — Auth: 6-digit OTP sign-in flow](./2026-05-05-auth.md)
- [2026-05-04 — Schema: tables, RLS, and RPCs](./2026-05-04-schema-2.md)
- [2026-05-04 — Foundation: design, scaffold, first commit](./2026-05-04-foundation.md)

(Add new entries to the top of this list as you write them.)
