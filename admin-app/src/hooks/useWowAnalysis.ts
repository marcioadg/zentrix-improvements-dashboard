import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CompanyDelta {
  company_id: string;
  name: string;
  hours_a: number;
  hours_b: number;
  delta_hours: number;
  delta_pct: number | null;
}

export interface CohortDelta {
  hours_a: number;
  hours_b: number;
  delta_hours: number;
  delta_pct: number | null;
  active_companies_a: number;
  active_companies_b: number;
  top_gainers: CompanyDelta[];
  top_losers: CompanyDelta[];
  newly_active: CompanyDelta[];
  churned: CompanyDelta[];
}

export interface CompareDeltas {
  mode: 'compare';
  excludes_free: true;
  week_a_start: string;
  week_a_end: string;
  week_b_start: string;
  week_b_end: string;
  total: {
    hours_a: number;
    hours_b: number;
    delta_hours: number;
    delta_pct: number | null;
  };
  paid: CohortDelta;
  trial: CohortDelta;
}

export type Trajectory = 'rising' | 'falling' | 'volatile' | 'flat';

export interface WeekRow {
  week_start: string;
  paid_hours: number;
  trial_hours: number;
  paid_active: number;
  trial_active: number;
}

export interface CohortTrendSummary {
  first_hours: number;
  last_hours: number;
  change_hours: number;
  change_pct: number | null;
  slope_per_week: number;
  trajectory: Trajectory;
}

export interface CompanyTrajectory {
  company_id: string;
  name: string;
  weekly_hours: number[];
  total_hours: number;
  first_hours: number;
  last_hours: number;
  peak_hours: number;
  trough_hours: number;
  peak_week_start: string;
  trough_week_start: string;
  slope_per_week: number;
  trajectory: Trajectory;
}

export interface TrendDeltas {
  mode: 'trend';
  excludes_free: true;
  range_start: string;
  range_end: string;
  weeks_count: number;
  weeks: WeekRow[];
  paid_summary: CohortTrendSummary;
  trial_summary: CohortTrendSummary;
  top_companies_paid: CompanyTrajectory[];
  top_companies_trial: CompanyTrajectory[];
}

export type WowAnalysisDeltas = CompareDeltas | TrendDeltas;

export interface WowAnalysisResult {
  deltas: WowAnalysisDeltas;
  narrative: string | null;
  model: string | null;
  narrative_error: string | null;
  cached: boolean;
  mode: 'compare' | 'trend';
  generated_at?: string;
}

export function useWowAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WowAnalysisResult | null>(null);

  const analyze = useCallback(
    async (
      week_a_start: string,
      week_b_start: string,
      options?: { force_refresh?: boolean; mode?: 'compare' | 'trend' },
    ) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('analyze-wow-usage', {
          body: {
            week_a_start,
            week_b_start,
            force_refresh: options?.force_refresh ?? false,
            mode: options?.mode ?? 'compare',
          },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        setResult(data as WowAnalysisResult);
      } catch (e) {
        logger.error('useWowAnalysis error:', e);
        setError(e instanceof Error ? e.message : 'Failed to analyze WoW change');
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, error, result, analyze, reset };
}
