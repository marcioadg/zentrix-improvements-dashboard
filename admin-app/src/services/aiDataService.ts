import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface ComprehensiveBusinessData {
  company: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    role: string;
    fullName: string;
    teams: Array<{
      id: string;
      name: string;
      // role removed as team roles are deprecated
    }>;
  };
  metrics: {
    current: Array<{
      id: string;
      name: string;
      value: number;
      target: number;
      unit: string;
      status: 'green' | 'yellow' | 'red';
      owner: string;
      team: string;
      weekStart: string;
    }>;
    withTrends: Array<{
      id: string;
      name: string;
      values: number[];
      trend: 'improving' | 'declining' | 'stable';
      changePercent: number;
      owner: string;
      team: string;
    }>;
    improving: Array<any>;
    declining: Array<any>;
  };
  tasks: {
    personal: Array<{
      id: string;
      title: string;
      status: string;
      dueDate?: string;
      isOverdue: boolean;
    }>;
    team: Array<{
      id: string;
      title: string;
      status: string;
      team: string;
      assignedTo?: string;
      dueDate?: string;
      isOverdue: boolean;
    }>;
  };
  goals: {
    personal: Array<{
      id: string;
      title: string;
      status: string;
      targetDate?: string;
    }>;
    team: Array<{
      id: string;
      title: string;
      status: string;
      team: string;
      targetDate?: string;
    }>;
  };
  issues: {
    unresolved: Array<{
      id: string;
      title: string;
      type: string;
      owner: string;
      team: string;
      createdAt: string;
      daysOpen: number;
    }>;
  };
  meetings: {
    recent: Array<{
      id: string;
      type: string;
      team: string;
      date: string;
      status: string;
    }>;
  };
  summary: {
    redMetricsCount: number;
    yellowMetricsCount: number;
    greenMetricsCount: number;
    overdueTasksCount: number;
    openIssuesCount: number;
    decliningMetricsCount: number;
    improvingMetricsCount: number;
    metricsLikelyToMiss: number;
    trendMomentum: 'positive' | 'negative' | 'neutral';
    teamHealthScore: number;
  };
}

export const aggregateBusinessData = async (userId: string, companyIdOverride?: string): Promise<ComprehensiveBusinessData> => {
  logger.log('🔍 Aggregating business data for user:', userId);
  logger.log('🔍 User ID type and format:', typeof userId, userId.length, 'characters');
  
  // Get user context first
  const { data: userContext, error: contextError } = await supabase.rpc('get_user_ai_business_context', {
    p_user_id: userId
  });

  logger.log('🔍 User context result:', { userContext, contextError });

  if (contextError || !userContext) {
    logger.error('❌ Error getting user context:', contextError);
    throw new Error('Failed to get user context');
  }

  if (userContext.error) {
    logger.error('❌ User context returned error:', userContext.error);
    throw new Error(userContext.error);
  }

  const effectiveCompanyId = companyIdOverride || userContext.company_id;
  logger.log('🏢 Using company ID:', effectiveCompanyId, companyIdOverride ? '(override)' : '(from context)');
  
  // Get company info
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', effectiveCompanyId)
    .single();

  if (!company) {
    throw new Error('Company not found');
  }

  logger.log('🏢 Company found:', company.name);

// Get user's teams for this company
const { data: userTeams } = await supabase
  .from('team_members')
  .select(`
    team_id,
    teams!inner (
      id,
      name,
      company_id
    )
  `)
  .eq('user_id', userId)
  .eq('teams.company_id', effectiveCompanyId);

  const teams = (userTeams || []).map((tm: any) => ({
    id: tm.team_id,
    name: tm.teams?.name || 'Unknown Team'
    // role removed as team roles are deprecated
  }));

  const teamIds = teams.map(t => t.id);

  // Get current week's metrics for user's teams
  const currentWeekStart = new Date();
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
  const weekStartStr = currentWeekStart.toISOString().split('T')[0];

  const { data: currentMetrics } = await supabase
    .from('weekly_metrics')
    .select(`
      id,
      metric_name,
      metric_value,
      target_value,
      unit,
      target_logic,
      week_start_date,
      profiles!owner_id (full_name),
      teams!team_id (name)
    `)
    .in('team_id', teamIds)
    .eq('week_start_date', weekStartStr)
    .is('deleted_at', null);

  // Calculate metric status
  const metricsWithStatus = (currentMetrics || []).map(metric => {
    const value = metric.metric_value || 0;
    const target = metric.target_value || 0;
    const logic = metric.target_logic || 'greater_than_or_equal';
    
    let status: 'green' | 'yellow' | 'red' = 'green';
    
    if (target > 0) {
      const percentage = (value / target) * 100;
      
      if (logic === 'greater_than_or_equal') {
        status = percentage >= 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';
      } else if (logic === 'less_than_or_equal') {
        status = percentage <= 100 ? 'green' : percentage <= 120 ? 'yellow' : 'red';
      } else {
        status = percentage >= 90 && percentage <= 110 ? 'green' : 'yellow';
      }
    }

    return {
      id: metric.id,
      name: metric.metric_name,
      value,
      target,
      unit: metric.unit || '',
      status,
      owner: (metric.profiles as any)?.full_name || 'Unassigned',
      team: (metric.teams as any)?.name || 'Unknown Team',
      weekStart: metric.week_start_date
    };
  });

  // Get trend data (last 4 weeks)
  const fourWeeksAgo = new Date(currentWeekStart);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data: trendMetrics } = await supabase
    .from('weekly_metrics')
    .select(`
      metric_name,
      metric_value,
      week_start_date,
      owner_id,
      profiles!owner_id (full_name),
      teams!team_id (name)
    `)
    .in('team_id', teamIds)
    .gte('week_start_date', fourWeeksAgo.toISOString().split('T')[0])
    .is('deleted_at', null)
    .order('metric_name', { ascending: true })
    .order('week_start_date', { ascending: true });

  // Process trends
  const metricsMap = new Map();
  (trendMetrics || []).forEach(metric => {
    const key = `${metric.metric_name}-${metric.owner_id}`;
    if (!metricsMap.has(key)) {
      metricsMap.set(key, {
        id: key,
        name: metric.metric_name,
        values: [],
        owner: (metric.profiles as any)?.full_name || 'Unassigned',
        team: (metric.teams as any)?.name || 'Unknown Team'
      });
    }
    metricsMap.get(key).values.push(metric.metric_value || 0);
  });

  const withTrends = Array.from(metricsMap.values()).map(metric => {
    const values = metric.values;
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    let changePercent = 0;
    
    if (values.length >= 2) {
      const first = values[0];
      const last = values[values.length - 1];
      
      if (first > 0) {
        changePercent = ((last - first) / first) * 100;
        trend = changePercent > 5 ? 'improving' : changePercent < -5 ? 'declining' : 'stable';
      }
    }

    return {
      ...metric,
      trend,
      changePercent
    };
  });

  // Get personal tasks
  const { data: personalTasks } = await supabase
    .from('fast_tasks')
    .select('id, title, status, due_date')
    .eq('user_id', userId)
    .eq('task_type', 'personal')
    .eq('is_archived', false);

  // Get team tasks
  const { data: teamTasks } = await supabase
    .from('fast_tasks')
    .select(`
      id,
      title,
      status,
      due_date,
      assigned_to_name,
      teams!team_id (name)
    `)
    .in('team_id', teamIds)
    .eq('task_type', 'team')
    .eq('is_archived', false);

  // Get goals (now from team_goals table)
  const { data: goals } = await supabase
    .from('team_goals')
    .select(`
      id,
      title,
      status,
      target_date,
      progress,
      teams!inner (name)
    `)
    .in('team_id', teamIds)
    .eq('is_company_goal', false);

  // Get issues
  const { data: issues } = await supabase
    .from('issues')
    .select(`
      id,
      title,
      issue_type,
      status,
      created_at,
      profiles!owner_id (full_name),
      teams!team_id (name)
    `)
    .in('team_id', teamIds)
    .eq('status', 'open')
    .neq('archived', true);

  // Get recent meetings
  const { data: meetings } = await supabase
    .from('meetings_state')
    .select(`
      id,
      meeting_type,
      status,
      started_at,
      teams!team_id (name)
    `)
    .in('team_id', teamIds)
    .order('started_at', { ascending: false })
    .limit(5);

  // Calculate summary metrics
  const redMetrics = metricsWithStatus.filter(m => m.status === 'red');
  const yellowMetrics = metricsWithStatus.filter(m => m.status === 'yellow');
  const greenMetrics = metricsWithStatus.filter(m => m.status === 'green');
  
  const decliningMetrics = withTrends.filter(m => m.trend === 'declining');
  const improvingMetrics = withTrends.filter(m => m.trend === 'improving');
  
  const today = new Date();
  const overdueTasks = [...(personalTasks || []), ...(teamTasks || [])]
    .filter(task => task.due_date && new Date(task.due_date) < today && task.status !== 'completed');

  // Calculate team health score (0-100)
  const totalMetrics = metricsWithStatus.length;
  const healthScore = totalMetrics > 0 
    ? Math.round(((greenMetrics.length * 100) + (yellowMetrics.length * 60)) / totalMetrics)
    : 100;

  const trendMomentum = improvingMetrics.length > decliningMetrics.length 
    ? 'positive' 
    : decliningMetrics.length > improvingMetrics.length 
      ? 'negative' 
      : 'neutral';

  return {
    company: {
      id: company.id,
      name: company.name
    },
    user: {
      id: userId,
      role: userContext.user_role,
      fullName: userContext.full_name,
      teams
    },
    metrics: {
      current: metricsWithStatus,
      withTrends,
      improving: improvingMetrics,
      declining: decliningMetrics
    },
    tasks: {
      personal: (personalTasks || []).map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: task.due_date,
        isOverdue: task.due_date ? new Date(task.due_date) < today && task.status !== 'completed' : false
      })),
      team: (teamTasks || []).map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        team: (task.teams as any)?.name || 'Unknown Team',
        assignedTo: task.assigned_to_name,
        dueDate: task.due_date,
        isOverdue: task.due_date ? new Date(task.due_date) < today && task.status !== 'completed' : false
      }))
    },
    goals: {
      personal: [],
      team: (goals || []).map(goal => ({
        id: goal.id,
        title: goal.title,
        status: goal.status,
        team: (goal.teams as any)?.name || 'Unknown Team',
        targetDate: goal.target_date
      }))
    },
    issues: {
      unresolved: (issues || []).map(issue => {
        const createdAt = new Date(issue.created_at);
        const daysOpen = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: issue.id,
          title: issue.title,
          type: issue.issue_type,
          owner: (issue.profiles as any)?.full_name || 'Unassigned',
          team: (issue.teams as any)?.name || 'Unknown Team',
          createdAt: issue.created_at,
          daysOpen
        };
      })
    },
    meetings: {
      recent: (meetings || []).map(meeting => ({
        id: meeting.id,
        type: meeting.meeting_type,
        team: (meeting.teams as any)?.name || 'Unknown Team',
        date: meeting.started_at,
        status: meeting.status
      }))
    },
    summary: {
      redMetricsCount: redMetrics.length,
      yellowMetricsCount: yellowMetrics.length,
      greenMetricsCount: greenMetrics.length,
      overdueTasksCount: overdueTasks.length,
      openIssuesCount: issues?.length || 0,
      decliningMetricsCount: decliningMetrics.length,
      improvingMetricsCount: improvingMetrics.length,
      metricsLikelyToMiss: redMetrics.length + Math.floor(yellowMetrics.length / 2),
      trendMomentum,
      teamHealthScore: healthScore
    }
  };
};

export const formatDataForAI = (data: ComprehensiveBusinessData): string => {
  const context = `
CURRENT BUSINESS CONTEXT for ${data.company.name}

USER CONTEXT:
- Name: ${data.user.fullName}
- Role: ${data.user.role}
- Teams: ${data.user.teams.map(t => t.name).join(', ')}
- Permission Level: ${data.user.role === 'super_admin' || data.user.role === 'director' ? 'All Teams' : 'Assigned Teams Only'}

PERFORMANCE OVERVIEW:
- Team Health Score: ${data.summary.teamHealthScore}/100
- Trend Momentum: ${data.summary.trendMomentum.toUpperCase()}
- Critical Metrics (Red): ${data.summary.redMetricsCount}
- Warning Metrics (Yellow): ${data.summary.yellowMetricsCount}
- On-Track Metrics (Green): ${data.summary.greenMetricsCount}
- Overdue Tasks: ${data.summary.overdueTasksCount}
- Open Issues: ${data.summary.openIssuesCount}

METRICS PERFORMANCE:
${data.metrics.current.map(m => 
  `• ${m.name} (${m.team}): ${m.value}${m.unit} / ${m.target}${m.unit} [${m.status.toUpperCase()}] - Owner: ${m.owner}`
).join('\n')}

TRENDING METRICS:
${data.metrics.withTrends.filter(m => m.trend !== 'stable').map(m => 
  `• ${m.name} (${m.team}): ${m.trend.toUpperCase()} ${m.changePercent > 0 ? '+' : ''}${m.changePercent.toFixed(1)}% - Owner: ${m.owner}`
).join('\n')}

RISK INDICATORS:
${data.metrics.declining.length > 0 ? `- ${data.metrics.declining.length} metrics declining` : ''}
${data.summary.overdueTasksCount > 0 ? `- ${data.summary.overdueTasksCount} overdue tasks` : ''}
${data.issues.unresolved.filter(i => i.daysOpen > 30).length > 0 ? `- ${data.issues.unresolved.filter(i => i.daysOpen > 30).length} issues open >30 days` : ''}

CURRENT PRIORITIES:
Personal Tasks (${data.tasks.personal.filter(t => t.status !== 'completed').length}):
${data.tasks.personal.filter(t => t.status !== 'completed').slice(0, 5).map(t => 
  `• ${t.title} [${t.status}]${t.isOverdue ? ' - OVERDUE' : ''}`
).join('\n')}

Team Tasks (${data.tasks.team.filter(t => t.status !== 'completed').length}):
${data.tasks.team.filter(t => t.status !== 'completed').slice(0, 5).map(t => 
  `• ${t.title} (${t.team}) [${t.status}]${t.assignedTo ? ` - ${t.assignedTo}` : ''}${t.isOverdue ? ' - OVERDUE' : ''}`
).join('\n')}

OPEN ISSUES (${data.issues.unresolved.length}):
${data.issues.unresolved.slice(0, 5).map(i => 
  `• ${i.title} (${i.team}) - ${i.owner} - ${i.daysOpen} days open [${i.type}]`
).join('\n')}

TEAM GOALS:
${data.goals.team.slice(0, 5).map(g => 
  `• ${g.title} (${g.team}) [${g.status}]${g.targetDate ? ` - Target: ${g.targetDate}` : ''}`
).join('\n')}

RECENT MEETINGS:
${data.meetings.recent.slice(0, 3).map(m => 
  `• ${m.type} - ${m.team} (${m.status})`
).join('\n')}

INTELLIGENCE NOTES:
- User can see data from teams: ${data.user.teams.map(t => t.name).join(', ')}
- Focus responses on user's team context and role permissions
- Highlight trends, risks, and actionable insights
- Use clear terminology: Goals (not Rocks), Metrics (not Scorecards), Tasks (not To-Dos), Issues (not IDS)
`;

  return context.trim();
};