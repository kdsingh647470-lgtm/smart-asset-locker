# Scan Upgrade: PDFs, Doc Types, Locker Attachments

Three upgrades to the Scan tab so it handles more than just invoice photos and the original file ends up safely in the Locker, linked to the right item.

## 1. Accept PDF + multi-page uploads

- Scan tab's Upload picker accepts `image/*,application/pdf` (camera button stays image-only).
- Server endpoint `src/routes/api/scan-invoice.ts` accepts either an image or a PDF:
  - Image → sent to Gemini as `image_url` (today's path).
  - PDF → sent as a `file` content block with `data:application/pdf;base64,...` and the real filename; Gemini reads all pages.
- Bump server body limit and add a 10 MB / 20-page guard with a clear error.

## 2. Document type selector

Before sending, user picks one of: **Invoice · Warranty · Insurance · Manual · AMC**.

- Each type uses a tailored extraction schema (AI SDK `Output.object`) so the right fields come back:
  - Invoice: today's fields (name, brand, model, serial, price_paid, price_now, purchased_at, warranty_until, seller).
  - Warranty: provider, coverage type, warranty_until, claim/policy number, terms summary.
  - Insurance: insurer, policy number, sum insured, premium, insured_until, coverage notes.
  - Manual: brand, model, product category, key specs (no dates).
  - AMC: provider, contract number, amc_until, scope, contact.
- Confirm screen shows only the relevant fields and writes back to the matching `items` columns (`warranty_until`, `insured_until`, `amc_until`, `has_manual`, `has_invoice`, `notes`).
- User can pick "Attach to existing item" (dropdown of their inventory) or "Create new item".

## 3. Store original file in the Locker + auto-fill lifecycle dots

- New Supabase Storage bucket `item-documents` (private, RLS: `auth.uid() = owner`).
- New table `public.item_documents`:
  - `item_id` (FK → items), `user_id`, `doc_type` (invoice/warranty/insurance/manual/amc), `file_path`, `file_name`, `mime_type`, `size_bytes`, `extracted_json`, `created_at`.
  - GRANTs + RLS scoped to `auth.uid() = user_id`.
- On successful scan: upload original file to `item-documents/{user_id}/{item_id}/{uuid}-{filename}`, insert `item_documents` row, and set the corresponding flag on the item:
  - invoice → `has_invoice = true`
  - manual → `has_manual = true`
  - warranty/insurance/amc → set the matching expiry date if extracted.
- Locker tab: each of the 5 existing categories (invoices, warranties, insurance, manuals, AMC) now lists the real uploaded docs grouped by item, with tap-to-view (signed URL, 1-hour expiry) and delete.
- Inventory lifecycle dots (Invoice/Warranty/AMC/Insurance/Manual) read from `item_documents` + date columns, so they turn green automatically once a doc is filed.

## Technical notes

- Files: edit `src/routes/api/scan-invoice.ts`, `src/routes/index.tsx` (Scan + Locker tabs), `src/lib/items-api.ts`; add `src/lib/documents-api.ts`.
- One migration: create `item_documents` table (with GRANTs, RLS, `update_updated_at_column` trigger) and the `item-documents` storage bucket policies.
- AI model unchanged (`google/gemini-2.5-flash` — supports PDF file input). Per-doc-type schemas kept small to stay under Gemini's structured-output state limit.
- Gmail auto-import and email-forward inbox are explicitly **out of scope** for this round.

Shall I build it?
