## Goal
Show a first-time user how GharLog works before they see the app, then present an empty-state dashboard with clear "add your first item" prompts. Once they add inventory, the dashboard seamlessly switches to the full live view (stats, alerts, reminders, calendar).

## Plan

### 1. Onboarding carousel (first install, zero items)
- Build a 4-screen swipeable walkthrough accessible at `/onboarding`:
  1. **"Track everything you own"** — visual of home with appliances, warranties, docs
  2. **"Never miss a renewal"** — alert/reminder visualization
  3. **"Scan invoices in seconds"** — camera + Gmail import demo
  4. **"Your encrypted vault"** — locker + insurance gap visual
- Each screen: large illustration, bold headline, 1-line subtext, dot indicator.
- Last screen has a primary "Get Started" CTA that sets `hasSeenOnboarding = true` in localStorage and navigates to `/`.
- Only shown if `hasSeenOnboarding` is not set AND the user has 0 items in Supabase. Skip entirely if cloud data exists.

### 2. Empty-state Dashboard (0 items, onboarding already seen)
When the user lands on `/` with 0 items:
- Hide the live stat chips and alert banners.
- Show a friendly empty-state card:
  - Headline: "Your home vault is empty"
  - Subtext: "Add your first appliance, gadget, or document to start tracking warranties, renewals, and value."
  - Three prominent CTA buttons:
    - **"Scan an invoice"** → jumps to Scan tab
    - **"Add manually"** → opens the existing Add Item form
    - **"Import from Gmail"** → jumps to Scan tab (Gmail section)
- Below CTAs: 3 small feature teaser cards (Reminders, Locker, Insurance) with icon + 1-line description so the user knows what the app does.

### 3. Populated Dashboard (>=1 item)
- Keep the current Dashboard exactly as-is: live asset value, attention count, renewal reminders, maintenance calendar, service marketplace.
- This becomes the default view once the first item is saved to Supabase.

### 4. State switching logic
- In the Dashboard component, query the real item count from Supabase.
- If `count === 0` and `hasSeenOnboarding === true` → render EmptyStateDashboard.
- If `count === 0` and `hasSeenOnboarding !== true` → redirect to `/onboarding`.
- If `count > 0` → render PopulatedDashboard (current view).
- Persist `hasSeenOnboarding` flag in localStorage. Clearing app data resets it.

### 5. Route structure
- `/onboarding` — new route file for the tutorial carousel.
- `/` — dashboard remains home; internal state handles empty vs populated.
- No auth gate on `/onboarding` (public), but it checks session/item state and redirects appropriately.

## Out of scope
- Animations beyond simple CSS transitions for the carousel.
- Backend schema changes (uses existing `items` table).
- Push notifications or email reminders (already handled elsewhere).

## Files to create / modify
- `src/routes/onboarding.tsx` — new onboarding route
- `src/routes/index.tsx` — add empty-state branch and redirect logic
- `src/lib/onboarding-storage.ts` — localStorage helper for the seen flag
- Reuse existing `AddItemForm`, `ScanTab`, and `LockerCategoryTile` components where possible.
