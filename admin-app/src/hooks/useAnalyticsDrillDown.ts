import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { TimeBucket, getLocalEndOfDay } from '@/utils/timeBucketUtils';
import { checkTargetCondition } from '@/utils/metricUtils';
import { getActiveUserIdsForCompanies, filterRatingsByActiveUsers } from '@/utils/analyticsUserFilter';
import { fetchAllPages } from '@/utils/fetchAllPages';
import { getGoalStatusesAsOfBucketEnd } from '@/utils/goalStatusAnalytics';
import {
  GoalDrillDownData,
  ScorecardDrillDownData,
  MeetingRatingDrillDownData,
  TaskDrillDownData,
  MeetingProductivityDrillDownData,
} from '@/types/analyticsDrillDown';

export const useAnalyticsDrillDown = (
  companyIds: string[],
  teamIds: string[],
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  timeframe: '4weeks' | '3months' | '6months' | '1year' | '2years' | 'alltime',
  hideShortMeetings: boolean = false,
  sharedBuckets: TimeBucket[]
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get date range for a given period using shared buckets
  const getBucketDates = useCallback((period: string) => {
    const bucket = sharedBuckets.find(b => b.label === period);
    if (!bucket) {
      logger.warn(`⚠️ Bucket not found for period "${period}". Available buckets:`, sharedBuckets.map(b => b.label));
    }
    return bucket ? { start: bucket.start, end: bucket.end } : null;
  }, [sharedBuckets]);

  const fetchGoalsDrillDown = useCallback(async (period: string): Promise<GoalDrillDownData[]> => {
    try {
      setLoading(true);
      setError(null);

      // Guard: Return empty if no teams to query
      if (teamIds.length === 0) {
        logger.warn('⚠️ No team IDs provided for goals drill-down - returning empty results');
        return [];
      }

      const dates = getBucketDates(period);
      if (!dates) return [];

      const endDate = dates.end.toISOString().split('T')[0];

      const goals = await fetchAllPages(() =>
        supabase
          .from('team_goals')
          .select(`
            id,
            title,
            status,
            created_at,
            updated_at,
            archived,
            is_deleted,
            deleted_at,
            owner_id,
            team_id,
            teams!inner(name)
          `)
          .in('team_id', teamIds)
          .or('archived.is.null,archived.eq.false')
          .or('is_deleted.is.null,is_deleted.eq.false')
          .is('deleted_at', null)
      );

      const snapshots = await fetchAllPages(() =>
        supabase
          .from('goal_status_snapshots')
          .select('goal_id, team_id, status, snapshot_date')
          .lte('snapshot_date', endDate)
          .in('team_id', teamIds)
          .order('snapshot_date', { ascending: true })
      );

      const goalById = new Map(
        goals.map((goal: any) => [goal.id, goal])
      );
      const statuses = getGoalStatusesAsOfBucketEnd(goals, snapshots, {
        start: dates.start,
        end: dates.end,
        label: period,
        dateKey: dates.start.toISOString(),
      });

      // Get owner names
      const ownerIds = [...new Set(statuses
        .map(status => goalById.get(status.goalId)?.owner_id)
        .filter(Boolean))];

      const { data: profiles } = ownerIds.length > 0
        ? await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ownerIds)
        : { data: [] };

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const result: GoalDrillDownData[] = statuses.map((status) => {
        const goal = goalById.get(status.goalId);

        return {
          id: status.goalId,
          title: goal?.title || 'Untitled Goal',
          team_name: goal?.teams?.name || 'Unknown Team',
          status: status.status,
          owner_name: (profileMap.get(goal?.owner_id) as string) || null,
          updated_at: status.updatedAt,
        };
      });

      return result;
    } catch (err) {
      logger.error('Error fetching goals drill-down:', err);
      setError('Failed to load goals data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [getBucketDates, teamIds]);

  const fetchMetricsDrillDown = useCallback(async (period: string): Promise<ScorecardDrillDownData[]> => {
    try {
      setLoading(true);
      setError(null);

      // Guard: Return empty if no teams to query
      if (teamIds.length === 0) {
        logger.warn('⚠️ No team IDs provided for metrics drill-down - returning empty results');
        return [];
      }

      // Fetch active user IDs to filter out deactivated members
      const activeUserIds = companyIds.length > 0 ? await getActiveUserIdsForCompanies(companyIds) : new Set<string>();

      const dates = getBucketDates(period);
      if (!dates) return [];

      const startDate = dates.start.toISOString().split('T')[0];
      const endDate = dates.end.toISOString().split('T')[0];

      const query = supabase
        .from('weekly_metrics')
        .select(`
          id,
          metric_name,
          metric_value,
          target_value,
          target_logic,
          week_start_date,
          owner_id,
          team_id,
          teams!inner(name)
        `)
        .is('deleted_at', null)
        .gte('week_start_date', startDate)
        .lte('week_start_date', endDate)
        .in('team_id', teamIds);

      const { data: metrics, error: metricsError } = await query;
      if (metricsError) throw metricsError;

      if (!metrics || metrics.length === 0) {
        return [];
      }

      // Filter to only include metrics owned by active users
      const filteredMetrics = metrics.filter((m: any) => 
        m.owner_id && activeUserIds.has(m.owner_id)
      );

      logger.log(`📊 Scorecard drill-down: Fetched ${metrics.length} total metrics, ${filteredMetrics.length} from active users for period "${period}"`);

      // Different aggregation strategy based on frequency
      let metricsToShow: any[];
      
      if (frequency === 'weekly') {
        // For weekly: Keep current behavior - snapshot of most recent week
        const mostRecentWeekDate = filteredMetrics.reduce((latest: Date, metric: any) => {
          const metricDate = new Date(metric.week_start_date);
          return metricDate > latest ? metricDate : latest;
        }, new Date(0));

        const mostRecentWeekStr = mostRecentWeekDate.toISOString().split('T')[0];
        logger.log(`📍 Weekly mode - Most recent week: ${mostRecentWeekStr}`);

        metricsToShow = filteredMetrics.filter(
          (metric: any) => metric.week_start_date === mostRecentWeekStr
        );
        
        logger.log(`📊 Weekly mode - Showing ${metricsToShow.length} metrics from most recent week`);
      } else {
        // For monthly/quarterly/yearly: Aggregate unique metrics across entire bucket
        logger.log(`📊 Aggregation mode (${frequency}) - Processing all ${filteredMetrics.length} metrics`);
        
        // Group by unique metric (metric_name + owner_id + team_id)
        const uniqueMetrics = new Map();
        filteredMetrics.forEach((metric: any) => {
          const key = `${metric.metric_name}-${metric.owner_id}-${metric.team_id}`;
          const existing = uniqueMetrics.get(key);
          // Keep the metric with the most recent week_start_date
          if (!existing || metric.week_start_date > existing.week_start_date) {
            uniqueMetrics.set(key, metric);
          }
        });

        metricsToShow = Array.from(uniqueMetrics.values());
        logger.log(`🔍 After deduplication: ${metricsToShow.length} unique metrics`);
      }

      const result: ScorecardDrillDownData[] = metricsToShow.map((metric: any) => {
        const isOnTrack = metric.metric_value !== null &&
          metric.target_value !== null &&
          metric.target_logic &&
          checkTargetCondition(metric.metric_value, metric.target_value, metric.target_logic);

        return {
          id: metric.id,
          metric_name: metric.metric_name || 'Unknown Metric',
          team_name: metric.teams?.name || 'Unknown Team',
          metric_value: metric.metric_value,
          target_value: metric.target_value,
          status: isOnTrack ? 'On Track' : 'Off Track',
          week_start_date: metric.week_start_date,
        };
      }) || [];

      return result;
    } catch (err) {
      logger.error('Error fetching metrics drill-down:', err);
      setError('Failed to load metrics data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [getBucketDates, teamIds, companyIds, frequency]);

  const fetchMeetingRatingsDrillDown = useCallback(async (period: string): Promise<MeetingRatingDrillDownData[]> => {
    try {
      setLoading(true);
      setError(null);

      const dates = getBucketDates(period);
      if (!dates || companyIds.length === 0) return [];

      // Fetch active user IDs to filter ratings
      const activeUserIds = await getActiveUserIdsForCompanies(companyIds);

      let query = supabase
        .from('meeting_results')
        .select(`
          id,
          created_at,
          meeting_ratings,
          total_duration_seconds,
          team_id,
          teams!inner(name)
        `)
        .in('company_id', companyIds)
        .gte('created_at', dates.start.toISOString())
        .lte('created_at', dates.end.toISOString());

      if (hideShortMeetings) {
        query = query.gte('total_duration_seconds', 1500);
      }

      if (teamIds.length > 0) {
        query = query.in('team_id', teamIds);
      }

      const { data: meetings, error: meetingsError } = await query;
      if (meetingsError) throw meetingsError;

      const result: MeetingRatingDrillDownData[] = meetings
        ?.map((meeting: any) => {
          // Filter ratings to only include active users
          const filteredRatings = filterRatingsByActiveUsers(
            meeting.meeting_ratings as Record<string, number>,
            activeUserIds
          );
          const ratings = Object.values(filteredRatings).filter((r: any) => typeof r === 'number' && r > 0);
          const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

          return {
            id: meeting.id,
            meeting_date: meeting.created_at,
            team_name: meeting.teams?.name || 'Unknown Team',
            num_ratings: ratings.length,
            avg_rating: avgRating,
            ratings: filteredRatings,
          };
        }) || [];

      return result;
    } catch (err) {
      logger.error('Error fetching meeting ratings drill-down:', err);
      setError('Failed to load meeting ratings data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [getBucketDates, teamIds, companyIds, hideShortMeetings]);

  const fetchTaskCompletionDrillDown = useCallback(async (period: string, statusFilter?: 'On Time' | 'Late' | 'Overdue'): Promise<TaskDrillDownData[]> => {
    try {
      setLoading(true);
      setError(null);

      const dates = getBucketDates(period);
      if (!dates || companyIds.length === 0) return [];

      // Fetch active user IDs to filter tasks
      const activeUserIds = await getActiveUserIdsForCompanies(companyIds);

      let query = supabase
        .from('fast_tasks')
        .select(`
          id,
          title,
          status,
          due_date,
          updated_at,
          completed_at,
          created_at,
          assigned_to,
          team_id,
          teams!inner(name)
        `)
        .in('company_id', companyIds)
        .eq('task_type', 'team')
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .not('team_id', 'is', null)
        .not('due_date', 'is', null)
        .gte('due_date', dates.start.toISOString().split('T')[0])
        .lte('due_date', dates.end.toISOString().split('T')[0]);

      if (teamIds.length > 0) {
        query = query.in('team_id', teamIds);
      }

      const { data: tasks, error: tasksError } = await query;
      if (tasksError) throw tasksError;

      // Filter to only include tasks assigned to at least one active user
      const tasksWithActiveAssignees = tasks?.filter((task: any) => {
        const assignedTo = task.assigned_to as string[] | null;
        if (!assignedTo || assignedTo.length === 0) return false;
        return assignedTo.some((userId: string) => activeUserIds.has(userId));
      }) || [];

      // Filter to only tasks with definitive status (matching chart logic)
      // Excludes in-progress tasks with future due dates
      const tasksWithDefinitiveStatus = tasksWithActiveAssignees.filter((task: any) => {
        // Include if completed
        if (task.status === 'done') return true;
        // Include if overdue (not completed and past LOCAL end-of-day)
        if (task.due_date && getLocalEndOfDay(task.due_date) < new Date()) return true;
        // Exclude in-progress tasks with future due dates
        return false;
      });

      // Fetch assignee names (only for active users)
      const allAssigneeIds = tasksWithDefinitiveStatus.flatMap((t: any) => 
        (t.assigned_to || []).filter((id: string) => activeUserIds.has(id))
      );
      const uniqueAssigneeIds = [...new Set(allAssigneeIds)];
      
      let profileMap = new Map<string, string>();
      if (uniqueAssigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', uniqueAssigneeIds);
        
        profileMap = new Map(
          profiles?.map(p => [p.id, p.full_name || p.email]) || []
        );
      }

      const result: TaskDrillDownData[] = tasksWithDefinitiveStatus.map((task: any) => {
        let completionStatus: 'On Time' | 'Late' | 'Overdue' = 'Overdue';

        if (task.status === 'done' && task.due_date) {
          // Use LOCAL end-of-day for comparison (matches chart logic)
          const completionDate = task.completed_at ? new Date(task.completed_at) : new Date(task.updated_at);
          completionStatus = completionDate <= getLocalEndOfDay(task.due_date) ? 'On Time' : 'Late';
        } else if (task.status === 'done') {
          completionStatus = 'On Time';
        } else if (task.due_date && getLocalEndOfDay(task.due_date) < new Date()) {
          completionStatus = 'Overdue';
        }

        // Only show active assignees in the display
        const assigneeNames = task.assigned_to
          ?.filter((id: string) => activeUserIds.has(id))
          .map((id: string) => profileMap.get(id))
          .filter(Boolean)
          .join(', ') || null;

        return {
          id: task.id,
          title: task.title,
          status: task.status,
          due_date: task.due_date,
          completed_at: task.status === 'done' ? (task.completed_at || task.updated_at) : null,
          assignee_name: assigneeNames,
          team_name: task.teams?.name || 'Unknown Team',
          completion_status: completionStatus,
        };
      }).filter((task: TaskDrillDownData) => {
        if (!statusFilter) return true;
        
        // "Late" filter includes both Late AND Overdue (matching chart logic)
        if (statusFilter === 'Late') {
          return task.completion_status === 'Late' || task.completion_status === 'Overdue';
        }
        
        // Other filters work as normal
        return task.completion_status === statusFilter;
      });

      return result;
    } catch (err) {
      logger.error('Error fetching task completion drill-down:', err);
      setError('Failed to load tasks data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [getBucketDates, teamIds, companyIds]);

  const fetchMeetingProductivityDrillDown = useCallback(async (period: string, type: 'issues' | 'tasks' | 'resolution'): Promise<MeetingProductivityDrillDownData[]> => {
    try {
      setLoading(true);
      setError(null);

      const dates = getBucketDates(period);
      if (!dates || companyIds.length === 0) return [];

      let query = supabase
        .from('meeting_results')
        .select(`
          id,
          created_at,
          tasks_created,
          issues_resolved,
          section_durations,
          total_duration_seconds,
          team_id,
          teams!inner(name)
        `)
        .in('company_id', companyIds)
        .gte('created_at', dates.start.toISOString())
        .lte('created_at', dates.end.toISOString());

      if (hideShortMeetings) {
        query = query.gte('total_duration_seconds', 1500);
      }

      if (teamIds.length > 0) {
        query = query.in('team_id', teamIds);
      }

      const { data: meetings, error: meetingsError } = await query;
      if (meetingsError) throw meetingsError;

      const result: MeetingProductivityDrillDownData[] = meetings?.map((meeting: any) => {
        const issuesResolved = Array.isArray(meeting.issues_resolved) ? meeting.issues_resolved : [];
        const tasksCreated = Array.isArray(meeting.tasks_created) ? meeting.tasks_created : [];
        const issuesCount = issuesResolved.length;
        const tasksCount = tasksCreated.length;

        const sectionDurations = meeting.section_durations as Record<string, number> || {};
        const issuesSectionTimeMs = sectionDurations['5'] || 0;
        const avgTimePerIssue = issuesCount > 0 && issuesSectionTimeMs > 0
          ? (issuesSectionTimeMs / 1000 / 60) / issuesCount
          : null;

        return {
          id: meeting.id,
          meeting_date: meeting.created_at,
          team_name: meeting.teams?.name || 'Unknown Team',
          issues_count: issuesCount,
          tasks_count: tasksCount,
          avg_time_per_issue: avgTimePerIssue,
          issues_resolved: issuesResolved,
          tasks_created: tasksCreated,
        };
      }).filter((m: MeetingProductivityDrillDownData) => {
        if (type === 'issues') return true;
        if (type === 'tasks') return true; // Show all meetings including those with 0 tasks
        if (type === 'resolution') return true; // Show all meetings
        return true;
      }) || [];

      return result;
    } catch (err) {
      logger.error('Error fetching meeting productivity drill-down:', err);
      setError('Failed to load meeting productivity data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [getBucketDates, teamIds, companyIds]);

  return {
    loading,
    error,
    fetchGoalsDrillDown,
    fetchMetricsDrillDown,
    fetchMeetingRatingsDrillDown,
    fetchTaskCompletionDrillDown,
    fetchMeetingProductivityDrillDown,
  };
};
