## Goal
Restore the rich demo experience for new users across Dashboard, Inventory, Locker, AI Assistant, and Insurance tabs — until they add their first real item. A persistent "Add your first item" CTA stays pinned at the top, and the demo content auto-disappears once real data exists.

## Behaviour

- **Trigger**: `itemsQ.data.length === 0` → demo mode ON for the logged-in user.
- **First real item added** → demo content automatically replaced by the user's real data (no manual toggle needed).
- **Onboarding carousel** (`/onboarding`) stays as-is for first launch; this plan only affects the in-app tabs after onboarding.

## Top CTA banner (all 5 tabs, demo mode only)

A sticky banner just under the tab header:
> 👋 You're viewing sample data. **[+ Add your first item]** to make this your home.

Tapping the button on any tab opens the existing Add Item sheet. Dismissing is not allowed (it's informational, not a toast) — it disappears only when a real item exists.

## Per-tab demo content

Pull from a new `src/lib/demo-data.ts` (sample Kedar household: LG AC, Samsung TV, MacBook, Bosch washing machine, Honda City, etc.).

1. **Dashboard** — show the original rich view: ₹8.42L asset value, "3 need attention", ₹12K savings, AI suggestion card, 3 alert banners (AC warranty expiring, RO filter due, car insurance renewal), Service Marketplace card for an "expired" LG warranty, full Maintenance Calendar with seasonal + sample items.
2. **Inventory** — 5–6 sample items with the 5-dot lifecycle bar (Invoice/Warranty/AMC/Insurance/Manual), purchase price + current market value with depreciation %.
3. **Locker** — 8 category tiles (Invoices, Warranties, Insurance, Manuals, Property, IDs, Vehicle, Medical) each with a sample count badge; "Home Timeline" below with past/upcoming events.
4. **AI Assistant** — pre-seeded suggestion chips that work against demo data ("When does my AC warranty end?", "Kitchen total value?", "All Samsung items"). Responses run through the same AI server fn but with demo inventory as context.
5. **Insurance** — coverage gap visualiser (₹8.99L home value, ₹4L covered, ₹4.99L gap), 4 insurer partner cards, 3-tier plan comparison (Free / Pro ₹999 / Business ₹3,999).

## Visual treatment

Demo content rendered with a subtle "SAMPLE" chip on each card (top-right, muted brand tint) so users never confuse it with real data. Same design tokens as live UI — no separate styling.

## Files

- **New** `src/lib/demo-data.ts` — typed sample items, locker counts, timeline events, insurance figures.
- **New** `src/components/demo/DemoBanner.tsx` — sticky CTA banner.
- **New** `src/components/demo/SampleChip.tsx` — small "SAMPLE" badge.
- **Edit** `src/routes/index.tsx` — for each of the 5 tab components, branch on `itemsQ.data.length === 0`: render demo variant + banner, else render real data view (current behaviour unchanged).
- **Remove** the current "empty dashboard" placeholder added last turn (superseded by full demo view).

## Out of scope

- No DB writes for demo data (purely in-memory).
- No "reset to demo" toggle after items exist.
- Onboarding carousel logic untouched.