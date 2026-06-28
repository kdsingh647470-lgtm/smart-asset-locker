## Goal
Make the Maintenance Calendar on the Dashboard fully editable — users can add, edit, mark done, or delete tasks per month — and persist them per user. Add a few high-impact upgrades that turn it from a static reminder into a real maintenance log.

## 1. Editable calendar (core)

### Storage
New table `public.maintenance_tasks`:
- `user_id` (uuid)
- `month` (smallint 0–11) — used when the task repeats yearly with no fixed date
- `due_date` (date, nullable) — if set, takes precedence; the month chip is derived from it
- `label` (text)
- `tone` (text: blue / teal / purple / amber / red / green)
- `recurrence` (text: `none` | `yearly` | `quarterly` | `monthly`)
- `linked_item_id` (uuid, nullable → `items.id`) — for tasks auto-tied to an appliance
- `done_at` (timestamptz, nullable) — last completion
- `notes` (text, nullable)

RLS scoped to `auth.uid()`, grants for `authenticated` + `service_role`, `updated_at` trigger.

### UI changes on the calendar card
- Each month tile becomes tappable → opens a bottom sheet listing all tasks for that month with: ✓ done toggle, ✎ edit, 🗑 delete.
- "+ Add task" button at the bottom of the sheet (label, tone, optional exact date, recurrence, notes).
- Tasks now show a small ✓ when completed this cycle (greyed out), or a red dot if past-due.
- Long-press / swipe a chip in the grid view to quick-toggle "done".
- First-time users get the existing `DEFAULT_SCHEDULE` seeded into their table on first open (one-time, idempotent via a marker row or count check) so they can edit instead of being stuck with read-only defaults.
- Auto-derived tasks from `items` (warranty/AMC/insurance) keep appearing but are visually marked "Auto" and editing them creates an override row in `maintenance_tasks` linked via `linked_item_id`.

### Files
- **New migration** — `maintenance_tasks` table + RLS + grants + trigger.
- **New** `src/lib/maintenance-api.ts` — list / create / update / toggleDone / delete.
- **Edit** `src/routes/index.tsx` — replace static `MaintenanceCalendar` with a query-driven version + month sheet (`MonthTasksSheet`) + add/edit form (`TaskForm`). Keep `buildSchedule` only for the auto-from-inventory merge.

## 2. Suggested upgrades to make it genuinely useful

Pick any subset; flagged ones are highest leverage.

1. **★ Push / browser reminders 7 days + 1 day before each task** — using the existing reminders util; opt-in toggle on the calendar header.
2. **★ "Mark done" history** — every completion writes a row to `maintenance_log` so the user sees "Last AC service: 14 Mar 2026 by Urban Company". Becomes proof for warranty/insurance claims.
3. **★ One-tap "Book now"** — any task tile shows the Service Marketplace partners (Urban Company / OEM / Local) inline, pre-filled with the item brand.
4. **Cost tracking** — optional ₹ amount on completion; year-end view shows "You spent ₹14,200 on home upkeep in 2026" + per-category breakdown.
5. **Smart recurrence** — when a task is marked done, auto-schedule the next occurrence (e.g. RO filter every 3 months from completion date, not calendar month).
6. **Seasonal templates by city** — pick "Bengaluru / Delhi / Mumbai / Chennai" and we pre-load locally relevant tasks (pre-monsoon roof check, winter geyser service, summer AC gas top-up).
7. **Share with family / household** — second user (spouse, parent) can view and tick off tasks; useful for joint households.
8. **Export to Google Calendar** — one-tap ICS download or Google Calendar deep-link per task so reminders live where the user already looks.
9. **AI Assistant integration** — the assistant can answer "what's due next month?" and "create a quarterly RO filter reminder" by reading/writing this table.
10. **Vendor notes** — store the technician's name/number per task; next year the user taps "call same guy".

## Technical details

- New table requires its own migration step (cannot be combined with code edits in the same turn). After the migration is approved, the regenerated types unlock typed CRUD in `maintenance-api.ts`.
- Seed-defaults strategy: on the dashboard mount, if `count(maintenance_tasks where user_id = me) = 0` and a `localStorage("ghar.maint.seeded")` flag is absent, insert the 12 `DEFAULT_SCHEDULE` rows with `recurrence='yearly'`, then set the flag. Keeps it idempotent without a server-side migration trigger.
- Sheet UI reuses existing bottom-sheet pattern from `AddItemForm`.
- TanStack Query keys: `["maintenance", userId]`; invalidate on every mutation.

## Out of scope (this plan)
- Native push notifications (requires Capacitor wiring).
- Multi-user household sharing (needs a `households` table — separate plan).
- Payment for booking partners.

## Question for you
Should I ship just **the editable calendar (#1)** now, or bundle one or two of the upgrades — my recommendation is **#1 + #2 (mark-done history) + #3 (inline Book now)** since they reuse code already in the app and turn the calendar into a real log without new dependencies.