import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { useStrategicPlans, useTeams, formatDate } from './usePrototypeData';

const LinearStrategy: React.FC = () => {
  const { plans, loading: plansLoading } = useStrategicPlans();
  const { teams, loading: teamsLoading } = useTeams();
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'strategy' | 'swot'>('strategy');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const loading = plansLoading || teamsLoading;
  const teamNames = ['All Teams', ...teams.map(t => t.name)];

  const filteredPlans = selectedTeam === 'All Teams' ? plans : plans.filter(p => p.team_name === selectedTeam);
  const activePlan = filteredPlans.find(p => p.id === selectedPlanId) || filteredPlans[0];

  const renderPlanData = (planData: any, t: any) => {
    if (!planData) return <div className="py-8 text-center text-[13px]" style={{ color: t.textMuted }}>No strategy data available</div>;

    // planData can be various formats - try to render adaptively
    if (typeof planData === 'string') {
      return <div className="text-[13px] whitespace-pre-wrap" style={{ color: t.textSecondary }}>{planData}</div>;
    }

    if (Array.isArray(planData)) {
      return (
        <div className="space-y-4">
          {planData.map((item: any, i: number) => (
            <div key={i} className="rounded-[6px] border p-4" style={{ borderColor: t.border }}>
              {item.title && <div className="text-[14px] font-semibold mb-2" style={{ color: t.textPrimary }}>{item.title}</div>}
              {item.description && <div className="text-[12px] mb-2" style={{ color: t.textSecondary }}>{item.description}</div>}
              {item.content && <div className="text-[12px]" style={{ color: t.textSecondary }}>{item.content}</div>}
              {item.keyResults && Array.isArray(item.keyResults) && (
                <div className="mt-3 space-y-2">
                  {item.keyResults.map((kr: any, ki: number) => (
                    <div key={ki} className="flex items-center gap-2 text-[12px]">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${kr.status === 'complete' ? 'bg-emerald-500' : kr.status === 'at_risk' ? 'bg-destructive' : 'bg-primary'}`} />
                      <span style={{ color: t.textPrimary }}>{kr.title || kr.description}</span>
                      {kr.progress !== undefined && <span className="ml-auto font-mono text-[11px]" style={{ color: t.textMuted }}>{kr.progress}%</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Object format
    if (typeof planData === 'object') {
      const sections = Object.entries(planData).filter(([_, v]) => v !== null && v !== undefined);
      if (sections.length === 0) return <div className="py-8 text-center text-[13px]" style={{ color: t.textMuted }}>Empty strategy</div>;
      return (
        <div className="space-y-4">
          {sections.map(([key, value]: [string, any]) => (
            <div key={key} className="rounded-[6px] border p-4" style={{ borderColor: t.border }}>
              <div className="text-[14px] font-semibold mb-2 capitalize" style={{ color: t.textPrimary }}>
                {key.replace(/_/g, ' ')}
              </div>
              {typeof value === 'string' ? (
                <div className="text-[12px] whitespace-pre-wrap" style={{ color: t.textSecondary }}>{value}</div>
              ) : Array.isArray(value) ? (
                <ul className="space-y-1">
                  {value.map((item: any, i: number) => (
                    <li key={i} className="text-[12px] flex items-start gap-2" style={{ color: t.textSecondary }}>
                      <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: t.accent }} />
                      {typeof item === 'string' ? item : item.title || item.description || JSON.stringify(item)}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[12px]" style={{ color: t.textSecondary }}>{JSON.stringify(value, null, 2)}</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    return <div className="text-[12px]" style={{ color: t.textSecondary }}>{String(planData)}</div>;
  };

  const renderSwotData = (swotData: any, t: any) => {
    if (!swotData) return <div className="py-8 text-center text-[13px]" style={{ color: t.textMuted }}>No SWOT analysis available</div>;

    const swotSections = [
      { key: 'strengths', label: 'Strengths', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
      { key: 'weaknesses', label: 'Weaknesses', color: 'text-red-400', bg: 'bg-destructive/10' },
      { key: 'opportunities', label: 'Opportunities', color: 'text-blue-400', bg: 'bg-primary/10' },
      { key: 'threats', label: 'Threats', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];

    return (
      <div className="grid grid-cols-2 gap-4">
        {swotSections.map(section => {
          const items = swotData[section.key] || [];
          return (
            <div key={section.key} className={`rounded-[6px] border p-4 ${section.bg}`} style={{ borderColor: t.border }}>
              <h3 className={`text-[13px] font-semibold mb-3 ${section.color}`}>{section.label}</h3>
              {Array.isArray(items) && items.length > 0 ? (
                <ul className="space-y-2">
                  {items.map((item: any, i: number) => (
                    <li key={i} className="text-[12px] flex items-start gap-2" style={{ color: t.textSecondary }}>
                      <span className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${section.color.replace('text-', 'bg-')}`} />
                      {typeof item === 'string' ? item : item.text || item.title || JSON.stringify(item)}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[12px]" style={{ color: t.textMuted }}>No items</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <LinearLayout activeLabel="Strategy" searchPlaceholder="Search strategy...">
      {({ t, theme }) => {
        if (loading) return <LoadingSkeleton t={t} rows={8} />;

        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Strategy</h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>{plans.length} active plans</p>
              </div>
              <div className="relative">
                <button onClick={() => setTeamDropdownOpen(!teamDropdownOpen)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border bg-transparent text-[12px]" style={{ borderColor: t.border, color: t.textSecondary }}>
                  {selectedTeam}
                  <ChevronDown size={12} />
                </button>
                {teamDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-[180px] rounded-[6px] border py-1 z-10" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                    {teamNames.map(team => (
                      <button key={team} onClick={() => { setSelectedTeam(team); setTeamDropdownOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] transition-colors" style={{ color: selectedTeam === team ? t.textPrimary : t.textSecondary }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        {team}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 mb-6">
              {[{ label: 'Strategy', value: 'strategy' as const }, { label: 'SWOT', value: 'swot' as const }].map(tab => {
                const isActive = activeTab === tab.value;
                return (
                  <button key={tab.value} onClick={() => setActiveTab(tab.value)} className="px-3 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors" style={{ backgroundColor: isActive ? t.active : 'transparent', color: isActive ? t.textPrimary : t.textMuted }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = t.hover; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ── Plan selector (if multiple) ── */}
            {filteredPlans.length > 1 && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {filteredPlans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className="px-3 py-1.5 rounded-[5px] border text-[12px] transition-colors"
                    style={{
                      borderColor: plan.id === activePlan?.id ? t.accent : t.border,
                      color: plan.id === activePlan?.id ? t.accent : t.textSecondary,
                    }}
                  >
                    {plan.team_name || plan.title || 'Plan'}
                  </button>
                ))}
              </div>
            )}

            {/* ── Content ── */}
            {!activePlan ? (
              <div className="py-16 text-center text-[13px]" style={{ color: t.textMuted }}>
                No strategic plans found for this selection.
              </div>
            ) : (
              <>
                {activePlan.team_name && (
                  <div className="text-[12px] mb-4" style={{ color: t.textMuted }}>
                    Team: {activePlan.team_name} · Last updated: {formatDate(activePlan.updated_at)}
                  </div>
                )}

                {activeTab === 'strategy' ? renderPlanData(activePlan.plan_data, t) : renderSwotData(activePlan.swot_data, t)}
              </>
            )}

            <FooterHint t={t} />
          </>
        );
      }}
    </LinearLayout>
  );
};

export default LinearStrategy;
