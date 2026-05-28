
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface EnhancedRLSPolicy {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string;
  with_check: string;
  is_enabled: boolean;
  description: string;
  policy_type: string;
}

export interface EnhancedTableRLSStatus {
  table_name: string;
  rls_enabled: boolean;
  policy_count: number;
  has_data: boolean;
  description: string;
  risk_level: string;
  company_isolated: boolean;
}

export interface RLSStatistics {
  total_tables: number;
  rls_enabled_tables: number;
  total_policies: number;
  unique_policy_types: number;
  tables_with_data: number;
}

interface BulkOperationResponse {
  success: boolean;
  success_count?: number;
  error_count?: number;
  errors?: any[];
  error?: string;
}

export const useEnhancedRLSManagement = () => {
  const [policies, setPolicies] = useState<EnhancedRLSPolicy[]>([]);
  const [tableStatuses, setTableStatuses] = useState<EnhancedTableRLSStatus[]>([]);
  const [statistics, setStatistics] = useState<RLSStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false);
  const { toast } = useToast();

  const fetchEnhancedPolicies = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_enhanced_policies');
      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      logger.error('Error fetching enhanced RLS policies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch enhanced RLS policies",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchEnhancedTableStatuses = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_enhanced_table_info');
      if (error) throw error;
      setTableStatuses(data || []);
    } catch (error) {
      logger.error('Error fetching enhanced table RLS status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch enhanced table RLS status",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchStatistics = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_rls_statistics');
      if (error) throw error;
      
      const stats = data as unknown as RLSStatistics;
      setStatistics(stats);
    } catch (error) {
      logger.error('Error fetching RLS statistics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch RLS statistics",
        variant: "destructive",
      });
    }
  }, [toast]);

  const toggleIndividualPolicy = useCallback(async (policyName: string, tableName: string, enable: boolean) => {
    try {
      const { data, error } = await supabase.rpc('toggle_individual_policy', {
        p_policy_name: policyName,
        p_table_name: tableName,
        p_enable: enable
      });

      if (error) throw error;

      const response = data as unknown as { success: boolean; error?: string; action?: string };
      
      if (response?.success) {
        toast({
          title: "Success",
          description: `Policy ${policyName} ${enable ? 'enabled' : 'disabled'} for table ${tableName}`,
        });
        
        await Promise.all([fetchEnhancedPolicies(), fetchEnhancedTableStatuses(), fetchStatistics()]);
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (error: any) {
      logger.error('Error toggling individual policy:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to toggle policy",
        variant: "destructive",
      });
    }
  }, [toast, fetchEnhancedPolicies, fetchEnhancedTableStatuses, fetchStatistics]);

  const toggleTableRLS = useCallback(async (tableName: string, enable: boolean) => {
    try {
      const { data, error } = await supabase.rpc('toggle_table_rls', {
        p_table_name: tableName,
        p_enable: enable
      });

      if (error) throw error;

      const response = data as unknown as { success: boolean; error?: string };
      
      if (response?.success) {
        toast({
          title: "Success",
          description: `RLS ${enable ? 'enabled' : 'disabled'} for table ${tableName}`,
        });
        
        await Promise.all([fetchEnhancedTableStatuses(), fetchStatistics()]);
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (error: any) {
      logger.error('Error toggling table RLS:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to toggle RLS",
        variant: "destructive",
      });
    }
  }, [toast, fetchEnhancedTableStatuses, fetchStatistics]);

  const bulkToggleTableRLS = useCallback(async (tableNames: string[], enable: boolean) => {
    setBulkOperationInProgress(true);
    try {
      const { data, error } = await supabase.rpc('bulk_toggle_table_rls', {
        p_table_names: tableNames,
        p_enable: enable
      });

      if (error) throw error;

      const response = data as unknown as BulkOperationResponse;
      
      if (response?.success) {
        toast({
          title: "Bulk Operation Complete",
          description: `RLS ${enable ? 'enabled' : 'disabled'} for ${response.success_count} tables. ${response.error_count} errors.`,
        });
        
        if (response.error_count && response.error_count > 0) {
          logger.warn('Bulk operation errors:', response.errors);
        }
        
        await Promise.all([fetchEnhancedTableStatuses(), fetchStatistics()]);
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (error: any) {
      logger.error('Error in bulk toggle operation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to perform bulk operation",
        variant: "destructive",
      });
    } finally {
      setBulkOperationInProgress(false);
    }
  }, [toast, fetchEnhancedTableStatuses, fetchStatistics]);

  const enableCompanyIsolationMode = useCallback(async () => {
    setBulkOperationInProgress(true);
    try {
      const { data, error } = await supabase.rpc('enable_company_isolation_mode');

      if (error) throw error;

      const response = data as unknown as { success: boolean; message?: string; tables_updated?: number; errors?: number };
      
      if (response?.success) {
        toast({
          title: "Company Isolation Enabled",
          description: `${response.message}. Updated ${response.tables_updated} tables.`,
        });
        
        await Promise.all([fetchEnhancedTableStatuses(), fetchStatistics(), fetchEnhancedPolicies()]);
      } else {
        throw new Error('Failed to enable company isolation mode');
      }
    } catch (error: any) {
      logger.error('Error enabling company isolation mode:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to enable company isolation mode",
        variant: "destructive",
      });
    } finally {
      setBulkOperationInProgress(false);
    }
  }, [toast, fetchEnhancedTableStatuses, fetchStatistics, fetchEnhancedPolicies]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEnhancedPolicies(),
        fetchEnhancedTableStatuses(),
        fetchStatistics()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchEnhancedPolicies, fetchEnhancedTableStatuses, fetchStatistics]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Set up real-time subscription for admin actions
  useEffect(() => {
    const channel = supabase
      .channel('enhanced_rls_management_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_actions',
          filter: 'action_type=in.(rls_toggle,policy_toggle,bulk_rls_toggle,company_isolation_enable)'
        },
        (payload) => {
          logger.log('Enhanced RLS change detected:', payload);
          refreshAll();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAll]);

  return {
    policies,
    tableStatuses,
    statistics,
    loading,
    isConnected,
    bulkOperationInProgress,
    toggleIndividualPolicy,
    toggleTableRLS,
    bulkToggleTableRLS,
    enableCompanyIsolationMode,
    refreshAll,
  };
};
