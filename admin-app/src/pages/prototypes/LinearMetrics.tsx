import React, { useState } from 'react';
import { ChevronDown, Plus, AlertTriangle, Settings2, Trash2 } from 'lucide-react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { useMetrics, useTeams, MetricRow } from './usePrototypeData';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatValue = (value: number | null, unit: string): string => {
  if (value === null) return '—';
  if (unit === '$' || unit === 'currency' || unit === 'USD') return value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value}`;
  if (unit === '%' || unit === 'percent') return `${value}%`;
  if (unit === 'score' || unit === 'rating') return String(value);
  return value >= 1000 ? value.toLocaleString() : String(value);
};

const getCellStatus = (metric: MetricRow, value: number | null): 'good' | 'warning' | 'bad' | 'neutral' => {
  if (value === null || metric.target_value === null) return 'neutral';
  const isAbove = metric.target_logic !== 'below';
  if (isAbove) {
    if (value >= metric.target_value) return 'good';
    if (value >= metric.target_value * 0.85) return 'warning';
    return 'bad';
  } else {
    if (value <= metric.target_value) return 'good';
    if (value <= metric.target_value * 1.15) return 'warning';
    return 'bad';
  }
};

const CELL_STYLES: Record<string, string> = { good: '', warning: 'text-amber-400', bad: 'text-red-400', neutral: '' };
const CELL_BG: Record<string, string> = { good: '', warning: 'bg-amber-500/[0.04]', bad: 'bg-destructive/[0.04]', neutral: '' };

// ─── Sparkline ──────────────────────────────────────────────────────────────

const Sparkline = ({ values, accentColor, mutedColor, width = 50, height = 16 }: { values: (number | null)[]; accentColor: string; mutedColor: string; width?: number; height?: number }) => {
  const validValues = values.filter((v): v is number => v !== null);
  if (validValues.length < 2) return <span style={{ color: mutedColor }}>—</span>;
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const range = max - min || 1;
  const points = validValues.map((v, i) => `${(i / (validValues.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={points} fill="none" stroke={accentColor} strokeWidth="1.5" />
    </svg>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────

const LinearMetrics: React.FC = () => {
  const { metrics, weeks, loading: metricsLoading } = useMetrics();
  const { teams, loading: teamsLoading } = useTeams();
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loading = metricsLoading || teamsLoading;
  const teamNames = ['All Teams', ...teams.map(t => t.name)];

  // Last 4 weeks for display
  const displayWeeks = weeks.slice(-4);

  const filteredMetrics = metrics
    .filter(m => teamFilter === 'All Teams' || m.team_name === teamFilter)
    .filter(m => searchQuery === '' || m.metric_name.toLowerCase().includes(searchQuery.toLowerCase()));

  const issueCount = filteredMetrics.reduce((count, m) => {
    return count + displayWeeks.filter(w => {
      const status = getCellStatus(m, m.weeklyValues[w] ?? null);
      return status === 'bad' || status === 'warning';
    }).length;
  }, 0);

  const formatWeekLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <LinearLayout activeLabel="Metrics" searchPlaceholder="Search metrics..." maxWidth="1100px">
      {({ t, theme }) => {
        if (loading) return <LoadingSkeleton t={t} rows={10} />;

        return (
          <>
            {/* ── Page heading ── */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Metrics</h1>
                <div className="flex items-center gap-3 text-[13px]" style={{ color: t.textMuted }}>
                  <span>{filteredMetrics.length} metrics</span>
                  {issueCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-400/70">
                      <AlertTriangle size={12} />
                      {issueCount} off-track
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setTeamDropdownOpen(!teamDropdownOpen)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border bg-transparent text-[12px]" style={{ borderColor: t.border, color: t.textSecondary }}>
                    {teamFilter}
                    <ChevronDown size={12} />
                  </button>
                  {teamDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-[180px] rounded-[6px] border py-1 z-10" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                      {teamNames.map(team => (
                        <button key={team} onClick={() => { setTeamFilter(team); setTeamDropdownOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] transition-colors" style={{ color: teamFilter === team ? t.textPrimary : t.textSecondary }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          {team}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Weekly metrics spreadsheet ── */}
            <div className="rounded-[6px] border overflow-hidden" style={{ borderColor: t.border }}>
              <div className="grid grid-cols-[1fr_90px_90px_90px_90px_90px_60px_80px] border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                <div className="px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] font-medium" style={{ color: t.textMuted }}>Metric</div>
                <div className="px-3 py-2.5 text-[11px] uppercase tracking-[0.06em] font-medium text-center" style={{ color: t.textMuted }}>Owner</div>
                {displayWeeks.map(week => (
                  <div key={week} className="px-3 py-2.5 text-[11px] uppercase tracking-[0.06em] font-medium text-center border-l" style={{ color: t.textMuted, borderColor: t.border }}>
                    {formatWeekLabel(week)}
                  </div>
                ))}
                {/* Pad if fewer than 4 weeks */}
                {Array.from({ length: Math.max(0, 4 - displayWeeks.length) }).map((_, i) => (
                  <div key={`pad-${i}`} className="px-3 py-2.5 text-[11px] text-center border-l" style={{ color: t.textMuted, borderColor: t.border }}>—</div>
                ))}
                <div className="px-1 py-2.5 text-[11px] uppercase tracking-[0.06em] font-medium text-center border-l" style={{ color: t.textMuted, borderColor: t.border }}>Trend</div>
                <div className="px-3 py-2.5 text-[11px] uppercase tracking-[0.06em] font-medium text-center border-l" style={{ color: t.textMuted, borderColor: t.border }}>Target</div>
              </div>

              {filteredMetrics.length === 0 && (
                <div className="px-4 py-8 text-center" style={{ color: t.textMuted }}>No metrics found</div>
              )}

              {filteredMetrics.map((metric, i) => {
                const weekValues = displayWeeks.map(w => metric.weeklyValues[w] ?? null);
                return (
                  <div
                    key={metric.id}
                    className={`grid grid-cols-[1fr_90px_90px_90px_90px_90px_60px_80px] items-center transition-colors ${i < filteredMetrics.length - 1 ? 'border-b' : ''}`}
                    style={{ borderColor: t.border }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div className="px-4 py-3 flex items-center gap-2 min-w-0">
                      <span className="text-[13px] truncate" style={{ color: t.textPrimary }}>{metric.metric_name}</span>
                      {weekValues.some(v => getCellStatus(metric, v) === 'bad') && (
                        <AlertTriangle size={11} className="text-red-400/70 flex-shrink-0" />
                      )}
                    </div>
                    <div className="px-3 py-3 flex items-center justify-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0" style={{ backgroundColor: t.avatarBg, color: t.accent }}>{metric.owner_initials}</div>
                      <span className="text-[11px] truncate" style={{ color: t.textMuted }}>{metric.owner_name.split(' ')[0]}</span>
                    </div>
                    {displayWeeks.map((week, wi) => {
                      const value = metric.weeklyValues[week] ?? null;
                      const status = getCellStatus(metric, value);
                      return (
                        <div key={week} className={`px-3 py-3 text-center border-l ${CELL_BG[status]}`} style={{ borderColor: t.border }}>
                          <span className={`text-[13px] font-mono ${CELL_STYLES[status]}`} style={value === null ? { color: t.textMuted } : (status === 'good' || status === 'neutral' ? { color: t.textPrimary } : undefined)}>
                            {formatValue(value, metric.unit)}
                          </span>
                        </div>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 4 - displayWeeks.length) }).map((_, pi) => (
                      <div key={`pad-${pi}`} className="px-3 py-3 text-center border-l" style={{ borderColor: t.border, color: t.textMuted }}>—</div>
                    ))}
                    <div className="px-1 py-3 flex items-center justify-center border-l" style={{ borderColor: t.border }}>
                      <Sparkline values={weekValues} accentColor={t.accent} mutedColor={t.textMuted} />
                    </div>
                    <div className="px-3 py-3 text-center border-l" style={{ borderColor: t.border, color: t.textMuted }}>
                      <span className="text-[12px] font-mono">
                        {metric.target_value !== null ? `${metric.target_logic === 'below' ? '<' : ''}${metric.target_value}` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-4 mt-4 text-[11px]" style={{ color: t.textMuted }}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive/60" />Off-track</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500/60" />Warning</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500/60" />On-track</span>
              <span className="flex items-center gap-1.5 ml-auto"><span style={{ color: t.textMuted }}>—</span>No data</span>
            </div>

            <FooterHint t={t} />
          </>
        );
      }}
    </LinearLayout>
  );
};

export default LinearMetrics;
