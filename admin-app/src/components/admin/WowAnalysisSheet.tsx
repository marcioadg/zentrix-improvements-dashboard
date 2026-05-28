import React, { useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sparkles,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  AlertTriangle,
  Activity,
  Minus,
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import {
  useWowAnalysis,
  type CompanyDelta,
  type CohortDelta,
  type CompareDeltas,
  type TrendDeltas,
  type CompanyTrajectory,
  type CohortTrendSummary,
  type Trajectory,
} from '@/hooks/useWowAnalysis';

interface WowAnalysisSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWeekA: string;
  defaultWeekB: string;
}

type Mode = 'compare' | 'trend';

const formatWeekLabel = (weekStartISO: string): string => {
  const start = parseISO(weekStartISO);
  const end = addDays(start, 6);
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
};

const formatWeekShort = (weekStartISO: string): string =>
  format(parseISO(weekStartISO), 'MMM d');

const formatSignedHours = (h: number): string =>
  `${h > 0 ? '+' : h < 0 ? '−' : ''}${Math.abs(h).toFixed(1)}h`;
const formatSignedPct = (pct: number | null): string => {
  if (pct == null) return 'n/a';
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
};
const formatSignedSlope = (slope: number): string =>
  `${slope > 0 ? '+' : ''}${slope.toFixed(2)}h/wk`;

// ---------------------------------------------------------------------------
// Compare-mode subcomponents
// ---------------------------------------------------------------------------

const DeltaTable: React.FC<{
  rows: CompanyDelta[];
  emptyMessage: string;
  showDeltaPct?: boolean;
  highlightSign?: 'positive' | 'negative' | null;
}> = ({ rows, emptyMessage, showDeltaPct = true, highlightSign = null }) => {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-2">{emptyMessage}</p>;
  }
  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Company</th>
            <th className="text-right px-3 py-2 font-medium">Week A</th>
            <th className="text-right px-3 py-2 font-medium">Week B</th>
            <th className="text-right px-3 py-2 font-medium">Δ</th>
            {showDeltaPct && <th className="text-right px-3 py-2 font-medium">Δ%</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const deltaColor =
              highlightSign === 'positive'
                ? 'text-green-600 dark:text-green-400'
                : highlightSign === 'negative'
                  ? 'text-red-600 dark:text-red-400'
                  : '';
            return (
              <tr key={r.company_id} className="border-t">
                <td className="px-3 py-2 truncate max-w-[220px]" title={r.name}>
                  {r.name}
                </td>
                <td className="text-right px-3 py-2 font-mono">{r.hours_a.toFixed(1)}h</td>
                <td className="text-right px-3 py-2 font-mono">{r.hours_b.toFixed(1)}h</td>
                <td className={`text-right px-3 py-2 font-mono font-semibold ${deltaColor}`}>
                  {formatSignedHours(r.delta_hours)}
                </td>
                {showDeltaPct && (
                  <td className={`text-right px-3 py-2 font-mono ${deltaColor}`}>
                    {formatSignedPct(r.delta_pct)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const CompareHeadline: React.FC<{ deltas: CompareDeltas }> = ({ deltas }) => {
  const { total, week_a_start, week_b_start } = deltas;
  const isUp = total.delta_hours > 0;
  const isDown = total.delta_hours < 0;
  const colorClass = isUp
    ? 'text-green-600 dark:text-green-400'
    : isDown
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : null;
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">
        {formatWeekLabel(week_a_start)} → {formatWeekLabel(week_b_start)}
      </p>
      <p className={`mt-1 text-2xl font-bold flex items-center gap-2 ${colorClass}`}>
        {Icon && <Icon className="h-6 w-6" />}
        {formatSignedHours(total.delta_hours)}
        <span className="text-base font-normal">({formatSignedPct(total.delta_pct)})</span>
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {total.hours_a.toFixed(1)}h → {total.hours_b.toFixed(1)}h · paid + trial only
      </p>
    </div>
  );
};

const CompareCohortCard: React.FC<{
  label: string;
  tone: 'paid' | 'trial';
  cohort: CohortDelta;
}> = ({ label, tone, cohort }) => {
  const isUp = cohort.delta_hours > 0;
  const isDown = cohort.delta_hours < 0;
  const cls = isUp
    ? 'text-green-600 dark:text-green-400'
    : isDown
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground';
  const accent = tone === 'paid' ? 'border-l-2 border-l-primary' : 'border-l-2 border-l-amber-400';
  return (
    <div className={`rounded-md border ${accent} p-3`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono font-semibold text-sm ${cls}`}>
        {formatSignedHours(cohort.delta_hours)}{' '}
        <span className="text-xs font-normal">({formatSignedPct(cohort.delta_pct)})</span>
      </p>
      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
        {cohort.hours_a.toFixed(1)}h → {cohort.hours_b.toFixed(1)}h
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        {cohort.active_companies_a} → {cohort.active_companies_b} active
      </p>
    </div>
  );
};

const CompareDrilldown: React.FC<{ title: string; cohort: CohortDelta }> = ({ title, cohort }) => (
  <section className="space-y-3">
    <h4 className="text-sm font-semibold">{title}</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
          Top gainers
        </p>
        <DeltaTable rows={cohort.top_gainers} emptyMessage="No gainers." highlightSign="positive" />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
          Top losers
        </p>
        <DeltaTable rows={cohort.top_losers} emptyMessage="No losers." highlightSign="negative" />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
          Newly active
        </p>
        <DeltaTable
          rows={cohort.newly_active}
          emptyMessage="None."
          showDeltaPct={false}
          highlightSign="positive"
        />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
          Churned
        </p>
        <DeltaTable
          rows={cohort.churned}
          emptyMessage="None."
          showDeltaPct={false}
          highlightSign="negative"
        />
      </div>
    </div>
  </section>
);

// ---------------------------------------------------------------------------
// Trend-mode subcomponents
// ---------------------------------------------------------------------------

const trajectoryColor = (t: Trajectory): string => {
  switch (t) {
    case 'rising':
      return 'text-green-600 dark:text-green-400';
    case 'falling':
      return 'text-red-600 dark:text-red-400';
    case 'volatile':
      return 'text-amber-600 dark:text-amber-400';
    case 'flat':
      return 'text-muted-foreground';
  }
};

const TrajectoryBadge: React.FC<{ t: Trajectory }> = ({ t }) => {
  const Icon =
    t === 'rising' ? TrendingUp : t === 'falling' ? TrendingDown : t === 'volatile' ? Activity : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide ${trajectoryColor(t)}`}
    >
      <Icon className="h-3 w-3" /> {t}
    </span>
  );
};

const Sparkline: React.FC<{ values: number[]; tone?: 'paid' | 'trial' }> = ({ values, tone }) => {
  if (values.length < 2) return null;
  const w = 80;
  const h = 20;
  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values);
  const range = Math.max(max - min, 0.0001);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke = tone === 'paid' ? 'currentColor' : tone === 'trial' ? 'rgb(251 191 36)' : 'currentColor';
  return (
    <svg width={w} height={h} className={tone === 'paid' ? 'text-primary' : ''}>
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} />
    </svg>
  );
};

const TrendHeadline: React.FC<{ deltas: TrendDeltas }> = ({ deltas }) => {
  const { paid_summary, trial_summary, weeks_count, range_start, range_end } = deltas;
  const overallChange = paid_summary.change_hours + trial_summary.change_hours;
  const overallStart = paid_summary.first_hours + trial_summary.first_hours;
  const overallPct =
    overallStart === 0 ? null : Math.round((overallChange / overallStart) * 1000) / 10;
  const isUp = overallChange > 0;
  const isDown = overallChange < 0;
  const colorClass = isUp
    ? 'text-green-600 dark:text-green-400'
    : isDown
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">
        {formatWeekLabel(range_start)} → {format(parseISO(range_end), 'MMM d, yyyy')} ·{' '}
        {weeks_count} weeks
      </p>
      <p className={`mt-1 text-2xl font-bold flex items-center gap-2 ${colorClass}`}>
        <Icon className="h-6 w-6" />
        {formatSignedHours(overallChange)}
        <span className="text-base font-normal">({formatSignedPct(overallPct)}) first → last</span>
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {(paid_summary.first_hours + trial_summary.first_hours).toFixed(1)}h →{' '}
        {(paid_summary.last_hours + trial_summary.last_hours).toFixed(1)}h · paid + trial only
      </p>
    </div>
  );
};

const TrendCohortCard: React.FC<{
  label: string;
  tone: 'paid' | 'trial';
  summary: CohortTrendSummary;
  weeklyHours: number[];
}> = ({ label, tone, summary, weeklyHours }) => {
  const accent = tone === 'paid' ? 'border-l-2 border-l-primary' : 'border-l-2 border-l-amber-400';
  const cls = trajectoryColor(summary.trajectory);
  return (
    <div className={`rounded-md border ${accent} p-3 flex flex-col gap-1`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <TrajectoryBadge t={summary.trajectory} />
      </div>
      <p className={`font-mono font-semibold text-sm ${cls}`}>
        {formatSignedSlope(summary.slope_per_week)}
      </p>
      <p className="text-[11px] text-muted-foreground font-mono">
        {summary.first_hours.toFixed(1)}h → {summary.last_hours.toFixed(1)}h
        {summary.change_pct != null && (
          <span className="ml-1">({formatSignedPct(summary.change_pct)})</span>
        )}
      </p>
      <div className="mt-1 opacity-80">
        <Sparkline values={weeklyHours} tone={tone} />
      </div>
    </div>
  );
};

const TopCompaniesTable: React.FC<{
  title: string;
  rows: CompanyTrajectory[];
  tone: 'paid' | 'trial';
}> = ({ title, rows, tone }) => {
  if (rows.length === 0) {
    return (
      <section className="space-y-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground italic">No active companies in this range.</p>
      </section>
    );
  }
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Company</th>
              <th className="text-right px-3 py-2 font-medium">Total</th>
              <th className="text-right px-3 py-2 font-medium">First → Last</th>
              <th className="text-right px-3 py-2 font-medium">Slope</th>
              <th className="text-left px-3 py-2 font-medium">Trend</th>
              <th className="text-left px-3 py-2 font-medium">Pattern</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.company_id} className="border-t">
                <td className="px-3 py-2 truncate max-w-[180px]" title={r.name}>
                  {r.name}
                </td>
                <td className="text-right px-3 py-2 font-mono">{r.total_hours.toFixed(1)}h</td>
                <td className="text-right px-3 py-2 font-mono">
                  {r.first_hours.toFixed(1)} → {r.last_hours.toFixed(1)}
                </td>
                <td
                  className={`text-right px-3 py-2 font-mono ${trajectoryColor(r.trajectory)}`}
                >
                  {formatSignedSlope(r.slope_per_week)}
                </td>
                <td className="px-3 py-2">
                  <TrajectoryBadge t={r.trajectory} />
                </td>
                <td className="px-3 py-2">
                  <Sparkline values={r.weekly_hours} tone={tone} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const WeeksTable: React.FC<{ deltas: TrendDeltas }> = ({ deltas }) => (
  <section className="space-y-2">
    <h4 className="text-sm font-semibold">Per-week totals</h4>
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Week</th>
            <th className="text-right px-3 py-2 font-medium">Paid</th>
            <th className="text-right px-3 py-2 font-medium">Trial</th>
            <th className="text-right px-3 py-2 font-medium">Active (P/T)</th>
          </tr>
        </thead>
        <tbody>
          {deltas.weeks.map((w) => (
            <tr key={w.week_start} className="border-t">
              <td className="px-3 py-2">{formatWeekShort(w.week_start)}</td>
              <td className="text-right px-3 py-2 font-mono">{w.paid_hours.toFixed(1)}h</td>
              <td className="text-right px-3 py-2 font-mono">{w.trial_hours.toFixed(1)}h</td>
              <td className="text-right px-3 py-2 font-mono text-muted-foreground">
                {w.paid_active} / {w.trial_active}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

// ---------------------------------------------------------------------------
// Main sheet
// ---------------------------------------------------------------------------

export const WowAnalysisSheet: React.FC<WowAnalysisSheetProps> = ({
  open,
  onOpenChange,
  defaultWeekA,
  defaultWeekB,
}) => {
  const [weekA, setWeekA] = useState(defaultWeekA);
  const [weekB, setWeekB] = useState(defaultWeekB);
  const [mode, setMode] = useState<Mode>('compare');
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const { loading, error, result, analyze, reset } = useWowAnalysis();

  useEffect(() => {
    if (!open || availableWeeks.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error: e } = await supabase
          .from('weekly_usage_snapshots')
          .select('week_start')
          .order('week_start', { ascending: false })
          .limit(1000);
        if (e) throw e;
        if (!cancelled) setAvailableWeeks((data ?? []).map((r) => r.week_start as string));
      } catch (err) {
        logger.error('WowAnalysisSheet: failed to load week list', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, availableWeeks.length]);

  useEffect(() => {
    if (!open) {
      setWeekA(defaultWeekA);
      setWeekB(defaultWeekB);
      setMode('compare');
    }
  }, [defaultWeekA, defaultWeekB, open]);

  // Auto-run on open. Only fires once per open.
  useEffect(() => {
    if (open && weekA && weekB && weekB > weekA) {
      analyze(weekA, weekB, { mode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sortedWeeks = useMemo(
    () => [...availableWeeks].sort((a, b) => (a < b ? 1 : -1)),
    [availableWeeks],
  );
  const weekBOptions = useMemo(
    () => sortedWeeks.filter((w) => w > weekA),
    [sortedWeeks, weekA],
  );

  const canAnalyze = weekA && weekB && weekB > weekA && !loading;

  const runAnalysis = () => {
    if (canAnalyze) analyze(weekA, weekB, { mode });
  };
  const refreshAnalysis = () => {
    if (canAnalyze) analyze(weekA, weekB, { mode, force_refresh: true });
  };

  useEffect(() => {
    if (weekA && weekB && weekA >= weekB) {
      const next = sortedWeeks.find((w) => w > weekA);
      if (next) setWeekB(next);
    }
  }, [weekA, weekB, sortedWeeks]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const weeksBetween = useMemo(() => {
    if (!weekA || !weekB || weekB <= weekA) return 0;
    const days = (parseISO(weekB).getTime() - parseISO(weekA).getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(days / 7) + 1;
  }, [weekA, weekB]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            WoW Usage Analysis
          </SheetTitle>
          <SheetDescription>
            Compare two weeks or analyze the trajectory across a range. Free-tier companies are
            excluded — analysis covers paid + trial customers only. Numbers come from SQL; the
            narrative is Claude reading those numbers, it can't invent figures.
          </SheetDescription>
        </SheetHeader>

        {/* Mode toggle */}
        <div className="mt-6 inline-flex rounded-md border p-0.5 bg-muted/30 text-xs">
          <button
            onClick={() => setMode('compare')}
            className={`px-3 py-1.5 rounded ${
              mode === 'compare' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
            }`}
            disabled={loading}
          >
            Compare 2 weeks
          </button>
          <button
            onClick={() => setMode('trend')}
            className={`px-3 py-1.5 rounded ${
              mode === 'trend' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
            }`}
            disabled={loading}
          >
            Analyze range ({weeksBetween}w)
          </button>
        </div>

        {/* Comparison selector */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] items-end gap-3 mt-3 mb-6">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {mode === 'compare' ? 'From (older week)' : 'Range start'}
            </label>
            <Select value={weekA} onValueChange={setWeekA}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a week" />
              </SelectTrigger>
              <SelectContent>
                {sortedWeeks.map((w) => (
                  <SelectItem key={w} value={w}>
                    {formatWeekLabel(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-muted-foreground pb-2 hidden sm:inline">
            {mode === 'compare' ? 'vs' : '→'}
          </span>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {mode === 'compare' ? 'To (newer week)' : 'Range end'}
            </label>
            <Select value={weekB} onValueChange={setWeekB}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a week" />
              </SelectTrigger>
              <SelectContent>
                {weekBOptions.map((w) => (
                  <SelectItem key={w} value={w}>
                    {formatWeekLabel(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runAnalysis} disabled={!canAnalyze} className="whitespace-nowrap">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
          </Button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground my-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            {mode === 'compare'
              ? 'Computing per-company deltas and asking Claude to narrate…'
              : `Computing ${weeksBetween}-week trajectory and asking Claude to narrate…`}
          </div>
        )}

        {error && !loading && (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Analysis failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && !loading && !error && (
          <div className="space-y-4">
            {result.deltas.mode === 'compare' ? (
              <>
                <CompareHeadline deltas={result.deltas} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <CompareCohortCard
                    label="Paid (revenue)"
                    tone="paid"
                    cohort={result.deltas.paid}
                  />
                  <CompareCohortCard
                    label="Trial (pipeline)"
                    tone="trial"
                    cohort={result.deltas.trial}
                  />
                </div>
              </>
            ) : (
              <>
                <TrendHeadline deltas={result.deltas} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <TrendCohortCard
                    label="Paid (revenue)"
                    tone="paid"
                    summary={result.deltas.paid_summary}
                    weeklyHours={result.deltas.weeks.map((w) => w.paid_hours)}
                  />
                  <TrendCohortCard
                    label="Trial (pipeline)"
                    tone="trial"
                    summary={result.deltas.trial_summary}
                    weeklyHours={result.deltas.weeks.map((w) => w.trial_hours)}
                  />
                </div>
              </>
            )}

            {/* AI narrative */}
            {result.narrative_error ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>AI narrative unavailable</AlertTitle>
                <AlertDescription>{result.narrative_error}</AlertDescription>
              </Alert>
            ) : result.narrative ? (
              <div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{result.narrative}</ReactMarkdown>
                </div>
                {result.cached && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                    <span>Cached result.</span>
                    <button
                      onClick={refreshAnalysis}
                      className="inline-flex items-center gap-1 underline hover:no-underline"
                    >
                      <RefreshCw className="h-3 w-3" /> Refresh
                    </button>
                  </p>
                )}
              </div>
            ) : null}

            {/* Drilldown — different content per mode */}
            <Collapsible className="border rounded-lg">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30">
                <span>
                  {result.deltas.mode === 'compare'
                    ? 'Raw deltas — who moved the needle'
                    : 'Raw data — weeks & top companies'}
                </span>
                <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-6">
                {result.deltas.mode === 'compare' ? (
                  <>
                    <CompareDrilldown title="Paid customers" cohort={result.deltas.paid} />
                    <CompareDrilldown title="Trial customers" cohort={result.deltas.trial} />
                  </>
                ) : (
                  <>
                    <WeeksTable deltas={result.deltas} />
                    <TopCompaniesTable
                      title="Top paid companies"
                      rows={result.deltas.top_companies_paid}
                      tone="paid"
                    />
                    <TopCompaniesTable
                      title="Top trial companies"
                      rows={result.deltas.top_companies_trial}
                      tone="trial"
                    />
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            <p className="text-[11px] text-muted-foreground border-t pt-3">
              Numbers computed deterministically from{' '}
              <code className="font-mono">company_usage_stats</code> with a 480-min/user/day cap.
              Free-tier and unclassified companies are excluded so cohort sums reconcile with the
              headline. The narrative is generated by {result.model ?? 'Claude'} based strictly on
              the structured deltas — it cannot invent figures.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default WowAnalysisSheet;
