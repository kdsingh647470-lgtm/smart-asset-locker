import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { generateObject, generateText } from "ai";
import { z } from "zod";

const RoomEnum = z
  .enum(["living", "kitchen", "bedroom", "bath", "study", "outdoor", "other"])
  .describe("Best-guess room for this item");

const InvoiceSchema = z.object({
  name: z.string().describe("Primary product name, e.g. 'Qubo Car Dashcam Pro 4K'. For multi-item invoices, pick the highest-value line item."),
  brand: z.string().nullable().describe("Brand only, e.g. 'Qubo', 'LG', 'Samsung'"),
  serial: z.string().nullable().describe("Serial / model / ASIN if visible"),
  room: RoomEnum,
  price_paid: z.number().describe("Grand total paid in INR (₹). Use 0 if not found."),
  price_now: z.number().describe("Estimated current market value in INR (₹) after depreciation. Use 0 if you can't estimate."),
  purchased_at: z.string().nullable().describe("Invoice / purchase date in YYYY-MM-DD format. Convert dd.mm.yyyy or dd/mm/yyyy."),
  warranty_until: z.string().nullable().describe("Warranty end date YYYY-MM-DD if computable"),
  seller: z.string().nullable().describe("Seller / merchant name, e.g. 'Amazon', 'ETRADE MARKETING PRIVATE LIMITED'"),
  confidence: z.enum(["low", "medium", "high"]),
});

const WarrantySchema = z.object({
  name: z.string().describe("Product the warranty covers"),
  brand: z.string().nullable(),
  serial: z.string().nullable(),
  room: RoomEnum,
  provider: z.string().nullable().describe("Warranty provider / OEM"),
  coverage: z.string().nullable().describe("What is covered, short summary"),
  warranty_until: z.string().nullable().describe("Warranty end date YYYY-MM-DD"),
  claim_number: z.string().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
});

const InsuranceSchema = z.object({
  name: z.string().describe("Item / asset insured (e.g. 'Home contents', 'iPhone 15')"),
  brand: z.string().nullable(),
  room: RoomEnum,
  insurer: z.string().nullable(),
  policy_number: z.string().nullable(),
  sum_insured: z.number().describe("Sum insured in INR. 0 if not found."),
  premium: z.number().describe("Annual premium in INR. 0 if not found."),
  insured_until: z.string().nullable().describe("Policy end date YYYY-MM-DD"),
  coverage: z.string().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
});

const ManualSchema = z.object({
  name: z.string(),
  brand: z.string().nullable(),
  serial: z.string().nullable().describe("Model number"),
  room: RoomEnum,
  category: z.string().nullable().describe("Product category (e.g. 'Washing machine')"),
  key_specs: z.string().nullable().describe("One-line summary of key specs"),
  confidence: z.enum(["low", "medium", "high"]),
});

const AmcSchema = z.object({
  name: z.string().describe("Item covered by the AMC"),
  brand: z.string().nullable(),
  room: RoomEnum,
  provider: z.string().nullable(),
  contract_number: z.string().nullable(),
  amc_until: z.string().nullable().describe("AMC end date YYYY-MM-DD"),
  scope: z.string().nullable(),
  contact: z.string().nullable().describe("Service contact phone/email"),
  confidence: z.enum(["low", "medium", "high"]),
});

const DOC_PROMPTS = {
  invoice:
    "Extract structured invoice data. Use these EXACT JSON keys: name, brand, serial, room, price_paid (INR grand total as a number), price_now (your estimated current market value in INR after depreciation; use category norms — Electronics ~30%/yr, Appliances ~15%/yr, Furniture ~10%/yr), purchased_at (YYYY-MM-DD), warranty_until (YYYY-MM-DD or null), seller, confidence. If invoice has multiple line items, pick the SINGLE highest-value product as the primary item. Use null for unknown strings/dates and 0 for unknown numbers. Convert dd.mm.yyyy and dd/mm/yyyy dates to YYYY-MM-DD.",
  warranty:
    "Extract warranty information. Use these EXACT JSON keys: name, brand, serial, room, provider, coverage, warranty_until (YYYY-MM-DD), claim_number, confidence. Use null for unknown values.",
  insurance:
    "Extract insurance policy details. Use these EXACT JSON keys: name, brand, room, insurer, policy_number, sum_insured (INR number), premium (INR number), insured_until (YYYY-MM-DD), coverage, confidence. Use null/0 for unknown.",
  manual:
    "Identify the product this manual is for. Use these EXACT JSON keys: name, brand, serial (model number), room, category, key_specs, confidence.",
  amc:
    "Extract Annual Maintenance Contract details. Use these EXACT JSON keys: name, brand, room, provider, contract_number, amc_until (YYYY-MM-DD), scope, contact, confidence.",
} as const;

const SCHEMAS = {
  invoice: InvoiceSchema,
  warranty: WarrantySchema,
  insurance: InsuranceSchema,
  manual: ManualSchema,
  amc: AmcSchema,
} as const;

const REAL_DOC_TYPES = ["invoice", "warranty", "insurance", "manual", "amc"] as const;

type RealDocType = (typeof REAL_DOC_TYPES)[number];
type DocType = RealDocType | "any";

type ScanBody = {
  fileDataUrl?: string;
  fileName?: string;
  mimeType?: string;
  docType?: DocType;
  // legacy
  imageDataUrl?: string;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Best-effort YYYY-MM-DD from common Indian invoice date formats.
function normalizeDate(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function pickNumber(...candidates: unknown[]): number {
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
    if (typeof c === "string") {
      const n = Number(c.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return 0;
}

function pickString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

// Map a free-form Gemini JSON response to our invoice shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function salvageInvoice(raw: any): z.infer<typeof InvoiceSchema> | null {
  if (!raw || typeof raw !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstItem: any = Array.isArray(raw.items) && raw.items.length > 0 ? raw.items[0] : {};
  const name = pickString(raw.name, raw.product_name, firstItem.name, firstItem.description, firstItem.product);
  if (!name) return null;
  return {
    name,
    brand: pickString(raw.brand, firstItem.brand),
    serial: pickString(raw.serial, raw.asin, raw.model, firstItem.hsn, firstItem.asin),
    room: "other",
    price_paid: pickNumber(
      raw.price_paid,
      raw.total_amount,
      raw.grand_total,
      raw.invoice_total,
      firstItem.item_total,
      firstItem.net_amount,
    ),
    price_now: pickNumber(raw.price_now, raw.current_market_value_inr, firstItem.current_market_value_inr),
    purchased_at: normalizeDate(raw.purchased_at ?? raw.invoice_date ?? raw.order_date ?? raw.date),
    warranty_until: normalizeDate(raw.warranty_until),
    seller: pickString(raw.seller, raw.seller_name, raw.merchant, raw.vendor),
    confidence: "medium",
  };
}

export const Route = createFileRoute("/api/scan-invoice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ScanBody;
        const docType: DocType = body.docType ?? "invoice";
        const dataUrl = body.fileDataUrl ?? body.imageDataUrl;
        const fileName = body.fileName ?? "document";
        const mimeType =
          body.mimeType ??
          (dataUrl?.match(/^data:([^;]+);base64,/)?.[1] ?? "image/jpeg");

        if (!dataUrl || !dataUrl.startsWith("data:")) {
          return json({ error: "fileDataUrl required" }, 400);
        }

        const b64 = dataUrl.split(",")[1] ?? "";
        const approxBytes = Math.floor((b64.length * 3) / 4);
        if (approxBytes > MAX_BYTES) {
          return json({ error: "File too large (max 10 MB)" }, 413);
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-2.5-flash");

        const isPdf = mimeType === "application/pdf";
        const mediaBlock = isPdf
          ? { type: "file" as const, data: dataUrl, mediaType: "application/pdf", filename: fileName }
          : { type: "image" as const, image: dataUrl };

        // Resolve "any" into a real document type first
        let resolvedDocType: RealDocType = docType as RealDocType;
        if (docType === "any") {
          try {
            const { text } = await generateText({
              model,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Classify this document. Reply with ONLY one word from this list: invoice, warranty, insurance, manual, amc. No explanation, no punctuation.`,
                    },
                    mediaBlock,
                  ],
                },
              ],
            });
            const clean = text.toLowerCase().trim().replace(/[^a-z]/g, "");
            if (REAL_DOC_TYPES.includes(clean as RealDocType)) {
              resolvedDocType = clean as RealDocType;
            } else {
              resolvedDocType = "invoice";
            }
          } catch {
            resolvedDocType = "invoice";
          }
        }

        const promptBlock = { type: "text" as const, text: DOC_PROMPTS[resolvedDocType] };

        // Pass 1: structured generation with the real schema as a response_format constraint.
        try {
          const { object } = await generateObject({
            model,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            schema: SCHEMAS[resolvedDocType] as any,
            messages: [{ role: "user", content: [promptBlock, mediaBlock] }],
          });
          return json({ docType: resolvedDocType, data: object });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Scan failed";
          console.error("scan-invoice generateObject failed:", message);

          // Pass 2 (salvage): ask for raw JSON, then best-effort remap common keys.
          if (resolvedDocType === "invoice") {
            try {
              const { text } = await generateText({
                model,
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text:
                          "Extract this invoice as JSON. Reply with ONLY a JSON object (no markdown fences, no commentary). Include at minimum: product name, brand, total amount in INR, invoice date, seller name. If multiple items, focus on the most expensive one.",
                      },
                      mediaBlock,
                    ],
                  },
                ],
              });
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const salvaged = salvageInvoice(parsed);
                if (salvaged) {
                  return json({ docType: resolvedDocType, data: salvaged, partial: true });
                }
              }
            } catch (salvageErr) {
              console.error("scan-invoice salvage failed:", salvageErr);
            }
          }

          const isSchemaMiss =
            /did not match schema|No object generated|schema|validation/i.test(message);
          return json(
            {
              error: isSchemaMiss
                ? "Couldn't fully read this document. Try a clearer photo or fill the details manually."
                : message,
              fallback: true,
              docType: resolvedDocType,
            },
            200,
          );
        }
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
