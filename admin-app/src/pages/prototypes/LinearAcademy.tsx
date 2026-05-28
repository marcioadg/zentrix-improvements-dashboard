import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock } from 'lucide-react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { useTrainingProgressData } from './usePrototypeData';

// Static learning paths data (mirrors the production academyContent.ts)
const LEARNING_PATHS = [
  { slug: 'leadership-fundamentals', title: 'Leadership Fundamentals', category: 'Leadership', totalLessons: 8, estimatedMinutes: 120 },
  { slug: 'eos-mastery', title: 'EOS Mastery', category: 'Operations', totalLessons: 10, estimatedMinutes: 150 },
  { slug: 'sales-excellence', title: 'Sales Excellence', category: 'Sales', totalLessons: 7, estimatedMinutes: 90 },
  { slug: 'data-driven-decisions', title: 'Data-Driven Decisions', category: 'Analytics', totalLessons: 6, estimatedMinutes: 80 },
  { slug: 'team-management', title: 'Team Management', category: 'Leadership', totalLessons: 8, estimatedMinutes: 100 },
  { slug: 'strategic-planning', title: 'Strategic Planning', category: 'Strategy', totalLessons: 6, estimatedMinutes: 90 },
  { slug: 'customer-success', title: 'Customer Success', category: 'Growth', totalLessons: 5, estimatedMinutes: 60 },
];

const CATEGORY_COLORS: Record<string, string> = {
  Leadership: 'bg-purple-500/20 text-purple-400',
  Operations: 'bg-yellow-500/20 text-yellow-400',
  Sales: 'bg-primary/20 text-blue-400',
  Analytics: 'bg-cyan-500/20 text-cyan-400',
  Strategy: 'bg-emerald-500/20 text-emerald-400',
  Growth: 'bg-orange-500/20 text-orange-400',
};

const LinearAcademy: React.FC = () => {
  const { progress, loading } = useTrainingProgressData();
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', ...new Set(LEARNING_PATHS.map(p => p.category))];

  // Calculate completion per path
  const getPathProgress = (pathSlug: string) => {
    const pathLessons = progress.filter(p => p.path_slug === pathSlug);
    const completedLessons = pathLessons.filter(p => p.status === 'completed').length;
    const path = LEARNING_PATHS.find(p => p.slug === pathSlug);
    const total = path?.totalLessons || 1;
    return {
      completed: completedLessons,
      total,
      percentage: Math.round((completedLessons / total) * 100),
      status: completedLessons === 0 ? 'not_started' : completedLessons >= total ? 'completed' : 'in_progress',
    };
  };

  const filteredPaths = categoryFilter === 'All'
    ? LEARNING_PATHS
    : LEARNING_PATHS.filter(p => p.category === categoryFilter);

  const allPathProgress = LEARNING_PATHS.map(p => getPathProgress(p.slug));
  const inProgressCount = allPathProgress.filter(p => p.status === 'in_progress').length;
  const completedCount = allPathProgress.filter(p => p.status === 'completed').length;
  const overallProgress = allPathProgress.length > 0
    ? Math.round(allPathProgress.reduce((sum, p) => sum + p.percentage, 0) / allPathProgress.length)
    : 0;

  return (
    <LinearLayout activeLabel="Academy" searchPlaceholder="Search courses...">
      {({ t, theme }) => {
        if (loading) return <LoadingSkeleton t={t} rows={6} />;

        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>
                  <BookOpen size={20} className="inline mr-2" style={{ color: t.accent }} />
                  Zentrix Academy
                </h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>
                  {LEARNING_PATHS.length} learning paths available
                </p>
              </div>
            </div>

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-4 gap-px mb-6 rounded-[6px] overflow-hidden border" style={{ borderColor: t.border }}>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Overall Progress</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.accent }}>{overallProgress}%</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>In Progress</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-amber-400">{inProgressCount}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Completed</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-emerald-400">{completedCount}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Total Paths</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.textPrimary }}>{LEARNING_PATHS.length}</span>
              </div>
            </div>

            {/* ── Category filter ── */}
            <div className="flex items-center gap-1 mb-4 flex-wrap">
              {categories.map(cat => {
                const isActive = categoryFilter === cat;
                return (
                  <button key={cat} onClick={() => setCategoryFilter(cat)} className="px-3 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors" style={{ backgroundColor: isActive ? t.active : 'transparent', color: isActive ? t.textPrimary : t.textMuted }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = t.hover; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* ── Course cards ── */}
            <div className="grid grid-cols-2 gap-3">
              {filteredPaths.map(path => {
                const prog = getPathProgress(path.slug);
                return (
                  <div
                    key={path.slug}
                    className="rounded-[6px] border p-4 transition-colors cursor-pointer"
                    style={{ borderColor: t.border, backgroundColor: t.cardBg }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = t.cardBg)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] ${CATEGORY_COLORS[path.category] || 'bg-gray-500/20 text-muted-foreground'}`}>
                        {path.category}
                      </span>
                      {prog.status === 'completed' ? (
                        <CheckCircle size={14} className="text-emerald-400" />
                      ) : prog.status === 'in_progress' ? (
                        <span className="text-[11px] font-mono" style={{ color: t.accent }}>{prog.percentage}%</span>
                      ) : (
                        <span className="text-[11px]" style={{ color: t.textMuted }}>Not started</span>
                      )}
                    </div>
                    <div className="text-[14px] font-semibold mb-1" style={{ color: t.textPrimary }}>{path.title}</div>
                    <div className="flex items-center gap-3 text-[11px] mb-3" style={{ color: t.textMuted }}>
                      <span className="flex items-center gap-1"><BookOpen size={10} />{path.totalLessons} lessons</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{path.estimatedMinutes}m</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
                      <div
                        className={`h-full rounded-full transition-all ${prog.status === 'completed' ? 'bg-emerald-500' : 'bg-[#5c84fe]'}`}
                        style={{ width: `${prog.percentage}%` }}
                      />
                    </div>
                    <div className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>
                      {prog.completed} of {prog.total} lessons completed
                    </div>
                  </div>
                );
              })}
            </div>

            <FooterHint t={t} />
          </>
        );
      }}
    </LinearLayout>
  );
};

export default LinearAcademy;
