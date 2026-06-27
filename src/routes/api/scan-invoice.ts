import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { generateText, Output } from "ai";
import { z } from "zod";

const ExtractSchema = z.object({
  name: z.string().describe("Product name, e.g. 'LG Front Load Washing Machine'"),
  brand: z.string().nullable(),
  serial: z.string().nullable().describe("Serial number or model number if visible"),
  room: z
    .enum(["living", "kitchen", "bedroom", "bath", "study", "outdoor", "other"])
    .describe("Best-guess room for this item"),
  price_paid: z.number().describe("Purchase price in INR (₹). 0 if not found."),
  price_now: z.number().describe("Estimated current market value in INR (₹) accounting for depreciation."),
  purchased_at: z.string().nullable().describe("Purchase date in YYYY-MM-DD if visible"),
  warranty_until: z.string().nullable().describe("Warranty end date in YYYY-MM-DD if computable"),
  seller: z.string().nullable().describe("Seller/store name if visible"),
  confidence: z.enum(["low", "medium", "high"]),
});

type ScanBody = { imageDataUrl?: string };

export const Route = createFileRoute("/api/scan-invoice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { imageDataUrl } = (await request.json()) as ScanBody;
        if (!imageDataUrl || !imageDataUrl.startsWith("data:")) {
          return new Response(JSON.stringify({ error: "imageDataUrl required" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        try {
          const { output } = await generateText({
            model,
            output: Output.object({ schema: ExtractSchema }),
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract structured invoice data from this image. Estimate current market value in INR based on typical depreciation for the product category. If something is not visible, set it to null or 0.",
                  },
                  { type: "image", image: imageDataUrl },
                ],
              },
            ],
          });

          return new Response(JSON.stringify(output), {
            headers: { "content-type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Scan failed";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
