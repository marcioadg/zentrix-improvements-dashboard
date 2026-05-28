import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Sparkles, ArrowRight } from 'lucide-react';
import { MobileOnboardingShell } from './MobileOnboardingShell';
import { useMobileOnboarding } from './MobileOnboardingContext';
import {
  getRecommendedGoalTexts,
  getIndustryDisplayLabel,
} from '@/data/onboardingRecommendations';

const getQuarterLabel = (d: Date = new Date()): string => {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
};

const StepGoals: React.FC = () => {
  const {
    industry,
    teamSize,
    goals,
    addGoal,
    removeGoal,
    selectedMetricsCount,
    next,
    back,
  } = useMobileOnboarding();

  const allSuggestions = useMemo(
    () => getRecommendedGoalTexts(industry, teamSize),
    [industry, teamSize],
  );
  const industryLabel = getIndustryDisplayLabel(industry);

  // Seed 2 suggested goals on first mount of this step (if empty).
  const seededRef = React.useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (goals.length === 0 && allSuggestions.length > 0) {
      allSuggestions.slice(0, 2).forEach((t) => addGoal(t, 'suggested'));
    }
    seededRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState('');
  const draftValid = draft.trim().length > 0;
  const atMax = goals.length >= 7;

  const handleSaveGoal = () => {
    if (!draftValid || atMax) return;
    addGoal(draft, 'manual');
    setDraft('');
    setShowAdd(false);
  };

  const hasGoals = goals.length >= 1;

  return (
    <MobileOnboardingShell
      step={3}
      eyebrow="03 · GOALS"
      title={
        <>
          What will define this{' '}
          <span style={{ fontStyle: 'italic', fontWeight: 500 }}>quarter?</span>
        </>
      }
      subtitle="3–7 priorities so important you'd be devastated to miss them."
      heroExtra={
        <div
          className="rounded-xl px-3.5 py-2.5 border border-white/10 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(6px)' }}
        >
          <span
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8b8ec5 0%, #6366f1 100%)' }}
          >
            <Sparkles size={14} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium text-white truncate">
              Zentrix AI is reading your context
            </div>
            <div
              className="text-[10px] tracking-[0.1em] text-white/55 uppercase truncate"
              style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
            >
              {industryLabel}
              {selectedMetricsCount > 0 ? ` · ${selectedMetricsCount} metric${selectedMetricsCount === 1 ? '' : 's'}` : ''}
            </div>
          </div>
        </div>
      }
      onBack={back}
      primaryLabel={hasGoals ? 'Continue' : 'Skip for now'}
      primarySuffix={<ArrowRight size={16} strokeWidth={2.4} />}
      primaryDisabled={false}
      onPrimary={() => next()}
    >
      <section>
        <h2 className="text-[17px] font-semibold text-[#0c0d12] tracking-[-0.01em]">
          Your {getQuarterLabel()} goals
        </h2>
        <p className="mt-1 text-[13px] text-[#71717a]">
          Add 3–7. You can edit them in your first meeting.
        </p>

        <div className="mt-4 space-y-2.5">
          {goals.map((g, i) => (
            <div
              key={g.id}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-[#e8e8eb] bg-white shadow-sm"
            >
              <span
                className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-[#1e2235] text-white text-[10.5px] font-semibold tracking-[0.06em]"
                style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
              >
                G{i + 1}
              </span>
              <span className="flex-1 min-w-0 text-[14.5px] text-[#18181b]">
                {g.text}
              </span>
              <button
                type="button"
                onClick={() => removeGoal(g.id)}
                className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center text-[#a1a1aa] active:bg-[#f4f4f5]"
                aria-label="Remove goal"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Add another goal */}
        {!showAdd ? (
          <button
            type="button"
            disabled={atMax}
            onClick={() => setShowAdd(true)}
            className="mt-3 w-full h-12 rounded-2xl border-2 border-dashed border-[#d4d4d8] text-[13.5px] font-medium text-[#52525b] flex items-center justify-center gap-2 active:bg-[#f4f4f5] disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={2.4} />
            {atMax ? 'Max 7 goals' : 'Add another goal'}
          </button>
        ) : (
          <div className="mt-3 p-3 rounded-2xl bg-white border border-[#e8e8eb] shadow-sm space-y-2.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Reach $480k MRR by end of quarter"
              rows={2}
              autoFocus
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#e8e8eb] text-[14.5px] resize-none focus:outline-none focus:border-[#a1a1aa]"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setDraft('');
                }}
                className="h-10 px-4 rounded-lg text-[13px] font-medium text-[#52525b] active:bg-[#f4f4f5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!draftValid || atMax}
                onClick={handleSaveGoal}
                className="flex-1 h-10 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, #1e2235 0%, #8b8ec5 100%)' }}
              >
                Add goal
              </button>
            </div>
          </div>
        )}

      </section>
    </MobileOnboardingShell>
  );
};

export default StepGoals;
