import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { toast } from '@/hooks/use-toast';
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

interface UsageSummary {
  total_users: number;
  total_amount: number;
  billing_month: string;
  last_updated: string | null;
  // Enhanced billing context
  full_period_amount?: number;
  days_elapsed?: number;
  total_days_in_period?: number;
  period_type?: string;
  period_start?: string;
  period_end?: string;
}

interface ErrorState {
  hasError: boolean;
  message: string;
}

// Enhanced hook for accurate billing period calculations with aggressive cache clearing
export const useUsageBilling = () => {
  const { currentCompany } = useMultiCompany();
  const [billingUsage, setBillingUsage] = useState<BillingUsage[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState>({ hasError: false, message: '' });
  const [cacheKey, setCacheKey] = useState<string>('');

  // Clear any stale cache immediately
  const clearAllCache = useCallback(() => {
    logger.log('🧹 CACHE CLEARING - Starting comprehensive cache clear');
    
    // Clear React state
    setUsageSummary(null);
    setBillingUsage([]);
    setError({ hasError: false, message: '' });
    
    // Clear any browser storage that might contain stale data
    try {
      localStorage.removeItem('usageBilling_cache');
      localStorage.removeItem('billingPeriod_cache');
      sessionStorage.removeItem('usageBilling_cache');
      sessionStorage.removeItem('billingPeriod_cache');
      logger.log('🧹 CACHE CLEARING - Browser storage cleared');
    } catch (e) {
      logger.log('🧹 CACHE CLEARING - Browser storage clear failed (expected in some environments)');
    }
    
    // Generate new cache key to force recalculation
    setCacheKey(Math.random().toString(36).substr(2, 9));
    logger.log('🧹 CACHE CLEARING - Complete, new cache key generated');
  }, []);

  logger.log('🚀 useUsageBilling HOOK CALLED:', {
    currentCompanyId: currentCompany?.id,
    currentCompanyName: currentCompany?.name,
    hookInstanceId: Math.random().toString(36).substr(2, 9),
    cacheKey,
    timestamp: new Date().toISOString()
  });

  // Simple billing period logic using direct database columns
  const getCurrentBillingPeriod = useCallback(async () => {
    if (!currentCompany?.id) return null;

    try {
      // Get company subscription details
      const { data: subscription, error } = await supabase
        .from('company_subscriptions')
        .select('trial_end, subscribed, subscription_tier, created_at, subscribed_at, subscription_end')
        .eq('company_id', currentCompany?.id)
        .single();

      if (error || !subscription) {
        logger.log('No subscription found, using default period');
        // Default to current calendar month if no subscription data
        const now = new Date();
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
          trialBased: false,
          periodType: 'calendar'
        };
      }

      logger.log('🔍 SIMPLE BILLING PERIOD - Raw Data:', {
        companyName: currentCompany?.name,
        companyId: currentCompany?.id,
        subscription: subscription
      });

      // Date-based logic: Check if we're still within trial period first
      const currentDate = new Date();
      const trialEndDate = new Date(subscription.trial_end + (subscription.trial_end.includes('T') ? '' : 'T00:00:00Z'));
      const isInTrialPeriod = currentDate <= trialEndDate;

      if (isInTrialPeriod) {
        // Still in trial period - check if subscribed or not
        const createdDate = new Date(subscription.created_at + (subscription.created_at.includes('T') ? '' : 'T00:00:00Z'));
        const startDate = createdDate.toISOString().split('T')[0];
        const endDate = trialEndDate.toISOString().split('T')[0];
        
        const periodType = subscription.subscribed ? 'trial_subscribed' : 'trial';
        
        logger.log('📅 Trial Period (still active):', { 
          startDate, 
          endDate, 
          subscribed: subscription.subscribed,
          periodType 
        });
        
        return {
          startDate,
          endDate,
          trialBased: true,
          periodType
        };
      } else if (subscription.subscribed && subscription.subscribed_at && subscription.subscription_end) {
        // Trial ended but has active subscription - use subscription period
        const subscribedDate = subscription.subscribed_at.split(' ')[0]; // Get just "2025-09-24" part
        const subscriptionEndDate = subscription.subscription_end.split(' ')[0]; // Get just "2025-10-23" part
        
        logger.log('📅 Post-Trial Subscription Period:', { 
          startDate: subscribedDate, 
          endDate: subscriptionEndDate,
          rawSubscribedAt: subscription.subscribed_at,
          rawSubscriptionEnd: subscription.subscription_end 
        });
        
        return {
          startDate: subscribedDate,
          endDate: subscriptionEndDate,
          trialBased: false,
          periodType: 'subscription'
        };
      } else {
        // Trial ended, no active subscription - post-trial period
        const trialEndDateString = trialEndDate.toISOString().split('T')[0];
        const nextMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
        
        logger.log('📅 Post-Trial Period (no subscription):', { 
          startDate: trialEndDateString, 
          endDate: nextMonthEnd 
        });
        
        return {
          startDate: trialEndDateString,
          endDate: nextMonthEnd,
          trialBased: false,
          periodType: 'post_trial'
        };
      }

      // Default fallback for other cases
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        trialBased: false,
        periodType: 'calendar'
      };

    } catch (error) {
      logger.error('Error calculating billing period:', error);
      // Fallback to calendar month
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        trialBased: false,
        periodType: 'calendar'
      };
    }
  }, [currentCompany?.id]);

  // Get current billing period usage with accurate prorated calculations
  const getCurrentMonthUsage = useCallback(async () => {
    logger.log('📋 getCurrentMonthUsage CALLED:', {
      currentCompanyId: currentCompany?.id,
      currentCompanyName: currentCompany?.name,
      timestamp: new Date().toISOString()
    });
    
    if (!currentCompany?.id) {
      logger.log('❌ getCurrentMonthUsage EARLY RETURN: No currentCompany?.id');
      return;
    }

    setLoading(true);
    setError({ hasError: false, message: '' });

    try {
      logger.log('📊 Fetching current billing period usage for company:', currentCompany?.id, currentCompany?.name);

      // Get current billing period
      const billingPeriod = await getCurrentBillingPeriod();
      if (!billingPeriod) {
        throw new Error('Could not determine billing period');
      }

      // Get current active members count with profile data
      const { data: activeMembers, error: membersError } = await supabase
        .from('company_members')
        .select(`
          user_id, 
          joined_at,
          profiles!inner(
            id,
            full_name,
            email
          )
        `)
        .eq('company_id', currentCompany?.id)
        .eq('status', 'active');

      if (membersError) {
        throw new Error(`Failed to fetch active members: ${membersError.message}`);
      }

      const totalUsers = activeMembers?.length || 0;
      const basePrice = 5.00; // $5 per user per month
      const fullPeriodAmount = totalUsers * basePrice;

      // For trial expired + no subscription, show simplified data
      if (billingPeriod.periodType === 'post_trial') {
        logger.log('🔢 Simplified billing (post-trial, no subscription):', {
          totalUsers,
          monthlyAmount: fullPeriodAmount,
          periodType: billingPeriod.periodType
        });

        const newUsageSummary = {
          total_users: totalUsers,
          total_amount: fullPeriodAmount, // Show full monthly amount for subscription preview
          billing_month: billingPeriod.startDate,
          last_updated: new Date().toISOString(),
          full_period_amount: fullPeriodAmount,
          days_elapsed: 0, // No days elapsed since not subscribed
          total_days_in_period: 30, // Standard month
          period_type: billingPeriod.periodType,
          period_start: billingPeriod.startDate,
          period_end: billingPeriod.endDate
        };

        setUsageSummary(newUsageSummary);

        // No detailed usage records for non-subscribed companies
        setBillingUsage([]);
        return;
      }

      // For active subscriptions or trials, calculate prorated amounts
      const now = new Date();
      const periodStart = new Date(billingPeriod.startDate);
      const periodEnd = new Date(billingPeriod.endDate);
      
      // Calculate total days in period
      const totalDaysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate days elapsed (including today)
      const daysElapsed = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
      const cappedDaysElapsed = Math.min(daysElapsed, totalDaysInPeriod);
      
      // Calculate prorated amount for days elapsed
      const proratedAmount = Math.round((cappedDaysElapsed / totalDaysInPeriod) * fullPeriodAmount * 100) / 100;

      logger.log('🔢 Billing calculations:', {
        totalUsers,
        fullPeriodAmount,
        totalDaysInPeriod,
        daysElapsed: cappedDaysElapsed,
        proratedAmount,
        periodType: billingPeriod.periodType
      });

      // SIMPLIFIED: Create usage summary
      const newUsageSummary = {
        total_users: totalUsers,
        total_amount: proratedAmount,
        billing_month: billingPeriod.startDate,
        last_updated: new Date().toISOString(),
        full_period_amount: fullPeriodAmount,
        days_elapsed: cappedDaysElapsed,
        total_days_in_period: totalDaysInPeriod,
        period_type: billingPeriod.periodType,
        period_start: billingPeriod.startDate,
        period_end: billingPeriod.endDate
      };

      logger.log('✅ Setting usage summary:', {
        companyName: currentCompany?.name,
        period: `${billingPeriod.startDate} to ${billingPeriod.endDate}`,
        totalUsers,
        proratedAmount
      });

      setUsageSummary(newUsageSummary);

      // Create usage records with profile data (only for subscribed companies)
      const usageRecords = activeMembers?.map((member: any) => ({
        id: `current-${member.user_id}`,
        user_id: member.user_id,
        billing_month: billingPeriod.startDate,
        days_active: cappedDaysElapsed,
        total_days_in_month: totalDaysInPeriod,
        prorated_amount: Math.round((cappedDaysElapsed / totalDaysInPeriod) * basePrice * 100) / 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Flatten profile data for easier access
        user_name: member.profiles?.full_name || member.profiles?.email || 'Unknown User',
        user_email: member.profiles?.email || 'No email'
      })) || [];

      setBillingUsage(usageRecords);

      logger.log('✅ Current billing period usage loaded:', {
        totalUsers,
        proratedAmount,
        fullPeriodAmount,
        period: `${billingPeriod.startDate} to ${billingPeriod.endDate}`,
        periodType: billingPeriod.periodType
      });

    } catch (error) {
      logger.error('❌ Error fetching current usage:', error);
      setError({ hasError: true, message: 'Failed to fetch current usage' });
      toast({
        title: "Error",
        description: "Failed to fetch current usage data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id, getCurrentBillingPeriod]);

  // Auto-load on mount and company change with controlled cache clearing
  useEffect(() => {
    logger.log('🔄 useUsageBilling useEffect TRIGGERED:', {
      currentCompanyId: currentCompany?.id,
      currentCompanyName: currentCompany?.name,
      willCallGetCurrentMonthUsage: !!currentCompany?.id,
      timestamp: new Date().toISOString()
    });
    
    if (currentCompany?.id) {
      // Clear cache only when company changes
      setUsageSummary(null);
      setBillingUsage([]);
      setError({ hasError: false, message: '' });
      
      logger.log('🧹 Cache cleared, calling getCurrentMonthUsage for:', currentCompany?.name);
      getCurrentMonthUsage();
    }
  }, [currentCompany?.id]); // Removed getCurrentMonthUsage to fix infinite loop

  // Update usage billing - trigger usage recalculation with simple cache clearing
  const updateUsageBilling = async () => {
    logger.log('🔄 updateUsageBilling CALLED - Force refresh');
    setUsageSummary(null);
    setBillingUsage([]);
    setError({ hasError: false, message: '' });
    return await getCurrentMonthUsage();
  };

  return {
    // Data
    billingUsage,
    usageSummary,
    loading,
    error,
    
    // Actions
    updateUsageBilling,
    clearAllCache,
    
    // Helper functions for backward compatibility
    calculateProrated: (daysActive: number, totalDays: number, basePrice: number = 5.00) => {
      if (totalDays === 0) return 0;
      return Math.round((daysActive / totalDays) * basePrice * 100) / 100;
    },
    getDaysInMonth: (dateString: string) => {
      const date = new Date(dateString);
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    },
    getCurrentBillingPeriod
  };
};
