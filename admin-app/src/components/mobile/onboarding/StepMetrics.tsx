import React, { useMemo, useState } from 'react';
import { Check, Plus, Trash2, ArrowRight } from 'lucide-react';
import { MobileOnboardingShell } from './MobileOnboardingShell';
import { useMobileOnboarding } from './MobileOnboardingContext';
import {
  getRecommendedMetrics,
  getDefaultMetricTarget,
  getIndustryDisplayLabel,
} from '@/data/onboardingRecommendations';

const UNIT_OPTIONS = [
  { value: '$', label: '$' },
  { value: '%', label: '%' },
  { value: 'count', label: '#' },
  { value: 'hours', label: 'hrs' },
];

const CALCULATION_OPTIONS = [
  { value: 'total', label: 'Sum' },
  { value: 'average', label: 'Avg' },
];

const formatMoneyShort = (n: number): string => {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m.toFixed(m >= 10 ? 0 : 1)}M`.replace('.0', '');
  }
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
};

const StepMetrics: React.FC = () => {
  const {
    industry,
    teamSize,
    selectedMetricIds,
    toggleMetric,
    customMetrics,
    addCustomMetric,
    removeCustomMetric,
    selectedMetricsCount,
    next,
    back,
  } = useMobileOnboarding();

  const recs = useMemo(() => getRecommendedMetrics(industry), [industry]);
  const industryLabel = getIndustryDisplayLabel(industry);

  // Hero illustrative card: show the first suggested metric's name and target.
  const heroSample = recs[0];
  const heroTarget = heroSample
    ? (() => {
        const raw = Number(getDefaultMetricTarget(heroSample, teamSize));
        if (!Number.isFinite(raw)) return null;
        if (heroSample.defaultUnit === '$') return formatMoneyShort(raw);
        if (heroSample.defaultUnit === '%') return `${raw}%`;
        return String(raw);
      })()
    : null;
  const heroCurrent = heroSample && heroTarget
    ? (() => {
        const raw = Number(getDefaultMetricTarget(heroSample, teamSize));
        if (!Number.isFinite(raw)) return heroTarget;
        const partial = Math.round(raw * 0.65);
        if (heroSample.defaultUnit === '$') return formatMoneyShort(partial);
        if (heroSample.defaultUnit === '%') return `${partial}%`;
        return String(partial);
      })()
    : null;

  const [showCustom, setShowCustom] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    unit: '$',
    calculation: 'total',
    target: '',
  });
  const draftValid = draft.name.trim().length > 0;

  const handleSaveCustom = () => {
    if (!draftValid) return;
    addCustomMetric({
      name: draft.name.trim(),
      unit: draft.unit,
      calculation: draft.calculation,
      target: draft.target,
    });
    setDraft({ name: '', unit: '$', calculation: 'total', target: '' });
    setShowCustom(false);
  };

  const hasSelection = selectedMetricsCount >= 1;

  return (
    <MobileOnboardingShell
      step={2}
      eyebrow="02 · METRICS"
      title={
        <>
          Pick the numbers that{' '}
          <span style={{ fontStyle: 'italic', fontWeight: 500 }}>matter.</span>
        </>
      }
      subtitle="Track 5–15 weekly numbers that tell you, at a glance, whether the business is on track."
      heroExtra={
        heroSample && heroTarget && heroCurrent ? (
          <div
            className="rounded-xl px-4 py-3 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(6px)' }}
          >
            <div className="flex items-center justify-between">
              <div
                className="text-[9.5px] tracking-[0.18em] text-white/60 uppercase"
                style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
              >
                {heroSample.badge}
              </div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-[#86efac]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                on track
              </div>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <div className="text-[22px] font-semibold text-white tracking-[-0.01em]">
                {heroCurrent}
              </div>
              <div className="text-[12px] text-white/50">/ {heroTarget}</div>
            </div>
            <div className="mt-2 h-[3px] w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: '65%',
                  background: 'linear-gradient(90deg, #8b8ec5 0%, #ffffff 100%)',
                }}
              />
            </div>
          </div>
        ) : undefined
      }
      onBack={back}
      primaryLabel={hasSelection ? 'Continue' : 'Skip for now'}
      primarySuffix={
        hasSelection ? (
          <span className="inline-flex items-center gap-1">
            · {selectedMetricsCount} <ArrowRight size={16} strokeWidth={2.4} />
          </span>
        ) : (
          <ArrowRight size={16} strokeWidth={2.4} />
        )
      }
      primaryDisabled={false}
      onPrimary={() => next()}
    >
      <section>
        <h2 className="text-[17px] font-semibold text-[#0c0d12] tracking-[-0.01em]">
          Suggested for {industryLabel} · tap to add
        </h2>
        <p className="mt-1 text-[13px] text-[#71717a]">
          Custom metrics can be added below.
        </p>

        <div className="mt-4 space-y-2.5">
          {recs.map((m) => {
            const selected = selectedMetricIds.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMetric(m.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                  selected
                    ? 'bg-white border-[#1e2235] shadow-sm'
                    : 'bg-white border-[#e8e8eb] active:bg-[#f4f4f5]'
                }`}
              >
                <span
                  className={`shrink-0 flex items-center justify-center h-9 min-w-[50px] px-2 rounded-lg text-[10.5px] font-semibold tracking-[0.06em] ${
                    selected
                      ? 'bg-[#1e2235] text-white'
                      : 'bg-[#f4f4f5] text-[#71717a]'
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                >
                  {m.badge}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14.5px] font-medium text-[#18181b] truncate">
                    {m.title}
                  </span>
                  <span className="block text-[12px] text-[#71717a] truncate">
                    {m.subtitle}
                  </span>
                </span>
                <span
                  className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center border ${
                    selected
                      ? 'bg-[#1e2235] border-[#1e2235]'
                      : 'bg-white border-[#d4d4d8]'
                  }`}
                >
                  {selected && <Check size={14} className="text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom metrics list */}
        {customMetrics.length > 0 && (
          <div className="mt-3 space-y-2.5">
            {customMetrics.map((m) => (
              <div
                key={m.id}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border border-[#1e2235] bg-white shadow-sm"
              >
                <span
                  className="shrink-0 flex items-center justify-center h-9 min-w-[50px] px-2 rounded-lg bg-[#1e2235] text-white text-[10.5px] font-semibold tracking-[0.06em]"
                  style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                >
                  CSTM
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14.5px] font-medium text-[#18181b] truncate">
                    {m.name}
                  </span>
                  <span className="block text-[12px] text-[#71717a] truncate">
                    {m.unit} · {m.calculation === 'total' ? 'Sum' : 'Avg'}
                    {m.target ? ` · target ${m.target}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeCustomMetric(m.id)}
                  className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center text-[#a1a1aa] active:bg-[#f4f4f5]"
                  aria-label="Remove custom metric"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add custom metric */}
        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="mt-3 w-full h-12 rounded-2xl border-2 border-dashed border-[#d4d4d8] text-[13.5px] font-medium text-[#52525b] flex items-center justify-center gap-2 active:bg-[#f4f4f5]"
          >
            <Plus size={16} strokeWidth={2.4} />
            Add a custom metric
          </button>
        ) : (
          <div className="mt-3 p-4 rounded-2xl bg-white border border-[#e8e8eb] shadow-sm space-y-3">
            <div>
              <label className="block text-[12.5px] font-medium text-[#3f3f46] mb-1">
                Metric name
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Pipeline coverage"
                className="w-full h-11 px-3 rounded-xl bg-white border border-[#e8e8eb] text-[14.5px] focus:outline-none focus:border-[#a1a1aa]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[12.5px] font-medium text-[#3f3f46] mb-1">
                  Unit
                </label>
                <select
                  value={draft.unit}
                  onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                  className="w-full h-11 px-2 rounded-xl bg-white border border-[#e8e8eb] text-[14px] appearance-none"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-[#3f3f46] mb-1">
                  Calc
                </label>
                <select
                  value={draft.calculation}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, calculation: e.target.value }))
                  }
                  className="w-full h-11 px-2 rounded-xl bg-white border border-[#e8e8eb] text-[14px] appearance-none"
                >
                  {CALCULATION_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-[#3f3f46] mb-1">
                  Target
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.target}
                  onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
                  placeholder="—"
                  className="w-full h-11 px-3 rounded-xl bg-white border border-[#e8e8eb] text-[14px] focus:outline-none focus:border-[#a1a1aa]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowCustom(false);
                  setDraft({ name: '', unit: '$', calculation: 'total', target: '' });
                }}
                className="h-10 px-4 rounded-lg text-[13px] font-medium text-[#52525b] active:bg-[#f4f4f5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!draftValid}
                onClick={handleSaveCustom}
                className="flex-1 h-10 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, #1e2235 0%, #8b8ec5 100%)' }}
              >
                Add metric
              </button>
            </div>
          </div>
        )}
      </section>
    </MobileOnboardingShell>
  );
};

export default StepMetrics;
