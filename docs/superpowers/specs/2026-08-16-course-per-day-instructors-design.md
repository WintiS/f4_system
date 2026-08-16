# Per-day instructor coverage on courses

**Date:** 2026-08-16
**Status:** Approved, ready for implementation plan

## Problem

A course spans 1–6 days (or a full week). Today `course.instructorIds` is a
single flat list applied to **every** day of the course — the same instructors
are booked for the whole run. Schools need to split coverage: one instructor for
the first days, a different one for the later days, or any per-day mix.

## Goal

Let an admin restrict each selected instructor to specific course days, so
different instructors can cover different days. Surfaced as a side option while
selecting instructors in the course modal. Day-level granularity only (not
per-block).

## Non-goals (YAGNI)

- Per-block (morning/afternoon) instructor assignment — day-level only.
- Auto-prefilling covered days from an instructor's availability window.
- Any change to lessons (only courses gain this).

## Data model

New optional course field:

```js
instructorDays: { [instructorId]: string[] /* "YYYY-MM-DD" dates covered */ }
```

Semantics:

- An instructor in `instructorIds` covers **all** course days **unless** a key
  for them exists in `instructorDays` — then they cover **only** the listed
  dates.
- **Absent key = all days.** Existing courses have no `instructorDays`, so they
  behave exactly as today. No backfill/migration of existing rows needed.
- Empty array for a key = instructor covers **no** days (allowed; the row simply
  shows 0 days).

### Persistence

Add a `instructor_days jsonb` column to the `courses` table (Supabase
migration), defaulting to `'{}'`. Wire it through the row mappers alongside the
existing `overrides` jsonb, in `src/context/SchoolStore.jsx`:

- `rowToCourse`: `instructorDays: r.instructor_days ?? {}`
- `courseToRow`: `if ('instructorDays' in d) r.instructor_days = d.instructorDays ?? {}`

## Core helper

Add to `SchoolStore.jsx` (near `courseDays`):

```js
export function courseInstructorsOnDate(course, date) {
  const map = course.instructorDays ?? {}
  return (course.instructorIds ?? []).filter(
    (id) => !map[id] || map[id].includes(date),
  )
}
```

This replaces the flat `instructorIds.includes(id)` / iterate-all-ids logic
wherever a course's instructors are resolved **for a specific date**.

## Consumers to update (4)

All in `src/context/SchoolStore.jsx`:

1. **`courseConflictsFor`** (~line 295) — for each course day, only check the
   instructors returned by `courseInstructorsOnDate(course, date)` instead of the
   full `ids` list. Same for the other-course comparison branch: an instructor
   only conflicts on a date if they cover that date in the other course too
   (`courseInstructorsOnDate(c, date).includes(instId)`).

2. **Teaching-hours derivation** (~line 520) — when crediting course minutes,
   only add a day's minutes if the instructor covers that day
   (`courseInstructorsOnDate(c, d).includes(instructorId)`), instead of crediting
   every `courseDays(c)` day.

3. **`courseItemsForDate`** (~line 746) — set each calendar item's
   `instructorIds` to `courseInstructorsOnDate(c, dateStr)` still intersected
   with live instructors. A day nobody covers renders as unassigned for that day.

4. **`removeInstructor` cleanup** (~line 433) — when an instructor is removed,
   also delete their key from each affected course's `instructorDays` (persist
   the pruned map alongside the existing `instructor_ids` update).

## UI — `src/components/CourseModal.jsx`

Existing instructor picker is a 2-col grid of checkbox rows with amber
availability hints. Extend each **checked** row:

- Add a `dny ▾` toggle button on the row that expands an inline day picker.
- The day picker shows one chip per course day (from the existing `days` memo),
  labelled weekday + `D.M.` (reuse/extend `shortDate`). Chips are toggle buttons.
- **Default:** all chips on = full coverage. In this state store **no** key in
  `instructorDays` (baseline).
- Toggling chips off writes an explicit date array for that instructor into
  `form.instructorDays`. Turning all chips back on deletes the key (back to
  baseline).
- Collapsed hint on the row when restricted: compact summary such as `Po–St` or
  `3 dny` so the restriction is visible without expanding.
- Unchecking the instructor entirely also removes their `instructorDays` key.

State lives in `form.instructorDays`; add it to the `useState` initializer
(`instructorDays: {}`) and include in the saved `form`.

Keep the existing amber partial-availability hints unchanged — they inform the
admin but do not auto-set coverage.

## Housekeeping

On **save** (`save()` in CourseModal), prune `instructorDays` so it only
contains dates within the current `courseDays(form)` and only keys still present
in `instructorIds`. Editing span/start-date can otherwise leave stale dates.

## Edge cases

- Instructor covers 0 days (all chips off): allowed; contributes no conflicts, no
  hours, appears on no calendar day. Row shows `0 dní`.
- Span/start-date changed after restricting: stale dates pruned on save; chips
  re-render against new `days`, previously-off days outside the new range simply
  vanish.
- Removed/merged instructor: key dropped in `removeInstructor`; `courseItemsForDate`
  already intersects with live instructors as a second guard.

## Testing / verification

- No automated test harness in repo — verify by `npm run build` (must pass) plus
  manual check: create a multi-day course, assign instructor A to first days and
  B to later days, confirm calendar chips, double-booking warning, and instructor
  hour totals each respect the per-day split.
