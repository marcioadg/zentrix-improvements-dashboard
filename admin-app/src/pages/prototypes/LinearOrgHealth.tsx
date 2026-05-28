import React from 'react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { useHealthAssessments, formatDate } from './usePrototypeData';

const STATUS_COLORS: Record<string, string> = {
  open: 'text-emerald-400',
  closed: 'text-muted-foreground',
  draft: 'text-amber-400',
};

const getScoreColor = (score: number | null) => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
};

const getScoreLabel = (score: number | null) => {
  if (score === null) return 'No data';
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Moderate';
  return 'At Risk';
};

const LinearOrgHealth: React.FC = () => {
  const { assessments, loading } = useHealthAssessments();

  const latestAssessment = assessments[0];
  const openAssessments = assessments.filter(a => a.status === 'open');
  const closedAssessments = assessments.filter(a => a.status === 'closed');
  const avgScore = assessments.filter(a => a.overall_score !== null).length > 0
    ? Math.round(assessments.filter(a => a.overall_score !== null).reduce((sum, a) => sum + (a.overall_score || 0), 0) / assessments.filter(a => a.overall_score !== null).length)
    : null;

  return (
    <LinearLayout activeLabel="Org Health" searchPlaceholder="Search assessments...">
      {({ t, theme }) => {
        if (loading) return <LoadingSkeleton t={t} rows={8} />;

        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Org Health</h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>
                  {assessments.length} assessments · {openAssessments.length} active
                </p>
              </div>
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-4 gap-px mb-6 rounded-[6px] overflow-hidden border" style={{ borderColor: t.border }}>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Overall Score</div>
                <span className={`text-[24px] font-semibold tracking-[-0.04em] ${getScoreColor(avgScore)}`}>
                  {avgScore !== null ? avgScore : '—'}
                </span>
                {avgScore !== null && <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>{getScoreLabel(avgScore)}</div>}
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Active Assessments</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-emerald-400">{openAssessments.length}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Completed</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.accent }}>{closedAssessments.length}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Total Respondents</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.textPrimary }}>
                  {assessments.reduce((sum, a) => sum + (a.respondent_count || 0), 0)}
                </span>
              </div>
            </div>

            {/* ── Latest assessment highlight ── */}
            {latestAssessment && (
              <div className="rounded-[6px] border p-5 mb-6" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>Latest Assessment</h2>
                  <span className={`text-[11px] ${STATUS_COLORS[latestAssessment.status] || 'text-muted-foreground'}`}>
                    {latestAssessment.status === 'open' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />}
                    {latestAssessment.status}
                  </span>
                </div>
                <div className="text-[13px] mb-2" style={{ color: t.textPrimary }}>{latestAssessment.title}</div>
                <div className="flex items-center gap-4 text-[12px]" style={{ color: t.textMuted }}>
                  <span>Date: {formatDate(latestAssessment.assessment_date)}</span>
                  {latestAssessment.overall_score !== null && (
                    <span>Score: <span className={getScoreColor(latestAssessment.overall_score)}>{latestAssessment.overall_score}/100</span></span>
                  )}
                  {latestAssessment.respondent_count !== null && (
                    <span>{latestAssessment.respondent_count} respondents</span>
                  )}
                </div>
              </div>
            )}

            {/* ── All assessments ── */}
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] mb-2" style={{ color: t.textPrimary }}>All Assessments</h2>
            <div className="rounded-[6px] border overflow-hidden" style={{ borderColor: t.border }}>
              <div className="grid grid-cols-[1fr_100px_90px_90px_80px] gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.06em] font-medium border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border, color: t.textMuted }}>
                <span>Title</span>
                <span>Date</span>
                <span>Score</span>
                <span>Responses</span>
                <span>Status</span>
              </div>

              {assessments.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px]" style={{ color: t.textMuted }}>No health assessments found.</div>
              )}

              {assessments.map((assessment, i) => (
                <div
                  key={assessment.id}
                  className={`grid grid-cols-[1fr_100px_90px_90px_80px] gap-2 px-4 py-3 items-center transition-colors cursor-pointer ${i < assessments.length - 1 ? 'border-b' : ''}`}
                  style={{ borderColor: t.border }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span className="text-[13px] truncate" style={{ color: t.textPrimary }}>{assessment.title}</span>
                  <span className="text-[12px]" style={{ color: t.textMuted }}>{formatDate(assessment.assessment_date)}</span>
                  <span className={`text-[13px] font-mono ${getScoreColor(assessment.overall_score)}`}>
                    {assessment.overall_score !== null ? `${assessment.overall_score}/100` : '—'}
                  </span>
                  <span className="text-[12px]" style={{ color: t.textMuted }}>{assessment.respondent_count ?? '—'}</span>
                  <span className={`text-[11px] capitalize ${STATUS_COLORS[assessment.status] || 'text-muted-foreground'}`}>
                    {assessment.status}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Score legend ── */}
            <div className="flex items-center gap-4 mt-4 text-[11px]" style={{ color: t.textMuted }}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500/60" />Healthy (80+)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500/60" />Moderate (60-79)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive/60" />At Risk (&lt;60)</span>
            </div>

            <FooterHint t={t} />
          </>
        );
      }}
    </LinearLayout>
  );
};

export default LinearOrgHealth;
