# Fix: PDF scan extracts perfectly but nothing reaches the form

## What's actually happening

Looked at the AI Gateway log for your last PDF upload (log `019f0c7f-84f4-7bc8-b07a-623d66f478d7`). Gemini read the Amazon invoice **flawlessly** — pulled "Qubo Car Dashcam Pro 4K", ₹12,240, seller ETRADE MARKETING, invoice date 22.10.2025, even an estimated current market value of ₹8,500.

The problem is purely on our side: the model returned JSON with *its own field names* (`invoice_number`, `seller_name`, `items[]`, `total_amount`) instead of *our* field names (`name`, `brand`, `price_paid`, `price_now`, `room`, `purchased_at`). The AI SDK's `Output.object` only validates — it doesn't actually force Gemini to use our schema — so validation failed and we showed "Couldn't read this document".

## The fix (3 small changes in `src/routes/api/scan-invoice.ts`)

### 1. Use `generateObject` instead of `generateText` + `Output.object`

`generateObject` from the `ai` package sends the schema as a real `response_format` constraint to OpenRouter/Gemini, which forces the model to emit exactly the field names we ask for. This alone fixes the dashcam invoice case.

### 2. Tighten the prompt with field names + a worked example

Tell Gemini explicitly: "Use these exact JSON keys: `name`, `brand`, `serial`, `room`, `price_paid` (the grand total in INR), `price_now` (your estimate after depreciation), `purchased_at` (YYYY-MM-DD), `warranty_until`, `seller`. If a field is unknown, use null for strings/dates and 0 for numbers."

For multi-item invoices like the dashcam one, instruct: "If the invoice has multiple line items, pick the primary product (highest value) and put it in `name`."

### 3. Salvage fallback when the schema still misses

If `generateObject` still throws (rare — e.g. model returned prose), do a second pass with `generateText` (no schema) asking for raw JSON, then best-effort map common keys:
- `invoice_number` / `order_number` → notes
- `total_amount` / `item_total` / `grand_total` → `price_paid`
- `current_market_value_inr` → `price_now`
- `invoice_date` → `purchased_at` (parse dd.mm.yyyy / dd/mm/yyyy → YYYY-MM-DD)
- `items[0].description` → `name`
- `seller_name` → `seller`

Return `{ data, partial: true }` so the UI shows a "Please verify" hint above the prefilled form.

## What stays the same

- Same model (`google/gemini-2.5-flash`), same PDF/image upload path, same 10 MB cap.
- Same five doc types and Zod schemas (the keys are correct — they just weren't being enforced).
- Same 200-with-fallback error contract that we shipped last turn, so the UI never blanks again.

## How we'll verify

After the change, re-upload the same dashcam PDF. Expected: confirm screen pre-fills with name "Qubo Car Dashcam Pro 4K", brand "Qubo", price_paid 12240, price_now 8500, purchased_at 2025-10-22, seller "ETRADE MARKETING PRIVATE LIMITED". Then check the AI Gateway log to confirm the response now matches our schema keys.

## Files touched

- `src/routes/api/scan-invoice.ts` — swap to `generateObject`, sharpen prompts per doc type, add salvage fallback. ~40 lines changed, no new files, no migration.
