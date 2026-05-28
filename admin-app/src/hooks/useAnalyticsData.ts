import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { 
  TimeSeriesAnalyticsData,
  TimeSeriesDataPoint
} from '@/types/analytics';
import { logger } from '@/lib/logger';
import { generateTimeBuckets, getDateRange, isDateInBucket, TimeBucket, getLocalEndOfDay, parseLocalDate } from '@/utils/timeBucketUtils';
import { checkTargetCondition } from '@/utils/metricUtils';
import { getActiveUserIds, filterRatingsByActiveUsers } from '@/utils/analyticsUserFilter';
import { fetchAllPages } from '@/utils/fetchAllPages';
import { buildGoalStatusTimeSeries } from '@/utils/goalStatusAnalytics';
export const useAnalyticsData = (
  selectedTeamId: string | null,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  timeframe: '4weeks' | '3months' | '6months' | '1year' | '2years' | 'alltime',
  hideShortMeetings: boolean = false,
  companyIds: string[] = []
) => {
  const [data, setData] = useState<TimeSeriesAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the first company ID for queries that need a single company context (like active user filtering)
  const primaryCompanyId = companyIds[0] || null;

  const fetchGoalsTimeSeries = useCallback(async (teamIds: string[], buckets: TimeBucket[]): Promise<TimeSeriesDataPoint[]> => {
    try {
      // Guard: Return empty if no teams to query
      if (teamIds.length === 0) {
        logger.warn('⚠️ No team IDs provided for goals query - returning empty results');
        return [];
      }

      const maxBucketEnd = buckets.reduce((latest, bucket) => (
        bucket.end > latest ? bucket.end : latest
      ), buckets[0]?.end ?? new Date());
      const maxBucketEndDate = maxBucketEnd.toISOString().split('T')[0];
      
      logger.log('🎯 ===== GOALS FETCH START =====');
      logger.log('📅 Date Range:', { 
        end: maxBucketEnd.toISOString(),
        teamIds,
        bucketsCount: buckets.length
      });

      const goals = await fetchAllPages(() =>
        supabase
          .from('team_goals')
          .select('id, status, created_at, updated_at, archived, is_deleted, deleted_at')
          .in('team_id', teamIds)
          .or('archived.is.null,archived.eq.false')
          .or('is_deleted.is.null,is_deleted.eq.false')
          .is('deleted_at', null)
      );

      const snapshots = await fetchAllPages(() =>
        supabase
          .from('goal_status_snapshots')
          .select('goal_id, team_id, status, snapshot_date')
          .lte('snapshot_date', maxBucketEndDate)
          .in('team_id', teamIds)
          .order('snapshot_date', { ascending: true })
      );

      logger.log('📥 Goals status data fetched:', {
        currentGoals: goals.length,
        snapshots: snapshots.length,
      });

      const results = buildGoalStatusTimeSeries(goals, snapshots, buckets);

      logger.log('🎯 ===== GOALS FETCH COMPLETE =====\n');
      return results;
    } catch (err) {
      logger.error('❌ Error in fetchGoalsTimeSeries:', err);
      logger.error('Error fetching goals time series:', err);
      return [];
    }
  }, [timeframe, frequency]);

  const fetchMetricsPerformanceTimeSeries = useCallback(async (teamIds: string[], buckets: TimeBucket[]): Promise<TimeSeriesDataPoint[]> => {
    try {
      logger.log('🎯 ===== METRICS PERFORMANCE FETCH START =====');
      logger.log('📊 Input Parameters:', {
        teamIds,
        teamIdsCount: teamIds.length,
        bucketsCount: buckets.length,
        frequency,
        timeframe
      });

      // Guard: Return empty if no teams to query
      if (teamIds.length === 0) {
        logger.warn('⚠️ No team IDs - returning empty');
        return [];
      }

      // Fetch active user IDs to filter out deactivated members (from all companies)
      const activeUserIdSets = await Promise.all(companyIds.map(id => getActiveUserIds(id)));
      const activeUserIds = new Set<string>();
      activeUserIdSets.forEach(set => set.forEach(id => activeUserIds.add(id)));
      logger.log(`📊 Active users for filtering: ${activeUserIds.size}`);

      const { start, end } = getDateRange(timeframe, frequency);
      
      logger.log('📅 Date Range Calculated:', {
        start: start.toISOString(),
        end: end.toISOString(),
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      });

      logger.log('📦 Buckets Generated:');
      buckets.forEach((bucket, idx) => {
        logger.log(`  Bucket ${idx}: ${bucket.label}`, {
          start: bucket.start.toISOString().split('T')[0],
          end: bucket.end.toISOString().split('T')[0]
        });
      });
      
      // Fetch all weekly metrics using pagination to bypass 1000-row limit
      const metricsData = await fetchAllPages(() => 
        supabase
          .from('weekly_metrics')
          .select('id, metric_name, owner_id, team_id, metric_value, target_value, target_logic, week_start_date')
          .is('deleted_at', null)
          .gte('week_start_date', start.toISOString().split('T')[0])
          .lte('week_start_date', end.toISOString().split('T')[0])
          .in('team_id', teamIds)
          .order('week_start_date', { ascending: true })
          .order('id', { ascending: true })
      );

      // Filter to only include metrics owned by active users
      const filteredMetricsData = metricsData?.filter(m => 
        m.owner_id && activeUserIds.has(m.owner_id)
      ) || [];

      logger.log('📥 Raw Data Fetched:', {
        totalMetrics: metricsData?.length || 0,
        afterActiveUserFilter: filteredMetricsData.length,
        uniqueWeeks: [...new Set(filteredMetricsData.map(m => m.week_start_date))].sort(),
        uniqueTeams: [...new Set(filteredMetricsData.map(m => m.team_id))]
      });

      // Group by week to see distribution
      const weekDistribution: Record<string, number> = {};
      filteredMetricsData.forEach(m => {
        weekDistribution[m.week_start_date] = (weekDistribution[m.week_start_date] || 0) + 1;
      });
      logger.log('📊 Metrics by Week:', weekDistribution);

      let lastValidPercentage: number | null = null;

      const results = buckets.map((bucket, bucketIdx) => {
        const metricsInBucket = filteredMetricsData.filter(metric => 
          isDateInBucket(metric.week_start_date, bucket)
        ) || [];

        logger.log(`\n🔍 Bucket ${bucketIdx} (${bucket.label}):`, {
          bucketStart: bucket.start.toISOString().split('T')[0],
          bucketEnd: bucket.end.toISOString().split('T')[0],
          metricsFound: metricsInBucket.length,
          weekDates: [...new Set(metricsInBucket.map(m => m.week_start_date))]
        });

        // Check if we have metrics with actual values (not just NULL values)
        const metricsWithValues = metricsInBucket.filter(m => m.metric_value !== null);
        const hasRealData = metricsWithValues.length > 0;

        if (!hasRealData) {
          logger.log(`  ❌ No metrics with values in bucket ${bucket.label}`);
          
          // Use last known percentage if available
          if (lastValidPercentage !== null) {
            logger.log(`  🔄 Using last known data: ${lastValidPercentage.toFixed(1)}%`);
            return {
              date: bucket.dateKey,
              period: bucket.label,
              'On Track': lastValidPercentage,
              isLastKnown: true,
            };
          }
          
          return {
            date: bucket.dateKey,
            period: bucket.label,
            'On Track': 0,
            isLastKnown: false,
          };
        }

        // Different aggregation strategy based on frequency
        let metricsToAnalyze: any[];
        
        if (frequency === 'weekly') {
          // For weekly: Keep current behavior - snapshot of most recent week
          const mostRecentWeekDate = metricsInBucket.reduce((latest, metric) => {
            const metricDate = new Date(metric.week_start_date);
            return metricDate > latest ? metricDate : latest;
          }, new Date(0));

          const mostRecentWeekStr = mostRecentWeekDate.toISOString().split('T')[0];
          logger.log(`  📍 Most recent week in bucket: ${mostRecentWeekStr}`);

          metricsToAnalyze = metricsInBucket.filter(
            metric => metric.week_start_date === mostRecentWeekStr
          );
          
          logger.log(`  📊 Weekly mode - Metrics from most recent week: ${metricsToAnalyze.length}`);
        } else {
          // For monthly/quarterly/yearly: Aggregate unique metrics across entire bucket
          logger.log(`  📊 Aggregation mode (${frequency}) - Total metrics in bucket: ${metricsInBucket.length}`);
          
          // Group by unique metric (metric_name + owner_id + team_id)
          const uniqueMetrics = new Map();
          metricsInBucket.forEach(metric => {
            const key = `${metric.metric_name}-${metric.owner_id}-${metric.team_id}`;
            const existing = uniqueMetrics.get(key);
            // Keep the metric with the most recent week_start_date
            if (!existing || metric.week_start_date > existing.week_start_date) {
              uniqueMetrics.set(key, metric);
            }
          });

          metricsToAnalyze = Array.from(uniqueMetrics.values());
          logger.log(`  🔍 Unique metrics after deduplication: ${metricsToAnalyze.length}`);
        }

        // Calculate percentage based on analyzed metrics
        const totalMetrics = metricsToAnalyze.length;
        const onTrackMetrics = metricsToAnalyze.filter(m => {
          const hasValue = m.metric_value !== null;
          const hasTarget = m.target_value !== null;
          const hasLogic = m.target_logic !== null;
          const isOnTrack = hasValue && hasTarget && hasLogic && 
            checkTargetCondition(m.metric_value, m.target_value, m.target_logic);
          
          return isOnTrack;
        }).length;

        const percentage = totalMetrics > 0 ? (onTrackMetrics / totalMetrics) * 100 : 0;

        logger.log(`  ✅ Results for ${bucket.label}:`, {
          total: totalMetrics,
          onTrack: onTrackMetrics,
          percentage: percentage.toFixed(1) + '%'
        });

        // Update last valid percentage for future fallback
        lastValidPercentage = percentage;

        return {
          date: bucket.dateKey,
          period: bucket.label,
          'On Track': percentage,
          isLastKnown: false,
        };
      });

      logger.log('🎯 ===== SCORECARDS FETCH COMPLETE =====\n');
      logger.log('Final Results:', results);

      return results;
    } catch (err: any) {
      logger.error('Error fetching scorecards time series:', err);
      return [];
    }
  }, [timeframe, frequency, companyIds.join(',')]);

  const fetchMeetingRatingsTimeSeries = useCallback(async (teamIds: string[], buckets: TimeBucket[]): Promise<TimeSeriesDataPoint[]> => {
    try {
      const { start, end } = getDateRange(timeframe, frequency);
      
      // Fetch active user IDs to filter out deactivated members' ratings (from all companies)
      const activeUserIdSets = await Promise.all(companyIds.map(id => getActiveUserIds(id)));
      const activeUserIds = new Set<string>();
      activeUserIdSets.forEach(set => set.forEach(id => activeUserIds.add(id)));
      logger.log(`📊 Meeting Ratings - Active users for filtering: ${activeUserIds.size}`);

      let query = supabase
        .from('meeting_results')
        .select('team_id, meeting_ratings, created_at, total_duration_seconds')
        .in('company_id', companyIds)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (teamIds.length > 0) {
        query = query.in('team_id', teamIds);
      }

      const { data: meetingsData, error: meetingsError } = await query;
      if (meetingsError) throw meetingsError;

      return buckets.map(bucket => {
        const meetingsInBucket = meetingsData?.filter(meeting => {
          const inBucket = isDateInBucket(meeting.created_at, bucket);
          if (!inBucket) return false;
          
          // Apply duration filter if enabled
          if (hideShortMeetings) {
            const duration = meeting.total_duration_seconds || 0;
            return duration >= 1500; // 25 minutes in seconds
          }
          
          return true;
        }) || [];

        const allRatings: number[] = [];
        meetingsInBucket.forEach(meeting => {
          if (!meeting.meeting_ratings) return;
          
          // Filter ratings to only include active users
          const filteredRatings = filterRatingsByActiveUsers(
            meeting.meeting_ratings as Record<string, number>,
            activeUserIds
          );
          
          const validRatings = Object.values(filteredRatings)
            .filter((r: any) => typeof r === 'number' && r > 0);
          allRatings.push(...validRatings as number[]);
        });

        const avgRating = allRatings.length > 0
          ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
          : 0;

        return {
          date: bucket.dateKey,
          period: bucket.label,
          'Average Rating': avgRating,
        };
      });
    } catch (err) {
      logger.error('Error fetching meeting ratings time series:', err);
      return [];
    }
  }, [timeframe, frequency, companyIds.join(','), hideShortMeetings]);

  const fetchTaskCompletionTimeSeries = useCallback(async (teamIds: string[], buckets: TimeBucket[]): Promise<TimeSeriesDataPoint[]> => {
    try {
      const { start, end } = getDateRange(timeframe, frequency);
      
      // Fetch active user IDs to filter out tasks assigned to deactivated members (from all companies)
      const activeUserIdSets = await Promise.all(companyIds.map(id => getActiveUserIds(id)));
      const activeUserIds = new Set<string>();
      activeUserIdSets.forEach(set => set.forEach(id => activeUserIds.add(id)));
      logger.log(`📊 Task Completion - Active users for filtering: ${activeUserIds.size}`);

      // Note: Archived tasks ARE included - they represent completed historical work
      // Fetch all tasks using pagination to bypass 1000-row limit
      const tasksData = await fetchAllPages(() => {
        let query = supabase
          .from('fast_tasks')
          .select('id, team_id, status, due_date, updated_at, completed_at, created_at, assigned_to')
          .in('company_id', companyIds)
          .eq('task_type', 'team')
          .eq('is_deleted', false)
          .not('team_id', 'is', null)
          .not('due_date', 'is', null)
          .gte('due_date', start.toISOString().split('T')[0])
          .lte('due_date', end.toISOString().split('T')[0])
          .order('due_date', { ascending: true })
          .order('id', { ascending: true });

        if (teamIds.length > 0) {
          query = query.in('team_id', teamIds);
        }

        return query;
      });

      // Filter to only include tasks assigned to at least one active user
      const filteredTasksData = tasksData?.filter(task => {
        const assignedTo = task.assigned_to as string[] | null;
        if (!assignedTo || assignedTo.length === 0) return false;
        return assignedTo.some(userId => activeUserIds.has(userId));
      }) || [];

      logger.log(`📊 Tasks after active user filter: ${filteredTasksData.length} (from ${tasksData?.length || 0})`);

      return buckets.map(bucket => {
        const tasksInBucket = filteredTasksData.filter(task => 
          task.due_date && isDateInBucket(task.due_date, bucket)
        ) || [];

        // Only consider tasks with due dates
        const tasksWithDueDate = tasksInBucket.filter(t => t.due_date);
        
        // Only count tasks with definitive status (completed OR overdue)
        // Excludes in-progress tasks with future due dates
        const tasksWithDefinitiveStatus = tasksWithDueDate.filter(t => {
          // Include if completed
          if (t.status === 'done') return true;
          // Include if overdue (not completed and past LOCAL end-of-day of due date)
          if (getLocalEndOfDay(t.due_date) < new Date()) return true;
          // Exclude if in progress with future due date
          return false;
        });
        
        const total = tasksWithDefinitiveStatus.length;
        
        const completedOnTime = tasksWithDefinitiveStatus.filter(t => {
          if (t.status !== 'done') return false;
          // Compare against LOCAL end-of-day of due_date
          const completionDate = t.completed_at ? new Date(t.completed_at) : new Date(t.updated_at);
          return completionDate <= getLocalEndOfDay(t.due_date);
        }).length;

        // Combine completed late and overdue into single "Late" category
        const late = tasksWithDefinitiveStatus.filter(t => {
          // Completed late (after LOCAL end-of-day of due date)
          if (t.status === 'done') {
            const completionDate = t.completed_at ? new Date(t.completed_at) : new Date(t.updated_at);
            return completionDate > getLocalEndOfDay(t.due_date);
          }
          // Or overdue (not completed and past LOCAL end-of-day of due date)
          return getLocalEndOfDay(t.due_date) < new Date();
        }).length;

        return {
          date: bucket.dateKey,
          period: bucket.label,
          'On Time': total > 0 ? (completedOnTime / total) * 100 : 0,
          'Late': total > 0 ? (late / total) * 100 : 0,
        };
      });
    } catch (err) {
      logger.error('Error fetching task completion time series:', err);
      return [];
    }
  }, [timeframe, frequency, companyIds.join(',')]);

  const fetchMeetingProductivityTimeSeries = useCallback(async (teamIds: string[], buckets: TimeBucket[]): Promise<TimeSeriesDataPoint[]> => {
    try {
      const { start, end } = getDateRange(timeframe, frequency);
      
      let query = supabase
        .from('meeting_results')
        .select('team_id, tasks_created, issues_resolved, section_durations, created_at, total_duration_seconds')
        .in('company_id', companyIds)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (teamIds.length > 0) {
        query = query.in('team_id', teamIds);
      }

      const { data: meetingsData, error: meetingsError } = await query;
      if (meetingsError) throw meetingsError;

      return buckets.map(bucket => {
        const meetingsInBucket = meetingsData?.filter(meeting => {
          const inBucket = isDateInBucket(meeting.created_at, bucket);
          if (!inBucket) return false;
          
          // Apply duration filter if enabled
          if (hideShortMeetings) {
            const duration = meeting.total_duration_seconds || 0;
            return duration >= 1500; // 25 minutes in seconds
          }
          
          return true;
        }) || [];

        const totalMeetings = meetingsInBucket.length;
        let totalIssuesSolved = 0;
        let totalTasksCreated = 0;
        const timePerIssueValues: number[] = [];

        logger.log(`📊 Meeting Productivity - Bucket: ${bucket.label}, Meetings: ${totalMeetings}`);

        meetingsInBucket.forEach(meeting => {
          // Count issues solved
          if (meeting.issues_resolved && Array.isArray(meeting.issues_resolved)) {
            const issuesCount = meeting.issues_resolved.length;
            totalIssuesSolved += issuesCount;
            
            // Calculate time per issue from section 5 (Issues section)
            const sectionDurations = meeting.section_durations as Record<string, number> || {};
            const issuesSectionTimeMs = sectionDurations['5'] || 0;
            
            if (issuesCount > 0 && issuesSectionTimeMs > 0) {
              const timePerIssueMinutes = (issuesSectionTimeMs / 1000 / 60) / issuesCount;
              timePerIssueValues.push(timePerIssueMinutes);
            }
          }

          // Count tasks created
          if (meeting.tasks_created && Array.isArray(meeting.tasks_created)) {
            totalTasksCreated += meeting.tasks_created.length;
          }
        });

        const avgIssuesPerMeeting = totalMeetings > 0 ? totalIssuesSolved / totalMeetings : 0;
        const avgTasksPerMeeting = totalMeetings > 0 ? totalTasksCreated / totalMeetings : 0;
        const avgTimePerIssue = timePerIssueValues.length > 0
          ? timePerIssueValues.reduce((sum, time) => sum + time, 0) / timePerIssueValues.length
          : 0;

        logger.log(`📊 Results - Issues: ${totalIssuesSolved} (avg: ${avgIssuesPerMeeting.toFixed(2)}/meeting), Tasks: ${totalTasksCreated} (avg: ${avgTasksPerMeeting.toFixed(2)}/meeting)`);

        return {
          date: bucket.dateKey,
          period: bucket.label,
          'Issues Solved': avgIssuesPerMeeting,
          'Tasks Created': avgTasksPerMeeting,
          'Avg Resolution Time': avgTimePerIssue,
        };
      });
    } catch (err) {
      logger.error('Error fetching meeting productivity time series:', err);
      return [];
    }
  }, [timeframe, frequency, companyIds.join(','), hideShortMeetings]);

  const fetchAllAnalytics = useCallback(async () => {
    if (!companyIds.length) return;

    setLoading(true);
    setError(null);

    try {
      // Get all teams for selected companies
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .in('company_id', companyIds);

      if (teamsError) throw teamsError;

      const allTeamIds = teamsData?.map(t => t.id) || [];
      
      // Validate: Ensure we have teams to query
      if (allTeamIds.length === 0 && !selectedTeamId) {
        logger.warn('⚠️ No teams found for company - analytics will be empty');
        setData({
          goals: { timeSeries: [] },
          scorecards: { timeSeries: [] },
          meetingRatings: { timeSeries: [] },
          taskCompletion: { timeSeries: [] },
          meetingProductivity: { timeSeries: [] }
        });
        setLoading(false);
        return;
      }

      const teamIdsToFetch = selectedTeamId ? [selectedTeamId] : allTeamIds;

      // Generate time buckets
      const { start, end } = getDateRange(timeframe, frequency);
      const buckets = generateTimeBuckets(start, end, frequency);

      logger.log('📊 Analytics Date Range:', { start, end, timeframe, frequency });
      logger.log('📊 Generated Buckets:', buckets.map(b => ({ 
        label: b.label, 
        start: b.start, 
        end: b.end 
      })));

      // Fetch all analytics in parallel
      const [goals, metrics, meetingRatings, taskCompletion, meetingProductivity] = await Promise.all([
        fetchGoalsTimeSeries(teamIdsToFetch, buckets),
        fetchMetricsPerformanceTimeSeries(teamIdsToFetch, buckets),
        fetchMeetingRatingsTimeSeries(teamIdsToFetch, buckets),
        fetchTaskCompletionTimeSeries(teamIdsToFetch, buckets),
        fetchMeetingProductivityTimeSeries(teamIdsToFetch, buckets)
      ]);

      const analyticsData: TimeSeriesAnalyticsData = {
        goals: { timeSeries: goals },
        scorecards: { timeSeries: metrics },
        meetingRatings: { timeSeries: meetingRatings },
        taskCompletion: { timeSeries: taskCompletion },
        meetingProductivity: { timeSeries: meetingProductivity }
      };

      setData(analyticsData);

    } catch (err: any) {
      logger.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [companyIds.join(','), selectedTeamId, frequency, timeframe, fetchGoalsTimeSeries, fetchMetricsPerformanceTimeSeries, fetchMeetingRatingsTimeSeries, fetchTaskCompletionTimeSeries, fetchMeetingProductivityTimeSeries]);

  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: fetchAllAnalytics
  };
};
