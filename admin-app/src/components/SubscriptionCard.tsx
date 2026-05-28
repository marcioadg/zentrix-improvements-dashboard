import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSubscription } from '@/hooks/useSubscription';

import { ButtonLoadingState } from '@/components/ui/loading-state';
import { ArrowUpRight, CreditCard, Users, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { useUsageBilling } from '@/hooks/useUsageBilling';
export const SubscriptionCard = () => {
  const {
    subscription,
    loading,
    isPaidActive,
    isTrialActive,
    createCheckoutSession,
    openCustomerPortal
  } = useSubscription();
  const { usageSummary, updateUsageBilling, loading: usageLoading } = useUsageBilling();

  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubscribeClick = async () => {
    setIsRedirecting(true);
    
    try {
      await createCheckoutSession();
      // createCheckoutSession now handles navigation internally
      // Reset loading state in case navigation fails
      setTimeout(() => setIsRedirecting(false), 800);
    } catch (error) {
      // Reset loading state on error
      setIsRedirecting(false);
    }
  };

  // Reset loading state when component mounts (user returns from Stripe)
  useEffect(() => {
    setIsRedirecting(false);
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTrialEndDate = () => {
    return subscription.extended_trial_end || subscription.trial_end;
  };

  const calculateMonthlyCost = () => {
    // Standardize on $5/user/month pricing
    const basePrice = 5;
    const userCount = usageSummary?.total_users || subscription.user_count || 1;
    return userCount * basePrice;
  };

  const handleRefreshUsage = async () => {
    await updateUsageBilling();
  };

  const isCanceling = subscription.cancel_at_period_end;
  const isFree = subscription.subscription_tier === 'Free';
  const isUsageBased = subscription.billing_type === 'usage_based';
  const currentMonthlyCost = calculateMonthlyCost();

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">
                  {isFree ? 'Free' : (subscription.subscription_tier || 'Trial period')}
                </h3>
                {!isFree && (isTrialActive || (!isPaidActive && getTrialEndDate())) && (
                  <Badge 
                    variant={isTrialActive ? "secondary" : "destructive"} 
                    className="text-xs flex items-center gap-1"
                  >
                    <Calendar className="h-3 w-3" />
                    {isTrialActive ? 'Expires' : 'Expired'} {formatDate(getTrialEndDate())}
                  </Badge>
                )}
              </div>
              
              {isFree ? (
                <p className="text-sm text-muted-foreground">
                  Full access to Zentrix OS at no cost
                </p>
               ) : isPaidActive ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {isUsageBased 
                      ? `$${currentMonthlyCost.toFixed(2)} this month • ${usageSummary?.total_users || subscription.user_count || 0} users`
                      : `$${currentMonthlyCost}/month • ${subscription.user_count} users`
                    }
                  </p>
                  {isUsageBased && (
                    <p className="text-xs text-muted-foreground">
                      Postpaid billing • Next charge: {formatDate(subscription.next_billing_date || subscription.subscription_end)}
                    </p>
                  )}
                  {!isUsageBased && (
                    <p className="text-xs text-muted-foreground">
                      Next billing: {formatDate(subscription.next_billing_date || subscription.subscription_end)}
                    </p>
                  )}
                </div>
               ) : (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {isUsageBased 
                      ? `Postpaid billing at $5/user/month (prorated daily)`
                      : `Ready for ${subscription.user_count} users at $${currentMonthlyCost}/month`
                    }
                  </p>
                  {isUsageBased && (
                    <p className="text-xs text-muted-foreground">
                      You'll be charged at the end of each billing period
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isFree && (
              (isPaidActive || isCanceling) ? (
                <div className="flex items-center gap-2">
                  {isUsageBased && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshUsage}
                      disabled={usageLoading}
                      className="flex items-center gap-2"
                    >
                      {usageLoading ? (
                        <ButtonLoadingState message="Updating..." />
                      ) : (
                        <>
                          <TrendingUp className="h-3 w-3" />
                          Refresh Usage
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={openCustomerPortal}
                  >
                    <CreditCard className="h-3 w-3" />
                    Manage Billing
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>

                </div>
              ) : (
                <Button
                  onClick={handleSubscribeClick}
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={isRedirecting}
                >
                  {isRedirecting ? (
                    <ButtonLoadingState message="Redirecting to Stripe..." />
                  ) : (
                  <>
                    <CreditCard className="h-3 w-3" />
                    Start Subscription
                  </>
                  )}
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Postpaid Billing Information */}
      {isUsageBased && (isPaidActive || isCanceling) && (
        <Card className="border-0 shadow-sm mt-4">
          <CardContent className="p-6">
            <div className="bg-info/10 rounded-lg p-4 border border-info/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-info" />
                <h4 className="font-medium text-foreground">Postpaid Billing Active</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                You'll be charged at the end of each billing period based on actual usage.{' '}
                {usageSummary?.period_type === 'trial_subscribed'
                  ? `Your subscription is active and you're still in your trial period (expires ${formatDate(getTrialEndDate())}).`
                  : usageSummary?.period_type === 'trial'
                  ? `You're currently in your trial period (expires ${formatDate(getTrialEndDate())}).`
                  : 'Your trial ended, and now you\'re in your first billing period.'
                }
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-info font-medium">Current Usage:</span>
                  <span className="ml-2 text-foreground">${currentMonthlyCost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-info font-medium">Next Charge:</span>
                  <span className="ml-2 text-foreground">{formatDate(subscription.next_billing_date || subscription.subscription_end)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


    </>
  );
};
