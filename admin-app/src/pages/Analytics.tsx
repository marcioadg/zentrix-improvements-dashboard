import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ShieldIcon, BarChart3, Grid3X3 } from 'lucide-react';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { use7DayAnalyticsSummary } from '@/hooks/use7DayAnalyticsSummary';
import { useAnalyticsDrillDown } from '@/hooks/useAnalyticsDrillDown';
import { DepartmentSelector } from '@/components/analytics/DepartmentSelector';
import { AnalyticsSettings } from '@/components/analytics/AnalyticsSettings';
import { CompanyComparisonHeatmap } from '@/components/analytics/CompanyComparisonHeatmap';
import { AnalyticsCompanyFilterDropdown } from '@/components/analytics/AnalyticsCompanyFilterDropdown';
import { useCompanyComparisonData, ComparisonTimeframe } from '@/hooks/useCompanyComparisonData';
import { useAnalyticsCompanyFilter } from '@/hooks/useAnalyticsCompanyFilter';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { safeStorage } from '@/utils/safeStorage';
import { KPISummaryCards } from '@/components/analytics/KPISummaryCards';
import { GoalsAnalyticsChart } from '@/components/analytics/GoalsAnalyticsChart';
import { MetricsPerformanceChart } from '@/components/analytics/MetricsPerformanceChart';
import { MeetingRatingsChart } from '@/components/analytics/MeetingRatingsChart';
import { TaskCompletionChart } from '@/components/analytics/TaskCompletionChart';
import { IssuesSolvedChart } from '@/components/analytics/IssuesSolvedChart';
import { TasksCreatedChart } from '@/components/analytics/TasksCreatedChart';
import { TasksToIssuesRatioChart } from '@/components/analytics/TasksToIssuesRatioChart';
import { AvgResolutionTimeChart } from '@/components/analytics/AvgResolutionTimeChart';
import { TasksCompletedOvertimeChart } from '@/components/analytics/TasksCompletedOvertimeChart';
import { TasksPerPersonOvertimeChart } from '@/components/analytics/TasksPerPersonOvertimeChart';
import { IssuesPerPersonOvertimeChart } from '@/components/analytics/IssuesPerPersonOvertimeChart';
import { ChartSkeleton } from '@/components/analytics/ChartSkeleton';
import { DrillDownModal } from '@/components/analytics/DrillDownModal';
import { DrillDownData, DrillDownColumn } from '@/types/analyticsDrillDown';
import { EmptyState } from '@/components/ui/empty-state';
import { format } from 'date-fns';
import { useTasksCompletedOvertime } from '@/hooks/useTasksCompletedOvertime';
import { useTasksPerPersonOvertime } from '@/hooks/useTasksPerPersonOvertime';
import { useIssuesPerPersonOvertime } from '@/hooks/useIssuesPerPersonOvertime';
import { generateTimeBuckets, getDateRange } from '@/utils/timeBucketUtils';
import { TimeSeriesAnalyticsData, TimeSeriesDataPoint } from '@/types/analytics';
import { fetchAllPages } from '@/utils/fetchAllPages';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

// Helper function to check if all analytics data is empty
const isAllDataEmpty = (
  data: TimeSeriesAnalyticsData | null,
  tasksOvertimeData: TimeSeriesDataPoint[] | null,
  sevenDaySummary: { goalsAchieved: number; avgMeetingRating: number; tasksCompleted: number; issuesResolved: number; loading: boolean }
): boolean => {
  // Don't show empty state while still loading summary
  if (sevenDaySummary.loading) return false;
  
  if (!data) return true;
  
  const hasGoalsData = data.goals.timeSeries.some(p => 
    (Number(p['Completed']) || 0) > 0 || 
    (Number(p['On Track']) || 0) > 0 || 
    (Number(p['Off Track']) || 0) > 0
  );
  
  const hasScorecardsData = data.scorecards.timeSeries.some(p => 
    (Number(p['On Track']) || 0) > 0
  );
  
  const hasMeetingRatingsData = data.meetingRatings.timeSeries.some(p => 
    (Number(p['Average Rating']) || 0) > 0
  );
  
  const hasTaskCompletionData = data.taskCompletion.timeSeries.some(p => 
    (Number(p['On Time']) || 0) > 0 || (Number(p['Late']) || 0) > 0
  );
  
  const hasMeetingProductivityData = data.meetingProductivity.timeSeries.some(p => 
    (Number(p['Issues Solved']) || 0) > 0 || (Number(p['Tasks Created']) || 0) > 0
  );
  
  const hasTasksOvertimeData = tasksOvertimeData?.some(p => 
    (Number(p['Tasks Completed']) || 0) > 0
  ) || false;
  
  const has7DayData = 
    sevenDaySummary.goalsAchieved > 0 || 
    sevenDaySummary.avgMeetingRating > 0 || 
    sevenDaySummary.tasksCompleted > 0 || 
    sevenDaySummary.issuesResolved > 0;
  
  return !hasGoalsData && !hasScorecardsData && !hasMeetingRatingsData && 
         !hasTaskCompletionData && !hasMeetingProductivityData && 
         !hasTasksOvertimeData && !has7DayData;
};

const frequencies = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const timeframes = [
  { value: '4weeks', label: 'Last 4 Weeks' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: '1year', label: 'Last Year' },
  { value: '2years', label: 'Last 2 Years' },
  { value: 'alltime', label: 'All Time' },
] as const;

export default function Analytics() {
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [timeframe, setTimeframe] = useState<'4weeks' | '3months' | '6months' | '1year' | '2years' | 'alltime'>('6months');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [allTeamIds, setAllTeamIds] = useState<string[]>([]);
  const [hideShortMeetings, setHideShortMeetings] = useState(() => {
    try {
      const saved = safeStorage.getItem('analytics_hideShortMeetings');
      return saved !== null ? JSON.parse(saved) : true;
    } catch { return true; }
  });
  const [showAllCompanies, setShowAllCompanies] = useState(() => {
    try {
      const saved = safeStorage.getItem('analytics_showAllCompanies');
      return saved !== null ? JSON.parse(saved) : false;
    } catch { return false; }
  });
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonTimeframe, setComparisonTimeframe] = useState<ComparisonTimeframe>(7);
  const { hasManagerAccess, hasDirectorAccess, isSuperAdmin } = useCurrentUserPermissionLevel();
  const { currentCompany, companies, loading: companyLoading } = useMultiCompany();
  const { excludedCompanyIds, updateFilter, isLoading: filterLoading, isUpdating: filterUpdating } = useAnalyticsCompanyFilter();

  // Compute effective company IDs based on toggle state and filter
  const effectiveCompanyIds = useMemo(() => {
    if (showAllCompanies && isSuperAdmin && companies.length > 0) {
      // Filter out excluded companies
      return companies
        .map(c => c.id)
        .filter(id => !excludedCompanyIds.includes(id));
    }
    return currentCompany?.id ? [currentCompany?.id] : [];
  }, [showAllCompanies, isSuperAdmin, companies, currentCompany?.id, excludedCompanyIds]);

  // Filtered companies for comparison modal
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => !excludedCompanyIds.includes(c.id));
  }, [companies, excludedCompanyIds]);

  // Company comparison data (only fetched when modal is open)
  const { 
    data: comparisonData, 
    loading: comparisonLoading 
  } = useCompanyComparisonData(filteredCompanies, comparisonModalOpen && isSuperAdmin && showAllCompanies, hideShortMeetings, comparisonTimeframe);

  // Track analytics view
  useEffect(() => {
    import('@/lib/analytics').then(({ trackAnalyticsView }) => {
      trackAnalyticsView();
    }).catch(err => logger.warn('Failed to load analytics:', err));
  }, []);

  // Persist hideShortMeetings preference
  useEffect(() => {
    safeStorage.setItem('analytics_hideShortMeetings', JSON.stringify(hideShortMeetings));
  }, [hideShortMeetings]);

  // Persist showAllCompanies preference
  useEffect(() => {
    safeStorage.setItem('analytics_showAllCompanies', JSON.stringify(showAllCompanies));
  }, [showAllCompanies]);

  // Stable string key for effectiveCompanyIds to use as a dependency
  const effectiveCompanyIdsKey = useMemo(() => effectiveCompanyIds.join(','), [effectiveCompanyIds]);

  // Fetch all team IDs for the effective companies
  useEffect(() => {
    let cancelled = false;

    const fetchTeams = async () => {
      if (!effectiveCompanyIds.length) {
        if (!cancelled) setAllTeamIds([]);
        return;
      }

      const { data: teamsData } = await supabase
        .from('teams')
        .select('id')
        .in('company_id', effectiveCompanyIds);

      if (!cancelled) {
        setAllTeamIds(teamsData?.map(t => t.id) || []);
      }
    };

    fetchTeams();
    return () => { cancelled = true; };
  }, [effectiveCompanyIdsKey]);

  // Reset selectedTeamId when showAllCompanies is enabled
  useEffect(() => {
    if (showAllCompanies) {
      setSelectedTeamId(null);
    }
  }, [showAllCompanies]);
  
  const { data, loading, error } = useAnalyticsData(selectedTeamId, frequency, timeframe, hideShortMeetings, effectiveCompanyIds);
  const sevenDaySummary = use7DayAnalyticsSummary(
    effectiveCompanyIds,
    selectedTeamId ? [selectedTeamId] : allTeamIds
  );
  const { data: tasksOvertimeData, loading: tasksOvertimeLoading } = useTasksCompletedOvertime(
    effectiveCompanyIds,
    selectedTeamId,
    frequency,
    timeframe
  );
  const { data: tasksPerPersonData, loading: tasksPerPersonLoading } = useTasksPerPersonOvertime(
    effectiveCompanyIds,
    selectedTeamId,
    frequency,
    timeframe
  );
  const { data: issuesPerPersonData, loading: issuesPerPersonLoading } = useIssuesPerPersonOvertime(
    effectiveCompanyIds,
    selectedTeamId,
    frequency,
    timeframe
  );

  // Drill-down state
  const [drillDownModal, setDrillDownModal] = useState<{
    open: boolean;
    title: string;
    description?: string;
    data: DrillDownData[];
    columns: DrillDownColumn[];
  }>({
    open: false,
    title: '',
    description: '',
    data: [],
    columns: [],
  });

  // Get team IDs for drill-down queries
  const teamIds = selectedTeamId ? [selectedTeamId] : allTeamIds;
  
  // Generate time buckets once to share between charts and drill-down
  const timeBuckets = React.useMemo(() => {
    const { start, end } = getDateRange(timeframe, frequency);
    return generateTimeBuckets(start, end, frequency);
  }, [timeframe, frequency]);

  // Find most recent period with actual goal data (fallback for 0% current period)
  const mostRecentGoalsPeriod = useMemo(() => {
    if (!data?.goals.timeSeries.length) return null;
    
    // Search backwards for first period with actual goal data
    for (let i = data.goals.timeSeries.length - 1; i >= 0; i--) {
      const entry = data.goals.timeSeries[i];
      const total = 
        (Number(entry['Completed']) || 0) + 
        (Number(entry['On Track']) || 0) + 
        (Number(entry['Off Track']) || 0);
      if (total > 0) return entry;
    }
    
    // Fallback to last if no data anywhere
    return data.goals.timeSeries[data.goals.timeSeries.length - 1];
  }, [data?.goals.timeSeries]);

  const drillDown = useAnalyticsDrillDown(
    effectiveCompanyIds,
    teamIds,
    frequency,
    timeframe,
    hideShortMeetings,
    timeBuckets
  );

  // Drill-down handlers
  const handleGoalsClick = async (period: string, dataKey: string) => {
    try {
      const data = await drillDown.fetchGoalsDrillDown(period);
      const statusFilter = dataKey as 'complete' | 'on_track' | 'off_track' | 'canceled';
      const filteredData = data.filter(g => g.status === statusFilter);

      setDrillDownModal({
        open: true,
        title: `Goals: ${dataKey} - ${period}`,
        description: `Showing ${filteredData.length} goals with status "${dataKey}"`,
        data: filteredData,
        columns: [
          { key: 'title', label: 'Goal Title' },
          { key: 'team_name', label: 'Team' },
          { key: 'status', label: 'Status' },
          { key: 'owner_name', label: 'Owner' },
          { key: 'updated_at', label: 'Last Updated' },
        ],
      });
    } catch (error) {
      logger.error('Failed to fetch goals drill-down:', error);
      toast.error('Failed to load drill-down data');
    }
  };

  const handleScorecardsClick = async (period: string) => {
    try {
      const data = await drillDown.fetchMetricsDrillDown(period);

      setDrillDownModal({
        open: true,
        title: `Metrics - ${period}`,
        description: `Showing ${data.length} metrics`,
        data,
        columns: [
          { key: 'metric_name', label: 'Metric Name' },
          { key: 'team_name', label: 'Team' },
          { key: 'metric_value', label: 'Actual' },
          { key: 'target_value', label: 'Target' },
          { key: 'status', label: 'Status' },
          { key: 'week_start_date', label: 'Week' },
        ],
      });
    } catch (error) {
      logger.error('Failed to fetch metrics drill-down:', error);
      toast.error('Failed to load drill-down data');
    }
  };

  const handleMeetingRatingsClick = async (period: string) => {
    try {
      const data = await drillDown.fetchMeetingRatingsDrillDown(period);

      setDrillDownModal({
        open: true,
        title: `Meeting Ratings - ${period}`,
        description: `Showing ${data.length} meetings`,
        data,
        columns: [
          { key: 'meeting_date', label: 'Date' },
          { key: 'team_name', label: 'Team' },
          { key: 'num_ratings', label: 'Ratings Count' },
          {
            key: 'avg_rating',
            label: 'Avg Rating',
            render: (value: number) => value.toFixed(1)
          },
        ],
      });
    } catch (error) {
      logger.error('Failed to fetch meeting ratings drill-down:', error);
      toast.error('Failed to load drill-down data');
    }
  };

  const handleTaskCompletionClick = async (period: string, dataKey: string) => {
    try {
      const statusMap: Record<string, 'On Time' | 'Late' | 'Overdue'> = {
        'On Time': 'On Time',
        'Late': 'Late',
        'Overdue': 'Overdue'
      };
      const statusFilter = statusMap[dataKey];
      const data = await drillDown.fetchTaskCompletionDrillDown(period, statusFilter);

      setDrillDownModal({
        open: true,
        title: `Tasks: ${dataKey} - ${period}`,
        description: `Showing ${data.length} tasks`,
        data,
        columns: [
          { key: 'title', label: 'Task Title' },
          { key: 'team_name', label: 'Team' },
          { key: 'assignee_name', label: 'Assignee' },
          { key: 'due_date', label: 'Due Date' },
          { key: 'completed_at', label: 'Completed' },
          { key: 'completion_status', label: 'Status' },
        ],
      });
    } catch (error) {
      logger.error('Failed to fetch task completion drill-down:', error);
      toast.error('Failed to load drill-down data');
    }
  };

  const handleIssuesSolvedClick = async (period: string) => {
    try {
      const data = await drillDown.fetchMeetingProductivityDrillDown(period, 'issues');

      setDrillDownModal({
        open: true,
        title: `Issues Solved - ${period}`,
        description: `Showing ${data.length} meetings with issues resolved`,
        data,
        columns: [
          { key: 'meeting_date', label: 'Meeting Date' },
          { key: 'team_name', label: 'Team' },
          { key: 'issues_count', label: 'Issues Resolved' },
        ],
      });
    } catch (error) {
      logger.error('Failed to fetch issues solved drill-down:', error);
      toast.error('Failed to load drill-down data');
    }
  };

  const handleTasksCreatedClick = async (period: string) => {
    try {
      const data = await drillDown.fetchMeetingProductivityDrillDown(period, 'tasks');

      setDrillDownModal({
        open: true,
        title: `Tasks Created - ${period}`,
        description: `Showing ${data.length} meetings with tasks created`,
        data,
        columns: [
          { key: 'meeting_date', label: 'Meeting Date' },
          { key: 'team_name', label: 'Team' },
          { key: 'tasks_count', label: 'Tasks Created' },
        ],
      });
    } catch (error) {
      logger.error('Failed to fetch tasks created drill-down:', error);
      toast.error('Failed to load drill-down data');
    }
  };

  const handleAvgResolutionTimeClick = async (period: string) => {
    try {
      const data = await drillDown.fetchMeetingProductivityDrillDown(period, 'resolution');

      setDrillDownModal({
        open: true,
        title: `Avg Resolution Time - ${period}`,
        description: `Showing ${data.length} meetings with resolution time data`,
        data,
        columns: [
          { key: 'meeting_date', label: 'Meeting Date' },
          { key: 'team_name', label: 'Team' },
          { key: 'issues_count', label: 'Issues' },
          {
            key: 'avg_time_per_issue',
            label: 'Avg Time (min)',
            render: (value: number | null) => value ? value.toFixed(1) : '—'
          },
        ],
      });
    } catch (error) {
      logger.error('Failed to fetch avg resolution time drill-down:', error);
      toast.error('Failed to load drill-down data');
    }
  };

  // New handlers for overtime charts
  const handleTasksCompletedOvertimeClick = async (period: string) => {
    if (effectiveCompanyIds.length === 0) return;

    const dates = timeBuckets.find(b => b.label === period);
    if (!dates) return;

    // Fetch all tasks using pagination to bypass 1000-row limit
    let data: any[];
    try {
      data = await fetchAllPages(() => {
        let query = supabase
          .from('fast_tasks')
          .select('id, title, updated_at, status, team_name, assigned_to')
          .in('company_id', effectiveCompanyIds)
          .eq('status', 'done')
          .eq('is_deleted', false)
          .gte('updated_at', dates.start.toISOString())
          .lte('updated_at', dates.end.toISOString())
          .order('updated_at', { ascending: true })
          .order('id', { ascending: true });
        
        if (selectedTeamId) {
          query = query.eq('team_id', selectedTeamId);
        } else if (allTeamIds.length > 0) {
          query = query.in('team_id', allTeamIds);
        }
        
        return query;
      });
    } catch (error) {
      logger.error('Error fetching tasks:', error);
      return;
    }

    const assigneeIds = [...new Set((data || []).flatMap(task => task.assigned_to || []))];
    const { data: profiles } = assigneeIds.length > 0 
      ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
      : { data: [] };

    const profileMap = new Map<string, string>(
      (profiles || []).map(p => [p.id, p.full_name || 'Unknown'])
    );

    const formattedData = (data || []).map(task => ({
      id: task.id,
      title: task.title,
      completed_at: task.updated_at ? format(new Date(task.updated_at), 'MMM d, yyyy') : null,
      assignee_name: (task.assigned_to?.[0] ? profileMap.get(task.assigned_to[0]) : null) || 'Unassigned',
      team_name: task.team_name || 'No Team',
    }));

    setDrillDownModal({
      open: true,
      title: `Tasks Completed - ${period}`,
      description: `Showing ${formattedData.length} completed tasks`,
      data: formattedData,
      columns: [
        { key: 'title', label: 'Task Title' },
        { key: 'team_name', label: 'Team' },
        { key: 'assignee_name', label: 'Assignee' },
        { key: 'completed_at', label: 'Completed' },
      ],
    });
  };

  const handleTasksPerPersonClick = async (period: string) => {
    if (effectiveCompanyIds.length === 0) return;

    const dates = timeBuckets.find(b => b.label === period);
    if (!dates) return;

    // Fetch members
    const { data: members } = await supabase
      .from('company_members')
      .select('id, user_id, company_id')
      .in('company_id', effectiveCompanyIds)
      .eq('status', 'active');

    const memberIds = members?.map(m => m.user_id).filter(Boolean) || [];
    
    // Fetch profile names
    const { data: profiles } = memberIds.length > 0 
      ? await supabase.from('profiles').select('id, full_name').in('id', memberIds)
      : { data: [] };

    const profileMap = new Map<string, string>(
      (profiles || []).map(p => [p.id, p.full_name || 'Unknown'])
    );

    // Fetch tasks completed per person
    let query = supabase
      .from('fast_tasks')
      .select('id, title, assigned_to, updated_at, team_name')
      .in('company_id', effectiveCompanyIds)
      .eq('status', 'done')
      .eq('is_deleted', false)
      .gte('updated_at', dates.start.toISOString())
      .lte('updated_at', dates.end.toISOString());

    if (selectedTeamId) {
      query = query.eq('team_id', selectedTeamId);
    } else if (allTeamIds.length > 0) {
      query = query.in('team_id', allTeamIds);
    }

    const { data: tasks } = await query;

    // Group by assignee
    const tasksByPerson = new Map<string, number>();
    (tasks || []).forEach(task => {
      (task.assigned_to || []).forEach((userId: string) => {
        tasksByPerson.set(userId, (tasksByPerson.get(userId) || 0) + 1);
      });
    });

    const formattedData = Array.from(tasksByPerson.entries())
      .map(([userId, count]) => ({
        id: userId,
        person_name: profileMap.get(userId) || 'Unknown',
        tasks_completed: count,
      }))
      .sort((a, b) => b.tasks_completed - a.tasks_completed);

    setDrillDownModal({
      open: true,
      title: `Tasks Per Person - ${period}`,
      description: `Showing ${formattedData.length} team members with completed tasks`,
      data: formattedData,
      columns: [
        { key: 'person_name', label: 'Person' },
        { key: 'tasks_completed', label: 'Tasks Completed' },
      ],
    });
  };

  const handleIssuesPerPersonClick = async (period: string) => {
    if (effectiveCompanyIds.length === 0) return;

    const dates = timeBuckets.find(b => b.label === period);
    if (!dates) return;

    // Fetch members
    const { data: members } = await supabase
      .from('company_members')
      .select('id, user_id, company_id')
      .in('company_id', effectiveCompanyIds)
      .eq('status', 'active');

    const memberIds = members?.map(m => m.user_id).filter(Boolean) || [];
    
    // Fetch profile names
    const { data: profiles } = memberIds.length > 0 
      ? await supabase.from('profiles').select('id, full_name').in('id', memberIds)
      : { data: [] };

    const profileMap = new Map<string, string>(
      (profiles || []).map(p => [p.id, p.full_name || 'Unknown'])
    );

    // Fetch resolved issues per owner
    let query = supabase
      .from('issues')
      .select('id, title, owner_id, updated_at, team_id')
      .eq('status', 'resolved')
      .eq('is_deleted', false)
      .gte('updated_at', dates.start.toISOString())
      .lte('updated_at', dates.end.toISOString());

    if (selectedTeamId) {
      query = query.eq('team_id', selectedTeamId);
    } else if (allTeamIds.length > 0) {
      query = query.in('team_id', allTeamIds);
    }

    const { data: issues } = await query;

    // Group by owner
    const issuesByPerson = new Map<string, number>();
    (issues || []).forEach(issue => {
      if (issue.owner_id) {
        issuesByPerson.set(issue.owner_id, (issuesByPerson.get(issue.owner_id) || 0) + 1);
      }
    });

    const formattedData = Array.from(issuesByPerson.entries())
      .map(([userId, count]) => ({
        id: userId,
        person_name: profileMap.get(userId) || 'Unknown',
        issues_resolved: count,
      }))
      .sort((a, b) => b.issues_resolved - a.issues_resolved);

    setDrillDownModal({
      open: true,
      title: `Issues Per Person - ${period}`,
      description: `Showing ${formattedData.length} team members with resolved issues`,
      data: formattedData,
      columns: [
        { key: 'person_name', label: 'Person' },
        { key: 'issues_resolved', label: 'Issues Resolved' },
      ],
    });
  };

  const handleTasksToIssuesRatioClick = async (period: string) => {
    const data = await drillDown.fetchMeetingProductivityDrillDown(period, 'tasks');
    const issuesData = await drillDown.fetchMeetingProductivityDrillDown(period, 'issues');
    
    // Combine data showing both tasks created and issues solved per meeting
    const combinedData = data.map(meeting => {
      const issuesMeeting = issuesData.find(i => i.id === meeting.id);
      return {
        ...meeting,
        issues_count: issuesMeeting?.issues_count || 0,
      };
    });

    setDrillDownModal({
      open: true,
      title: `Tasks to Issues Ratio - ${period}`,
      description: `Showing ${combinedData.length} meetings with tasks and issues data`,
      data: combinedData,
      columns: [
        { key: 'meeting_date', label: 'Meeting Date' },
        { key: 'team_name', label: 'Team' },
        { key: 'tasks_count', label: 'Tasks Created' },
        { key: 'issues_count', label: 'Issues Solved' },
      ],
    });
  };

  // KPI Drill-down handlers for last 7 days
  const handleKPIGoalsClick = async () => {
    if (effectiveCompanyIds.length === 0) return;
    
    let query = supabase
      .from('team_goals')
      .select(`
        id,
        title,
        status,
        updated_at,
        owner_id,
        team_id,
        teams!inner(name, company_id)
      `)
      .in('teams.company_id', effectiveCompanyIds)
      .or('archived.is.null,archived.eq.false')
      .in('status', ['complete', 'on_track']);
    
    if (selectedTeamId) {
      query = query.eq('team_id', selectedTeamId);
    }
    
    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching goals:', error);
      return;
    }

    // Fetch owner profiles separately
    const ownerIds = [...new Set((data || []).map(g => g.owner_id).filter(Boolean))];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ownerIds);

    const profileMap = new Map(
      profiles?.map(p => [p.id, p.full_name || p.email]) || []
    );

    const formattedData = (data || []).map(goal => ({
      id: goal.id,
      title: goal.title,
      team_name: (goal.teams as any)?.name || 'No Team',
      status: goal.status,
      owner_name: profileMap.get(goal.owner_id) || 'Unassigned',
      updated_at: format(new Date(goal.updated_at), 'MMM d, yyyy'),
    }));

    setDrillDownModal({
      open: true,
      title: 'Goals On-track & Completed',
      description: `Showing ${formattedData.length} goals with status "complete" or "on_track"`,
      data: formattedData,
      columns: [
        { key: 'title', label: 'Goal Title' },
        { key: 'team_name', label: 'Team' },
        { key: 'status', label: 'Status' },
        { key: 'owner_name', label: 'Owner' },
        { key: 'updated_at', label: 'Last Updated' },
      ],
    });
  };

  const handleKPIMeetingRatingClick = async () => {
    if (effectiveCompanyIds.length === 0) return;
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let query = supabase
      .from('meeting_results')
      .select('id, created_at, meeting_ratings, team_id, teams!inner(name, company_id)')
      .in('teams.company_id', effectiveCompanyIds)
      .gte('created_at', sevenDaysAgo.toISOString())
      .not('meeting_ratings', 'is', null);
    
    if (selectedTeamId) {
      query = query.eq('team_id', selectedTeamId);
    }
    
    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching meeting ratings:', error);
      return;
    }

    const formattedData = (data || [])
      .map(meeting => {
        const ratings = meeting.meeting_ratings as Record<string, number> | null;
        if (!ratings) return null;

        const ratingValues = Object.values(ratings);
        // Filter out zero and invalid ratings
        const validRatings = ratingValues.filter((r: any) => typeof r === 'number' && r > 0);
        
        // Skip meetings with no valid ratings
        if (validRatings.length === 0) return null;
        
        const avgRating = validRatings.reduce((sum, val) => sum + val, 0) / validRatings.length;

        return {
          id: meeting.id,
          meeting_date: format(new Date(meeting.created_at), 'MMM d, yyyy'),
          team_name: (meeting.teams as any)?.name || 'No Team',
          num_ratings: validRatings.length,
          avg_rating: avgRating,
          ratings: ratings,
        };
      })
      .filter(Boolean);

    setDrillDownModal({
      open: true,
      title: 'Meeting Ratings - Last 7 Days',
      description: `Showing ${formattedData.length} meetings with valid ratings (ratings > 0)`,
      data: formattedData,
      columns: [
        { key: 'meeting_date', label: 'Date' },
        { key: 'team_name', label: 'Team' },
        { key: 'num_ratings', label: 'Ratings Count' },
        { 
          key: 'avg_rating', 
          label: 'Avg Rating',
          render: (value: number) => value.toFixed(1)
        },
      ],
    });
  };

  const handleKPITasksClick = async () => {
    if (effectiveCompanyIds.length === 0) return;
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let query = supabase
      .from('fast_tasks')
      .select(`
        id,
        title,
        updated_at,
        status,
        company_id,
        team_id,
        team_name,
        assigned_to
      `)
      .in('company_id', effectiveCompanyIds)
      .eq('status', 'done')
      .eq('is_deleted', false)
      .gte('updated_at', sevenDaysAgo.toISOString());
    
    if (selectedTeamId) {
      query = query.eq('team_id', selectedTeamId);
    }
    
    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching tasks:', error);
      return;
    }

    // Fetch profile data for assignees
    const assigneeIds = [...new Set((data || []).flatMap(task => task.assigned_to || []))];
    const { data: profiles } = assigneeIds.length > 0 
      ? await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assigneeIds)
      : { data: [] };

    const profileMap = new Map<string, string>(
      (profiles || []).map(p => [p.id, p.full_name || 'Unknown'])
    );

    const formattedData = (data || []).map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      due_date: null,
      completed_at: task.updated_at ? format(new Date(task.updated_at), 'MMM d, yyyy') : null,
      assignee_name: (task.assigned_to?.[0] ? profileMap.get(task.assigned_to[0]) : null) || 'Unassigned',
      team_name: task.team_name || 'No Team',
      completion_status: 'On Time' as const,
    }));

    setDrillDownModal({
      open: true,
      title: 'Tasks Completed - Last 7 Days',
      description: `Showing ${formattedData.length} completed tasks`,
      data: formattedData,
      columns: [
        { key: 'title', label: 'Task Title' },
        { key: 'team_name', label: 'Team' },
        { key: 'assignee_name', label: 'Assignee' },
        { key: 'completed_at', label: 'Completed' },
        { key: 'status', label: 'Status' },
      ],
    });
  };

  const handleKPIIssuesClick = async () => {
    if (effectiveCompanyIds.length === 0) return;
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let query = supabase
      .from('meeting_results')
      .select('id, created_at, issues_resolved, team_id, teams!inner(name, company_id)')
      .in('teams.company_id', effectiveCompanyIds)
      .gte('created_at', sevenDaysAgo.toISOString())
      .not('issues_resolved', 'is', null);
    
    if (selectedTeamId) {
      query = query.eq('team_id', selectedTeamId);
    }
    
    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching issues:', error);
      return;
    }

    const formattedData = (data || [])
      .map(meeting => {
        const issues = meeting.issues_resolved as any[] | null;
        if (!issues || issues.length === 0) return null;

        return {
          id: meeting.id,
          meeting_date: format(new Date(meeting.created_at), 'MMM d, yyyy'),
          team_name: (meeting.teams as any)?.name || 'No Team',
          issues_count: issues.length,
          tasks_count: 0,
          avg_time_per_issue: null,
          issues_resolved: issues,
          tasks_created: [],
        };
      })
      .filter(Boolean);

    setDrillDownModal({
      open: true,
      title: 'Issues Resolved - Last 7 Days',
      description: `Showing ${formattedData.length} meetings with issues resolved`,
      data: formattedData,
      columns: [
        { key: 'meeting_date', label: 'Meeting Date' },
        { key: 'team_name', label: 'Team' },
        { key: 'issues_count', label: 'Issues Resolved' },
      ],
    });
  };

  const hasAnalyticsAccess = hasManagerAccess || hasDirectorAccess || isSuperAdmin;

  if (!hasAnalyticsAccess) {
    return (
      <div className="px-6 py-6 space-y-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <ShieldIcon className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Access Restricted</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Analytics is only available to managers, directors, and super administrators. 
            Please contact your administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Analytics</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Track trends and performance metrics over time
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          {[...Array(7)].map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  // Check if all data is empty
  const allDataEmpty = isAllDataEmpty(data, tasksOvertimeData, sevenDaySummary);

  if (allDataEmpty) {
    return (
      <div className="px-6 py-6 space-y-8 animate-fade-in">
        {/* Header with filters - kept visible so user can change selection */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Analytics</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Track trends and performance metrics over time
            </p>
          </div>
          <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl flex-wrap">
            {showAllCompanies ? (
              <div className="w-64 h-10 flex items-center px-3 bg-muted/50 rounded-md border border-border/50">
                <span className="text-sm text-muted-foreground">All Companies & Departments</span>
              </div>
            ) : (
              <DepartmentSelector
                selectedTeamId={selectedTeamId}
                onTeamChange={setSelectedTeamId}
                filterByMembership={false}
              />
            )}
            <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              {isSuperAdmin && showAllCompanies && (
                <>
                  <AnalyticsCompanyFilterDropdown
                    companies={companies}
                    excludedCompanyIds={excludedCompanyIds}
                    onFilterChange={updateFilter}
                    isLoading={filterLoading}
                    isUpdating={filterUpdating}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setComparisonModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Grid3X3 className="w-4 h-4" />
                    Compare
                  </Button>
                </>
              )}
              <AnalyticsSettings
                hideShortMeetings={hideShortMeetings}
                onHideShortMeetingsChange={setHideShortMeetings}
                isSuperAdmin={isSuperAdmin}
                showAllCompanies={showAllCompanies}
                onShowAllCompaniesChange={setShowAllCompanies}
              />
            </div>
          </div>
        </div>
        <EmptyState
          icon={BarChart3}
          title="No analytics data available"
          description="There's no activity data for the selected team and time period. Try selecting a different team or expanding your timeframe, or start using the platform to generate data."
        />

        {/* Company Comparison Heatmap Modal */}
        <CompanyComparisonHeatmap
          open={comparisonModalOpen}
          onOpenChange={setComparisonModalOpen}
          data={comparisonData}
          loading={comparisonLoading}
          timeframe={comparisonTimeframe}
          onTimeframeChange={setComparisonTimeframe}
        />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-8 animate-fade-in">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Analytics</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Track trends and performance metrics over time
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl flex-wrap">
          {showAllCompanies ? (
            <div className="w-64 h-10 flex items-center px-3 bg-muted/50 rounded-md border border-border/50">
              <span className="text-sm text-muted-foreground">All Companies & Departments</span>
            </div>
          ) : (
            <DepartmentSelector
              selectedTeamId={selectedTeamId}
              onTeamChange={setSelectedTeamId}
              filterByMembership={false}
            />
          )}
          <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frequencies.map((freq) => (
                <SelectItem key={freq.value} value={freq.value}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeframes.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            {isSuperAdmin && showAllCompanies && (
              <>
                <AnalyticsCompanyFilterDropdown
                  companies={companies}
                  excludedCompanyIds={excludedCompanyIds}
                  onFilterChange={updateFilter}
                  isLoading={filterLoading}
                  isUpdating={filterUpdating}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setComparisonModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Grid3X3 className="w-4 h-4" />
                  Compare
                </Button>
              </>
            )}
            <AnalyticsSettings
              hideShortMeetings={hideShortMeetings}
              onHideShortMeetingsChange={setHideShortMeetings}
              isSuperAdmin={isSuperAdmin}
              showAllCompanies={showAllCompanies}
              onShowAllCompaniesChange={setShowAllCompanies}
            />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <KPISummaryCards
          goalsAchieved={
            mostRecentGoalsPeriod
              ? Math.round(
                  (Number(mostRecentGoalsPeriod['Completed']) || 0) +
                  (Number(mostRecentGoalsPeriod['On Track']) || 0)
                )
              : sevenDaySummary.goalsAchieved
          }
          goalsAchievedTrend={sevenDaySummary.goalsAchievedTrend}
          avgMeetingRating={sevenDaySummary.avgMeetingRating}
          avgMeetingRatingTrend={sevenDaySummary.avgMeetingRatingTrend}
          tasksCompleted={sevenDaySummary.tasksCompleted}
          tasksCompletedTrend={sevenDaySummary.tasksCompletedTrend}
          issuesResolved={sevenDaySummary.issuesResolved}
          issuesResolvedTrend={sevenDaySummary.issuesResolvedTrend}
          loading={companyLoading || sevenDaySummary.loading}
          onGoalsClick={handleKPIGoalsClick}
          onMeetingRatingClick={handleKPIMeetingRatingClick}
          onTasksClick={handleKPITasksClick}
          onIssuesClick={handleKPIIssuesClick}
        />
      </div>

      {/* Time-series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
        <MetricsPerformanceChart 
          data={data?.scorecards.timeSeries || []} 
          onBarClick={handleScorecardsClick}
        />
        <GoalsAnalyticsChart 
          data={data?.goals.timeSeries || []} 
          onBarClick={handleGoalsClick}
        />
        <MeetingRatingsChart
          data={data?.meetingRatings.timeSeries || []} 
          onBarClick={handleMeetingRatingsClick}
        />
        <TaskCompletionChart 
          data={data?.taskCompletion.timeSeries || []} 
          onBarClick={handleTaskCompletionClick}
        />
        <TasksCreatedChart 
          data={data?.meetingProductivity.timeSeries || []} 
          onBarClick={handleTasksCreatedClick}
        />
        <TasksCompletedOvertimeChart 
          data={tasksOvertimeData || []} 
          onBarClick={handleTasksCompletedOvertimeClick}
        />
        <TasksPerPersonOvertimeChart 
          data={tasksPerPersonData || []} 
          onBarClick={handleTasksPerPersonClick}
        />
        <IssuesPerPersonOvertimeChart 
          data={issuesPerPersonData || []} 
          onBarClick={handleIssuesPerPersonClick}
        />
        <IssuesSolvedChart
          data={data?.meetingProductivity.timeSeries || []} 
          onBarClick={handleIssuesSolvedClick}
        />
        <TasksToIssuesRatioChart 
          data={data?.meetingProductivity.timeSeries || []} 
          onPointClick={handleTasksToIssuesRatioClick}
        />
        <AvgResolutionTimeChart 
          data={data?.meetingProductivity.timeSeries || []} 
          onBarClick={handleAvgResolutionTimeClick}
        />
      </div>

      {/* Drill-Down Modal */}
      <DrillDownModal
        open={drillDownModal.open}
        onOpenChange={(open) => setDrillDownModal(prev => ({ ...prev, open }))}
        title={drillDownModal.title}
        description={drillDownModal.description}
        data={drillDownModal.data}
        columns={drillDownModal.columns}
        loading={drillDown.loading}
      />

      {/* Company Comparison Heatmap Modal */}
      <CompanyComparisonHeatmap
        open={comparisonModalOpen}
        onOpenChange={setComparisonModalOpen}
        data={comparisonData}
        loading={comparisonLoading}
        timeframe={comparisonTimeframe}
        onTimeframeChange={setComparisonTimeframe}
      />
    </div>
  );
}
