import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { generateTimeBuckets, getDateRange } from '@/utils/timeBucketUtils';
import { fetchAllPages } from '@/utils/fetchAllPages';
import { logger } from '@/utils/logger';

export const useIssuesPerPersonOvertime = (
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

        // Get team IDs for filtering
        let teamIds: string[] = [];
        if (teamId) {
          teamIds = [teamId];
        } else {
          const { data: teams } = await supabase
            .from('teams')
            .select('id')
            .in('company_id', companyIds);
          
          if (teams && teams.length > 0) {
            teamIds = teams.map(t => t.id);
          }
        }

        // Fetch all resolved issues using pagination to bypass 1000-row limit
        const issues = await fetchAllPages(() => {
          let query = supabase
            .from('issues')
            .select('id, updated_at, team_id, status')
            .eq('status', 'resolved')
            .eq('is_deleted', false)
            .gte('updated_at', start.toISOString())
            .lte('updated_at', end.toISOString())
            .order('updated_at', { ascending: true })
            .order('id', { ascending: true });

          if (teamIds.length > 0) {
            query = query.in('team_id', teamIds);
          }

          return query;
        });

        // Group issues by time bucket and calculate per-person metric with historical member count
        const timeSeriesData: TimeSeriesDataPoint[] = buckets.map(bucket => {
          const historicalMemberCount = members?.filter(member => {
            const memberJoinDate = member.accepted_at 
              ? new Date(member.accepted_at) 
              : new Date(member.joined_at);
            return memberJoinDate <= bucket.end && member.status === 'active';
          }).length || 1;

          const issuesInBucket = issues.filter((issue: { id: string; updated_at: string; team_id: string; status: string }) => {
            const resolutionDate = new Date(issue.updated_at);
            return resolutionDate >= bucket.start && resolutionDate <= bucket.end;
          });

          const issuesPerPerson = historicalMemberCount > 0 
            ? Math.round((issuesInBucket.length / historicalMemberCount) * 10) / 10 
            : 0;

          return {
            date: bucket.start.toISOString(),
            period: bucket.label,
            'Issues Per Person': issuesPerPerson,
          };
        });

        setData(timeSeriesData);
      } catch (error) {
        logger.error('Error fetching issues per person overtime:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyIds.join(','), teamId, frequency, timeframe]);

  return { data, loading };
};
