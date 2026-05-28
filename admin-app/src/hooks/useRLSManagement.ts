
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface RLSPolicy {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string;
  with_check: string;
  is_enabled: boolean;
}

export interface TableRLSStatus {
  table_name: string;
  rls_enabled: boolean;
  policy_count: number;
  has_data: boolean;
}

export interface RLSStatistics {
  total_tables: number;
  rls_enabled_tables: number;
  total_policies: number;
  unique_policy_types: number;
  tables_with_data: number;
}

interface ToggleRLSResponse {
  success: boolean;
  action?: string;
  error?: string;
}

export const useRLSManagement = () => {
  const [policies, setPolicies] = useState<RLSPolicy[]>([]);
  const [tableStatuses, setTableStatuses] = useState<TableRLSStatus[]>([]);
  const [statistics, setStatistics] = useState<RLSStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const fetchPolicies = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_rls_policies');
      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      logger.error('Error fetching RLS policies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch RLS policies",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchTableStatuses = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_table_rls_status');
      if (error) throw error;
      setTableStatuses(data || []);
    } catch (error) {
      logger.error('Error fetching table RLS status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch table RLS status",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchStatistics = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_rls_statistics');
      if (error) throw error;
      
      // Type assertion with proper unknown conversion
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

  const toggleTableRLS = useCallback(async (tableName: string, enable: boolean) => {
    try {
      const { data, error } = await supabase.rpc('toggle_table_rls', {
        p_table_name: tableName,
        p_enable: enable
      });

      if (error) throw error;

      // Type assertion with proper unknown conversion
      const response = data as unknown as ToggleRLSResponse;
      
      if (response?.success) {
        toast({
          title: "Success",
          description: `RLS ${enable ? 'enabled' : 'disabled'} for table ${tableName}`,
        });
        
        // Refresh data
        await Promise.all([fetchTableStatuses(), fetchStatistics()]);
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
  }, [toast, fetchTableStatuses, fetchStatistics]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPolicies(),
        fetchTableStatuses(),
        fetchStatistics()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchPolicies, fetchTableStatuses, fetchStatistics]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Set up real-time subscription for admin actions
  useEffect(() => {
    const channel = supabase
      .channel('rls_management_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_actions',
          filter: 'action_type=eq.rls_toggle'
        },
        (payload) => {
          logger.log('RLS change detected:', payload);
          // Refresh data when RLS changes are detected
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
    toggleTableRLS,
    refreshAll,
  };
};
