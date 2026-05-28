
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface BasicRLSPolicy {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string;
  with_check: string;
}

export interface TableRLSInfo {
  table_name: string;
  rls_enabled: boolean;
  has_policies: boolean;
  policy_count: number;
}

export interface RLSStats {
  total_tables: number;
  rls_enabled_tables: number;
  total_policies: number;
  tables_with_data: number;
}

export const rlsService = {
  // Get basic RLS policies from system tables
  async getRLSPolicies(): Promise<BasicRLSPolicy[]> {
    try {
      const { data, error } = await supabase.rpc('get_rls_policies');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching RLS policies:', error);
      // Fallback: return empty array instead of crashing
      return [];
    }
  },

  // Get table RLS status from system tables
  async getTableRLSStatus(): Promise<TableRLSInfo[]> {
    try {
      const { data, error } = await supabase.rpc('get_table_rls_status');

      if (error) throw error;
      
      // Convert JSONB response to array and add has_policies field
      const tables = data || [];
      return tables.map((table: any) => ({
        ...table,
        has_policies: table.policy_count > 0
      }));
    } catch (error) {
      logger.error('Error fetching table RLS status:', error);
      // Fallback: return empty array
      return [];
    }
  },

  // Get basic RLS statistics
  async getRLSStatistics(): Promise<RLSStats> {
    try {
      const { data, error } = await supabase.rpc('get_rls_statistics');

      if (error) throw error;
      return data || {
        total_tables: 0,
        rls_enabled_tables: 0,
        total_policies: 0,
        tables_with_data: 0
      };
    } catch (error) {
      logger.error('Error fetching RLS statistics:', error);
      // Fallback: return zero stats
      return {
        total_tables: 0,
        rls_enabled_tables: 0,
        total_policies: 0,
        tables_with_data: 0
      };
    }
  },

  // Simple toggle RLS for a table
  async toggleTableRLS(tableName: string, enable: boolean): Promise<{ success: boolean; message: string }> {
    // Validate table name to prevent SQL injection: only allow alphanumeric and underscores
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return { success: false, message: 'Invalid table name' };
    }
    try {
      const action = enable ? 'ENABLE' : 'DISABLE';
      const { data, error } = await supabase.rpc('custom_sql', {
        query: `ALTER TABLE public.${tableName} ${action} ROW LEVEL SECURITY`
      });

      if (error) throw error;
      
      return {
        success: true,
        message: `RLS ${enable ? 'enabled' : 'disabled'} for table ${tableName}`
      };
    } catch (error: any) {
      logger.error('Error toggling RLS:', error);
      return {
        success: false,
        message: error.message || 'Failed to toggle RLS'
      };
    }
  }
};
