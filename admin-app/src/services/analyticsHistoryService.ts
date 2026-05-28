import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface AnalyticsSnapshot {
  snapshot_date: string;
  total_companies: number;
  paid_companies: number;
  mrr: number;
  potential_mrr: number;
  total_usage_hours: number;
  total_users: number;
  total_teams: number;
  total_metrics: number;
  total_goals: number;
  onboarding_completion_percentage: number;
  created_at: string;
}

/**
 * Fetch analytics snapshots for the last N days
 */
export const fetchAnalyticsHistory = async (days: number = 7): Promise<AnalyticsSnapshot[]> => {
  logger.log(`📊 Fetching analytics history for last ${days} days`);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('platform_analytics_snapshots')
    .select('*')
    .gte('snapshot_date', startDate.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });

  if (error) {
    logger.error('❌ Error fetching analytics history:', error);
    throw error;
  }

  logger.log(`✅ Fetched ${data?.length || 0} analytics snapshots`);
  return data || [];
};

/**
 * Calculate growth percentage between two values
 */
export const calculateGrowthPercentage = (current: number, previous: number): number | null => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

/**
 * Get 7-day growth for all metrics based on historical snapshots
 */
export const calculate7DayGrowth = async (currentMetrics: any) => {
  try {
    const history = await fetchAnalyticsHistory(14); // Get 14 days to compare 7 days ago
    
    if (history.length < 2) {
      logger.log('⚠️ Insufficient historical data for growth calculation');
      return {
        totalCompanies: null,
        paidCompanies: null,
        mrr: null,
        potentialMrr: null,
        totalUsage7d: null,
        totalUsers: null,
        totalTeams: null,
        totalMetrics: null,
        totalGoals: null,
        onboardingCompletionPercentage: null,
      };
    }

    // Get snapshot from 7 days ago (or closest available)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const targetDate = sevenDaysAgo.toISOString().split('T')[0];
    
    // Find the snapshot closest to 7 days ago
    const previousSnapshot = history.reduce((prev, curr) => {
      const prevDiff = Math.abs(new Date(prev.snapshot_date).getTime() - sevenDaysAgo.getTime());
      const currDiff = Math.abs(new Date(curr.snapshot_date).getTime() - sevenDaysAgo.getTime());
      return currDiff < prevDiff ? curr : prev;
    });

    logger.log('📈 Calculating growth from', previousSnapshot.snapshot_date, 'to today');

    return {
      totalCompanies: calculateGrowthPercentage(
        currentMetrics.totalCompanies,
        previousSnapshot.total_companies
      ),
      paidCompanies: calculateGrowthPercentage(
        currentMetrics.paidCompanies,
        previousSnapshot.paid_companies
      ),
      mrr: calculateGrowthPercentage(
        currentMetrics.mrr,
        previousSnapshot.mrr
      ),
      potentialMrr: calculateGrowthPercentage(
        currentMetrics.potentialMrr,
        previousSnapshot.potential_mrr
      ),
      totalUsage7d: calculateGrowthPercentage(
        currentMetrics.totalUsage7d,
        previousSnapshot.total_usage_hours
      ),
      totalUsers: calculateGrowthPercentage(
        currentMetrics.totalUsers,
        previousSnapshot.total_users
      ),
      totalTeams: calculateGrowthPercentage(
        currentMetrics.totalTeams,
        previousSnapshot.total_teams
      ),
      totalMetrics: calculateGrowthPercentage(
        currentMetrics.totalMetrics,
        previousSnapshot.total_metrics
      ),
      totalGoals: calculateGrowthPercentage(
        currentMetrics.totalGoals,
        previousSnapshot.total_goals
      ),
      onboardingCompletionPercentage: calculateGrowthPercentage(
        currentMetrics.onboardingCompletionPercentage,
        previousSnapshot.onboarding_completion_percentage
      ),
    };
  } catch (error) {
    logger.error('❌ Error calculating 7-day growth:', error);
    return {
      totalCompanies: null,
      paidCompanies: null,
      mrr: null,
      potentialMrr: null,
      totalUsage7d: null,
      totalUsers: null,
      totalTeams: null,
      totalMetrics: null,
      totalGoals: null,
      onboardingCompletionPercentage: null,
    };
  }
};
