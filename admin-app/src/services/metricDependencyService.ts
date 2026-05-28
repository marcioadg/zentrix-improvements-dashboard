import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface DependentMetric {
  metric_id: string;
  metric_name: string;
  owner_name: string;
  team_name: string;
}

export interface DependencyCheckResult {
  hasDependencies: boolean;
  dependentMetrics: DependentMetric[];
}

/**
 * Check if a metric is used in any formula by searching formula_components
 * formula_components structure: [{ type: 'metric', value: 'metric-uuid', displayName: 'Metric Name' }, ...]
 */
export async function findDependentFormulas(metricId: string): Promise<DependencyCheckResult> {
  try {
    // Query metrics that have is_formula=true and contain this metric ID in their formula_components
    const { data, error } = await supabase
      .from('metrics')
      .select(`
        id,
        metric_name,
        owner_id,
        team_id,
        formula_components,
        profiles:owner_id (full_name, email),
        teams:team_id (name)
      `)
      .eq('is_formula', true)
      .is('deleted_at', null);

    if (error) {
      logger.error('Error checking formula dependencies:', error);
      return { hasDependencies: false, dependentMetrics: [] };
    }

    if (!data || data.length === 0) {
      return { hasDependencies: false, dependentMetrics: [] };
    }

    // Filter metrics whose formula_components contain the target metric ID
    const dependentMetrics: DependentMetric[] = [];
    
    for (const metric of data) {
      const components = metric.formula_components as any[] | null;
      if (!components || !Array.isArray(components)) continue;
      
      // Check if any component references the target metric
      const usesTargetMetric = components.some(
        (comp: any) => comp.type === 'metric' && comp.value === metricId
      );
      
      if (usesTargetMetric) {
        const profile = metric.profiles as any;
        const team = metric.teams as any;
        
        dependentMetrics.push({
          metric_id: metric.id,
          metric_name: metric.metric_name,
          owner_name: profile?.full_name || profile?.email || 'Unknown',
          team_name: team?.name || 'Unknown Team'
        });
      }
    }

    return {
      hasDependencies: dependentMetrics.length > 0,
      dependentMetrics
    };
  } catch (error) {
    logger.error('Error in findDependentFormulas:', error);
    return { hasDependencies: false, dependentMetrics: [] };
  }
}

/**
 * Check multiple metrics at once for formula dependencies
 */
export async function findBulkDependentFormulas(metricIds: string[]): Promise<DependencyCheckResult> {
  try {
    if (metricIds.length === 0) {
      return { hasDependencies: false, dependentMetrics: [] };
    }

    // Query all formula metrics
    const { data, error } = await supabase
      .from('metrics')
      .select(`
        id,
        metric_name,
        owner_id,
        team_id,
        formula_components,
        profiles:owner_id (full_name, email),
        teams:team_id (name)
      `)
      .eq('is_formula', true)
      .is('deleted_at', null);

    if (error) {
      logger.error('Error checking bulk formula dependencies:', error);
      return { hasDependencies: false, dependentMetrics: [] };
    }

    if (!data || data.length === 0) {
      return { hasDependencies: false, dependentMetrics: [] };
    }

    // Create a Set for faster lookup
    const metricIdSet = new Set(metricIds);
    const dependentMetrics: DependentMetric[] = [];
    const seenMetricIds = new Set<string>(); // Avoid duplicate entries
    
    for (const metric of data) {
      const components = metric.formula_components as any[] | null;
      if (!components || !Array.isArray(components)) continue;
      
      // Check if any component references any of the target metrics
      const usesTargetMetric = components.some(
        (comp: any) => comp.type === 'metric' && metricIdSet.has(comp.value)
      );
      
      if (usesTargetMetric && !seenMetricIds.has(metric.id)) {
        seenMetricIds.add(metric.id);
        
        const profile = metric.profiles as any;
        const team = metric.teams as any;
        
        dependentMetrics.push({
          metric_id: metric.id,
          metric_name: metric.metric_name,
          owner_name: profile?.full_name || profile?.email || 'Unknown',
          team_name: team?.name || 'Unknown Team'
        });
      }
    }

    return {
      hasDependencies: dependentMetrics.length > 0,
      dependentMetrics
    };
  } catch (error) {
    logger.error('Error in findBulkDependentFormulas:', error);
    return { hasDependencies: false, dependentMetrics: [] };
  }
}
