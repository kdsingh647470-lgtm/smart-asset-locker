/**
 * Unified billing entry point.
 *
 * - Web (browser, PWA): Razorpay subscriptions (existing flow, kept as-is).
 * - Native Android (Play Store build): Google Play Billing via RevenueCat.
 *
 * Google Play policy requires digital-goods subscriptions consumed inside
 * an Android app to use Play Billing. Using Razorpay inside the Play build
 * would get the app rejected. This module hides that split from the UI.
 */
import { isNative, nativePlatform } from './native';

export type BillingPeriod = 'monthly' | 'yearly';

/** Where should the pricing sheet route this purchase? */
export function billingChannel(): 'razorpay' | 'play' {
  if (isNative() && nativePlatform() === 'android') return 'play';
  return 'razorpay';
}

/** Play Billing product identifiers (must match the SKUs you create in Google Play Console). */
export const PLAY_PRODUCT_IDS: Record<BillingPeriod, string> = {
  monthly: 'gharlog_pro_monthly',
  yearly: 'gharlog_pro_yearly',
};

/**
 * RevenueCat entitlement ID that unlocks Pro. Configure the same string in
 * RevenueCat dashboard → Entitlements.
 */
export const PRO_ENTITLEMENT_ID = 'pro';

type RcConfig = { androidApiKey: string };
let cachedRcConfig: RcConfig | null = null;

async function loadRcConfig(): Promise<RcConfig | null> {
  if (cachedRcConfig) return cachedRcConfig;
  try {
    const res = await fetch('/api/public/revenuecat-config', { credentials: 'omit' });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<RcConfig>;
    if (!json.androidApiKey) return null;
    cachedRcConfig = { androidApiKey: json.androidApiKey };
    return cachedRcConfig;
  } catch {
    return null;
  }
}

let rcInitialized = false;

/** Initialise RevenueCat once per session with the signed-in user's id. */
export async function initRevenueCat(supabaseUserId: string): Promise<boolean> {
  if (!isNative() || nativePlatform() !== 'android') return false;
  if (rcInitialized) return true;
  const cfg = await loadRcConfig();
  if (!cfg) return false;
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
  await Purchases.configure({
    apiKey: cfg.androidApiKey,
    appUserID: supabaseUserId,
  });
  rcInitialized = true;
  return true;
}

/**
 * Launch the Play Billing purchase sheet for the chosen period. Resolves
 * with whether the Pro entitlement is now active on the RevenueCat side.
 *
 * The authoritative Pro grant on our backend still comes from the
 * RevenueCat webhook (see /api/public/revenuecat-webhook).
 */
export async function purchaseProViaPlay(period: BillingPeriod): Promise<{
  ok: boolean;
  message?: string;
}> {
  if (!isNative() || nativePlatform() !== 'android') {
    return { ok: false, message: 'Play Billing is only available on the Android app.' };
  }
  const { Purchases, PURCHASES_ERROR_CODE } = await import('@revenuecat/purchases-capacitor');
  const productId = PLAY_PRODUCT_IDS[period];

  try {
    const products = await Purchases.getProducts({ productIdentifiers: [productId] });
    const product = products.products?.[0];
    if (!product) {
      return {
        ok: false,
        message: `Product ${productId} not found. Check Play Console + RevenueCat setup.`,
      };
    }
    const { customerInfo } = await Purchases.purchaseStoreProduct({ product });
    const active = !!customerInfo.entitlements.active?.[PRO_ENTITLEMENT_ID];
    return active
      ? { ok: true }
      : { ok: false, message: 'Purchase completed but entitlement not yet active. Try again shortly.' };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string; userCancelled?: boolean };
    if (err?.userCancelled || err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { ok: false, message: 'Purchase cancelled' };
    }
    return { ok: false, message: err?.message ?? 'Purchase failed' };
  }
}

/** Restore previously purchased subscriptions (Play Store requirement). */
export async function restorePlayPurchases(): Promise<{ ok: boolean; message?: string }> {
  if (!isNative() || nativePlatform() !== 'android') {
    return { ok: false, message: 'Restore is only available on the Android app.' };
  }
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    const active = !!customerInfo.entitlements.active?.[PRO_ENTITLEMENT_ID];
    return active
      ? { ok: true }
      : { ok: false, message: 'No active Pro purchases found for this Google account.' };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, message: err?.message ?? 'Restore failed' };
  }
}
