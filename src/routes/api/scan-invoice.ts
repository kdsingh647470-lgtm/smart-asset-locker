import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { generateText, Output } from "ai";
import { z } from "zod";

const RoomEnum = z
  .enum(["living", "kitchen", "bedroom", "bath", "study", "outdoor", "other"])
  .describe("Best-guess room for this item");

const InvoiceSchema = z.object({
  name: z.string().describe("Product name, e.g. 'LG Front Load Washing Machine'"),
  brand: z.string().nullable(),
  serial: z.string().nullable().describe("Serial / model number if visible"),
  room: RoomEnum,
  price_paid: z.number().describe("Purchase price in INR (₹). 0 if not found."),
  price_now: z.number().describe("Estimated current market value in INR (₹) after depreciation."),
  purchased_at: z.string().nullable().describe("Purchase date YYYY-MM-DD"),
  warranty_until: z.string().nullable().describe("Warranty end date YYYY-MM-DD if computable"),
  seller: z.string().nullable(),
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
    "Extract structured invoice data from this document. Estimate current market value in INR based on typical depreciation for the product category. Set unseen fields to null or 0.",
  warranty:
    "Extract warranty information from this document. Identify the product, provider, coverage, and warranty end date.",
  insurance:
    "Extract insurance policy details. Identify insurer, policy number, sum insured (INR), annual premium (INR), and policy end date.",
  manual:
    "Identify the product this manual is for. Extract brand, model number, product category, and a brief specs summary.",
  amc:
    "Extract Annual Maintenance Contract details. Identify the covered item, provider, contract number, AMC end date, scope of service, and service contact.",
} as const;

const SCHEMAS = {
  invoice: InvoiceSchema,
  warranty: WarrantySchema,
  insurance: InsuranceSchema,
  manual: ManualSchema,
  amc: AmcSchema,
} as const;

type DocType = keyof typeof SCHEMAS;

type ScanBody = {
  fileDataUrl?: string;
  fileName?: string;
  mimeType?: string;
  docType?: DocType;
  // legacy
  imageDataUrl?: string;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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
        if (!(docType in SCHEMAS)) {
          return json({ error: "Invalid docType" }, 400);
        }

        // Rough size guard (base64 ~4/3 of bytes)
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

        try {
          const { output } = await generateText({
            model,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            output: Output.object({ schema: SCHEMAS[docType] as any }),
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: DOC_PROMPTS[docType] },
                  isPdf
                    ? {
                        type: "file",
                        data: dataUrl,
                        mediaType: "application/pdf",
                        filename: fileName,
                      }
                    : { type: "image", image: dataUrl },
                ],
              },
            ],
          });

          return json({ docType, data: output });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Scan failed";
          console.error("scan-invoice failed:", message);
          // Schema-mismatch / empty doc / model refusal: return 200 so the UI
          // can show a friendly message instead of crashing the route.
          const isSchemaMiss =
            /did not match schema|No object generated|schema/i.test(message);
          if (isSchemaMiss) {
            return json({
              error:
                "Couldn't read this document. Try a clearer photo, a different page, or fill the details manually.",
              fallback: true,
              docType,
            });
          }
          return json({ error: message, fallback: true }, 200);
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
