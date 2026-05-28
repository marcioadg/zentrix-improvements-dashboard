/**
 * MobileScorecardSection — v2 mirror of the desktop FullMeetingMetrics.
 *
 * Table-style card: avatar / metric / target / value, with a compact week
 * stepper and All / On-target / Off-target filter. Wires the same hook
 * (useWeeklyMetrics) and reuses its formatValue / checkTargetCondition so the
 * on/off-target logic matches desktop exactly.
 */
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTargetLogicSymbol } from '@/utils/metricUtils';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { cn } from '@/lib/utils';
import { MobileSectionShell, MobileAvatar } from './MobileSectionPrimitives';

interface MobileScorecardSectionProps {
  teamId: string;
  eyebrow?: React.ReactNode;
}

type Filter = 'all' | 'on' | 'off';

export const MobileScorecardSection: React.FC<MobileScorecardSectionProps> = ({
  teamId,
  eyebrow,
}) => {
  const {
    metrics,
    loading,
    getLast13WeeksStartDates,
    formatWeekDate,
    currentWeekStart,
    checkTargetCondition,
    formatValue,
  } = useWeeklyMetrics(teamId);

  const weeks = useMemo(() => {
    const list = (getLast13WeeksStartDates?.() ?? []).slice();
    list.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    if (currentWeekStart && !list.includes(currentWeekStart)) list.push(currentWeekStart);
    return list;
  }, [getLast13WeeksStartDates, currentWeekStart]);

  const [weekIdx, setWeekIdx] = useState<number | null>(null);
  const effectiveIdx =
    weekIdx ?? Math.max(0, weeks.indexOf(currentWeekStart) === -1 ? weeks.length - 1 : weeks.indexOf(currentWeekStart));
  const selectedWeek = weeks[effectiveIdx];

  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    return metrics
      .filter((m) => !m.archived)
      .map((m) => {
        const value =
          selectedWeek != null ? m.weeklyValues?.[selectedWeek] ?? null : m.metric_value;
        const onTarget =
          value != null && m.target_value != null
            ? checkTargetCondition(value, m.target_value, m.target_logic || 'greater_than_or_equal')
            : null;
        return { m, value, onTarget };
      });
  }, [metrics, selectedWeek, checkTargetCondition]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      on: rows.filter((r) => r.onTarget === true).length,
      off: rows.filter((r) => r.onTarget === false).length,
    }),
    [rows],
  );

  const visibleRows = rows.filter((r) => {
    if (filter === 'on') return r.onTarget === true;
    if (filter === 'off') return r.onTarget === false;
    return true;
  });

  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'on', label: 'On target' },
    { id: 'off', label: 'Off target' },
  ];

  return (
    <MobileSectionShell
      eyebrow={eyebrow}
      title="Scorecard."
      sub="Weekly metrics — review off-target first."
    >
      {/* filter + week stepper */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1.5 border transition-colors',
              filter === t.id
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border',
            )}
          >
            {t.label}
            <span
              className={cn(
                'text-[9.5px] tabular-nums px-1 py-px rounded',
                filter === t.id ? 'bg-background/15' : 'bg-muted',
              )}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
        <div className="flex-1" />
        {weeks.length > 0 && (
          <div className="inline-flex items-center gap-0.5 bg-card border border-border rounded-full pl-1 pr-1 py-0.5">
            <button
              type="button"
              aria-label="Previous week"
              disabled={effectiveIdx <= 0}
              onClick={() => setWeekIdx(Math.max(0, effectiveIdx - 1))}
              className="w-5 h-5 rounded-full flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft className="h-3 w-3 text-foreground" />
            </button>
            <span className="text-[10.5px] text-muted-foreground tabular-nums whitespace-nowrap px-1">
              {selectedWeek ? formatWeekDate(selectedWeek) : '—'}
            </span>
            <button
              type="button"
              aria-label="Next week"
              disabled={effectiveIdx >= weeks.length - 1}
              onClick={() => setWeekIdx(Math.min(weeks.length - 1, effectiveIdx + 1))}
              className="w-5 h-5 rounded-full flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight className="h-3 w-3 text-foreground" />
            </button>
          </div>
        )}
      </div>

      {loading && metrics.length === 0 ? (
        <div className="text-center py-8 text-[12.5px] text-muted-foreground">Loading scorecard…</div>
      ) : visibleRows.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl py-6 text-center text-[12.5px] text-muted-foreground">
          {metrics.length === 0 ? 'No metrics for this team yet.' : 'Nothing in this filter.'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[24px_1fr_auto_auto] gap-2 px-3 py-2 bg-muted/40 border-b border-border text-[9.5px] uppercase tracking-[0.06em] text-muted-foreground">
            <span />
            <span>Metric</span>
            <span className="text-right">Target</span>
            <span className="text-right">Value</span>
          </div>
          {visibleRows.map(({ m, value, onTarget }, i) => (
            <div
              key={m.id}
              className={cn(
                'grid grid-cols-[24px_1fr_auto_auto] gap-2 px-3 py-2.5 items-center',
                i < visibleRows.length - 1 && 'border-b border-border/60',
                onTarget === false && 'bg-destructive/[0.03]',
              )}
            >
              <MobileAvatar name={m.owner} colorKey={m.owner_id} size={20} />
              <div className="text-[12.5px] font-medium text-foreground truncate min-w-0">
                {m.metric_name}
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums text-right whitespace-nowrap">
                {m.target_value != null
                  ? `${getTargetLogicSymbol(m.target_logic || 'greater_than_or_equal')} ${formatValue(m.target_value, m.unit)}`
                  : '—'}
              </div>
              <div
                className={cn(
                  'text-[12px] font-semibold tabular-nums text-right whitespace-nowrap',
                  onTarget === true && 'text-success',
                  onTarget === false && 'text-destructive',
                  onTarget === null && 'text-muted-foreground',
                )}
              >
                {formatValue(value, m.unit)}
              </div>
            </div>
          ))}
        </div>
      )}
    </MobileSectionShell>
  );
};

export default MobileScorecardSection;
