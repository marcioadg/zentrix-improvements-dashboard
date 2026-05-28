
import { useEffect } from 'react';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { UsageBillingCard } from '@/components/billing/UsageBillingCard';
import { BillingAlertsCard } from '@/components/billing/BillingAlertsCard';

import { useSubscription } from '@/hooks/useSubscription';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { toast } from 'sonner';

export const Billing = () => {
  const { checkSubscription, subscription } = useSubscription();
  const { isSuperAdmin } = useCurrentUserPermissionLevel();
  const isFree = subscription?.subscription_tier === 'Free';

  useEffect(() => {
    // Check if user is returning from successful Stripe checkout
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      toast.success('Payment successful! Updating subscription status...');
      // Immediately refresh subscription to sync with Stripe
      checkSubscription();

      // Clean up URL parameters
      const newUrl = window.location.pathname + window.location.search.replace(/[?&](success|canceled)=true/g, '').replace(/^&/, '?').replace(/[?&]$/, '');
      window.history.replaceState({}, '', newUrl);
    } else if (canceled === 'true') {
      toast.info('Payment was canceled. You can try again at any time.');

      // Clean up URL parameters
      const newUrl = window.location.pathname + window.location.search.replace(/[?&](success|canceled)=true/g, '').replace(/^&/, '?').replace(/[?&]$/, '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [checkSubscription]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-semibold text-foreground tracking-tight">Billing & Subscription</h2>
        <p className="text-muted-foreground mt-1">
          Manage your subscription, payment methods, and billing information
        </p>
      </div>

      <div className="space-y-6">
        <SubscriptionCard />
        {isSuperAdmin && !isFree && (
          <>
            <BillingAlertsCard />
            <UsageBillingCard />
          </>
        )}
      </div>
    </div>
  );
};

export default Billing;