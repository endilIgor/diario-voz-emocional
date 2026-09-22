import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
export const billingAvailable = Platform.OS === 'android' && !!apiKey;
let configured = false;

function configure() {
  if (!billingAvailable || !apiKey) return false;
  if (!configured) {
    Purchases.configure({ apiKey });
    configured = true;
  }
  return true;
}

export async function getPremiumStatus() {
  if (!configure()) return false;
  const customer = await Purchases.getCustomerInfo();
  return !!customer.entitlements.active.premium;
}

export async function getPremiumOffers(): Promise<PurchasesPackage[]> {
  if (!configure()) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function buyPremiumOffer(offer: PurchasesPackage) {
  if (!configure()) throw new Error('Compras não configuradas.');
  const { customerInfo } = await Purchases.purchasePackage(offer);
  return !!customerInfo.entitlements.active.premium;
}

export async function restorePremium() {
  if (!configure()) return false;
  const customer = await Purchases.restorePurchases();
  return !!customer.entitlements.active.premium;
}
