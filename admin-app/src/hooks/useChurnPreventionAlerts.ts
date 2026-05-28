import { useCallback, useEffect, useState } from 'react';
import { useCurrentCompanyId } from './useCurrentCompanyId';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export interface ChurnAlert {
  id: string;
  type: 'ownerless_goal' | 'overdue_task' | 'stale_metric';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  itemId: string;
  itemName: string;
  createdAt: Date;
  actionUrl?: string;
}

export interface WeeklyScorecardMetrics {
  healthScore: number;
  trend: 'up' | 'down' | 'stable';
  goalsWithoutOwner: number;
  overdueTasks: number;
  unupdatedMetrics: number;
  meetingRemindersScheduled: number;
}

/**
 * Hook for managing churn prevention alerts
 * Tracks:
 * - Goals without owners
 * - Overdue tasks
 * - Metrics not updated in 7+ days
 * - Automatic meeting reminders
 */
export const useChurnPreventionAlerts = () => {
  const companyId = useCurrentCompanyId();
  const [alerts, setAlerts] = useState<ChurnAlert[]>([]);
  const [scorecard, setScorecard] = useState<WeeklyScorecardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch ownerless goals
  const fetchOwnerlessGoals = useCallback(async () => {
    if (!companyId) return [];
    
    try {
      const { data, error: err } = await supabase
        .from('goals')
        .select('id, title, created_at')
        .eq('company_id', companyId)
        .is('owner_id', null)
        .eq('status', 'active');

      if (err) throw err;
      
      return (data || []).map(goal => ({
        id: `goal-${goal.id}`,
        type: 'ownerless_goal' as const,
        severity: 'critical' as const,
        title: 'Goal Without Owner',
        description: `"${goal.title}" has no assigned owner`,
        itemId: goal.id,
        itemName: goal.title,
        createdAt: new Date(goal.created_at),
        actionUrl: `/goals/${goal.id}`
      }));
    } catch (err) {
      logger.error('Error fetching ownerless goals:', err);
      return [];
    }
  }, [companyId]);

  // Fetch overdue tasks
  const fetchOverdueTasks = useCallback(async () => {
    if (!companyId) return [];

    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select('id, title, due_date, created_at')
        .eq('company_id', companyId)
        .lt('due_date', new Date().toISOString())
        .neq('status', 'completed')
        .neq('status', 'cancelled');

      if (err) throw err;

      return (data || []).map(task => ({
        id: `task-${task.id}`,
        type: 'overdue_task' as const,
        severity: 'warning' as const,
        title: 'Overdue Task',
        description: `"${task.title}" is overdue`,
        itemId: task.id,
        itemName: task.title,
        createdAt: new Date(task.created_at),
        actionUrl: `/tasks/${task.id}`
      }));
    } catch (err) {
      logger.error('Error fetching overdue tasks:', err);
      return [];
    }
  }, [companyId]);

  // Fetch stale metrics (not updated in 7+ days)
  const fetchStaleMetrics = useCallback(async () => {
    if (!companyId) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const { data, error: err } = await supabase
        .from('metrics')
        .select('id, name, last_updated, created_at')
        .eq('company_id', companyId)
        .lt('last_updated', sevenDaysAgo.toISOString())
        .eq('status', 'active');

      if (err) throw err;

      return (data || []).map(metric => ({
        id: `metric-${metric.id}`,
        type: 'stale_metric' as const,
        severity: 'info' as const,
        title: 'Metric Not Updated',
        description: `"${metric.name}" hasn't been updated in 7+ days`,
        itemId: metric.id,
        itemName: metric.name,
        createdAt: new Date(metric.created_at),
        actionUrl: `/metrics/${metric.id}`
      }));
    } catch (err) {
      logger.error('Error fetching stale metrics:', err);
      return [];
    }
  }, [companyId]);

  // Fetch all alerts
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [ownerlessGoals, overdueTasks, staleMetrics] = await Promise.all([
        fetchOwnerlessGoals(),
        fetchOverdueTasks(),
        fetchStaleMetrics()
      ]);

      const allAlerts = [...ownerlessGoals, ...overdueTasks, ...staleMetrics];
      setAlerts(allAlerts);

      // Calculate scorecard metrics
      const healthScore = Math.max(0, 100 - (ownerlessGoals.length * 10 + overdueTasks.length * 5 + staleMetrics.length * 2));
      setScorecard({
        healthScore: Math.round(healthScore),
        trend: healthScore > 85 ? 'up' : healthScore > 70 ? 'stable' : 'down',
        goalsWithoutOwner: ownerlessGoals.length,
        overdueTasks: overdueTasks.length,
        unupdatedMetrics: staleMetrics.length,
        meetingRemindersScheduled: 0 // Will be implemented with notification system
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch churn prevention alerts';
      setError(errorMessage);
      logger.error('Churn prevention alerts error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchOwnerlessGoals, fetchOverdueTasks, fetchStaleMetrics]);

  // Initial fetch and setup polling
  useEffect(() => {
    if (companyId) {
      fetchAlerts();
      // Refresh alerts every 5 minutes
      const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [companyId, fetchAlerts]);

  const dismissAlert = useCallback(async (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  return {
    alerts,
    scorecard,
    loading,
    error,
    refetch: fetchAlerts,
    dismissAlert
  };
};
