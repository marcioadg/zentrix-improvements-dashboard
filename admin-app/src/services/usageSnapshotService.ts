import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

export interface UsageSnapshot {
  id: string;
  snapshot_date: string;
  snapshot_name: string | null;
  total_hours: number;
  total_users: number;
  active_companies: number;
  company_breakdown: CompanyBreakdownItem[];
  filters_applied: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
}

export interface CompanyBreakdownItem {
  id: string;
  name: string;
  usage_hours: number;
  user_count: number;
  avg_per_user: number;
  top_user: {
    name: string;
    hours: number;
  } | null;
}

export interface CreateSnapshotParams {
  snapshot_name?: string;
  total_hours: number;
  total_users: number;
  active_companies: number;
  company_breakdown: CompanyBreakdownItem[];
  filters_applied?: Record<string, any>;
}

/**
 * Save a new usage breakdown snapshot
 */
export const saveUsageSnapshot = async (params: CreateSnapshotParams): Promise<UsageSnapshot> => {
  logger.log('📸 Saving usage snapshot...');

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('usage_breakdown_snapshots')
    .insert({
      snapshot_name: params.snapshot_name || null,
      total_hours: params.total_hours,
      total_users: params.total_users,
      active_companies: params.active_companies,
      company_breakdown: params.company_breakdown,
      filters_applied: params.filters_applied || null,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    logger.error('❌ Error saving snapshot:', error);
    throw error;
  }

  logger.log('✅ Snapshot saved:', data.id);
  return data as UsageSnapshot;
};

/**
 * Fetch all usage snapshots (newest first)
 */
export const fetchUsageSnapshots = async (): Promise<UsageSnapshot[]> => {
  logger.log('📊 Fetching usage snapshots...');

  const { data, error } = await supabase
    .from('usage_breakdown_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false });

  if (error) {
    logger.error('❌ Error fetching snapshots:', error);
    throw error;
  }

  logger.log(`✅ Fetched ${data?.length || 0} snapshots`);
  return (data || []) as UsageSnapshot[];
};

/**
 * Delete a snapshot by ID
 */
export const deleteUsageSnapshot = async (snapshotId: string): Promise<void> => {
  logger.log('🗑️ Deleting snapshot:', snapshotId);

  const { error } = await supabase
    .from('usage_breakdown_snapshots')
    .delete()
    .eq('id', snapshotId);

  if (error) {
    logger.error('❌ Error deleting snapshot:', error);
    throw error;
  }

  logger.log('✅ Snapshot deleted');
};

/**
 * Format snapshot date for display
 */
export const formatSnapshotDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
