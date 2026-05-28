import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { generateTimeBuckets, getDateRange } from '@/utils/timeBucketUtils';
import { fetchAllPages } from '@/utils/fetchAllPages';
import { logger } from '@/utils/logger';

export const useTasksCompletedOvertime = (
  companyIds: string[],
  teamId: string | null,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  timeframe: '4weeks' | '3months' | '6months' | '1year' | '2years' | 'alltime'
) => {
  const [data, setData] = useState<TimeSeriesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyIds.length) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const { start, end } = getDateRange(timeframe, frequency);
        const buckets = generateTimeBuckets(start, end, frequency);

        // Fetch all completed tasks using pagination to bypass 1000-row limit
        const tasks = await fetchAllPages(() => {
          let query = supabase
            .from('fast_tasks')
            .select('id, completed_at, team_id')
            .in('company_id', companyIds)
            .eq('status', 'done')
            .eq('is_deleted', false)
            .not('completed_at', 'is', null)
            .gte('completed_at', start.toISOString())
            .lte('completed_at', end.toISOString())
            .order('completed_at', { ascending: true })
            .order('id', { ascending: true });

          if (teamId) {
            query = query.eq('team_id', teamId);
          }

          return query;
        });

        // Group tasks by time bucket
        const timeSeriesData: TimeSeriesDataPoint[] = buckets.map(bucket => {
          const tasksInBucket = tasks.filter((task: { id: string; completed_at: string; team_id: string | null }) => {
            const taskDate = new Date(task.completed_at);
            return taskDate >= bucket.start && taskDate <= bucket.end;
          });

          return {
            date: bucket.start.toISOString(),
            period: bucket.label,
            'Tasks Completed': tasksInBucket.length,
          };
        });

        setData(timeSeriesData);
      } catch (error) {
        logger.error('Error fetching tasks completed overtime:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyIds.join(','), teamId, frequency, timeframe]);

  return { data, loading };
};
