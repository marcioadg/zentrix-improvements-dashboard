import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { getActiveUserIds, filterRatingsByActiveUsers } from '@/utils/analyticsUserFilter';
import { fetchAllPages } from '@/utils/fetchAllPages';

interface SevenDayAnalyticsSummary {
  goalsAchieved: number;
  goalsAchievedTrend: number;
  avgMeetingRating: number;
  avgMeetingRatingTrend: number;
  tasksCompleted: number;
  tasksCompletedTrend: number;
  issuesResolved: number;
  issuesResolvedTrend: number;
  loading: boolean;
}

const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const use7DayAnalyticsSummary = (companyIds: string[], teamIds: string[] = []): SevenDayAnalyticsSummary => {
  const [summary, setSummary] = useState<SevenDayAnalyticsSummary>({
    goalsAchieved: 0,
    goalsAchievedTrend: 0,
    avgMeetingRating: 0,
    avgMeetingRatingTrend: 0,
    tasksCompleted: 0,
    tasksCompletedTrend: 0,
    issuesResolved: 0,
    issuesResolvedTrend: 0,
    loading: true,
  });

  useEffect(() => {
    if (!companyIds.length) {
      setSummary(prev => ({ ...prev, loading: true }));
      return;
    }

    const fetchSevenDayMetrics = async () => {
      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Fetch active user IDs to filter out deactivated members (from all companies)
        const activeUserIdSets = await Promise.all(companyIds.map(id => getActiveUserIds(id)));
        const activeUserIds = new Set<string>();
        activeUserIdSets.forEach(set => set.forEach(id => activeUserIds.add(id)));
        logger.log(`📊 7-Day Summary - Active users for filtering: ${activeUserIds.size}`);

        // Fetch current active goals status
        let currentGoalsQuery = supabase
          .from('team_goals')
          .select(`
            status,
            archived,
            team_id,
            owner_id,
            teams!inner(company_id)
          `)
          .in('teams.company_id', companyIds)
          .or('archived.is.null,archived.eq.false');
        
        if (teamIds.length > 0) {
          currentGoalsQuery = currentGoalsQuery.in('team_id', teamIds);
        }
        
        const { data: currentGoals } = await currentGoalsQuery;

        // Filter goals to only include those owned by active users
        const filteredCurrentGoals = currentGoals?.filter(g => 
          g.owner_id && activeUserIds.has(g.owner_id)
        ) || [];

        // Fetch previous period snapshots for trend comparison (7-14 days ago)
        let previousGoalsQuery = supabase
          .from('goal_status_snapshots')
          .select(`
            status,
            team_id,
            teams!inner(company_id)
          `)
          .in('teams.company_id', companyIds)
          .gte('snapshot_date', fourteenDaysAgo.toISOString())
          .lt('snapshot_date', sevenDaysAgo.toISOString());
        
        if (teamIds.length > 0) {
          previousGoalsQuery = previousGoalsQuery.in('team_id', teamIds);
        }
        
        const { data: previousGoals } = await previousGoalsQuery;

        const currentGoalsComplete = filteredCurrentGoals.filter(g => g.status === 'complete' || g.status === 'on_track').length || 0;
        const currentGoalsTotal = filteredCurrentGoals.length || 1;
        const currentGoalsPercent = (currentGoalsComplete / currentGoalsTotal) * 100;

        const previousGoalsComplete = previousGoals?.filter(g => g.status === 'complete' || g.status === 'on_track').length || 0;
        const previousGoalsTotal = previousGoals?.length || 1;
        const previousGoalsPercent = (previousGoalsComplete / previousGoalsTotal) * 100;

        // Fetch Meeting Ratings (current vs previous 7 days)
        let currentMeetingsQuery = supabase
          .from('meeting_results')
          .select('meeting_ratings, team_id')
          .in('company_id', companyIds)
          .gte('created_at', sevenDaysAgo.toISOString())
          .lte('created_at', now.toISOString())
          .not('meeting_ratings', 'is', null);
        
        if (teamIds.length > 0) {
          currentMeetingsQuery = currentMeetingsQuery.in('team_id', teamIds);
        }
        
        const { data: currentMeetings } = await currentMeetingsQuery;

        let previousMeetingsQuery = supabase
          .from('meeting_results')
          .select('meeting_ratings, team_id')
          .in('company_id', companyIds)
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString())
          .not('meeting_ratings', 'is', null);
        
        if (teamIds.length > 0) {
          previousMeetingsQuery = previousMeetingsQuery.in('team_id', teamIds);
        }
        
        const { data: previousMeetings } = await previousMeetingsQuery;

        // Filter ratings to only include active users
        const meetingsWithValidRatings = currentMeetings?.filter(m => {
          if (!m.meeting_ratings || typeof m.meeting_ratings !== 'object') return false;
          const filteredRatings = filterRatingsByActiveUsers(
            m.meeting_ratings as Record<string, number>,
            activeUserIds
          );
          return Object.keys(filteredRatings).length > 0;
        }) || [];

        const currentAvgRating = meetingsWithValidRatings.length > 0
          ? meetingsWithValidRatings.reduce((sum, m) => {
              const filteredRatings = filterRatingsByActiveUsers(
                m.meeting_ratings as Record<string, number>,
                activeUserIds
              );
              const ratings = Object.values(filteredRatings)
                .filter((r: any) => typeof r === 'number' && r > 0);
              const meetingAvg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
              return sum + meetingAvg;
            }, 0) / meetingsWithValidRatings.length
          : 0;

        const previousMeetingsWithValidRatings = previousMeetings?.filter(m => {
          if (!m.meeting_ratings || typeof m.meeting_ratings !== 'object') return false;
          const filteredRatings = filterRatingsByActiveUsers(
            m.meeting_ratings as Record<string, number>,
            activeUserIds
          );
          return Object.keys(filteredRatings).length > 0;
        }) || [];

        const previousAvgRating = previousMeetingsWithValidRatings.length > 0
          ? previousMeetingsWithValidRatings.reduce((sum, m) => {
              const filteredRatings = filterRatingsByActiveUsers(
                m.meeting_ratings as Record<string, number>,
                activeUserIds
              );
              const ratings = Object.values(filteredRatings)
                .filter((r: any) => typeof r === 'number' && r > 0);
              const meetingAvg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
              return sum + meetingAvg;
            }, 0) / previousMeetingsWithValidRatings.length
          : 0;

        // Fetch Tasks Completed (current vs previous 7 days) using pagination
        const currentTasks = await fetchAllPages(() => {
          let query = supabase
            .from('fast_tasks')
            .select('id, team_id, assigned_to')
            .in('company_id', companyIds)
            .eq('status', 'done')
            .eq('is_deleted', false)
            .gte('updated_at', sevenDaysAgo.toISOString())
            .lte('updated_at', now.toISOString())
            .order('updated_at', { ascending: true })
            .order('id', { ascending: true });
          
          if (teamIds.length > 0) {
            query = query.in('team_id', teamIds);
          }
          
          return query;
        });

        const previousTasks = await fetchAllPages(() => {
          let query = supabase
            .from('fast_tasks')
            .select('id, team_id, assigned_to')
            .in('company_id', companyIds)
            .eq('status', 'done')
            .eq('is_deleted', false)
            .gte('updated_at', fourteenDaysAgo.toISOString())
            .lt('updated_at', sevenDaysAgo.toISOString())
            .order('updated_at', { ascending: true })
            .order('id', { ascending: true });
          
          if (teamIds.length > 0) {
            query = query.in('team_id', teamIds);
          }
          
          return query;
        });

        // Filter tasks to only include those assigned to active users
        const filteredCurrentTasks = currentTasks?.filter(task => {
          const assignedTo = task.assigned_to as string[] | null;
          if (!assignedTo || assignedTo.length === 0) return false;
          return assignedTo.some(userId => activeUserIds.has(userId));
        }) || [];

        const filteredPreviousTasks = previousTasks?.filter(task => {
          const assignedTo = task.assigned_to as string[] | null;
          if (!assignedTo || assignedTo.length === 0) return false;
          return assignedTo.some(userId => activeUserIds.has(userId));
        }) || [];

        const currentTasksCount = filteredCurrentTasks.length;
        const previousTasksCount = filteredPreviousTasks.length;

        // Fetch Issues Resolved (current vs previous 7 days)
        let currentIssuesQuery = supabase
          .from('meeting_results')
          .select('issues_resolved, team_id')
          .in('company_id', companyIds)
          .gte('created_at', sevenDaysAgo.toISOString())
          .lte('created_at', now.toISOString())
          .not('issues_resolved', 'is', null);
        
        if (teamIds.length > 0) {
          currentIssuesQuery = currentIssuesQuery.in('team_id', teamIds);
        }
        
        const { data: currentIssues } = await currentIssuesQuery;

        let previousIssuesQuery = supabase
          .from('meeting_results')
          .select('issues_resolved, team_id')
          .in('company_id', companyIds)
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString())
          .not('issues_resolved', 'is', null);
        
        if (teamIds.length > 0) {
          previousIssuesQuery = previousIssuesQuery.in('team_id', teamIds);
        }
        
        const { data: previousIssues } = await previousIssuesQuery;

        // Count the total number of issues from all meetings (array length)
        const currentIssuesCount = currentIssues?.reduce((sum, m) => {
          const issues = m.issues_resolved as any[] | null;
          return sum + (issues?.length || 0);
        }, 0) || 0;
        
        const previousIssuesCount = previousIssues?.reduce((sum, m) => {
          const issues = m.issues_resolved as any[] | null;
          return sum + (issues?.length || 0);
        }, 0) || 0;

        // Calculate trends
        setSummary({
          goalsAchieved: Math.round(currentGoalsPercent),
          goalsAchievedTrend: calculatePercentageChange(currentGoalsPercent, previousGoalsPercent),
          avgMeetingRating: currentAvgRating,
          avgMeetingRatingTrend: calculatePercentageChange(currentAvgRating, previousAvgRating),
          tasksCompleted: currentTasksCount,
          tasksCompletedTrend: calculatePercentageChange(currentTasksCount, previousTasksCount),
          issuesResolved: currentIssuesCount,
          issuesResolvedTrend: calculatePercentageChange(currentIssuesCount, previousIssuesCount),
          loading: false,
        });

      } catch (error) {
        logger.error('Error fetching 7-day analytics summary:', error);
        setSummary(prev => ({ ...prev, loading: false }));
      }
    };

    fetchSevenDayMetrics();
  }, [companyIds.join(','), teamIds.join(',')]);

  return summary;
};
