import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type MobileStepId = 1 | 2 | 3 | 4;

export interface MobileCustomMetric {
  id: string;
  name: string;
  unit: string;
  calculation: string;
  target: string;
}

export interface MobileGoal {
  id: string;
  text: string;
  source: 'manual' | 'suggested';
}

export interface MobileOnboardingState {
  companyName: string;
  industry: string;
  country: string;
  teamSize: string;
  eosUsage: string;
  selectedMetricIds: Set<string>;
  customMetrics: MobileCustomMetric[];
  goals: MobileGoal[];
  dismissedSuggestionIds: Set<string>;
}

interface ContextValue extends MobileOnboardingState {
  step: MobileStepId;
  goTo: (s: MobileStepId) => void;
  next: () => void;
  back: () => void;

  setCompanyName: (v: string) => void;
  setIndustry: (v: string) => void;
  setCountry: (v: string) => void;
  setTeamSize: (v: string) => void;
  setEosUsage: (v: string) => void;

  toggleMetric: (id: string) => void;
  addCustomMetric: (m: Omit<MobileCustomMetric, 'id'>) => void;
  removeCustomMetric: (id: string) => void;

  addGoal: (text: string, source?: 'manual' | 'suggested') => void;
  removeGoal: (id: string) => void;
  dismissSuggestion: (id: string) => void;

  selectedMetricsCount: number;
  goalCount: number;
}

const MobileOnboardingContext = createContext<ContextValue | null>(null);

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

interface ProviderProps {
  initialCompanyName?: string;
  children: React.ReactNode;
}

export const MobileOnboardingProvider: React.FC<ProviderProps> = ({
  initialCompanyName = '',
  children,
}) => {
  const [step, setStep] = useState<MobileStepId>(1);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [industry, setIndustry] = useState('SaaS / Software');
  const [country, setCountry] = useState('BR');
  const [teamSize, setTeamSize] = useState('11–50');
  const [eosUsage, setEosUsage] = useState('eos_with_software');

  const [selectedMetricIds, setSelectedMetricIds] = useState<Set<string>>(new Set());
  const [customMetrics, setCustomMetrics] = useState<MobileCustomMetric[]>([]);

  const [goals, setGoals] = useState<MobileGoal[]>([]);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(new Set());

  const goTo = useCallback((s: MobileStepId) => {
    setStep(s);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, []);
  const next = useCallback(
    () => setStep((s) => (Math.min(4, s + 1) as MobileStepId)),
    [],
  );
  const back = useCallback(
    () => setStep((s) => (Math.max(1, s - 1) as MobileStepId)),
    [],
  );

  const toggleMetric = useCallback((id: string) => {
    setSelectedMetricIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addCustomMetric = useCallback((m: Omit<MobileCustomMetric, 'id'>) => {
    setCustomMetrics((prev) => [...prev, { ...m, id: newId() }]);
  }, []);
  const removeCustomMetric = useCallback((id: string) => {
    setCustomMetrics((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addGoal = useCallback((text: string, source: 'manual' | 'suggested' = 'manual') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGoals((prev) => {
      if (prev.length >= 7) return prev;
      return [...prev, { id: newId(), text: trimmed, source }];
    });
  }, []);
  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);
  const dismissSuggestion = useCallback((id: string) => {
    setDismissedSuggestionIds((prev) => new Set(prev).add(id));
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      step,
      goTo,
      next,
      back,
      companyName,
      industry,
      country,
      teamSize,
      eosUsage,
      selectedMetricIds,
      customMetrics,
      goals,
      dismissedSuggestionIds,
      setCompanyName,
      setIndustry,
      setCountry,
      setTeamSize,
      setEosUsage,
      toggleMetric,
      addCustomMetric,
      removeCustomMetric,
      addGoal,
      removeGoal,
      dismissSuggestion,
      selectedMetricsCount: selectedMetricIds.size + customMetrics.length,
      goalCount: goals.length,
    }),
    [
      step,
      goTo,
      next,
      back,
      companyName,
      industry,
      country,
      teamSize,
      eosUsage,
      selectedMetricIds,
      customMetrics,
      goals,
      dismissedSuggestionIds,
      toggleMetric,
      addCustomMetric,
      removeCustomMetric,
      addGoal,
      removeGoal,
      dismissSuggestion,
    ],
  );

  return (
    <MobileOnboardingContext.Provider value={value}>{children}</MobileOnboardingContext.Provider>
  );
};

export const useMobileOnboarding = (): ContextValue => {
  const ctx = useContext(MobileOnboardingContext);
  if (!ctx) throw new Error('useMobileOnboarding must be used inside MobileOnboardingProvider');
  return ctx;
};
