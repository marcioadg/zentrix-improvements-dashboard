import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { generateTimeBuckets, getDateRange } from '@/utils/timeBucketUtils';
import { fetchAllPages } from '@/utils/fetchAllPages';
import { logger } from '@/utils/logger';

export const useTasksPerPersonOvertime = (
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

        // Fetch company members with their join dates to calculate historical counts
        const { data: members, error: membersError } = await supabase
          .from('company_members')
          .select('id, company_id, joined_at, status, accepted_at')
          .in('company_id', companyIds);

        if (membersError) throw membersError;

        // Fetch all completed tasks using pagination to bypass 1000-row limit
        const tasks = await fetchAllPages(() => {
          let query = supabase
            .from('fast_tasks')
            .select('id, updated_at, team_id')
            .in('company_id', companyIds)
            .eq('status', 'done')
            .eq('is_deleted', false)
            .gte('updated_at', start.toISOString())
            .lte('updated_at', end.toISOString())
            .order('updated_at', { ascending: true })
            .order('id', { ascending: true });

          if (teamId) {
            query = query.eq('team_id', teamId);
          }

          return query;
        });

        // Group tasks by time bucket and calculate per-person metric with historical member count
        const timeSeriesData: TimeSeriesDataPoint[] = buckets.map(bucket => {
          // Calculate historical member count for this bucket
          const historicalMemberCount = members?.filter(member => {
            const memberJoinDate = member.accepted_at 
              ? new Date(member.accepted_at) 
              : new Date(member.joined_at);
            return memberJoinDate <= bucket.end && member.status === 'active';
          }).length || 1;

          const tasksInBucket = tasks.filter((task: { id: string; updated_at: string; team_id: string | null }) => {
            const taskDate = new Date(task.updated_at);
            return taskDate >= bucket.start && taskDate <= bucket.end;
          });

          const tasksPerPerson = historicalMemberCount > 0 
            ? Math.round((tasksInBucket.length / historicalMemberCount) * 10) / 10 
            : 0;

          return {
            date: bucket.start.toISOString(),
            period: bucket.label,
            'Tasks Per Person': tasksPerPerson,
          };
        });

        setData(timeSeriesData);
      } catch (error) {
        logger.error('Error fetching tasks per person overtime:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyIds.join(','), teamId, frequency, timeframe]);

  return { data, loading };
};
