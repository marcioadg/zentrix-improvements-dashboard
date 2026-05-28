
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { rlsService, type BasicRLSPolicy, type TableRLSInfo, type RLSStats } from '@/services/rlsService';
import { logger } from '@/utils/logger';

export const useSimplifiedRLSManagement = () => {
  const [policies, setPolicies] = useState<BasicRLSPolicy[]>([]);
  const [tableStatuses, setTableStatuses] = useState<TableRLSInfo[]>([]);
  const [statistics, setStatistics] = useState<RLSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      logger.log('🔄 Fetching RLS data using simplified service...');
      
      const [policiesData, tablesData, statsData] = await Promise.allSettled([
        rlsService.getRLSPolicies(),
        rlsService.getTableRLSStatus(),
        rlsService.getRLSStatistics()
      ]);

      // Handle policies
      if (policiesData.status === 'fulfilled') {
        setPolicies(policiesData.value);
      } else {
        logger.warn('Failed to fetch policies:', policiesData.reason);
        setPolicies([]);
      }

      // Handle table statuses
      if (tablesData.status === 'fulfilled') {
        setTableStatuses(tablesData.value);
      } else {
        logger.warn('Failed to fetch table statuses:', tablesData.reason);
        setTableStatuses([]);
      }

      // Handle statistics
      if (statsData.status === 'fulfilled') {
        setStatistics(statsData.value);
      } else {
        logger.warn('Failed to fetch statistics:', statsData.reason);
        setStatistics({
          total_tables: 0,
          rls_enabled_tables: 0,
          total_policies: 0,
          tables_with_data: 0
        });
      }

      logger.log('✅ RLS data fetched successfully');
      
    } catch (error: any) {
      logger.error('❌ Error fetching RLS data:', error);
      setError(error.message || 'Failed to fetch RLS data');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleTableRLS = useCallback(async (tableName: string, enable: boolean) => {
    try {
      const result = await rlsService.toggleTableRLS(tableName, enable);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        
        // Refresh data after successful toggle
        await fetchAllData();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      logger.error('Error toggling table RLS:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to toggle RLS",
        variant: "destructive",
      });
    }
  }, [toast, fetchAllData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    policies,
    tableStatuses,
    statistics,
    loading,
    error,
    isConnected: !error, // Simple connection status
    toggleTableRLS,
    refreshAll: fetchAllData,
  };
};
