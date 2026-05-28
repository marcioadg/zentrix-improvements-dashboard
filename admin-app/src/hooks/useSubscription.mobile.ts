/**
 * Mobile-only no-op version of useSubscription
 * 
 * APPLE APP STORE COMPLIANCE (Guideline 3.1.1):
 * This file is used ONLY in mobile builds (VITE_PLATFORM=mobile).
 * The actual subscription logic is completely excluded from mobile builds
 * to ensure zero payment-related code exists in the iOS binary.
 * 
 * This file is swapped in at build time via vite.config.ts aliasing.
 * Web builds always use the full useSubscription.ts file.
 */

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  trial_end?: string;
  extended_trial_end?: string;
  user_count?: number;
  next_billing_date?: string;
  subscription_status?: string;
  cancel_at_period_end?: boolean;
  billing_type?: string;
  base_price_per_user?: number;
  current_month_usage?: number;
  last_usage_update?: string;
}

interface SubscriptionHook {
  subscription: SubscriptionData;
  loading: boolean;
  isPaidActive: boolean;
  isTrialActive: boolean;
  hasCompanyAccess: boolean;
  checkSubscription: () => Promise<void>;
  createCheckoutSession: () => Promise<void>;
  cancelSubscription: (cancelImmediately?: boolean) => Promise<any>;
  openCustomerPortal: () => Promise<void>;
}

/**
 * No-op subscription hook for mobile builds.
 * Returns full access with zero network calls or payment logic.
 */
export const useSubscription = (): SubscriptionHook => ({
  subscription: { subscribed: true },
  loading: false,
  isPaidActive: false,
  isTrialActive: false,
  hasCompanyAccess: true,
  checkSubscription: async () => {},
  createCheckoutSession: async () => {},
  cancelSubscription: async () => {},
  openCustomerPortal: async () => {},
});
