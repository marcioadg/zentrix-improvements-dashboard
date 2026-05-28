
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { requestDeduplicator } from '@/utils/requestDeduplicator';
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

interface RLSError {
  type: 'network' | 'permission' | 'database' | 'unknown';
  message: string;
  operation: string;
  retryable: boolean;
}

interface LoadingStates {
  policies: boolean;
  tables: boolean;
  statistics: boolean;
  bulkOperation: boolean;
  individualOperation: string | null;
}

export const useOptimizedRLSManagement = () => {
  const [policies, setPolicies] = useState<EnhancedRLSPolicy[]>([]);
  const [tableStatuses, setTableStatuses] = useState<EnhancedTableRLSStatus[]>([]);
  const [statistics, setStatistics] = useState<RLSStatistics | null>(null);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    policies: true,
    tables: true,
    statistics: true,
    bulkOperation: false,
    individualOperation: null,
  });
  const [error, setError] = useState<RLSError | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const lastUpdateRef = useRef<Record<string, number>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Memoized loading state
  const loading = useMemo(() => {
    return loadingStates.policies || loadingStates.tables || loadingStates.statistics;
  }, [loadingStates]);

  const bulkOperationInProgress = loadingStates.bulkOperation;

  const createError = (type: RLSError['type'], message: string, operation: string, retryable = true): RLSError => ({
    type,
    message,
    operation,
    retryable
  });

  const handleError = (error: any, operation: string): RLSError => {
    logger.error(`RLS ${operation} error:`, error);
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      return createError('network', 'Network connection failed. Please check your internet connection.', operation);
    }
    
    if (error.message?.includes('permission') || error.message?.includes('access denied')) {
      return createError('permission', 'Insufficient permissions to access RLS data.', operation, false);
    }
    
    if (error.message?.includes('function') || error.message?.includes('does not exist')) {
      return createError('database', 'Required database functions are not available.', operation, false);
    }
    
    return createError('unknown', error.message || 'An unexpected error occurred.', operation);
  };

  const setLoadingState = useCallback((key: keyof LoadingStates, value: boolean | string | null) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  const shouldFetch = useCallback((dataType: string, forceRefresh = false) => {
    if (forceRefresh) return true;
    const lastUpdate = lastUpdateRef.current[dataType];
    const now = Date.now();
    const staleTime = 30000; // 30 seconds
    return !lastUpdate || (now - lastUpdate) > staleTime;
  }, []);

  const markDataFresh = useCallback((dataType: string) => {
    lastUpdateRef.current[dataType] = Date.now();
  }, []);

  const fetchEnhancedPolicies = useCallback(async (forceRefresh = false) => {
    if (!shouldFetch('policies', forceRefresh)) {
      logger.log('📋 Skipping policies fetch - data is fresh');
      return;
    }

    try {
      setLoadingState('policies', true);
      const result = await requestDeduplicator.deduplicate('enhanced-policies', async () => {
        const { data, error } = await supabase.rpc('get_enhanced_policies');
        if (error) throw error;
        return data || [];
      });
      
      setPolicies(result);
      setError(null);
      retryCountRef.current = 0;
      markDataFresh('policies');
      logger.log('✅ Policies fetched successfully');
    } catch (error: any) {
      const rlsError = handleError(error, 'fetch policies');
      setError(rlsError);
      
      if (rlsError.retryable && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        logger.log(`Retrying fetch policies (attempt ${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => fetchEnhancedPolicies(forceRefresh), Math.pow(2, retryCountRef.current) * 1000);
      }
    } finally {
      setLoadingState('policies', false);
    }
  }, [shouldFetch, markDataFresh, setLoadingState]);

  const fetchEnhancedTableStatuses = useCallback(async (forceRefresh = false) => {
    if (!shouldFetch('tables', forceRefresh)) {
      logger.log('📋 Skipping tables fetch - data is fresh');
      return;
    }

    try {
      setLoadingState('tables', true);
      const result = await requestDeduplicator.deduplicate('enhanced-tables', async () => {
        const { data, error } = await supabase.rpc('get_enhanced_table_info');
        if (error) throw error;
        return data || [];
      });
      
      setTableStatuses(result);
      setError(null);
      retryCountRef.current = 0;
      markDataFresh('tables');
      logger.log('✅ Table statuses fetched successfully');
    } catch (error: any) {
      const rlsError = handleError(error, 'fetch table statuses');
      setError(rlsError);
      
      if (rlsError.retryable && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        logger.log(`Retrying fetch table statuses (attempt ${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => fetchEnhancedTableStatuses(forceRefresh), Math.pow(2, retryCountRef.current) * 1000);
      }
    } finally {
      setLoadingState('tables', false);
    }
  }, [shouldFetch, markDataFresh, setLoadingState]);

  const fetchStatistics = useCallback(async (forceRefresh = false) => {
    if (!shouldFetch('statistics', forceRefresh)) {
      logger.log('📋 Skipping statistics fetch - data is fresh');
      return;
    }

    try {
      setLoadingState('statistics', true);
      const result = await requestDeduplicator.deduplicate('rls-statistics', async () => {
        const { data, error } = await supabase.rpc('get_rls_statistics');
        if (error) throw error;
        return data as unknown as RLSStatistics;
      });
      
      setStatistics(result);
      setError(null);
      retryCountRef.current = 0;
      markDataFresh('statistics');
      logger.log('✅ Statistics fetched successfully');
    } catch (error: any) {
      const rlsError = handleError(error, 'fetch statistics');
      setError(rlsError);
      
      if (rlsError.retryable && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        logger.log(`Retrying fetch statistics (attempt ${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => fetchStatistics(forceRefresh), Math.pow(2, retryCountRef.current) * 1000);
      }
    } finally {
      setLoadingState('statistics', false);
    }
  }, [shouldFetch, markDataFresh, setLoadingState]);

  const toggleIndividualPolicy = useCallback(async (policyName: string, tableName: string, enable: boolean) => {
    const operationKey = `${policyName}-${tableName}`;
    
    try {
      setLoadingState('individualOperation', operationKey);
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
        
        // Only refresh policies and statistics, not tables
        await Promise.all([
          fetchEnhancedPolicies(true),
          fetchStatistics(true)
        ]);
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
    } finally {
      setLoadingState('individualOperation', null);
    }
  }, [fetchEnhancedPolicies, fetchStatistics, setLoadingState, toast]);

  const toggleTableRLS = useCallback(async (tableName: string, enable: boolean) => {
    const operationKey = `table-${tableName}`;
    
    try {
      setLoadingState('individualOperation', operationKey);
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
        
        // Only refresh tables and statistics
        await Promise.all([
          fetchEnhancedTableStatuses(true),
          fetchStatistics(true)
        ]);
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
    } finally {
      setLoadingState('individualOperation', null);
    }
  }, [fetchEnhancedTableStatuses, fetchStatistics, setLoadingState, toast]);

  const bulkToggleTableRLS = useCallback(async (tableNames: string[], enable: boolean) => {
    try {
      setLoadingState('bulkOperation', true);
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
        
        // Refresh all data after bulk operation
        await Promise.all([
          fetchEnhancedTableStatuses(true),
          fetchStatistics(true)
        ]);
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
      setLoadingState('bulkOperation', false);
    }
  }, [fetchEnhancedTableStatuses, fetchStatistics, setLoadingState, toast]);

  const enableCompanyIsolationMode = useCallback(async () => {
    try {
      setLoadingState('bulkOperation', true);
      const { data, error } = await supabase.rpc('enable_company_isolation_mode');

      if (error) throw error;

      const response = data as unknown as { success: boolean; message?: string; tables_updated?: number; errors?: number };
      
      if (response?.success) {
        toast({
          title: "Company Isolation Enabled",
          description: `${response.message}. Updated ${response.tables_updated} tables.`,
        });
        
        // Refresh all data after company isolation
        await Promise.all([
          fetchEnhancedTableStatuses(true),
          fetchStatistics(true),
          fetchEnhancedPolicies(true)
        ]);
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
      setLoadingState('bulkOperation', false);
    }
  }, [fetchEnhancedTableStatuses, fetchStatistics, fetchEnhancedPolicies, setLoadingState, toast]);

  // Debounced refresh for real-time updates
  const debouncedRefresh = useCallback((dataTypes: string[] = ['all']) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      logger.log('🔄 Debounced refresh triggered for:', dataTypes);
      
      if (dataTypes.includes('all')) {
        Promise.all([
          fetchEnhancedPolicies(true),
          fetchEnhancedTableStatuses(true),
          fetchStatistics(true)
        ]);
      } else {
        const promises = [];
        if (dataTypes.includes('policies')) promises.push(fetchEnhancedPolicies(true));
        if (dataTypes.includes('tables')) promises.push(fetchEnhancedTableStatuses(true));
        if (dataTypes.includes('statistics')) promises.push(fetchStatistics(true));
        Promise.all(promises);
      }
    }, 1000); // 1 second debounce
  }, [fetchEnhancedPolicies, fetchEnhancedTableStatuses, fetchStatistics]);

  const refreshAll = useCallback(async () => {
    if (error && !error.retryable) {
      logger.log('Skipping refresh due to non-retryable error:', error);
      return;
    }
    
    logger.log('🔄 Manual refresh triggered');
    await Promise.all([
      fetchEnhancedPolicies(true),
      fetchEnhancedTableStatuses(true),
      fetchStatistics(true)
    ]);
  }, [fetchEnhancedPolicies, fetchEnhancedTableStatuses, fetchStatistics, error]);

  const clearError = useCallback(() => {
    setError(null);
    retryCountRef.current = 0;
  }, []);

  // Initial data fetch
  useEffect(() => {
    Promise.all([
      fetchEnhancedPolicies(),
      fetchEnhancedTableStatuses(),
      fetchStatistics()
    ]);
  }, [fetchEnhancedPolicies, fetchEnhancedTableStatuses, fetchStatistics]);

  // Set up real-time subscription with debouncing
  useEffect(() => {
    const channel = supabase
      .channel('optimized_rls_management_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_actions',
          filter: 'action_type=in.(rls_toggle,policy_toggle,bulk_rls_toggle,company_isolation_enable)'
        },
        (payload) => {
          logger.log('🔔 RLS change detected:', payload.eventType, payload.new);
          
          // Only refresh if no critical errors and determine what to refresh based on action type
          if (!error || error.retryable) {
            // Safe access to action_type with proper null checking
            const actionType = payload.new && typeof payload.new === 'object' && 'action_type' in payload.new 
              ? (payload.new as any).action_type 
              : null;
            
            let dataTypes = ['all'];
            
            if (actionType === 'policy_toggle') {
              dataTypes = ['policies', 'statistics'];
            } else if (actionType === 'rls_toggle') {
              dataTypes = ['tables', 'statistics'];
            }
            
            debouncedRefresh(dataTypes);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          logger.log('✅ Optimized RLS real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          logger.warn('⚠️ Optimized RLS real-time subscription error');
        }
      });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [debouncedRefresh, error]);

  return {
    policies,
    tableStatuses,
    statistics,
    loading,
    loadingStates,
    error,
    isConnected,
    bulkOperationInProgress,
    toggleIndividualPolicy,
    toggleTableRLS,
    bulkToggleTableRLS,
    enableCompanyIsolationMode,
    refreshAll,
    clearError,
  };
};
