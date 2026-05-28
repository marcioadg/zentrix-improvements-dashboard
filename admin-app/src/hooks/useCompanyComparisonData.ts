import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/multiCompany';
import { getActiveUserIds, filterRatingsByActiveUsers } from '@/utils/analyticsUserFilter';
import { fetchAllPages } from '@/utils/fetchAllPages';
import { logger } from '@/utils/logger';

export interface CompanyMetrics {
  companyId: string;
  companyName: string;
  overallScore: number;
  goalsOnTrackPercent: number;
  metricsOnTrackPercent: number;
  avgMeetingRating: number;
  tasksCompletedLast7Days: number;
  tasksOnTimePercent: number;
  issuesResolvedLast7Days: number;
  tasksCreatedInMeetings: number;
  tasksToIssuesRatio: number;
  avgResolutionTimeMinutes: number;
  meetingsLast7Days: number;
  tasksPerPerson: number;
  issuesPerPerson: number;
  memberCount: number;
}

export type ComparisonTimeframe = 7 | 30 | 90 | 365;

export const useCompanyComparisonData = (
  companies: Company[], 
  enabled: boolean, 
  hideShortMeetings: boolean = true,
  timeframeDays: ComparisonTimeframe = 7
) => {
  const [data, setData] = useState<CompanyMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || companies.length === 0) {
      setData([]);
      return;
    }

    const fetchCompanyMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const startDate = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

        const metricsPromises = companies.map(async (company) => {
          const companyId = company.id;
          
          // Get active users for this company
          const activeUserIds = await getActiveUserIds(companyId);

          // Fetch goals
          const { data: goals } = await supabase
            .from('team_goals')
            .select('status, owner_id, teams!inner(company_id)')
            .eq('teams.company_id', companyId)
            .or('archived.is.null,archived.eq.false');

          // Filter by active users, but if no active users found (possible RLS issue), include all
          const filteredGoals = activeUserIds.size > 0
            ? (goals?.filter(g => g.owner_id && activeUserIds.has(g.owner_id)) || [])
            : (goals || []);
          const onTrackGoals = filteredGoals.filter(g => g.status === 'on_track' || g.status === 'complete').length;
          const goalsOnTrackPercent = filteredGoals.length > 0 ? (onTrackGoals / filteredGoals.length) * 100 : 0;

          // Fetch metrics (scorecards)
          const { data: metrics } = await supabase
            .from('weekly_metrics')
            .select('metric_value, target_value, target_logic, owner_id, teams!inner(company_id)')
            .eq('teams.company_id', companyId)
            .is('deleted_at', null);

          // Filter by active users, but if no active users found (possible RLS issue), include all
          const filteredMetrics = activeUserIds.size > 0
            ? (metrics?.filter(m => m.owner_id && activeUserIds.has(m.owner_id)) || [])
            : (metrics || []);
          const onTrackMetrics = filteredMetrics.filter(m => {
            if (m.metric_value === null || m.target_value === null) return false;
            const logic = m.target_logic || '>=';
            if (logic === '>=') return m.metric_value >= m.target_value;
            if (logic === '<=') return m.metric_value <= m.target_value;
            if (logic === '=') return m.metric_value === m.target_value;
            return m.metric_value >= m.target_value;
          }).length;
          const metricsOnTrackPercent = filteredMetrics.length > 0 ? (onTrackMetrics / filteredMetrics.length) * 100 : 0;

          // Fetch meeting results - includes ratings, issues, tasks, and duration
          let meetingsQuery = supabase
            .from('meeting_results')
            .select('meeting_ratings, issues_resolved, tasks_created, total_duration_seconds')
            .eq('company_id', companyId)
            .gte('created_at', startDate.toISOString());
          
          // Apply duration filter if enabled (25 minutes = 1500 seconds)
          if (hideShortMeetings) {
            meetingsQuery = meetingsQuery.gte('total_duration_seconds', 1500);
          }
          
          const { data: meetings } = await meetingsQuery;

          // Calculate avg meeting rating
          let totalRating = 0;
          let ratingCount = 0;
          meetings?.forEach(m => {
            if (!m.meeting_ratings) return;
            const filteredRatings = filterRatingsByActiveUsers(
              m.meeting_ratings as Record<string, number>,
              activeUserIds
            );
            const ratings = Object.values(filteredRatings).filter(r => typeof r === 'number' && r > 0);
            if (ratings.length > 0) {
              totalRating += ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
              ratingCount++;
            }
          });
          const avgMeetingRating = ratingCount > 0 ? totalRating / ratingCount : 0;

          // Calculate issues resolved
          const issuesResolved = meetings?.reduce((sum, m) => {
            const issuesList = m.issues_resolved as any[] | null;
            return sum + (issuesList?.length || 0);
          }, 0) || 0;

          // Calculate tasks created in meetings
          const tasksCreatedInMeetings = meetings?.reduce((sum, m) => {
            const tasksList = m.tasks_created as any[] | null;
            return sum + (tasksList?.length || 0);
          }, 0) || 0;

          // Calculate tasks to issues ratio
          const tasksToIssuesRatio = issuesResolved > 0 ? tasksCreatedInMeetings / issuesResolved : 0;

          // Calculate avg resolution time (duration / issues) - convert seconds to minutes
          let totalDurationSeconds = 0;
          let totalIssuesWithDuration = 0;
          meetings?.forEach(m => {
            const issuesList = m.issues_resolved as any[] | null;
            const issueCount = issuesList?.length || 0;
            if (issueCount > 0 && m.total_duration_seconds) {
              totalDurationSeconds += m.total_duration_seconds;
              totalIssuesWithDuration += issueCount;
            }
          });
          const avgResolutionTimeMinutes = totalIssuesWithDuration > 0 
            ? (totalDurationSeconds / 60) / totalIssuesWithDuration 
            : 0;

          // Fetch tasks completed in timeframe using pagination
          const tasks = await fetchAllPages(() => 
            supabase
              .from('fast_tasks')
              .select('id, assigned_to, due_date, updated_at')
              .eq('company_id', companyId)
              .eq('status', 'done')
              .eq('is_deleted', false)
              .gte('updated_at', startDate.toISOString())
              .order('updated_at', { ascending: true })
              .order('id', { ascending: true })
          );

          // Fetch active member count for this company
          const { data: members } = await supabase
            .from('company_members')
            .select('id')
            .eq('company_id', companyId)
            .eq('status', 'active');
          
          const memberCount = members?.length || 1;

          // Filter by active users, but if no active users found (possible RLS issue), include all tasks
          const filteredTasks = activeUserIds.size > 0
            ? (tasks?.filter(t => {
                const assignedTo = t.assigned_to as string[] | null;
                return assignedTo?.some(id => activeUserIds.has(id));
              }) || [])
            : (tasks || []);

          // Calculate tasks per person
          const tasksPerPerson = memberCount > 0 
            ? Math.round((filteredTasks.length / memberCount) * 10) / 10 
            : 0;

          // Calculate issues per person
          const issuesPerPerson = memberCount > 0 
            ? Math.round((issuesResolved / memberCount) * 10) / 10 
            : 0;

          // Calculate tasks on time %
          let onTimeTasks = 0;
          filteredTasks.forEach(task => {
            if (!task.due_date) {
              onTimeTasks++; // No due date = on time
            } else {
              const completedAt = new Date(task.updated_at);
              const dueDate = new Date(task.due_date);
              if (completedAt <= dueDate) {
                onTimeTasks++;
              }
            }
          });
          const tasksOnTimePercent = filteredTasks.length > 0 
            ? (onTimeTasks / filteredTasks.length) * 100 
            : 0;

          return {
            companyId,
            companyName: company.name,
            overallScore: 0, // Placeholder, calculated after all metrics are collected
            goalsOnTrackPercent,
            metricsOnTrackPercent,
            avgMeetingRating,
            tasksCompletedLast7Days: filteredTasks.length,
            tasksOnTimePercent,
            issuesResolvedLast7Days: issuesResolved,
            tasksCreatedInMeetings,
            tasksToIssuesRatio,
            avgResolutionTimeMinutes,
            meetingsLast7Days: meetings?.length || 0,
            tasksPerPerson,
            issuesPerPerson,
            memberCount,
          };
        });

        const results = await Promise.all(metricsPromises);
        
        // Calculate normalized values for comparative metrics
        const maxRatio = Math.max(...results.map(r => r.tasksToIssuesRatio), 1);
        const minResTime = Math.min(...results.filter(r => r.avgResolutionTimeMinutes > 0).map(r => r.avgResolutionTimeMinutes), 1);
        const maxResTime = Math.max(...results.map(r => r.avgResolutionTimeMinutes), 60);

        // Normalize activity metrics across all companies
        const maxTasksPerPerson = Math.max(...results.map(r => r.tasksPerPerson), 1);
        const maxIssuesPerPerson = Math.max(...results.map(r => r.issuesPerPerson), 1);
        const maxTasksCompleted = Math.max(...results.map(r => r.tasksCompletedLast7Days), 1);
        const maxIssuesResolved = Math.max(...results.map(r => r.issuesResolvedLast7Days), 1);
        const maxMeetings = Math.max(...results.map(r => r.meetingsLast7Days), 1);
        const maxTasksCreated = Math.max(...results.map(r => r.tasksCreatedInMeetings), 1);
        
        // Calculate overall score for each company (8 metrics - excludes total tasks/issues/meetings)
        const resultsWithScores = results.map(r => {
          // Quality metrics (62% total)
          const goalsScore = (r.goalsOnTrackPercent / 100) * 10 * 0.17;
          const metricsScore = (r.metricsOnTrackPercent / 100) * 10 * 0.17;
          const ratingScore = r.avgMeetingRating * 0.14;
          const tasksOnTimeScore = (r.tasksOnTimePercent / 100) * 10 * 0.14;
          
          // Efficiency metrics (13% total)
          const normalizedRatio = maxRatio > 0 ? (r.tasksToIssuesRatio / maxRatio) * 10 : 0;
          const ratioScore = normalizedRatio * 0.07;
          
          let normalizedResTime = 5;
          if (r.avgResolutionTimeMinutes > 0 && maxResTime > minResTime) {
            normalizedResTime = 10 - ((r.avgResolutionTimeMinutes - minResTime) / (maxResTime - minResTime)) * 10;
            normalizedResTime = Math.max(0, Math.min(10, normalizedResTime));
          }
          const resTimeScore = normalizedResTime * 0.06;
          
          // Productivity per-person metrics (25% total)
          const tasksPerPersonScore = maxTasksPerPerson > 0 
            ? (r.tasksPerPerson / maxTasksPerPerson) * 10 * 0.14 : 0;
          const issuesPerPersonScore = maxIssuesPerPerson > 0 
            ? (r.issuesPerPerson / maxIssuesPerPerson) * 10 * 0.09 : 0;
          const tasksCreatedScore = maxTasksCreated > 0 
            ? (r.tasksCreatedInMeetings / maxTasksCreated) * 10 * 0.02 : 0;
          
          const overallScore = goalsScore + metricsScore + ratingScore + tasksOnTimeScore 
            + ratioScore + resTimeScore 
            + tasksPerPersonScore + issuesPerPersonScore + tasksCreatedScore;
          
          return {
            ...r,
            overallScore: Math.round(overallScore * 10) / 10,
          };
        });
        
        setData(resultsWithScores);
      } catch (err) {
        logger.error('Error fetching company comparison data:', err);
        setError('Failed to load comparison data');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyMetrics();
  }, [companies.map(c => c.id).join(','), enabled, hideShortMeetings, timeframeDays]);

  return { data, loading, error };
};
