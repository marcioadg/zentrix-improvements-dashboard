import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';

/**
 * Module-level subscription cache.
 * Ensures multiple useSubscription() consumers share cached data
 * and don't duplicate edge-function calls on every mount/navigation.
 * TTL: 5 minutes (300 000 ms). Cache is keyed by companyId.
 */
const SUBSCRIPTION_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: SubscriptionData;
  timestamp: number;
}

const subscriptionCache = new Map<string, CacheEntry>();

/** In-flight request deduplication: one promise per companyId at a time */
const inflightRequests = new Map<string, Promise<SubscriptionData>>();

function getCachedSubscription(companyId: string): SubscriptionData | null {
  const entry = subscriptionCache.get(companyId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SUBSCRIPTION_CACHE_TTL_MS) {
    subscriptionCache.delete(companyId);
    return null;
  }
  return entry.data;
}

function setCachedSubscription(companyId: string, data: SubscriptionData): void {
  subscriptionCache.set(companyId, { data, timestamp: Date.now() });
}

/** Invalidate the cache for a specific company (e.g. after cancel/checkout) */
export function invalidateSubscriptionCache(companyId?: string): void {
  if (companyId) {
    subscriptionCache.delete(companyId);
    inflightRequests.delete(companyId);
  } else {
    subscriptionCache.clear();
    inflightRequests.clear();
  }
}

/**
 * Check if running in mobile context (native app, mobile viewport, or /m/* routes)
 * Used to completely bypass subscription logic for Apple App Store compliance
 */
const isMobileContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isMobileRoute = window.location.pathname.startsWith('/m/');
  return isMobileOrTabletDevice() || isMobileRoute;
};

interface SubscriptionData {
  subscribed: boolean; // True if company has valid access (Free, Trial, or Paid)
  subscription_tier?: string; // 'Free', 'Trial', 'Basic', 'Premium', etc.
  subscription_end?: string;
  trial_end?: string;
  extended_trial_end?: string;
  user_count?: number;
  next_billing_date?: string;
  subscription_status?: string;
  cancel_at_period_end?: boolean;
  billing_type?: string; // 'fixed' or 'usage_based'
  base_price_per_user?: number; // Base price per user (default 5.00)
  current_month_usage?: number; // Current month's calculated usage amount
  last_usage_update?: string; // When usage was last updated
}

interface SubscriptionHook {
  subscription: SubscriptionData;
  loading: boolean;
  isPaidActive: boolean; // True if user has active paid subscription (paid tier + active subscription_end)
  isTrialActive: boolean; // True if trial period is still active
  hasCompanyAccess: boolean; // True if company has valid access (Free, Trial, or Paid)
  checkSubscription: () => Promise<void>;
  createCheckoutSession: () => Promise<void>;
  cancelSubscription: (cancelImmediately?: boolean, reason?: string, feedback?: string) => Promise<any>;
  openCustomerPortal: () => Promise<void>;
}

export const useSubscription = (): SubscriptionHook => {
  // MOBILE BYPASS: Complete no-op for Apple App Store compliance
  // No network calls, no logging, no subscription state management
  // Mobile users get full access with zero payment-related signals
  if (isMobileContext()) {
    return {
      subscription: { subscribed: true },
      loading: false,
      isPaidActive: false,
      isTrialActive: false,
      hasCompanyAccess: true,
      checkSubscription: async () => {},
      createCheckoutSession: async () => {},
      cancelSubscription: async () => {},
      openCustomerPortal: async () => {},
    };
  }

  // WEB ONLY: Full subscription logic below
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { currentCompany, loading: companyLoading } = useMultiCompany();
  const [subscription, setSubscription] = useState<SubscriptionData>({ subscribed: false });
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Keep loading true until auth and company are resolved AND subscription is checked
  const loading = authLoading || companyLoading || subscriptionLoading;

  // Derived booleans for clearer subscription status checks
  const isPaidActive = (() => {
    const { subscription_tier, subscription_end } = subscription;
    // Only paid tiers with active subscription_end are considered "paid active"
    const isPaidTier = ['Basic', 'Premium', 'Enterprise', 'Paid'].includes(subscription_tier || '');
    const hasValidSubscription = subscription_end ? new Date(subscription_end) > new Date() : false;
    return isPaidTier && hasValidSubscription;
  })();
  const isTrialActive = (() => {
    const trialEnd = subscription.extended_trial_end || subscription.trial_end;
    return trialEnd ? new Date(trialEnd) > new Date() : false;
  })();
  
  // Access is determined directly by the backend-calculated flag
  const hasCompanyAccess = subscription.subscribed;

  /**
   * Fetch subscription data from edge function (or DB fallback),
   * returning the parsed SubscriptionData. Shared by cache logic.
   */
  const fetchSubscriptionData = async (companyId: string): Promise<SubscriptionData> => {
    logger.debug('Fetching subscription via edge function for real-time Stripe sync', { companyId });

    const { data, error } = await supabase.functions.invoke('os-check-subscription', {
      body: { companyId }
    });

    if (error) {
      logger.warn('Edge function error - falling back to DB query', {
        error: error.message,
        companyId
      });

      const { data: companySubscription, error: dbError } = await supabase
        .from('company_subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbError) {
        logger.warn('DB fallback also failed - failing open (allowing access)', {
          error: dbError.message,
          companyId
        });
        return { subscribed: true };
      }

      if (companySubscription) {
        return {
          subscribed: companySubscription.subscribed,
          subscription_tier: companySubscription.subscription_tier,
          subscription_end: companySubscription.subscription_end,
          trial_end: companySubscription.trial_end,
          extended_trial_end: companySubscription.extended_trial_end,
          billing_type: companySubscription.billing_type || 'usage_based',
          base_price_per_user: companySubscription.base_price_per_user || 5.00,
          current_month_usage: companySubscription.current_month_usage || 0,
          last_usage_update: companySubscription.last_usage_update
        };
      }

      return { subscribed: true, billing_type: 'usage_based' };
    }

    logger.debug('Got fresh subscription data from edge function', {
      companyId,
      subscribed: data.subscribed,
      tier: data.subscription_tier
    });

    return {
      subscribed: data.subscribed,
      subscription_tier: data.subscription_tier,
      subscription_end: data.subscription_end,
      trial_end: data.trial_end,
      extended_trial_end: data.extended_trial_end,
      next_billing_date: data.next_billing_date,
      subscription_status: data.subscription_status,
      cancel_at_period_end: data.cancel_at_period_end,
      user_count: data.user_count,
      billing_type: data.billing_type || 'usage_based',
      base_price_per_user: data.base_price_per_user || 5.00,
      current_month_usage: data.current_month_usage || 0,
      last_usage_update: data.last_usage_update
    };
  };

  const checkSubscription = useCallback(async (forceRefresh = false) => {
    // Don't proceed if auth or company context is still loading
    if (authLoading || companyLoading) {
      return;
    }

    if (!user) {
      setSubscription({ subscribed: false });
      setSubscriptionLoading(false);
      return;
    }

    const currentCompanyId = currentCompany?.id;

    if (!currentCompanyId) {
      if (!companyLoading) {
        // Company context is done loading but no company found (e.g. new user or data error).
        // Don’t leave subscriptionLoading=true indefinitely — that causes an infinite spinner.
        logger.debug('No current company after load complete — clearing subscription loading state');
        setSubscriptionLoading(false);
      } else {
        logger.debug('No current company selected, waiting for context to load');
      }
      return;
    }

    // Check module-level cache first (shared across all hook instances)
    if (!forceRefresh) {
      const cached = getCachedSubscription(currentCompanyId);
      if (cached) {
        logger.debug('Using cached subscription data', {
          companyId: currentCompanyId,
          tier: cached.subscription_tier
        });
        setSubscription(cached);
        setSubscriptionLoading(false);
        return;
      }
    }

    // Mark loading before the async fetch so ProtectedRoute doesn't redirect
    // during the window between a company appearing and the fetch completing.
    setSubscriptionLoading(true);

    try {
      // Deduplicate in-flight requests: if another hook instance is already
      // fetching for this company, reuse its promise instead of firing again.
      let fetchPromise = inflightRequests.get(currentCompanyId);
      if (!fetchPromise) {
        fetchPromise = fetchSubscriptionData(currentCompanyId);
        inflightRequests.set(currentCompanyId, fetchPromise);
      }

      const result = await fetchPromise;
      inflightRequests.delete(currentCompanyId);

      // Store in module-level cache for other hook instances
      setCachedSubscription(currentCompanyId, result);

      setSubscription(result);
      setSubscriptionLoading(false);
    } catch (error) {
      inflightRequests.delete(currentCompanyId);
      logger.error('Error checking subscription:', { error });
      logger.warn('Unexpected error during subscription check - defaulting to access granted');
      setSubscription({ subscribed: true });
      setSubscriptionLoading(false);
    }
  }, [user, currentCompany?.id, authLoading, companyLoading]);

  const createCheckoutSession = async (): Promise<void> => {
    if (!user) {
      toast.error('Please log in to subscribe');
      return;
    }

    if (!currentCompany?.id) {
      toast.error('Please select a company first');
      return;
    }

    // Navigate to internal Stripe Elements checkout page
    navigate(`/checkout?company_id=${currentCompany?.id}`);
  };

  const cancelSubscription = async (cancelImmediately: boolean = false, reason?: string, feedback?: string) => {
    if (!user) {
      toast.error('Please log in to cancel subscription');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('os-cancel-subscription', {
        body: { cancelImmediately, cancellationReason: reason, cancellationFeedback: feedback }
      });
      
      if (error) {
        logger.error('Error canceling subscription:', { error: error.message });
        toast.error('Failed to cancel subscription');
        return;
      }

      if (data?.success) {
        toast.success(data.message);
        // Invalidate cache and refresh subscription data
        invalidateSubscriptionCache(currentCompany?.id);
        await checkSubscription(true);
        return data;
      } else {
        toast.error(data?.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      logger.error('Error canceling subscription:', { error });
      toast.error('Failed to cancel subscription');
    }
  };

  const openCustomerPortal = async () => {    
    if (!user) {
      toast.error('Please log in to manage subscription');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('os-customer-portal');
      
      if (error) {
        logger.error('Error opening customer portal:', { error: error.message });
        toast.error('Failed to open customer portal');
        return;
      }

      if (data?.url) {
        // Open Stripe customer portal in a new tab
        const portalWindow = window.open(data.url, '_blank');

        // When user returns from portal, sync subscription state from Stripe
        const handleFocus = async () => {
          window.removeEventListener('focus', handleFocus);
          // Small delay to ensure Stripe has processed any changes
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            await supabase.functions.invoke('os-sync-stripe-subscription', {
              body: { companyId: currentCompany?.id }
            });
            invalidateSubscriptionCache(currentCompany?.id);
            await checkSubscription(true);
          } catch (syncErr) {
            logger.warn('Post-portal sync failed (non-blocking)', syncErr);
          }
        };
        window.addEventListener('focus', handleFocus);
      } else {
        logger.error('No URL returned from customer portal');
        toast.error('No portal URL received');
      }
    } catch (error) {
      logger.error('Error opening customer portal:', { error });
      toast.error('Failed to open customer portal');
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription, currentCompany?.id]); // Re-check when current company changes

  // Auto-refresh every 30 seconds while the user is sitting on the Billing
  // tab — there to catch out-of-band subscription changes (e.g. a Stripe
  // checkout completed in another tab) so the plan/trial labels stay live
  // without a manual reload. Scoped to the Billing tab so the poll doesn't
  // hammer Supabase on Integrations / Notifications / Workspace / etc.,
  // which don't display any subscription state.
  // Billing.tsx itself calls checkSubscription on mount, so the tab is
  // always fresh on entry — the interval just keeps it fresh while open.
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const isOnBillingTab =
        window.location.pathname === '/settings' &&
        new URLSearchParams(window.location.search).get('tab') === 'billing';
      if (isOnBillingTab) {
        checkSubscription(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, checkSubscription, currentCompany?.id]);

  return {
    subscription,
    loading,
    isPaidActive,
    isTrialActive,
    hasCompanyAccess, // Add the new consistent access check
    checkSubscription,
    createCheckoutSession,
    cancelSubscription,
    openCustomerPortal,
  };
};