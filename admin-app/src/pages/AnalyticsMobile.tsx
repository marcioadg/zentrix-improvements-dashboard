/**
 * AnalyticsMobile — Mobile-only Analytics page (/m/analytics).
 *
 * Mobile shell of the desktop Analytics.tsx page (Variant A · KPI-first).
 * Uses mobile-specific components exclusively under src/components/mobile/
 * analytics/. Reads the same data hooks the desktop Analytics page uses
 * (useAnalyticsData, useTasksCompletedOvertime, useTasksPerPersonOvertime).
 * Desktop's Analytics.tsx is NOT modified.
 *
 * Page anatomy (top → bottom):
 *  1. MobileAnalyticsHeader   — Analytics title, subtitle (timeframe · team)
 *  2. Filter pill bar          — Timeframe + Team pills opening the filter sheet
 *  3. KPI grid 2×2            — Goals / Avg meeting rating / Tasks completed / Issues resolved
 *  4. Trends section header
 *  5. Featured tasks-overtime area chart
 *  6. 2-col grid: Goals / Meeting ratings / Task completion / Issues solved
 *  7. Top contributors (h-bar)
 *  8. Scorecard performance (line)
 *  9. MobileBottomNav
 *
 * KPI cards reflect the currently selected timeframe (not hardcoded 7 days),
 * mirroring the user's preferred behavior: the filter controls everything on
 * the page. Defaults to 4-week timeframe (closest to the original 7-day intent).
 *
 * NOTE: Drill-down sheets are scaffolded but not wired to real data in this
 * first cut — useAnalyticsDrillDown requires shared time-bucket plumbing that
 * is significant on its own. The sheets open with a placeholder state, so the
 * tap-to-drill UX is in place for a follow-up PR to fill in.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, Filter as FilterIcon, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useTasksCompletedOvertime } from '@/hooks/useTasksCompletedOvertime';
import { useTasksPerPersonOvertime } from '@/hooks/useTasksPerPersonOvertime';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { safeStorage } from '@/utils/safeStorage';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import MobileBottomNav from '@/components/MobileBottomNav';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import {
  MobileAnalyticsHeader,
  MobileKPICard,
  MobileChartCard,
  MobileAreaChart,
  MobileLineChart,
  MobileStackedBarChart,
  MobileBarChart,
  MobileHBarChart,
  MobileAnalyticsFilterSheet,
  MobileDrillDownSheet,
  TIMEFRAME_OPTIONS,
  type AnalyticsFilterValues,
  type AnalyticsTimeframe,
  type AnalyticsFrequency,
  type TeamOption,
  type MobileKPI,
  type MobileLineChartPoint,
  type MobileStackedBarPoint,
  type MobileBarPoint,
  type MobileHBarRow,
} from '@/components/mobile/analytics';

// ---------------------------------------------------------------------------
// Configuration / constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = 'mobile_analytics_filters';

const DEFAULT_FILTERS: AnalyticsFilterValues = {
  teamId: 'all',
  // 4 weeks is the closest match to the design's "last 7 days" KPI intent
  // while still being a real timeframe the data layer supports.
  timeframe: '4weeks',
  frequency: 'weekly',
};

const ALL_TEAMS_OPTION: TeamOption = { id: 'all', label: 'All teams' };

/** Persist filter values per company so different orgs keep their own selections. */
const storageKeyFor = (companyId: string | null | undefined) =>
  companyId ? `${STORAGE_KEY_PREFIX}_${companyId}` : STORAGE_KEY_PREFIX;

const loadFilters = (companyId: string | null | undefined): AnalyticsFilterValues => {
  try {
    const raw = safeStorage.getItem(storageKeyFor(companyId));
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw);
    // Defensive: only accept known shapes — fall back to defaults on schema drift.
    if (
      parsed &&
      typeof parsed.teamId === 'string' &&
      typeof parsed.timeframe === 'string' &&
      typeof parsed.frequency === 'string'
    ) {
      return {
        teamId: parsed.teamId,
        timeframe: parsed.timeframe as AnalyticsTimeframe,
        frequency: parsed.frequency as AnalyticsFrequency,
      };
    }
  } catch (e) {
    logger.warn('AnalyticsMobile: failed to read persisted filters', e);
  }
  return DEFAULT_FILTERS;
};

const saveFilters = (companyId: string | null | undefined, values: AnalyticsFilterValues) => {
  try {
    safeStorage.setItem(storageKeyFor(companyId), JSON.stringify(values));
  } catch (e) {
    logger.warn('AnalyticsMobile: failed to persist filters', e);
  }
};

// ---------------------------------------------------------------------------
// Adapters: hook data shapes → component prop shapes
// ---------------------------------------------------------------------------

interface TimeSeriesDP {
  date: string;
  period: string;
  [key: string]: number | string | boolean | undefined;
}

const sumKey = (series: TimeSeriesDP[], key: string): number =>
  series.reduce((acc, p) => acc + (Number(p[key]) || 0), 0);

const meanKeyNonZero = (series: TimeSeriesDP[], key: string): number => {
  const vals = series.map((p) => Number(p[key]) || 0).filter((v) => v > 0);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

const sparkFromSeries = (series: TimeSeriesDP[], keys: string[]): number[] =>
  series.map((p) => keys.reduce((acc, k) => acc + (Number(p[k]) || 0), 0));

const linePointsFromSeries = (series: TimeSeriesDP[], key: string): MobileLineChartPoint[] =>
  series.map((p) => ({ x: String(p.period || ''), value: Number(p[key]) || 0 }));

const stackedFromSeries = (
  series: TimeSeriesDP[],
  keys: string[],
): MobileStackedBarPoint[] =>
  series.map((p) => ({
    x: String(p.period || ''),
    values: keys.map((k) => Number(p[k]) || 0),
  }));

const barFromSeries = (series: TimeSeriesDP[], key: string): MobileBarPoint[] =>
  series.map((p) => ({ x: String(p.period || ''), value: Number(p[key]) || 0 }));

/**
 * Aggregate the latest "Tasks per Person" time-series datum into per-person
 * totals — the chart wants a single value per person (top N), not a series.
 */
const topContributorsFromSeries = (series: TimeSeriesDP[]): MobileHBarRow[] => {
  if (series.length === 0) return [];
  // Sum each person's value across all buckets in the current window.
  const totals: Record<string, number> = {};
  for (const point of series) {
    for (const k of Object.keys(point)) {
      if (k === 'date' || k === 'period' || k === 'isLastKnown') continue;
      const n = Number(point[k]);
      if (Number.isFinite(n)) totals[k] = (totals[k] || 0) + n;
    }
  }
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ id: name, label: name, value }));
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnalyticsMobile: React.FC = () => {
  const { currentCompany } = useMultiCompany();
  const companyId = currentCompany?.id ?? null;
  const effectiveCompanyIds = useMemo(() => (companyId ? [companyId] : []), [companyId]);

  const [filters, setFilters] = useState<AnalyticsFilterValues>(() => loadFilters(companyId));
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [teams, setTeams] = useState<TeamOption[]>([ALL_TEAMS_OPTION]);
  const [drillTitle, setDrillTitle] = useState<string | null>(null);

  // Reload persisted filters when the active company changes.
  useEffect(() => {
    setFilters(loadFilters(companyId));
  }, [companyId]);

  // Persist on change (after the initial load above).
  useEffect(() => {
    saveFilters(companyId, filters);
  }, [companyId, filters]);

  // Load teams for the team picker.
  useEffect(() => {
    let cancelled = false;
    const fetchTeams = async () => {
      if (!effectiveCompanyIds.length) {
        if (!cancelled) setTeams([ALL_TEAMS_OPTION]);
        return;
      }
      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .in('company_id', effectiveCompanyIds)
        .order('name');
      if (cancelled) return;
      setTeams([
        ALL_TEAMS_OPTION,
        ...(data?.map((t) => ({ id: t.id, label: t.name })) ?? []),
      ]);
    };
    fetchTeams();
    return () => {
      cancelled = true;
    };
  }, [effectiveCompanyIds]);

  const selectedTeamId = filters.teamId === 'all' ? null : filters.teamId;

  // Data hooks — same calls the desktop page makes, read-only.
  const { data, loading, error } = useAnalyticsData(
    selectedTeamId,
    filters.frequency,
    filters.timeframe,
    /* hideShortMeetings */ true,
    effectiveCompanyIds,
  );
  const { data: tasksOvertimeData, loading: tasksOvertimeLoading } = useTasksCompletedOvertime(
    effectiveCompanyIds,
    selectedTeamId,
    filters.frequency,
    filters.timeframe,
  );
  const { data: tasksPerPersonData, loading: tasksPerPersonLoading } = useTasksPerPersonOvertime(
    effectiveCompanyIds,
    selectedTeamId,
    filters.frequency,
    filters.timeframe,
  );

  // Pull-to-refresh: the analytics hooks re-fetch on dependency change. We
  // don't have a public refetch from those hooks, so PTR just gives a brief
  // settle window then yields. If/when we add a refetch handle to the hooks
  // we'll wire it here.
  const ptr = usePullToRefresh({
    onRefresh: async () => {
      await new Promise((r) => setTimeout(r, 400));
    },
    disabled: loading,
  });

  // -------------------------------------------------------------------------
  // Derived: KPI cards from useAnalyticsData over the current timeframe
  // -------------------------------------------------------------------------
  const kpis: MobileKPI[] = useMemo(() => {
    const goals = (data?.goals?.timeSeries ?? []) as TimeSeriesDP[];
    const ratings = (data?.meetingRatings?.timeSeries ?? []) as TimeSeriesDP[];
    const tasks = (data?.taskCompletion?.timeSeries ?? []) as TimeSeriesDP[];
    const productivity = (data?.meetingProductivity?.timeSeries ?? []) as TimeSeriesDP[];

    const goalsAchieved = Math.round(sumKey(goals, 'Completed'));
    const avgRating = meanKeyNonZero(ratings, 'Average Rating');
    const tasksCompleted = Math.round(sumKey(tasks, 'On Time') + sumKey(tasks, 'Late'));
    const issuesResolved = Math.round(sumKey(productivity, 'Issues Solved'));

    // Trend = last bucket vs second-to-last bucket within the same window.
    const trendOf = (series: TimeSeriesDP[], keys: string[]): number => {
      if (series.length < 2) return 0;
      const lastV = keys.reduce((a, k) => a + (Number(series[series.length - 1][k]) || 0), 0);
      const prevV = keys.reduce((a, k) => a + (Number(series[series.length - 2][k]) || 0), 0);
      return Math.round(lastV - prevV);
    };
    const ratingTrend = () => {
      const vals = ratings
        .map((p) => Number(p['Average Rating']) || 0)
        .filter((v) => v > 0);
      if (vals.length < 2) return 0;
      return Number((vals[vals.length - 1] - vals[vals.length - 2]).toFixed(1));
    };

    return [
      {
        id: 'goals',
        label: 'Goals achieved',
        value: `${goalsAchieved}`,
        delta: trendOf(goals, ['Completed']),
        deltaLabel: 'vs previous period',
        sparkValues: sparkFromSeries(goals, ['Completed']),
        tone: 'success',
      },
      {
        id: 'rating',
        label: 'Avg meeting rating',
        value: avgRating > 0 ? avgRating.toFixed(1) : '0',
        suffix: '/ 10',
        delta: ratingTrend(),
        deltaLabel: 'vs previous period',
        sparkValues: sparkFromSeries(ratings, ['Average Rating']),
        tone: 'primary',
      },
      {
        id: 'tasks',
        label: 'Tasks completed',
        value: `${tasksCompleted}`,
        delta: trendOf(tasks, ['On Time', 'Late']),
        deltaLabel: 'vs previous period',
        sparkValues: sparkFromSeries(tasks, ['On Time', 'Late']),
        tone: 'warning',
      },
      {
        id: 'issues',
        label: 'Issues resolved',
        value: `${issuesResolved}`,
        delta: trendOf(productivity, ['Issues Solved']),
        deltaLabel: 'vs previous period',
        sparkValues: sparkFromSeries(productivity, ['Issues Solved']),
        tone: 'destructive',
      },
    ];
  }, [data]);

  // -------------------------------------------------------------------------
  // Derived: chart datasets
  // -------------------------------------------------------------------------
  const tasksOvertime: MobileLineChartPoint[] = useMemo(
    () => linePointsFromSeries((tasksOvertimeData ?? []) as TimeSeriesDP[], 'Tasks Completed'),
    [tasksOvertimeData],
  );

  const goalsStacked: MobileStackedBarPoint[] = useMemo(
    () => stackedFromSeries((data?.goals?.timeSeries ?? []) as TimeSeriesDP[], ['Completed', 'On Track', 'Off Track']),
    [data],
  );
  const meetingRatingsLine: MobileLineChartPoint[] = useMemo(
    () => linePointsFromSeries((data?.meetingRatings?.timeSeries ?? []) as TimeSeriesDP[], 'Average Rating'),
    [data],
  );
  const taskCompletionStacked: MobileStackedBarPoint[] = useMemo(
    () => stackedFromSeries((data?.taskCompletion?.timeSeries ?? []) as TimeSeriesDP[], ['On Time', 'Late']),
    [data],
  );
  const issuesSolvedBar: MobileBarPoint[] = useMemo(
    () => barFromSeries((data?.meetingProductivity?.timeSeries ?? []) as TimeSeriesDP[], 'Issues Solved'),
    [data],
  );
  const scorecardLine: MobileLineChartPoint[] = useMemo(
    () => linePointsFromSeries((data?.scorecards?.timeSeries ?? []) as TimeSeriesDP[], 'On Track'),
    [data],
  );
  const topContributors: MobileHBarRow[] = useMemo(
    () => topContributorsFromSeries((tasksPerPersonData ?? []) as TimeSeriesDP[]),
    [tasksPerPersonData],
  );

  // -------------------------------------------------------------------------
  // Filter labels for the header subtitle + pill text
  // -------------------------------------------------------------------------
  const timeframeLabel =
    TIMEFRAME_OPTIONS.find((t) => t.id === filters.timeframe)?.label ?? 'Last 4 weeks';
  const teamLabel = teams.find((t) => t.id === filters.teamId)?.label ?? 'All teams';

  const subtitle = `Trends · ${timeframeLabel.toLowerCase()} · ${teamLabel}`;

  const handleOpenDrillDown = (title: string) => {
    setDrillTitle(title);
  };

  const showLoading = loading && !data;
  const showEmpty = !showLoading && !error && data && kpis.every((k) => k.value === '0' || k.value === '0.0');

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <MobileAnalyticsHeader
        title="Analytics"
        subtitle={subtitle}
        onOpenSettings={() => setFilterSheetOpen(true)}
      />

      {/* Pull-to-refresh indicator */}
      {ptr.isPulling && (
        <div
          className="flex justify-center py-4 transition-opacity"
          style={{ opacity: ptr.progress / 100 }}
        >
          <RefreshCw
            className={cn(
              'h-6 w-6 text-primary',
              ptr.isRefreshing && 'animate-spin',
            )}
            style={{ transform: `rotate(${ptr.progress * 3.6}deg)` }}
          />
        </div>
      )}

      <div className="flex-1" {...ptr.handlers}>
        {/* Filter pill bar */}
        <div className="px-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <FilterPill
              icon={<Calendar className="h-3 w-3" />}
              label={timeframeLabel}
              onTap={() => setFilterSheetOpen(true)}
            />
            <FilterPill
              icon={<FilterIcon className="h-3 w-3" />}
              label={teamLabel}
              onTap={() => setFilterSheetOpen(true)}
            />
          </div>
        </div>

        <div className="px-4 pt-4 pb-28 space-y-5">
          {/* KPI grid 2x2 */}
          {showLoading ? (
            <KPISkeletonGrid />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {kpis.map((kpi) => (
                <MobileKPICard
                  key={kpi.id}
                  kpi={kpi}
                  onTap={() => handleOpenDrillDown(`${kpi.label} — drill-down`)}
                />
              ))}
            </div>
          )}

          {/* Trends header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[16px] font-bold tracking-[-0.01em] text-foreground">Trends</div>
              <div className="text-[11px] text-muted-foreground">Tap a card to drill into the data</div>
            </div>
          </div>

          {/* Featured chart */}
          <MobileChartCard
            title="Tasks completed over time"
            subtitle={timeframeLabel}
            onTap={() => handleOpenDrillDown('Tasks completed over time')}
          >
            {tasksOvertimeLoading ? (
              <ChartSkeleton height={140} />
            ) : (
              <MobileAreaChart data={tasksOvertime} tone="primary" height={140} />
            )}
          </MobileChartCard>

          {/* 2-col small chart grid */}
          <div className="grid grid-cols-2 gap-2">
            <MobileChartCard
              title="Goals"
              subtitle="Completed / On track / Off track"
              size="sm"
              onTap={() => handleOpenDrillDown('Goals')}
            >
              <MobileStackedBarChart
                data={goalsStacked}
                seriesColors={[
                  'var(--success)',
                  'hsl(var(--primary))',
                  'var(--destructive)',
                ]}
                height={110}
              />
            </MobileChartCard>

            <MobileChartCard
              title="Meeting ratings"
              subtitle="Avg per period"
              size="sm"
              onTap={() => handleOpenDrillDown('Meeting ratings')}
            >
              <MobileLineChart data={meetingRatingsLine} tone="primary" height={110} domain={[0, 10]} />
            </MobileChartCard>

            <MobileChartCard
              title="Task completion"
              subtitle="On time / Late"
              size="sm"
              onTap={() => handleOpenDrillDown('Task completion')}
            >
              <MobileStackedBarChart
                data={taskCompletionStacked}
                seriesColors={['var(--success)', 'var(--warning)']}
                height={110}
              />
            </MobileChartCard>

            <MobileChartCard
              title="Issues solved"
              subtitle="Per period"
              size="sm"
              onTap={() => handleOpenDrillDown('Issues solved')}
            >
              <MobileBarChart data={issuesSolvedBar} tone="destructive" height={110} />
            </MobileChartCard>
          </div>

          {/* Top contributors */}
          <MobileChartCard title="Top contributors" subtitle="Tasks completed per person">
            {tasksPerPersonLoading ? (
              <ChartSkeleton height={120} />
            ) : topContributors.length === 0 ? (
              <EmptyHint message="No contributor data in this window." />
            ) : (
              <MobileHBarChart data={topContributors} tone="primary" />
            )}
          </MobileChartCard>

          {/* Scorecard performance */}
          <MobileChartCard
            title="Scorecard performance"
            subtitle="On-track metrics over time"
            onTap={() => handleOpenDrillDown('Scorecard performance')}
          >
            {showLoading ? (
              <ChartSkeleton height={140} />
            ) : (
              <MobileLineChart data={scorecardLine} tone="success" height={140} />
            )}
          </MobileChartCard>

          {showEmpty && (
            <EmptyHint message="No analytics for this selection yet. Try a wider timeframe." />
          )}

          {error && !loading && (
            <div className="rounded-[10px] border border-destructive/30 bg-destructive/5 text-destructive text-[12px] px-3 py-2">
              Couldn't load analytics. Pull down to retry.
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav />

      <MobileAnalyticsFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        teams={teams}
        values={filters}
        onApply={(next) => setFilters(next)}
      />

      <MobileDrillDownSheet
        open={drillTitle !== null}
        onOpenChange={(open) => !open && setDrillTitle(null)}
        title={drillTitle ?? ''}
        subtitle={`${timeframeLabel} · ${teamLabel}`}
        rows={[]}
        loading={false}
        emptyMessage="Drill-down rows coming in a follow-up — the tap target is in place."
        renderRow={() => null}
        rowKey={() => ''}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const FilterPill: React.FC<{
  icon?: React.ReactNode;
  label: string;
  onTap: () => void;
}> = ({ icon, label, onTap }) => (
  <button
    type="button"
    onClick={onTap}
    className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
      'bg-card border border-border/40 text-foreground',
      'text-[11.5px] font-semibold',
      'transition-transform duration-150 active:scale-95',
    )}
  >
    {icon && <span className="text-muted-foreground inline-flex items-center">{icon}</span>}
    <span className="line-clamp-1">{label}</span>
    <ChevronDown className="h-3 w-3 text-muted-foreground" />
  </button>
);

const KPISkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-2 gap-2">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-[130px] rounded-[14px] bg-card border border-border/40 animate-pulse"
      />
    ))}
  </div>
);

const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div
    style={{ height }}
    className="w-full rounded-[8px] bg-muted/40 animate-pulse"
  />
);

const EmptyHint: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center text-[12px] text-muted-foreground py-6">
    {message}
  </div>
);

export default AnalyticsMobile;
