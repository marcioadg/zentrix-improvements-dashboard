import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { format, startOfYear } from 'date-fns';

export type WowRangeMode = '16w' | '26w' | '52w' | 'ytd' | 'all';

export interface WeeklyUsageSnapshot {
  id: string;
  week_start: string;
  week_end: string;
  total_hours: number;
  paid_hours: number | null;
  trial_hours: number | null;
  free_hours: number | null;
  avg_hours_per_user: number | null;
  avg_hours_per_company: number | null;
  total_users: number | null;
  total_companies: number | null;
  paid_companies: number | null;
  wow_hours_change_pct: number | null;
  top_companies: Array<{ company_id: string; hours: number }> | null;
  low_companies: Array<{ company_id: string; hours: number }> | null;
  created_at: string;
}

export interface UseWeeklyUsageSnapshotsParams {
  mode: WowRangeMode;
  // Window offset in weeks. Only used for mode === '16w' (paging back/forward
  // through 16-week windows). Ignored for every other mode.
  offset?: number;
}

const SIXTEEN_WEEK_PAGE = 16;
// Hard cap to keep "All time" sensible if data grows for years. Weekly rows
// → 1000 = ~19 years of history; far beyond any realistic chart usefulness.
const MAX_ROWS = 1000;

export function useWeeklyUsageSnapshots({ mode, offset = 0 }: UseWeeklyUsageSnapshotsParams) {
  const [snapshots, setSnapshots] = useState<WeeklyUsageSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(false);

  useEffect(() => {
    const fetchSnapshots = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build the query per mode. All modes query DESC by week_start, then we
        // reverse client-side so the chart renders oldest → newest.
        let query = supabase
          .from('weekly_usage_snapshots')
          .select('*')
          .order('week_start', { ascending: false });

        if (mode === '16w') {
          query = query.range(offset, offset + SIXTEEN_WEEK_PAGE - 1);
        } else if (mode === '26w') {
          query = query.limit(26);
        } else if (mode === '52w') {
          query = query.limit(52);
        } else if (mode === 'ytd') {
          const startISO = format(startOfYear(new Date()), 'yyyy-MM-dd');
          query = query.gte('week_start', startISO).limit(MAX_ROWS);
        } else {
          // 'all'
          query = query.limit(MAX_ROWS);
        }

        const { data, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;

        const window = (data as WeeklyUsageSnapshot[]) ?? [];
        const ordered = window.slice().reverse();
        setSnapshots(ordered);

        // hasOlder gates the "earlier" arrow — only meaningful for '16w' paging.
        // Every other mode shows a fixed range with no paging concept.
        if (mode === '16w' && window.length === SIXTEEN_WEEK_PAGE) {
          const { count } = await supabase
            .from('weekly_usage_snapshots')
            .select('id', { count: 'exact', head: true });
          setHasOlder((count ?? 0) > offset + SIXTEEN_WEEK_PAGE);
        } else {
          setHasOlder(false);
        }
      } catch (err) {
        logger.error('Error fetching weekly usage snapshots:', err);
        setError(err instanceof Error ? err.message : 'Failed to load weekly usage data');
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshots();
  }, [mode, offset]);

  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const wowChangePct = latest?.wow_hours_change_pct ?? null;

  return { snapshots, loading, error, latest, prev, wowChangePct, hasOlder };
}
