import React, { useState } from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { CompLayout, CompLoadingSkeleton } from './CompLayout';
import { useMetrics, useTeams, MetricRow } from './usePrototypeData';

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

const Sparkline = ({ values, accentColor, mutedColor, width = 56, height = 18 }: { values: (number | null)[]; accentColor: string; mutedColor: string; width?: number; height?: number }) => {
  const validValues = values.filter((v): v is number => v !== null);
  if (validValues.length < 2) return <span style={{ color: mutedColor }}>—</span>;
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const range = max - min || 1;
  const points = validValues.map((v, i) => `${(i / (validValues.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={points} fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const CompMetrics: React.FC = () => {
  const { metrics, weeks, loading: metricsLoading } = useMetrics();
  const { teams, loading: teamsLoading } = useTeams();
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  const loading = metricsLoading || teamsLoading;
  const teamNames = ['All Teams', ...teams.map(t => t.name)];
  const displayWeeks = weeks.slice(-4);

  const filteredMetrics = metrics.filter(m => teamFilter === 'All Teams' || m.team_name === teamFilter);

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
    <CompLayout activeLabel="Metrics" searchPlaceholder="Search metrics..." maxWidth="1140px">
      {({ t }) => {
        if (loading) return <CompLoadingSkeleton t={t} rows={10} />;

        const cellColorMap = {
          good: { bg: 'transparent', text: t.successDark },
          warning: { bg: 'rgba(238,186,29,0.08)', text: t.warningDark },
          bad: { bg: 'rgba(201,56,58,0.06)', text: t.errorDark },
          neutral: { bg: 'transparent', text: t.textMuted },
        };

        return (
          <>
            {/* ── Page heading ── */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[24px] font-semibold tracking-[-0.02em] mb-1" style={{ color: t.textPrimary }}>Metrics</h1>
                <div className="flex items-center gap-3 text-[14px]" style={{ color: t.textMuted }}>
                  <span>{filteredMetrics.length} metrics</span>
                  {issueCount > 0 && (
                    <span className="flex items-center gap-1.5" style={{ color: t.warningDark }}>
                      <AlertTriangle size={13} />
                      {issueCount} off-track
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-[8px] border text-[14px] transition-colors"
                  style={{ borderColor: t.border, color: t.textSecondary, backgroundColor: t.cardBg }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = t.cardBg)}
                >
                  {teamFilter}
                  <ChevronDown size={14} />
                </button>
                {teamDropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-[200px] rounded-[12px] border py-1.5 z-10"
                    style={{ borderColor: t.border, backgroundColor: t.cardBg, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  >
                    {teamNames.map(team => (
                      <button
                        key={team}
                        onClick={() => { setTeamFilter(team); setTeamDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-[14px] transition-colors"
                        style={{ color: teamFilter === team ? t.accent : t.textSecondary }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Weekly metrics spreadsheet ── */}
            <div className="rounded-[12px] border overflow-hidden" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
              {/* Header row */}
              <div
                className="grid grid-cols-[1fr_90px_90px_90px_90px_90px_64px_80px] border-b"
                style={{ backgroundColor: t.surfaceSecondary, borderColor: t.divider }}
              >
                <div className="px-5 py-3 text-[12px] uppercase tracking-[0.05em] font-medium" style={{ color: t.textMuted }}>Metric</div>
                <div className="px-3 py-3 text-[12px] uppercase tracking-[0.05em] font-medium text-center" style={{ color: t.textMuted }}>Owner</div>
                {displayWeeks.map(week => (
                  <div
                    key={week}
                    className="px-3 py-3 text-[12px] uppercase tracking-[0.05em] font-medium text-center border-l"
                    style={{ color: t.textMuted, borderColor: t.divider }}
                  >
                    {formatWeekLabel(week)}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 4 - displayWeeks.length) }).map((_, i) => (
                  <div key={`pad-${i}`} className="px-3 py-3 text-[12px] text-center border-l" style={{ color: t.textMuted, borderColor: t.divider }}>—</div>
                ))}
                <div className="px-1 py-3 text-[12px] uppercase tracking-[0.05em] font-medium text-center border-l" style={{ color: t.textMuted, borderColor: t.divider }}>Trend</div>
                <div className="px-3 py-3 text-[12px] uppercase tracking-[0.05em] font-medium text-center border-l" style={{ color: t.textMuted, borderColor: t.divider }}>Target</div>
              </div>

              {filteredMetrics.length === 0 && (
                <div className="px-5 py-10 text-center text-[14px]" style={{ color: t.textMuted }}>No metrics found</div>
              )}

              {filteredMetrics.map((metric, i) => {
                const weekValues = displayWeeks.map(w => metric.weeklyValues[w] ?? null);
                return (
                  <div
                    key={metric.id}
                    className={`grid grid-cols-[1fr_90px_90px_90px_90px_90px_64px_80px] items-center transition-colors ${i < filteredMetrics.length - 1 ? 'border-b' : ''}`}
                    style={{ borderColor: t.divider }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div className="px-5 py-3.5 flex items-center gap-2 min-w-0">
                      <span className="text-[14px] truncate" style={{ color: t.textPrimary }}>{metric.metric_name}</span>
                      {weekValues.some(v => getCellStatus(metric, v) === 'bad') && (
                        <AlertTriangle size={12} style={{ color: t.error }} className="flex-shrink-0" />
                      )}
                    </div>
                    <div className="px-3 py-3.5 flex items-center justify-center gap-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                        style={{ backgroundColor: t.avatarBg, color: t.accentDark }}
                      >
                        {metric.owner_initials}
                      </div>
                      <span className="text-[12px] truncate" style={{ color: t.textMuted }}>{metric.owner_name.split(' ')[0]}</span>
                    </div>
                    {displayWeeks.map(week => {
                      const value = metric.weeklyValues[week] ?? null;
                      const status = getCellStatus(metric, value);
                      const colors = cellColorMap[status];
                      return (
                        <div
                          key={week}
                          className="px-3 py-3.5 text-center border-l"
                          style={{ borderColor: t.divider, backgroundColor: colors.bg }}
                        >
                          <span
                            className="text-[14px] font-mono font-medium"
                            style={{ color: value === null ? t.textDisabled : colors.text }}
                          >
                            {formatValue(value, metric.unit)}
                          </span>
                        </div>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 4 - displayWeeks.length) }).map((_, pi) => (
                      <div key={`pad-${pi}`} className="px-3 py-3.5 text-center border-l" style={{ borderColor: t.divider, color: t.textDisabled }}>—</div>
                    ))}
                    <div className="px-1 py-3.5 flex items-center justify-center border-l" style={{ borderColor: t.divider }}>
                      <Sparkline values={weekValues} accentColor={t.accent} mutedColor={t.textMuted} />
                    </div>
                    <div className="px-3 py-3.5 text-center border-l" style={{ borderColor: t.divider }}>
                      <span className="text-[13px] font-mono" style={{ color: t.textSecondary }}>
                        {metric.target_value !== null ? `${metric.target_logic === 'below' ? '<' : ''}${metric.target_value}` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-5 mt-5 text-[12px]" style={{ color: t.textMuted }}>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.error }} />Off-track
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.warning }} />Warning
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.success }} />On-track
              </span>
              <span className="flex items-center gap-2 ml-auto">
                <span style={{ color: t.textDisabled }}>—</span>No data
              </span>
            </div>
          </>
        );
      }}
    </CompLayout>
  );
};

export default CompMetrics;
