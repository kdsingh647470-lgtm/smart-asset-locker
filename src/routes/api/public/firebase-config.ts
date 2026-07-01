// Serves the Firebase Web config to the browser at runtime. apiKey is read
// from the server-side GOOGLE_API_KEY secret; other values are public.
import { createFileRoute } from "@tanstack/react-router";

const PUBLIC_CONFIG = {
  authDomain: "gharlog-21a1f.firebaseapp.com",
  projectId: "gharlog-21a1f",
  storageBucket: "gharlog-21a1f.firebasestorage.app",
  messagingSenderId: "321404491846",
  appId: "1:321404491846:web:b40eb08e8871e938cb5247",
};

const VAPID_PUBLIC_KEY =
  "BDvbmRCzuw1ZiUSHTX3XF48PS_J1508n8BY4JVADhRCSTF6QApjFpiuBdq2El5AMJ7_ibhvHTaYS0gTaZ_eYV7k";

export const Route = createFileRoute("/api/public/firebase-config")({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env.GOOGLE_API_KEY ?? "";
        return Response.json(
          { apiKey, ...PUBLIC_CONFIG, vapidKey: VAPID_PUBLIC_KEY },
          { headers: { "Cache-Control": "public, max-age=300" } },
        );
      },
    },
  },
});
