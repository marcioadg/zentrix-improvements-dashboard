import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface BillingAlert {
  id: string;
  company_id: string;
  alert_type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metadata: Record<string, any>;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useBillingAlerts = () => {
  const [alerts, setAlerts] = useState<BillingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentCompany } = useMultiCompany();

  const fetchAlerts = async () => {
    if (!currentCompany?.id) return;

    try {
      const { data, error } = await supabase
        .from('billing_alerts')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .is('resolved_at', null) // Only unresolved alerts
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching billing alerts:', error);
        return;
      }

      setAlerts(data || []);
    } catch (error) {
      logger.error('Error fetching billing alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('billing_alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) {
        logger.error('Error resolving alert:', error);
        return;
      }

      // Refresh alerts
      fetchAlerts();
    } catch (error) {
      logger.error('Error resolving alert:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [currentCompany?.id]);

  return {
    alerts,
    loading,
    fetchAlerts,
    resolveAlert,
  };
};