import { useUsageBilling } from '@/hooks/useUsageBilling';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';

interface BillingPeriodDisplayProps {
  month?: string;
  className?: string;
  periodIndex?: number;
}

export const BillingPeriodDisplay = ({ month, className, periodIndex = 0 }: BillingPeriodDisplayProps) => {
  const { usageSummary, loading } = useUsageBilling();
  
  logger.log('🎯 BillingPeriodDisplay RENDER:', {
    componentId: 'BillingPeriodDisplay',
    usageSummary: usageSummary ? {
      period_start: usageSummary.period_start,
      period_end: usageSummary.period_end,
      period_type: usageSummary.period_type,
      billing_month: usageSummary.billing_month
    } : null,
    loading,
    month,
    periodIndex,
    timestamp: new Date().toISOString()
  });

  if (loading || !usageSummary?.period_start || !usageSummary?.period_end) {
    return <span className={className}>Loading billing period...</span>;
  }

  // Parse dates without timezone conversion issues
  const startDate = new Date(usageSummary.period_start + 'T12:00:00.000Z');
  const endDate = new Date(usageSummary.period_end + 'T12:00:00.000Z');

  // Use date-fns for formatting
  const formatPattern = startDate.getFullYear() !== endDate.getFullYear() ? 'MMM d, yyyy' : 'MMM d';
  
  const startFormatted = format(startDate, formatPattern);
  const endFormatted = format(endDate, formatPattern);

  // Get period type label
  const getPeriodTypeLabel = (periodType?: string) => {
    if (periodType === 'trial') return '(trial period)';
    if (periodType === 'trial_subscribed') return '(trial period - subscribed)';
    if (periodType === 'post_trial') return '(post-trial billing)';
    if (periodType === 'subscription') return '(subscription billing)';
    return '';
  };

  return (
    <span className={className}>
      {startFormatted} - {endFormatted}
      {usageSummary.period_type && (
        <span className="text-xs text-muted-foreground ml-1">
          {getPeriodTypeLabel(usageSummary.period_type)}
        </span>
      )}
    </span>
  );
};