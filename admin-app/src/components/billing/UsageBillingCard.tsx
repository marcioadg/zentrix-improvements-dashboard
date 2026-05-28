import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUsageBilling } from '@/hooks/useUsageBilling';
import { ButtonLoadingState } from '@/components/ui/loading-state';
import { DollarSign, Users, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useSubscription } from '@/hooks/useSubscription';
import { logger } from '@/utils/logger';

interface BillingUsage {
  id: string;
  user_id: string;
  billing_month: string;
  days_active: number;
  total_days_in_month: number;
  prorated_amount: number;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export const UsageBillingCard = () => {
  const { subscription, isTrialActive } = useSubscription();
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    billingUsage, 
    usageSummary, 
    loading, 
    error,
    updateUsageBilling,
    calculateProrated,
    getDaysInMonth,
    clearAllCache,
  } = useUsageBilling();


  // Determine if company has expired trial with no subscription
  const isPostTrialNoSubscription = usageSummary?.period_type === 'post_trial';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatUsageDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM yyyy');
  };

  const formatBillingPeriod = (billingMonth: string) => {
    const date = new Date(billingMonth);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = format(new Date(year, month, 1), 'MMMM d');
    const lastDay = format(new Date(year, month + 1, 0), 'd, yyyy');
    return `${firstDay} – ${lastDay}`;
  };

  const calculateDailyRate = (basePrice: number = 5.00) => {
    const daysInMonth = usageSummary ? new Date(
      new Date(usageSummary.billing_month).getFullYear(),
      new Date(usageSummary.billing_month).getMonth() + 1,
      0
    ).getDate() : 30;
    return Math.round((basePrice / daysInMonth) * 1000) / 1000;
  };

  const handleRefreshUsage = async () => {
    logger.log('🔄 UsageBillingCard handleRefreshUsage - Refreshing usage data');
    await updateUsageBilling();
  };

  if (loading && !usageSummary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <ButtonLoadingState message="Loading usage data..." />
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      {/* Simplified Usage Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Current Month Usage
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshUsage}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <ButtonLoadingState message="Updating..." />
              ) : (
                <>
                  <TrendingUp className="h-3 w-3" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error.hasError ? (
            <div className="text-center py-8">
              <div className="flex flex-col items-center gap-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div className="space-y-2">
                  <h3 className="font-semibold">Error Loading Usage Data</h3>
                  <p className="text-sm text-muted-foreground">{error.message}</p>
                </div>
                <Button onClick={handleRefreshUsage} disabled={loading} variant="outline">
                  {loading ? (
                    <ButtonLoadingState message="Retrying..." />
                  ) : (
                    'Try Again'
                  )}
                </Button>
              </div>
            </div>
          ) : usageSummary ? (
            <div className="space-y-6">
              {/* Simplified Usage Display - Focus on Current State */}
               <div className={`rounded-lg p-4 border ${
                 isTrialActive 
                   ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 dark:from-emerald-900/20 dark:to-green-900/20 dark:border-emerald-800'
                   : isPostTrialNoSubscription
                   ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 dark:from-orange-900/20 dark:to-amber-900/20 dark:border-orange-800'
                   : 'bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20'
               }`}>
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">
                      {isTrialActive ? '🎉 Free Trial Active' : 
                       isPostTrialNoSubscription ? '⏰ Start Subscription' :
                       'Current Usage'}
                    </h3>
                  
                   {isTrialActive && subscription.trial_end && (
                     <Badge variant="secondary" className="text-xs">
                       Trial ends: {format(new Date(subscription.trial_end), 'MMM d, yyyy')}
                     </Badge>
                   )}
                   
                   {isPostTrialNoSubscription && (
                     <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:text-orange-300">
                       Subscribe Now
                     </Badge>
                   )}
                 </div>
                
                 <div className="grid grid-cols-2 gap-6">
                   <div className="text-center">
                     <div className="text-3xl font-bold text-primary mb-1">
                       {usageSummary.total_users}
                     </div>
                     <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                       <Users className="h-4 w-4" />
                       Active Users
                     </div>
                   </div>
                   
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-1">
                        $5.00
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Per User / Month
                      </div>
                    </div>
                 </div>

                 {/* Simple Pricing Info */}
                 <div className="mt-4 pt-4 border-t">
                   <div className="text-center">
                     <div className="text-sm text-muted-foreground mb-1">
                       {isTrialActive ? 'Current charges during trial:' :
                        isPostTrialNoSubscription ? 'Monthly cost when you subscribe:' :
                        'Estimated monthly total'}
                     </div>
                     <div className="text-lg font-semibold">
                       {isTrialActive
                         ? '$0.00'
                         : `${formatCurrency((usageSummary?.total_users || 0) * 5)} / month`}
                     </div>
                     {isTrialActive && (
                       <div className="text-xs text-muted-foreground mt-1">
                         After trial: {formatCurrency((usageSummary?.total_users || 0) * 5)} / month
                       </div>
                     )}
                   </div>
                 </div>
               </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">No Usage Data Available</h3>
                  <p className="text-sm text-muted-foreground">
                    Click refresh to load current usage data.
                  </p>
                </div>
                <Button onClick={handleRefreshUsage} disabled={loading}>
                  {loading ? (
                    <ButtonLoadingState message="Loading..." />
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Load Current Usage
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simplified User List - Only show for subscribed users */}
      {billingUsage.length > 0 && !isPostTrialNoSubscription && (
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors duration-200"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Active Users This Period
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {billingUsage.length} active users • Click to view details
                </p>
              </div>
              <div className="flex items-center justify-center h-8 w-8">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
          {isExpanded && (
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-full">
                {/* Simplified Header */}
                <div className="flex items-center justify-between pb-3 border-b text-sm font-medium text-muted-foreground">
                  <div>User</div>
                  <div>Monthly Rate</div>
                </div>
                
                {/* User List */}
                <div className="space-y-3 mt-4">
                  {billingUsage.map((usage) => (
                     <div key={usage.id} className="flex items-center justify-between py-3 px-4 bg-muted/20 rounded-lg border">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                           <span className="text-sm font-medium text-primary">
                             {usage.user_name?.charAt(0)?.toUpperCase() || '?'}
                           </span>
                         </div>
                         <div>
                           <p className="font-medium">
                             {usage.user_name || 'Unknown User'}
                           </p>
                           <p className="text-sm text-muted-foreground">
                             {usage.user_email || 'No email'}
                           </p>
                         </div>
                       </div>
                       
                       <div className="text-right">
                         <div className="font-medium">
                           $5.00/month
                         </div>
                         <div className="text-xs text-muted-foreground">
                           Stripe handles prorations
                         </div>
                       </div>
                     </div>
                   ))}
                </div>
                
                {/* Summary Footer */}
                <div className="flex justify-between items-center pt-4 mt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {billingUsage.length} user{billingUsage.length !== 1 ? 's' : ''} × $5.00/month
                  </div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(billingUsage.length * 5)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-center mt-2">
                  Stripe automatically handles prorations and exact billing
                </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};