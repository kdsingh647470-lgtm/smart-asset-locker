import { createFileRoute } from '@tanstack/react-router';

/**
 * RevenueCat webhook — authoritative source of truth for Pro entitlement
 * on the Android (Google Play Billing) side. Configure in the RevenueCat
 * dashboard → Project Settings → Integrations → Webhooks:
 *   URL:  https://gharlog.nesake.com/api/public/revenuecat-webhook
 *   Auth header: Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
 *
 * We upsert `user_plans` based on the subscriber's active entitlements.
 * The `app_user_id` on the event is the Supabase user id (set by
 * initRevenueCat in src/lib/billing.ts).
 */

const PRO_ENTITLEMENT_ID = 'pro';

type RcEvent = {
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  entitlement_ids?: string[] | null;
  entitlement_id?: string | null;
  expiration_at_ms?: number | null;
  environment?: 'SANDBOX' | 'PRODUCTION';
};

type RcPayload = {
  event: RcEvent;
  api_version?: string;
};

function isProEvent(ev: RcEvent): boolean {
  const ids = ev.entitlement_ids ?? (ev.entitlement_id ? [ev.entitlement_id] : []);
  return ids.includes(PRO_ENTITLEMENT_ID);
}

export const Route = createFileRoute('/api/public/revenuecat-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
        if (!secret) {
          return new Response('Webhook secret not configured', { status: 500 });
        }
        const auth = request.headers.get('authorization') ?? '';
        const provided = auth.replace(/^Bearer\s+/i, '').trim();
        if (provided !== secret) {
          return new Response('Unauthorized', { status: 401 });
        }

        let payload: RcPayload;
        try {
          payload = (await request.json()) as RcPayload;
        } catch {
          return new Response('Invalid JSON', { status: 400 });
        }

        const ev = payload?.event;
        if (!ev?.type || !ev?.app_user_id) {
          return new Response('Missing event fields', { status: 400 });
        }

        // Ignore events unrelated to our Pro entitlement (e.g. TEST events
        // still get 200 so RC marks the webhook healthy).
        if (ev.type === 'TEST') {
          return Response.json({ ok: true, test: true });
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const userId = ev.app_user_id;

        const grantsPro = new Set([
          'INITIAL_PURCHASE',
          'RENEWAL',
          'UNCANCELLATION',
          'PRODUCT_CHANGE',
          'TEMPORARY_ENTITLEMENT_GRANT',
        ]);
        const revokesPro = new Set([
          'CANCELLATION',
          'EXPIRATION',
          'SUBSCRIPTION_PAUSED',
          'BILLING_ISSUE',
        ]);

        if (grantsPro.has(ev.type) && isProEvent(ev)) {
          const { error } = await supabaseAdmin
            .from('user_plans')
            .upsert(
              {
                user_id: userId,
                plan: 'pro',
                activated_at: new Date().toISOString(),
                promo_code: 'play_billing',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' },
            );
          if (error) return new Response(error.message, { status: 500 });
        } else if (revokesPro.has(ev.type) && isProEvent(ev)) {
          // For CANCELLATION we still keep Pro until EXPIRATION; only
          // downgrade on the terminal events.
          if (ev.type === 'EXPIRATION' || ev.type === 'BILLING_ISSUE') {
            const { error } = await supabaseAdmin
              .from('user_plans')
              .upsert(
                {
                  user_id: userId,
                  plan: 'free',
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' },
              );
            if (error) return new Response(error.message, { status: 500 });
          }
        }

        return Response.json({ ok: true });
      },
    },
  },
});
