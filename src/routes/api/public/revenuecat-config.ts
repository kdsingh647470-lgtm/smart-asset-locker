import { createFileRoute } from '@tanstack/react-router';

/**
 * Exposes the RevenueCat public Android SDK key to the mobile app.
 * The RevenueCat Android SDK key is designed to be embedded in the client
 * (like a Firebase apiKey). Kept out of the repo so it can be rotated
 * without a code change.
 */
export const Route = createFileRoute('/api/public/revenuecat-config')({
  server: {
    handlers: {
      GET: async () => {
        const androidApiKey = process.env.REVENUECAT_ANDROID_SDK_KEY ?? '';
        if (!androidApiKey) {
          return new Response(JSON.stringify({ androidApiKey: '' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        return Response.json({ androidApiKey });
      },
    },
  },
});
