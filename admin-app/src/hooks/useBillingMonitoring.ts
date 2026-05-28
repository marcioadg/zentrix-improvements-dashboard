import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface BillingMetrics {
  companyId: string;
  subscriptionTier: string;
  isSubscribed: boolean;
  billingType: string;
  currentUsage: number;
  userCount: number;
  lastUsageUpdate: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  trialEnd: string | null;
  subscriptionEnd: string | null;
}

interface UsageEvent {
  id: string;
  eventType: string;
  eventDate: string;
  userId: string;
  previousStatus: string | null;
  notes: string | null;
  createdAt: string;
}

export const useBillingMonitoring = () => {
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const { currentCompany } = useMultiCompany();

  const fetchBillingMetrics = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      const { data, error } = await supabase
        .from('company_subscriptions')
        .select(`
          *,
          company_members!inner(count)
        `)
        .eq('company_id', currentCompany?.id)
        .single();

      if (error) {
        logger.error('Error fetching billing metrics:', error);
        return;
      }

      setMetrics({
        companyId: currentCompany?.id,
        subscriptionTier: data.subscription_tier || 'Free',
        isSubscribed: data.subscribed || false,
        billingType: data.billing_type || 'fixed',
        currentUsage: data.current_month_usage || 0,
        userCount: data.user_count || 0,
        lastUsageUpdate: data.last_usage_update,
        stripeSubscriptionId: data.stripe_subscription_id,
        stripeCustomerId: data.stripe_customer_id,
        trialEnd: data.trial_end,
        subscriptionEnd: data.subscription_end
      });
    } catch (error) {
      logger.error('Error fetching billing metrics:', error);
    }
  }, [currentCompany?.id]);

  const fetchRecentEvents = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_billing_events')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        logger.error('Error fetching billing events:', error);
        return;
      }

      setRecentEvents(data?.map(event => ({
        id: event.id,
        eventType: event.event_type,
        eventDate: event.event_date,
        userId: event.user_id,
        previousStatus: event.previous_status,
        notes: event.notes,
        createdAt: event.created_at
      })) || []);
    } catch (error) {
      logger.error('Error fetching billing events:', error);
    }
  }, [currentCompany?.id]);

  const triggerUsageReport = useCallback(async (eventType = 'manual') => {
    if (!currentCompany?.id) return { success: false, error: 'No company found' };

    try {
      // Use the new per-seat billing function
      const { data, error } = await supabase.functions.invoke('os-per-seat-billing', {
        body: { 
          company_id: currentCompany?.id,
          action: 'sync'
        }
      });

      if (error) throw error;

      logger.info('Per-seat billing sync completed', { data });
      
      // Refresh metrics after sync
      await fetchBillingMetrics();
      
      return { success: true, data };
    } catch (error) {
      logger.error('Error syncing per-seat billing:', error);
      return { success: false, error: error.message };
    }
  }, [currentCompany?.id, fetchBillingMetrics]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBillingMetrics(),
        fetchRecentEvents()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchBillingMetrics, fetchRecentEvents]);

  // Set up real-time subscription for billing events
  useEffect(() => {
    if (!currentCompany?.id) return;

    const channel = supabase
      .channel(`billing-events-${currentCompany?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_billing_events',
          filter: `company_id=eq.${currentCompany?.id}`
        },
        (payload) => {
          logger.info('New billing event received', { payload });
          fetchRecentEvents();
          fetchBillingMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'company_subscriptions',
          filter: `company_id=eq.${currentCompany?.id}`
        },
        (payload) => {
          logger.info('Subscription updated', { payload });
          fetchBillingMetrics();
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
        logger.info('Realtime subscription status', { status, companyId: currentCompany?.id });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, fetchBillingMetrics, fetchRecentEvents]);

  // Initial data fetch
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return {
    metrics,
    recentEvents,
    loading,
    isRealtimeConnected,
    refreshAll,
    triggerUsageReport,
    fetchBillingMetrics,
    fetchRecentEvents
  };
};