import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserTeams } from '@/hooks/useUserTeams';
import { getCurrentWeekStart } from '@/lib/weekUtils';
import { logger } from '@/utils/logger';

export interface TeamMetric {
  id: string;
  metric_name: string;
  unit: string;
  target_value?: number;
  target_logic?: string;
  team_id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export const useTeamMetrics = (teamId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { teams } = useUserTeams();
  const [metrics, setMetrics] = useState<TeamMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !teamId) {
      setMetrics([]);
      setLoading(false);
      return;
    }

    // Validate user belongs to the team
    const userTeamIds = teams.map(t => t.id);
    if (!userTeamIds.includes(teamId)) {
      logger.log('useTeamMetrics: User does not belong to team:', teamId);
      setMetrics([]);
      setLoading(false);
      return;
    }

    fetchMetrics();
  }, [user, teamId, teams]);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_metrics')
        .select('*')
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching team metrics:', error);
        toast({
          title: "Error",
          description: "Failed to fetch team metrics",
          variant: "destructive",
        });
        return;
      }

      logger.log('Fetched metrics:', data);
      setMetrics(data || []);
    } catch (error) {
      logger.error('Error fetching team metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch team metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMetric = async (metric: {
    metric_name: string;
    unit: string;
    target_value: number;
    target_logic?: string;
    owner_id: string;
    assistant_id?: string | null;
    team_id?: string;
    is_formula?: boolean;
    formula_components?: any[];
    aggregation_type?: string;
  }) => {
    if (!user?.id) {
      logger.error('addMetric: User not authenticated');
      throw new Error('User not authenticated');
    }

    const finalTeamId = metric.team_id || teamId;

    // Validate user belongs to the team (but allow if teams not loaded yet)
    const userTeamIds = teams.map(t => t.id);
    if (userTeamIds.length > 0 && !userTeamIds.includes(finalTeamId)) {
      const errorMsg = "You don't have permission to add metrics to this team.";
      logger.error('addMetric: Permission denied', { 
        finalTeamId, 
        userTeamIds,
        teamsLoaded: teams.length > 0 
      });
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      throw new Error(errorMsg);
    }

    // Create optimistic metric for immediate UI update
    const optimisticMetric: TeamMetric = {
      id: `temp-${Date.now()}`,
      metric_name: metric.metric_name,
      unit: metric.unit,
      target_value: metric.target_value,
      target_logic: metric.target_logic || 'greater_than_or_equal',
      team_id: metric.team_id || teamId,
      owner_id: metric.owner_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Add optimistic metric to state immediately
    logger.log('🔧 useTeamMetrics: Adding optimistic metric:', optimisticMetric);
    setMetrics(prev => [optimisticMetric, ...prev]);
    
    try {
      logger.log('🔧 useTeamMetrics: Creating metric with data:', { ...metric, team_id: metric.team_id || teamId, user_id: user.id });
      
      // Check for duplicate metric name in the same team with same owner
      const finalTeamId = metric.team_id || teamId;
      const { data: existingMetric, error: checkError } = await supabase
        .from('metrics')
        .select('id, metric_name')
        .eq('metric_name', metric.metric_name)
        .eq('team_id', finalTeamId)
        .eq('owner_id', metric.owner_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (checkError) {
        logger.error('❌ Error checking for duplicate metric:', checkError);
        throw checkError;
      }

      if (existingMetric) {
        logger.error('❌ Duplicate metric detected:', { 
          metricName: metric.metric_name, 
          teamId: finalTeamId, 
          ownerId: metric.owner_id, 
          existingMetric 
        });
        
        // Remove optimistic metric immediately
        setMetrics(prev => prev.filter(m => m.id !== optimisticMetric.id));
        
        toast({
          title: "Cannot Create Duplicate Metric",
          description: `A metric named "${metric.metric_name}" already exists for this owner in this team. Please use a different name or edit the existing metric instead.`,
          variant: "destructive",
        });
        throw new Error(`Duplicate metric: ${metric.metric_name}`);
      }

      logger.log('✅ No duplicate metric found, proceeding with creation');
      
      let insertedMetric;
      
      // Always use the RPC function for ALL metrics (both formula and non-formula)
      // This ensures metric_id is properly populated in weekly_metrics table
      const { data, error } = await supabase.rpc('upsert_weekly_metric_value', {
        p_metric_name: metric.metric_name,
        p_owner_id: metric.owner_id,
        p_team_id: metric.team_id || teamId,
        p_week_start_date: getCurrentWeekStart('monday'),
        p_metric_value: null, // Allow null for new metrics
        p_user_id: user.id,
        p_unit: metric.unit,
        p_target_value: metric.target_value,
        p_target_logic: metric.target_logic || 'greater_than_or_equal',
        p_is_formula: metric.is_formula || false,
        p_formula_components: metric.formula_components || null,
        p_aggregation_type: metric.aggregation_type || 'total'
      });
      
      if (error) throw error;
      insertedMetric = { id: data }; // RPC returns the weekly_metric ID

      // upsert_weekly_metric_value RPC doesn't take assistant_id; persist it via a
      // follow-up UPDATE keyed on the composite (name, owner, team).
      if (metric.assistant_id) {
        const { error: assistantErr } = await supabase
          .from('metrics')
          .update({ assistant_id: metric.assistant_id, updated_at: new Date().toISOString() })
          .eq('metric_name', metric.metric_name)
          .eq('owner_id', metric.owner_id)
          .eq('team_id', finalTeamId)
          .is('deleted_at', null);
        if (assistantErr) {
          logger.error('⚠️ useTeamMetrics.addMetric: failed to set assistant_id (metric was created):', assistantErr);
          // Non-fatal: metric exists, just without an assistant.
        }
      }

      // Replace optimistic metric with real one
      setMetrics(prev => prev.map(m =>
        m.id === optimisticMetric.id
          ? { ...optimisticMetric, id: insertedMetric.id }
          : m
      ));

      logger.log('✅ useTeamMetrics: Metric created successfully:', insertedMetric);
      
      // Track metric creation in analytics
      const { trackMetricCreated } = await import('@/lib/analytics');
      trackMetricCreated();
      
      toast({
        title: "Metric added",
        description: "Your metric has been created successfully.",
      });

      return insertedMetric;
    } catch (error) {
      // Remove optimistic metric on error
      logger.error('❌ useTeamMetrics: Error adding metric, removing optimistic update:', error);
      setMetrics(prev => prev.filter(m => m.id !== optimisticMetric.id));
      
      let errorMessage = 'Unknown error occurred';
      
      // Handle specific Supabase error types
      if (error && typeof error === 'object' && 'code' in error) {
        const supabaseError = error as { code: string; details?: string; message?: string };
        
        if (supabaseError.code === '23505') {
          // Unique constraint violation - duplicate metric name
          errorMessage = `A metric named "${metric.metric_name}" already exists for this team member and week. Please choose a different name.`;
        } else if (supabaseError.message) {
          errorMessage = supabaseError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: `Failed to add metric: ${errorMessage}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeMetric = async (metric: TeamMetric) => {
    if (!user) return;

    try {
      logger.log('Deleting metric:', metric.id);
      
      const deletedAt = new Date().toISOString();

      // Update parent metrics table
      const { error: metricsError } = await supabase
        .from('metrics')
        .update({ deleted_at: deletedAt })
        .eq('metric_name', metric.metric_name)
        .eq('owner_id', metric.owner_id)
        .eq('team_id', teamId)
        .is('deleted_at', null);

      if (metricsError) {
        logger.error('Error deleting metric from metrics table:', metricsError);
        toast({
          title: "Error",
          description: "Failed to delete metric",
          variant: "destructive",
        });
        return;
      }
      
      // Update weekly_metrics table
      const { error } = await supabase
        .from('weekly_metrics')
        .update({ deleted_at: deletedAt })
        .eq('id', metric.id)
        .eq('owner_id', user.id);

      if (error) {
        logger.error('Error deleting metric from weekly_metrics:', error);
        toast({
          title: "Error",
          description: "Failed to delete metric",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Metric deleted",
        description: "Your metric has been deleted successfully.",
      });

      // Refresh the metrics list
      await fetchMetrics();
    } catch (error) {
      logger.error('Error deleting metric:', error);
      toast({
        title: "Error",
        description: "Failed to delete metric",
        variant: "destructive",
      });
    }
  };

  const bulkRemoveMetrics = async (metricIds: string[]) => {
    if (!user) return;

    try {
      logger.log('Bulk deleting metrics:', metricIds);
      
      const deletedAt = new Date().toISOString();

      // First, get the metrics to find their names for parent table update
      const { data: metricsToDelete, error: fetchError } = await supabase
        .from('weekly_metrics')
        .select('metric_name, owner_id')
        .in('id', metricIds);

      if (fetchError) {
        logger.error('Error fetching metrics for bulk delete:', fetchError);
        toast({
          title: "Error",
          description: "Failed to delete metrics",
          variant: "destructive",
        });
        return;
      }

      // Update parent metrics table for each unique metric_name + owner_id combo
      const uniqueMetrics = Array.from(
        new Set(metricsToDelete?.map(m => `${m.metric_name}|${m.owner_id}`))
      ).map(key => {
        const [metric_name, owner_id] = key.split('|');
        return { metric_name, owner_id };
      });

      for (const { metric_name, owner_id } of uniqueMetrics) {
        const { error: metricsError } = await supabase
          .from('metrics')
          .update({ deleted_at: deletedAt })
          .eq('metric_name', metric_name)
          .eq('owner_id', owner_id)
          .eq('team_id', teamId)
          .is('deleted_at', null);

        if (metricsError) {
          logger.error('Error deleting from metrics table:', metricsError);
        }
      }
      
      // Update weekly_metrics table
      const { error } = await supabase
        .from('weekly_metrics')
        .update({ deleted_at: deletedAt })
        .in('id', metricIds)
        .eq('owner_id', user.id);

      if (error) {
        logger.error('Error bulk deleting metrics:', error);
        toast({
          title: "Error",
          description: "Failed to delete metrics",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Metrics deleted",
        description: `${metricIds.length} metrics have been deleted successfully.`,
      });

      // Refresh the metrics list
      await fetchMetrics();
    } catch (error) {
      logger.error('Error bulk deleting metrics:', error);
      toast({
        title: "Error",
        description: "Failed to delete metrics",
        variant: "destructive",
      });
    }
  };

  return {
    metrics,
    loading,
    addMetric,
    removeMetric,
    bulkRemoveMetrics,
    refetch: fetchMetrics,
  };
};
