import React, { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import { Target, BarChart3, Check, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { getCurrentWeekStart } from '@/lib/weekUtils';
import { useMetricsFormatting } from '@/hooks/useMetricsFormatting';
import { useToast } from '@/hooks/use-toast';
import { checkTargetCondition } from '@/utils/metricUtils';
import { useMobileDataPreloader } from '@/hooks/mobile';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MetricConfigurationModal } from '@/components/modals/MetricConfigurationModal';
import {
  MobileCard,
  MobileTeamDropdown,
  MobileEmptyState,
  MobileMetricsSkeleton,
} from '@/components/mobile';
import { useMobileShell } from '@/contexts/MobileShellContext';
import { logger } from '@/utils/logger';

interface MetricEntry {
  id: string;
  metric_name: string;
  owner_id: string;
  owner_name?: string;
  owner_avatar_url?: string;
  metric_value: number | null;
  target_value: number | null;
  target_logic?: string | null;
  unit: string;
  week_start_date: string;
}

// Memoized metric row with optimistic state
const MetricRow = React.memo(({ 
  metric,
  formatValue,
  onUpdate,
  onEdit,
  isPending
}: { 
  metric: MetricEntry;
  formatValue: (value: number, unit: string) => string;
  onUpdate: (value: number | null) => void;
  onEdit: () => void;
  isPending?: boolean;
}) => {
  const [localValue, setLocalValue] = useState<string>(metric.metric_value?.toString() ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(metric.metric_value?.toString() ?? '');
    }
  }, [metric.metric_value, isFocused]);

  const getInputStyles = (): string => {
    const base = "w-20 h-10 rounded-[6px] text-center text-sm font-semibold tabular-nums transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40";
    
    if (showSuccess) {
      return `${base} bg-[var(--success)]/10 text-[var(--success)] ring-2 ring-[var(--success)]/40`;
    }
    
    if (metric.metric_value === null || metric.metric_value === undefined) {
      return `${base} bg-muted/60 text-muted-foreground placeholder:text-muted-foreground/50`;
    }
    
    if (!metric.target_value) {
      return `${base} bg-muted text-foreground`;
    }
    
    const isOnTrack = checkTargetCondition(
      metric.metric_value, 
      metric.target_value, 
      metric.target_logic || 'greater_than_or_equal'
    );
    
    return isOnTrack
      ? `${base} bg-[var(--success)]/10 text-[var(--success)]`
      : `${base} bg-destructive/10 text-destructive`;
  };

  const handleBlur = async () => {
    setIsFocused(false);
    const currentValueStr = metric.metric_value?.toString() ?? '';
    
    if (localValue !== currentValueStr) {
      if (localValue === '') {
        onUpdate(null as any);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1000);
      } else {
        const numValue = parseFloat(localValue);
        if (!isNaN(numValue)) {
          onUpdate(numValue);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 1000);
        }
      }
    }
  };

  const initials = metric.owner_name
    ? metric.owner_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <MobileCard variant="outlined" className={isPending ? 'opacity-70' : ''}>
      <div className="grid grid-cols-[24px_1fr_60px_80px] gap-3 items-center">
        <Avatar className="h-6 w-6">
          <AvatarImage src={metric.owner_avatar_url || undefined} />
          <AvatarFallback className="text-[10px] bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <button 
          onClick={onEdit}
          className="text-sm font-medium text-foreground line-clamp-2 text-left hover:text-primary transition-colors flex items-center gap-1.5 group"
        >
          <span className="line-clamp-2">{metric.metric_name}</span>
          <Settings2 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
        </button>
        
        <span className="text-sm text-muted-foreground text-center font-medium tabular-nums justify-self-center">
          {metric.target_value ? formatValue(metric.target_value, metric.unit) : '—'}
        </span>
        
        <div className="relative justify-self-center">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            step="any"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            className={getInputStyles()}
            placeholder="—"
            autoComplete="off"
          />
          {showSuccess && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Check className="h-4 w-4 text-[var(--success)] animate-scale-in" />
            </div>
          )}
        </div>
      </div>
    </MobileCard>
  );
});

/**
 * MobileMetricsContent - Content-only version for MobileShell
 */
export const MobileMetricsContent: React.FC = () => {
  const shell = useMobileShell();
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useOptimizedUserTeams();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  const { formatValue } = useMetricsFormatting();
  const { preloadAdjacent } = useMobileDataPreloader();
  const [isPending, startTransition] = useTransition();
  
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [preferredTeamLoaded, setPreferredTeamLoaded] = useState(false);
  const [metricCountsByTeam, setMetricCountsByTeam] = useState<Map<string, number>>(new Map());
  const [optimisticMetrics, setOptimisticMetrics] = useState<Map<string, number>>(new Map());
  const [myMetricsOnly, setMyMetricsOnly] = useState(true);
  const [myMetricsOnlyLoaded, setMyMetricsOnlyLoaded] = useState(false);
  
  const [editingMetric, setEditingMetric] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Preload adjacent pages
  useEffect(() => {
    preloadAdjacent('metrics');
  }, [preloadAdjacent]);

  // Load preferred team and toggle from user_settings on mount
  useEffect(() => {
    if (!user?.id || preferredTeamLoaded) return;

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('preferred_metrics_team_id, my_metrics_only')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          if (data.preferred_metrics_team_id) {
            setSelectedTeamId(data.preferred_metrics_team_id);
          }
          if (data.my_metrics_only !== null) {
            setMyMetricsOnly(data.my_metrics_only);
          }
        }
        setPreferredTeamLoaded(true);
        setMyMetricsOnlyLoaded(true);
      } catch (err) {
        logger.error('Failed to load metrics preferences:', err);
        setPreferredTeamLoaded(true);
        setMyMetricsOnlyLoaded(true);
      }
    };

    loadPreferences();
  }, [user?.id, preferredTeamLoaded]);

  // Fetch metric counts with deduplication
  useEffect(() => {
    if (!user || !teams.length || !currentCompany) return;

    const fetchMetricCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('weekly_metrics')
          .select('team_id, metric_name')
          .eq('owner_id', user.id)
          .in('team_id', teams.map(t => t.id));

        if (error) throw error;

        const counts = new Map<string, number>();
        teams.forEach(team => counts.set(team.id, 0));
        
        if (data) {
          data.forEach(row => {
            const currentCount = counts.get(row.team_id) || 0;
            counts.set(row.team_id, currentCount + 1);
          });
        }

        setMetricCountsByTeam(counts);
      } catch (error) {
        logger.error('Error fetching metric counts:', error);
      }
    };

    fetchMetricCounts();
  }, [user, teams, currentCompany]);

  // Sort teams by metric count
  const sortedTeams = useMemo(() => {
    if (!teams.length || metricCountsByTeam.size === 0) return teams;
    return [...teams].sort((a, b) => {
      const countA = metricCountsByTeam.get(a.id) || 0;
      const countB = metricCountsByTeam.get(b.id) || 0;
      return countB !== countA ? countB - countA : a.name.localeCompare(b.name);
    });
  }, [teams, metricCountsByTeam]);

  const teamOptions = useMemo(() => 
    sortedTeams.map(team => ({ value: team.id, label: team.name })),
    [sortedTeams]
  );

  // Auto-select first team only if no preferred team was loaded
  useEffect(() => {
    if (!teamsLoading && preferredTeamLoaded && sortedTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(sortedTeams[0].id);
    }
    if (preferredTeamLoaded && selectedTeamId && sortedTeams.length > 0) {
      const teamExists = sortedTeams.some(t => t.id === selectedTeamId);
      if (!teamExists) {
        setSelectedTeamId(sortedTeams[0].id);
      }
    }
  }, [sortedTeams, teamsLoading, selectedTeamId, preferredTeamLoaded]);

  const { metrics, loading: metricsLoading, updateMetric } = useWeeklyMetrics(selectedTeamId, 'last_3_weeks');

  // User-owned metrics with optimistic values applied
  const filteredMetrics = useMemo(() => {
    if (!user || !metrics) return [];
    const currentWeekStr = getCurrentWeekStart('monday');

    return metrics
      .filter(metric => myMetricsOnly ? metric.owner_id === user.id : true)
      .map(metric => {
        const baseValue = metric.weeklyValues?.[currentWeekStr] || null;
        const optimisticValue = optimisticMetrics.get(metric.id);
        
        return {
          id: metric.id,
          metric_name: metric.metric_name,
          owner_id: metric.owner_id,
          owner_name: metric.owner || undefined,
          owner_avatar_url: metric.owner_avatar_url || undefined,
          metric_value: optimisticValue !== undefined ? optimisticValue : baseValue,
          target_value: metric.target_value,
          target_logic: metric.target_logic,
          unit: metric.unit || '',
          week_start_date: currentWeekStr,
          needsCompletion: baseValue === null || baseValue === undefined
        };
      });
  }, [metrics, user, optimisticMetrics, myMetricsOnly]);

  // Persist team change to database
  const handleTeamChange = useCallback(async (teamId: string) => {
    startTransition(() => {
      setSelectedTeamId(teamId);
    });

    if (user?.id) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            preferred_metrics_team_id: teamId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      } catch (err) {
        logger.error('Failed to persist preferred metrics team:', err);
      }
    }
  }, [user?.id]);

  // Optimistic metric update with instant feedback
  const handleMetricUpdate = useCallback(async (metricId: string, weekStart: string, value: number | null) => {
    if (value === null) {
      setOptimisticMetrics(prev => {
        const next = new Map(prev);
        next.delete(metricId);
        return next;
      });
    } else {
      setOptimisticMetrics(prev => new Map(prev).set(metricId, value));
    }
    
    try {
      await updateMetric(metricId, weekStart, value);
      setOptimisticMetrics(prev => {
        const next = new Map(prev);
        next.delete(metricId);
        return next;
      });
    } catch {
      setOptimisticMetrics(prev => {
        const next = new Map(prev);
        next.delete(metricId);
        return next;
      });
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  }, [updateMetric, toast]);

  // Handle opening the edit modal
  const handleEditMetric = useCallback((metric: MetricEntry) => {
    const fullMetric = metrics.find(m => m.id === metric.id);
    if (fullMetric) {
      setEditingMetric(fullMetric);
      setShowEditModal(true);
    }
  }, [metrics]);

  // Handle saving metric configuration
  const handleSaveMetricConfig = useCallback(async (config: any) => {
    if (!config || !config.id) return;
    
    try {
      const { error } = await supabase
        .from('weekly_metrics')
        .update({
          metric_name: config.metric_name,
          description: config.description,
          target_value: config.target_value,
          target_logic: config.target_logic,
          unit: config.unit,
          owner_id: config.owner_id,
          assistant_id: config.assistant_id,
          team_id: config.team_id,
          is_formula: config.is_formula,
          formula_components: config.formula_components,
          aggregation_type: config.aggregation_type,
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({ title: "Success", description: "Metric updated successfully." });
      setShowEditModal(false);
      setEditingMetric(null);
    } catch (error) {
      logger.error('Failed to update metric:', error);
      toast({ title: "Error", description: "Failed to update metric.", variant: "destructive" });
    }
  }, [toast]);

  // Fast loading state
  if (teamsLoading || metricsLoading || !preferredTeamLoaded) {
    return (
      <div className="px-4 py-4">
        <MobileMetricsSkeleton />
      </div>
    );
  }

  // No teams state
  if (sortedTeams.length === 0) {
    return (
      <div className="px-4 py-4">
        <MobileEmptyState
          icon={BarChart3}
          title="No teams available"
          description="You need to be assigned to a team to track metrics."
        />
      </div>
    );
  }

  return (
    <>
      {/* Page-specific controls */}
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between gap-3 mb-3">
          {sortedTeams.length > 1 && (
            <MobileTeamDropdown
              value={selectedTeamId}
              onChange={handleTeamChange}
              options={teamOptions}
              className="flex-1"
            />
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="my-metrics-toggle" className="text-sm text-muted-foreground whitespace-nowrap">
              My metrics
            </Label>
            <Switch
              id="my-metrics-toggle"
              checked={myMetricsOnly}
              onCheckedChange={async (checked) => {
                setMyMetricsOnly(checked);
                if (user?.id) {
                  try {
                    await supabase
                      .from('user_settings')
                      .upsert({
                        user_id: user.id,
                        my_metrics_only: checked,
                        updated_at: new Date().toISOString()
                      }, { onConflict: 'user_id' });
                  } catch (err) {
                    logger.error('Failed to persist my metrics toggle:', err);
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Metrics List */}
      <div className={`px-4 py-4 transition-opacity duration-150 ${isPending ? 'opacity-60' : ''}`}>
        {filteredMetrics.length === 0 ? (
          <MobileEmptyState
            icon={Target}
            title={myMetricsOnly ? "No metrics assigned" : "No metrics found"}
            description={myMetricsOnly ? "You don't have any metrics assigned to you for this team." : "No metrics found for this team."}
          />
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-[24px_1fr_60px_80px] gap-3 items-center text-xs font-medium text-muted-foreground px-3">
              <span></span>
              <span>Metric</span>
              <span className="text-center">Target</span>
              <span className="text-center">Value</span>
            </div>
            
            {/* Metric rows */}
            {filteredMetrics.map((metric) => (
              <MetricRow
                key={metric.id}
                metric={metric}
                formatValue={formatValue}
                onUpdate={(value) => handleMetricUpdate(metric.id, metric.week_start_date, value)}
                onEdit={() => handleEditMetric(metric)}
                isPending={optimisticMetrics.has(metric.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Metric Modal */}
      {editingMetric && (
        <MetricConfigurationModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          metric={editingMetric}
          onSave={handleSaveMetricConfig}
          teamId={selectedTeamId}
        />
      )}
    </>
  );
};

export default MobileMetricsContent;
