import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type ChatRequestBody = { messages?: unknown; inventory?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, inventory } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const inventoryContext =
          Array.isArray(inventory) && inventory.length > 0
            ? `The user's home inventory (JSON):\n${JSON.stringify(inventory, null, 2)}`
            : "The user has no items saved yet.";

        const system = `You are GharLog AI, an assistant for India's Digital Home Asset Manager.
Help users with their household appliances, warranties, AMCs, insurance, manuals, service schedules, and resale values.
Answer in concise, friendly English. Use ₹ for prices. Use **bold** for key facts. Reference real items from the inventory when possible.

${inventoryContext}`;

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
