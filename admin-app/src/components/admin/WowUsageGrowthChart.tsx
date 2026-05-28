import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp, TrendingDown, Clock, Building2, Users, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useWeeklyUsageSnapshots, type WowRangeMode } from '@/hooks/useWeeklyUsageSnapshots';
import { format, parseISO, addDays } from 'date-fns';
import { WowAnalysisSheet } from '@/components/admin/WowAnalysisSheet';

interface BucketFilters {
  paid: boolean;
  trial: boolean;
  free: boolean;
}

const RANGE_OPTIONS: ReadonlyArray<{ value: WowRangeMode; label: string }> = [
  { value: '16w', label: '16w' },
  { value: '26w', label: '26w' },
  { value: '52w', label: '52w' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'All' },
];
const VALID_RANGES = new Set<WowRangeMode>(RANGE_OPTIONS.map((o) => o.value));
const RANGE_STORAGE_KEY = 'zentrix.wowUsageRange';

const readStoredRange = (): WowRangeMode => {
  if (typeof window === 'undefined') return '16w';
  try {
    const stored = window.localStorage.getItem(RANGE_STORAGE_KEY);
    return stored && VALID_RANGES.has(stored as WowRangeMode) ? (stored as WowRangeMode) : '16w';
  } catch {
    return '16w';
  }
};

// Recharts custom tooltip — reads filtered_total written by the parent so
// the chart, tooltip, and KPI cards all reflect the same bucket selection.
const CustomTooltip = ({ active, payload, label, filters }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const f = filters as BucketFilters;
  const rangeLabel = d?.week_start
    ? (() => {
        const start = parseISO(d.week_start);
        const end = addDays(start, 6);
        return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
      })()
    : label;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-medium">{rangeLabel}</p>
      <p className="text-muted-foreground">
        Total: <span className="text-foreground font-semibold">{d?.filtered_total?.toFixed(1)}h</span>
      </p>
      {(d?.paid_hours != null || d?.trial_hours != null || d?.free_hours != null) && (
        <p className="text-muted-foreground">
          {f?.paid && <>Paid: <span className="text-foreground">{(d.paid_hours ?? 0).toFixed(1)}h</span></>}
          {f?.paid && (f?.trial || f?.free) && ' / '}
          {f?.trial && <>Trial: <span className="text-foreground">{(d.trial_hours ?? 0).toFixed(1)}h</span></>}
          {f?.trial && f?.free && ' / '}
          {f?.free && <>Free: <span className="text-foreground">{(d.free_hours ?? 0).toFixed(1)}h</span></>}
        </p>
      )}
      {d?.filtered_wow_pct != null && (
        <p className={d.filtered_wow_pct >= 0 ? 'text-green-500' : 'text-red-500'}>
          WoW: {d.filtered_wow_pct >= 0 ? '+' : ''}{d.filtered_wow_pct.toFixed(1)}%
        </p>
      )}
    </div>
  );
};

export const WowUsageGrowthChart: React.FC = () => {
  const [range, setRange] = useState<WowRangeMode>(readStoredRange);
  // Offset only paginates within '16w' mode. Resets whenever range switches.
  const [offset, setOffset] = useState(0);
  // Bucket filters — uncheck to remove a tier from the chart's Total line,
  // the Latest Week card value, and the WoW% badge. Individual bucket cards
  // (Paid/Trial/Free) always show their own real value.
  const [filters, setFilters] = useState<BucketFilters>({ paid: true, trial: true, free: true });
  // AI analysis side sheet.
  const [analyzeOpen, setAnalyzeOpen] = useState(false);

  const { snapshots, loading, error, latest, wowChangePct, hasOlder } =
    useWeeklyUsageSnapshots({ mode: range, offset });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(RANGE_STORAGE_KEY, range);
    } catch {
      // localStorage unavailable (private mode / quota) — silently ignore;
      // the chart still works, just won't remember the choice next visit.
    }
  }, [range]);

  const handleRangeChange = (next: WowRangeMode) => {
    setRange(next);
    setOffset(0);
  };

  const goEarlier = () => setOffset((o) => o + 16);
  const goLater = () => setOffset((o) => Math.max(0, o - 16));
  const isPaginated = range === '16w';
  const isPagedAwayFromLatest = isPaginated && offset > 0;

  // Date-range label for the navigator (e.g. "Jan 12 – Apr 27, 2026")
  const rangeLabel = snapshots.length > 0
    ? `${format(parseISO(snapshots[0].week_start), 'MMM d')} – ${format(
        parseISO(snapshots[snapshots.length - 1].week_start),
        'MMM d, yyyy',
      )}`
    : '';

  // Render the segmented selector in every state (loading / error / empty /
  // populated) so the user can switch ranges out of an empty result.
  const rangeSelector = (
    <ToggleGroup
      type="single"
      value={range}
      onValueChange={(value) => {
        if (value) handleRangeChange(value as WowRangeMode);
      }}
      className="gap-0.5"
      aria-label="Chart time range"
    >
      {RANGE_OPTIONS.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          variant="outline"
          className="h-8 px-2 text-xs"
          aria-label={`Show ${opt.label}`}
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage Growth (WoW)
            </CardTitle>
            {rangeSelector}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            Loading weekly usage data…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage Growth (WoW)
            </CardTitle>
            {rangeSelector}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-destructive text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Usage Growth (WoW)
              </CardTitle>
              <CardDescription>No weekly data yet — run backfill or wait for weekly rollup.</CardDescription>
            </div>
            {rangeSelector}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Recompute Total per data point as the sum of currently-selected buckets.
  // If all three are checked we fall back to total_hours from the snapshot
  // (which can include a small "unclassified" sliver — companies whose tier
  // doesn't match Paid/Trial/Free). Unchecking any bucket switches to the
  // explicit sum so the math always matches the visible bucket lines.
  const allSelected = filters.paid && filters.trial && filters.free;
  const chartData = snapshots.map((s, i) => {
    const bucketSum =
      (filters.paid ? s.paid_hours ?? 0 : 0) +
      (filters.trial ? s.trial_hours ?? 0 : 0) +
      (filters.free ? s.free_hours ?? 0 : 0);
    const filtered_total = allSelected ? (s.total_hours ?? 0) : bucketSum;
    const prev = snapshots[i - 1];
    const prevBucketSum = prev
      ? (filters.paid ? prev.paid_hours ?? 0 : 0) +
        (filters.trial ? prev.trial_hours ?? 0 : 0) +
        (filters.free ? prev.free_hours ?? 0 : 0)
      : null;
    const prev_total = prev ? (allSelected ? (prev.total_hours ?? 0) : prevBucketSum ?? 0) : null;
    const filtered_wow_pct =
      prev_total != null && prev_total > 0
        ? ((filtered_total - prev_total) / prev_total) * 100
        : null;
    return {
      ...s,
      label: format(parseISO(s.week_start), 'MMM d'),
      filtered_total,
      filtered_wow_pct,
    };
  });

  const paidHours = latest?.paid_hours ?? 0;
  const trialHours = latest?.trial_hours ?? 0;
  const freeHours = latest?.free_hours ?? 0;
  const thisWeekHours = allSelected
    ? (latest?.total_hours ?? 0)
    : (filters.paid ? paidHours : 0) + (filters.trial ? trialHours : 0) + (filters.free ? freeHours : 0);

  // WoW% recalculated against the same filter set.
  const filteredWowChangePct = allSelected
    ? wowChangePct
    : chartData.length > 0
      ? chartData[chartData.length - 1].filtered_wow_pct
      : null;
  const isPositive = filteredWowChangePct != null && filteredWowChangePct >= 0;
  const topCompanies = (latest?.top_companies ?? []) as Array<{ company_id: string; hours: number }>;

  // Date range covered by the KPI cards & "Top 5 Companies" section below.
  // The KPIs all read from `latest`, which is a single ISO week (Mon → Sun).
  // Showing the explicit range makes "This Week" unambiguous — especially on
  // Mondays, when `latest` is still the prior week until the daily cron runs.
  const latestWeekRange = latest?.week_start
    ? (() => {
        const start = parseISO(latest.week_start);
        const end = addDays(start, 6);
        return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
      })()
    : '';

  // Target at most ~16 X-axis labels regardless of how wide the range is.
  // Recharts `interval={n}` shows every (n+1)th tick starting from index 0.
  const xAxisInterval = Math.max(0, Math.ceil(snapshots.length / 16) - 1);

  // Defaults for the AI analysis sheet — compare the two newest weeks in the
  // current view. User can pick any pair from the sheet's own week list.
  const defaultWeekB = snapshots[snapshots.length - 1]?.week_start ?? '';
  const defaultWeekA = snapshots[snapshots.length - 2]?.week_start ?? '';
  const canAnalyze = snapshots.length >= 2;

  return (
    <>
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Usage Growth (WoW)
            </CardTitle>
            <CardDescription>
              Weekly platform usage hours — week-over-week
              {rangeLabel && (
                <span className="ml-2 text-muted-foreground/80">· {rangeLabel}</span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {rangeSelector}
            {/* Window pagination — only meaningful on the default 16w view. */}
            {isPaginated && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goEarlier}
                  disabled={loading || !hasOlder}
                  className="h-8 px-2"
                  title="View earlier weeks"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goLater}
                  disabled={loading || offset === 0}
                  className="h-8 px-2"
                  title="View later weeks"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            {canAnalyze && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAnalyzeOpen(true)}
                className="h-8 px-2 gap-1"
                title="AI analysis of WoW change"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Analyze
              </Button>
            )}
            {!isPagedAwayFromLatest && filteredWowChangePct != null && (
              <Badge
                variant={isPositive ? 'default' : 'destructive'}
                className="flex items-center gap-1 text-sm px-3 py-1"
              >
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {isPositive ? '+' : ''}{filteredWowChangePct.toFixed(1)}% WoW
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stat row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">
                Latest Week
                {latestWeekRange && (
                  <span className="ml-1 text-muted-foreground/70">· {latestWeekRange}</span>
                )}
              </p>
              <p className="text-2xl font-bold">{thisWeekHours.toFixed(1)}h</p>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <Checkbox
              checked={filters.paid}
              onCheckedChange={(c) => setFilters((f) => ({ ...f, paid: c === true }))}
              aria-label="Include paid hours in total and chart"
            />
            <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Paid Hours</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {paidHours.toFixed(1)}h
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <Checkbox
              checked={filters.trial}
              onCheckedChange={(c) => setFilters((f) => ({ ...f, trial: c === true }))}
              aria-label="Include trial hours in total and chart"
            />
            <Users className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Trial Hours</p>
              <p className="text-2xl font-bold text-amber-500 dark:text-amber-400">
                {trialHours.toFixed(1)}h
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <Checkbox
              checked={filters.free}
              onCheckedChange={(c) => setFilters((f) => ({ ...f, free: c === true }))}
              aria-label="Include free hours in total and chart"
            />
            <Users className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Free Hours</p>
              <p className="text-2xl font-bold text-violet-500 dark:text-violet-400">
                {freeHours.toFixed(1)}h
              </p>
            </div>
          </label>
        </div>

        {/* Line chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                interval={xAxisInterval}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip content={<CustomTooltip filters={filters} />} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Line
                type="monotone"
                dataKey="filtered_total"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 5 }}
                name="Total Hours"
              />
              {filters.paid && snapshots.some(s => s.paid_hours != null) && (
                <Line
                  type="monotone"
                  dataKey="paid_hours"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  name="Paid Hours"
                />
              )}
              {filters.trial && snapshots.some(s => s.trial_hours != null && s.trial_hours > 0) && (
                <Line
                  type="monotone"
                  dataKey="trial_hours"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  name="Trial Hours"
                />
              )}
              {filters.free && snapshots.some(s => s.free_hours != null && s.free_hours > 0) && (
                <Line
                  type="monotone"
                  dataKey="free_hours"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  name="Free Hours"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 companies */}
        {topCompanies.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Top 5 Companies
              {latestWeekRange && (
                <span className="ml-1 font-normal text-muted-foreground/70">· {latestWeekRange}</span>
              )}
            </p>
            <div className="space-y-1.5">
              {topCompanies.map((c, i) => (
                <div
                  key={c.company_id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                      #{i + 1}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                      {c.company_id}
                    </span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {c.hours.toFixed(1)}h
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    {canAnalyze && (
      <WowAnalysisSheet
        open={analyzeOpen}
        onOpenChange={setAnalyzeOpen}
        defaultWeekA={defaultWeekA}
        defaultWeekB={defaultWeekB}
      />
    )}
    </>
  );
};

export default WowUsageGrowthChart;
