import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

/**
 * RevenueCat setup (see PRODUCT.md):
 * - Entitlement `pro`
 * - Offering `default`: `$rc_weekly` ($4.99/week) and `$rc_annual` ($49/year, no trial)
 * - Offering `exit_offer`: `$rc_annual` on a separate product with a $19.99 first-year intro price
 *
 * Without EXPO_PUBLIC_REVENUECAT_IOS_KEY, purchases are simulated so the flow works in development.
 */
const API_KEY = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
const ENTITLEMENT = 'pro';

export const hasStore = !!API_KEY;

export type PlanId = 'annual' | 'weekly' | 'exit';

export const FALLBACK_PRICES: Record<PlanId, string> = {
  annual: '$49',
  weekly: '$4.99',
  exit: '$19.99',
};

let configured = false;

export function initPurchases() {
  if (!API_KEY || configured) return;
  Purchases.configure({ apiKey: API_KEY });
  configured = true;
}

async function findPackage(plan: PlanId): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const offering = plan === 'exit' ? offerings.all['exit_offer'] : offerings.current;
  if (!offering) return null;
  return plan === 'weekly' ? offering.weekly : offering.annual;
}

export async function getPrice(plan: PlanId): Promise<string> {
  if (!API_KEY) return FALLBACK_PRICES[plan];
  try {
    const pkg = await findPackage(plan);
    if (!pkg) return FALLBACK_PRICES[plan];
    return plan === 'exit' && pkg.product.introPrice ? pkg.product.introPrice.priceString : pkg.product.priceString;
  } catch {
    return FALLBACK_PRICES[plan];
  }
}

/** Returns true when the user now has the pro entitlement. Throws on real store errors other than cancel. */
export async function purchase(plan: PlanId): Promise<boolean> {
  if (!API_KEY) {
    await new Promise((r) => setTimeout(r, 600));
    return true;
  }
  const pkg = await findPackage(plan);
  if (!pkg) throw new Error('This plan is not available right now.');
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return !!customerInfo.entitlements.active[ENTITLEMENT];
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  if (!API_KEY) return false;
  const info = await Purchases.restorePurchases();
  return !!info.entitlements.active[ENTITLEMENT];
}

/** The ID the Coach server uses to check the subscription and rate-limit: RevenueCat's app user ID when configured. */
export async function appUserId(fallback: string): Promise<string> {
  if (!API_KEY) return fallback;
  try {
    return await Purchases.getAppUserID();
  } catch {
    return fallback;
  }
}

export async function checkEntitlement(): Promise<boolean | null> {
  if (!API_KEY) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT];
  } catch {
    return null;
  }
}
