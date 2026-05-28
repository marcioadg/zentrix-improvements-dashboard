/**
 * MetricsMobile - Mobile-only Metrics page (/m/metrics)
 * 
 * Uses mobile-specific components exclusively:
 * - MobileMeetingModalsManager instead of desktop MeetingModalsManager
 * - MobileAddMetricModal for adding metrics
 * - MobileMetricConfigurationModal for editing
 */
import React, { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import { TrendingUp, Target, BarChart3, Check, Settings2, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { getCurrentWeekStart } from '@/lib/weekUtils';
import { useMetricsFormatting } from '@/hooks/useMetricsFormatting';
import { useToast } from '@/hooks/use-toast';
import MobileBottomNav from '@/components/MobileBottomNav';
import { checkTargetCondition } from '@/utils/metricUtils';
import { useMobileDataPreloader, useMobileFABModals } from '@/hooks/mobile';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MobileMetricConfigurationModal } from '@/components/mobile/modals';
import { MobileMeetingModalsManager } from '@/components/mobile/MobileMeetingModalsManager';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import {
  MobilePageHeader,
  MobileCard,
  MobileTeamDropdown,
  MobileEmptyState,
  MobileMetricsSkeleton,
  MobileUnifiedFAB,
} from '@/components/mobile';
import { useHeadlines } from '@/hooks/useHeadlines';
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

  // Sync local value when metric updates from server
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(metric.metric_value?.toString() ?? '');
    }
  }, [metric.metric_value, isFocused]);

  const getInputStyles = (): string => {
    const base = "w-20 h-10 rounded-[6px] text-center text-sm font-semibold tabular-nums transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40";
    
    if (showSuccess) {
      return `${base} bg-success/10 dark:bg-green-900/40 text-success dark:text-green-300 ring-2 ring-green-500/40`;
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
      ? `${base} bg-success/10 dark:bg-green-900/40 text-success dark:text-green-300`
      : `${base} bg-destructive/10 dark:bg-red-900/40 text-red-700 dark:text-red-300`;
  };

  const handleBlur = async () => {
    setIsFocused(false);
    const currentValueStr = metric.metric_value?.toString() ?? '';
    
    // Only update if value actually changed
    if (localValue !== currentValueStr) {
      if (localValue === '') {
        // Allow clearing the value - pass null
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
        
        {/* Clickable metric name to edit */}
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
              <Check className="h-4 w-4 text-success animate-scale-in" />
            </div>
          )}
        </div>
      </div>
    </MobileCard>
  );
});

const MetricsMobile = () => {
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useOptimizedUserTeams();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  const { formatValue } = useMetricsFormatting();
  const { preloadAdjacent } = useMobileDataPreloader();
  const fabModals = useMobileFABModals();
  const [isPending, startTransition] = useTransition();
  
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [preferredTeamLoaded, setPreferredTeamLoaded] = useState(false);
  const [metricCountsByTeam, setMetricCountsByTeam] = useState<Map<string, number>>(new Map());
  const [optimisticMetrics, setOptimisticMetrics] = useState<Map<string, number>>(new Map());
  const [myMetricsOnly, setMyMetricsOnly] = useState(true);
  const [myMetricsOnlyLoaded, setMyMetricsOnlyLoaded] = useState(false);
  
  // Edit modal state
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
    // Also validate that selectedTeamId exists in current teams
    if (preferredTeamLoaded && selectedTeamId && sortedTeams.length > 0) {
      const teamExists = sortedTeams.some(t => t.id === selectedTeamId);
      if (!teamExists) {
        setSelectedTeamId(sortedTeams[0].id);
      }
    }
  }, [sortedTeams, teamsLoading, selectedTeamId, preferredTeamLoaded]);

  const { metrics, loading: metricsLoading, updateMetric, updateMetricConfiguration, addMetric, refetch } = useWeeklyMetrics(selectedTeamId, 'last_3_weeks');
  const { addHeadline } = useHeadlines(selectedTeamId || undefined);

  const handleAddHeadline = useCallback(async (
    title: string,
    content: string,
    teamId?: string,
    meetingId?: string,
    ownerId?: string,
    targetMeetingType?: 'weekly' | 'quarterly'
  ) => {
    try {
      await addHeadline(title, content, teamId, meetingId, targetMeetingType);
    } catch (error) {
      logger.error('Error adding headline:', error);
    }
  }, [addHeadline]);

  // Handler for adding metrics via FAB
  const handleAddMetric = useCallback(async (metricData: {
    metric_name: string;
    unit: string;
    target_value?: number;
    target_logic?: string;
    owner_id: string;
    team_id?: string;
    is_formula?: boolean;
    formula_components?: any[];
    aggregation_type?: string;
  }) => {
    try {
      await addMetric(metricData);
      toast({ title: "Metric Added", description: `${metricData.metric_name} has been added.` });
      await refetch(true);
    } catch (error) {
      logger.error('Error adding metric:', error);
      toast({ title: "Error", description: "Failed to add metric.", variant: "destructive" });
    }
  }, [addMetric, toast, refetch]);

  // Pull to refresh
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await refetch(true);
    },
    disabled: metricsLoading,
  });

  // User-owned metrics with optimistic values applied (show ALL metrics, not just incomplete)
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

    // Persist to database in background
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
    // Apply optimistic update immediately
    if (value === null) {
      setOptimisticMetrics(prev => {
        const next = new Map(prev);
        next.delete(metricId); // Remove from optimistic map for null
        return next;
      });
    } else {
      setOptimisticMetrics(prev => new Map(prev).set(metricId, value));
    }
    
    try {
      await updateMetric(metricId, weekStart, value);
      // Clear optimistic state on success (real data will flow through)
      setOptimisticMetrics(prev => {
        const next = new Map(prev);
        next.delete(metricId);
        return next;
      });
    } catch {
      // Rollback on error
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
    // Find the full metric data from the metrics array
    const fullMetric = metrics.find(m => m.id === metric.id);
    if (fullMetric) {
      setEditingMetric(fullMetric);
      setShowEditModal(true);
    }
  }, [metrics]);

  // Handle saving metric configuration — routes through the same hook the
  // desktop uses (updates the `metrics` table, not `weekly_metrics`).
  const handleSaveMetricConfig = useCallback(async (config: any) => {
    if (!config?.id) return;
    try {
      await updateMetricConfiguration(config.id, config);
      toast({ title: "Success", description: "Metric updated successfully." });
      setShowEditModal(false);
      setEditingMetric(null);
    } catch (error) {
      logger.error('Failed to update metric:', error);
      toast({ title: "Error", description: "Failed to update metric.", variant: "destructive" });
    }
  }, [updateMetricConfiguration, toast]);

  // Fast loading state
  if (teamsLoading || metricsLoading || !preferredTeamLoaded) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader title="Metrics" icon={BarChart3} showSearch />
        <div className="px-4 py-4">
          <MobileMetricsSkeleton />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  // No teams state
  if (sortedTeams.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader title="Metrics" icon={BarChart3} showSearch />
        <MobileEmptyState
          icon={BarChart3}
          title="No teams available"
          description="You need to be assigned to a team to track metrics."
        />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobilePageHeader title="Metrics" icon={BarChart3} showSearch>
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
                // Persist to database
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
      </MobilePageHeader>

      {/* Pull to Refresh Indicator */}
      {pullToRefresh.isPulling && (
        <div 
          className="flex justify-center py-4 transition-opacity"
          style={{ opacity: pullToRefresh.progress / 100 }}
        >
          <RefreshCw 
            className={`h-6 w-6 text-primary ${pullToRefresh.isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullToRefresh.progress * 3.6}deg)` }}
          />
        </div>
      )}

      {/* Metrics List */}
      <div 
        className={`px-4 py-4 transition-opacity duration-150 ${isPending ? 'opacity-60' : ''}`}
        {...pullToRefresh.handlers}
      >
        {filteredMetrics.length === 0 ? (
          <MobileEmptyState
            icon={Target}
            title={myMetricsOnly ? "No metrics assigned" : "No metrics found"}
            description={myMetricsOnly ? "You don't have any metrics assigned to you for this team." : "No metrics found for this team."}
          />
        ) : (
          <div className="space-y-3">
            {/* Header with week indicator - aligned with card content (MobileCard has p-4) */}
            <div className="grid grid-cols-[24px_1fr_60px_80px] gap-3 px-4 items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider justify-self-start">
                
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider justify-self-start">
                Metric
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase justify-self-center">
                Target
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tabular-nums justify-self-center">
                {format(parseISO(getCurrentWeekStart('monday')), 'MMM d')}
              </span>
            </div>
            
            {/* Rows */}
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

      {/* Unified FAB */}
      <MobileUnifiedFAB
        onAddTask={fabModals.openTaskModal}
        onAddIssue={fabModals.openIssueModal}
        onAddGoal={fabModals.openGoalModal}
        onAddMetric={fabModals.openMetricModal}
        onAddHeadline={fabModals.openHeadlineModal}
      />

      <MobileBottomNav />

      {/* Metric Configuration Modal */}
      <MobileMetricConfigurationModal
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) setEditingMetric(null);
        }}
        metric={editingMetric}
        onSave={handleSaveMetricConfig}
        teamId={selectedTeamId}
      />

      {/* Cross-page modals from FAB - Using MobileMeetingModalsManager */}
      <MobileMeetingModalsManager
        teamId={selectedTeamId}
        showTaskModal={fabModals.showTaskModal}
        showGoalModal={fabModals.showGoalModal}
        showMetricModal={fabModals.showMetricModal}
        showHeadlineModal={fabModals.showHeadlineModal}
        showIssueModal={fabModals.showIssueModal}
        setShowTaskModal={fabModals.setShowTaskModal}
        setShowGoalModal={fabModals.setShowGoalModal}
        setShowMetricModal={fabModals.setShowMetricModal}
        setShowHeadlineModal={fabModals.setShowHeadlineModal}
        setShowIssueModal={fabModals.setShowIssueModal}
        onAddTask={async () => {}}
        onAddGoal={async () => {}}
        onAddMetric={handleAddMetric}
        onAddHeadline={handleAddHeadline}
        onAddIssue={async () => false}
        forceUpcomingHeadline
      />
    </div>
  );
};

export default MetricsMobile;
