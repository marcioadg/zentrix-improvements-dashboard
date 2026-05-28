import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, subWeeks, format } from 'date-fns';
import { UserRole } from './companyRoleService';
import { logger } from '@/utils/logger';

export interface StrategicBusinessData {
  company: {
    name: string;
    currentDate: string;
  };
  strategy: {
    currentPlan: any;
    versionHistory: any[];
    lastUpdated: string;
    completionScore: number;
    keyGaps: string[];
  };
  metrics: {
    current: any[];
    trends: MetricTrendAnalysis[];
    healthScore: number;
    criticalMetrics: string[];
    performancePattern: string;
  };
  goals: {
    company: GoalAnalysis[];
    team: GoalAnalysis[];
    overallProgress: number;
    overdueCount: number;
    progressTrend: string;
  };
  tasks: {
    personal: TaskAnalysis;
    team: TaskAnalysis;
    completionRate: number;
    overdueCount: number;
    bottlenecks: string[];
  };
  issues: {
    unresolved: IssueAnalysis[];
    resolved: IssueAnalysis[];
    resolutionRate: number;
    recurringThemes: string[];
    teamHealthIndicators: string[];
  };
  orgChart: {
    roles: any[];
    assignments: any[];
    gaps: string[];
    effectivenessScore: number;
  };
  insights: {
    topConstraints: string[];
    growthLevers: string[];
    riskFactors: string[];
    recommendations: string[];
  };
  userContext: {
    role: string;
    level: string;
    permissions: any;
    accessibleTeams: string[];
  };
}

interface MetricTrendAnalysis {
  name: string;
  owner: string;
  unit: string;
  current: number;
  previous: number;
  trend: 'improving' | 'declining' | 'stable';
  weeklyData: number[];
  targetStatus: 'above' | 'below' | 'at' | 'no_target';
  consistency: number;
  volatility: number;
}

interface GoalAnalysis {
  id: string;
  title: string;
  status: string;
  progress: number;
  daysToTarget: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface TaskAnalysis {
  total: number;
  completed: number;
  overdue: number;
  avgCompletionTime: number;
  bottleneckAreas: string[];
}

interface IssueAnalysis {
  id: string;
  title: string;
  type: string;
  age: number;
  votes: number;
  owner: string;
  theme: string;
}

export const aggregateStrategicBusinessData = async (
  userId: string, 
  companyId: string, 
  userRole: UserRole,
  accessibleTeamIds: string[]
): Promise<StrategicBusinessData | null> => {
  try {
    logger.log('🔍 Starting company-scoped strategic data aggregation:', {
      userId,
      companyId,
      userLevel: userRole.level,
      accessibleTeams: accessibleTeamIds.length
    });

    // Get company info
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    // Parallel data fetching with role-based access control
    const [
      strategyData,
      metricsData,
      goalsData,
      tasksData,
      issuesData,
      orgChartData
    ] = await Promise.all([
      fetchStrategyAnalysis(companyId, userRole),
      fetchMetricsAnalysis(accessibleTeamIds, userRole),
      fetchGoalsAnalysis(accessibleTeamIds, companyId, userRole),
      fetchTasksAnalysis(userId, accessibleTeamIds, userRole),
      fetchIssuesAnalysis(accessibleTeamIds, userRole),
      fetchOrgChartAnalysis(companyId, userRole)
    ]);

    // Generate role-appropriate strategic insights
    const insights = generateStrategicInsights({
      strategy: strategyData,
      metrics: metricsData,
      goals: goalsData,
      tasks: tasksData,
      issues: issuesData,
      orgChart: orgChartData
    }, userRole);

    const result: StrategicBusinessData = {
      company: {
        name: company?.name || 'Your Company',
        currentDate: new Date().toISOString()
      },
      strategy: strategyData,
      metrics: metricsData,
      goals: goalsData,
      tasks: tasksData,
      issues: issuesData,
      orgChart: orgChartData,
      insights,
      userContext: {
        role: userRole.role,
        level: userRole.level,
        permissions: userRole.permissions,
        accessibleTeams: accessibleTeamIds
      }
    };

    logger.log('✅ Company-scoped strategic data aggregation complete:', {
      companyName: company?.name,
      userLevel: userRole.level,
      metricsCount: metricsData.current.length,
      constraintsIdentified: insights.topConstraints.length
    });

    return result;
  } catch (error) {
    logger.error('❌ Error aggregating company-scoped strategic business data:', error);
    return null;
  }
};

const fetchStrategyAnalysis = async (companyId: string, userRole: UserRole) => {
  // Only executives and managers can see full strategic plans
  if (!userRole.permissions.canViewStrategicInsights) {
    return {
      currentPlan: null,
      versionHistory: [],
      lastUpdated: 'Access restricted',
      completionScore: 0,
      keyGaps: ['Strategic planning access limited to management level']
    };
  }

  try {
    const { data: plans } = await supabase
      .from('strategic_plans')
      .select('*, strategic_plan_versions(*)')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    const currentPlan = plans?.[0];
    
    if (!currentPlan) {
      return {
        currentPlan: null,
        versionHistory: [],
        lastUpdated: 'Never',
        completionScore: 0,
        keyGaps: ['No strategic plan defined']
      };
    }

    const planData = currentPlan.plan_data as any;
    const completionScore = calculatePlanCompletionScore(planData);
    const keyGaps = identifyStrategyGaps(planData);

    return {
      currentPlan: planData,
      versionHistory: currentPlan.strategic_plan_versions || [],
      lastUpdated: formatDistanceToNow(new Date(currentPlan.updated_at), { addSuffix: true }),
      completionScore,
      keyGaps
    };
  } catch (error) {
    logger.error('Error fetching strategy analysis:', error);
    return {
      currentPlan: null,
      versionHistory: [],
      lastUpdated: 'Error loading',
      completionScore: 0,
      keyGaps: ['Unable to load strategic plan']
    };
  }
};

const fetchMetricsAnalysis = async (teamIds: string[], userRole: UserRole) => {
  if (teamIds.length === 0) {
    return {
      current: [],
      trends: [],
      healthScore: 0,
      criticalMetrics: [],
      performancePattern: 'No metrics data available'
    };
  }

  try {
    const thirteenWeeksAgo = subWeeks(new Date(), 13);
    
    const { data: metrics } = await supabase
      .from('weekly_metrics')
      .select(`
        *,
        owner:profiles!weekly_metrics_owner_id_fkey(full_name)
      `)
      .in('team_id', teamIds)
      .gte('week_start_date', format(thirteenWeeksAgo, 'yyyy-MM-dd'))
      .is('deleted_at', null)
      .order('week_start_date', { ascending: true });

    if (!metrics || metrics.length === 0) {
      return {
        current: [],
        trends: [],
        healthScore: 0,
        criticalMetrics: [],
        performancePattern: 'No metrics data found'
      };
    }

    const trends = analyzeMetricTrends(metrics);
    const healthScore = calculateMetricsHealthScore(trends);
    const criticalMetrics = identifyCriticalMetrics(trends);
    const performancePattern = identifyPerformancePattern(trends);

    return {
      current: getLatestMetrics(metrics),
      trends,
      healthScore,
      criticalMetrics,
      performancePattern
    };
  } catch (error) {
    logger.error('Error fetching metrics analysis:', error);
    return {
      current: [],
      trends: [],
      healthScore: 0,
      criticalMetrics: [],
      performancePattern: 'Error loading metrics data'
    };
  }
};

const fetchGoalsAnalysis = async (teamIds: string[], companyId: string, userRole: UserRole) => {
  try {
    const [companyGoals, teamGoals] = await Promise.all([
      supabase
        .from('team_goals')
        .select('*')
        .eq('is_company_goal', true)
        .eq('archived', false),
      supabase
        .from('team_goals')
        .select('*')
        .in('team_id', teamIds)
        .eq('is_company_goal', false)
        .eq('archived', false)
    ]);

    const analyzeGoals = (goals: any[]) => 
      goals?.map(goal => ({
        id: goal.id,
        title: goal.title,
        status: goal.status,
        progress: calculateGoalProgress(goal),
        daysToTarget: goal.target_date ? 
          Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
          null,
        riskLevel: assessGoalRisk(goal) as 'low' | 'medium' | 'high'
      })) || [];

    const companyAnalysis = analyzeGoals(companyGoals.data || []);
    const teamAnalysis = analyzeGoals(teamGoals.data || []);
    
    const allGoals = [...companyAnalysis, ...teamAnalysis];
    const overallProgress = allGoals.length > 0 ? 
      allGoals.reduce((sum, goal) => sum + goal.progress, 0) / allGoals.length : 0;
    const overdueCount = allGoals.filter(goal => 
      goal.daysToTarget !== null && goal.daysToTarget < 0
    ).length;

    return {
      company: companyAnalysis,
      team: teamAnalysis,
      overallProgress,
      overdueCount,
      progressTrend: determineProgressTrend(allGoals)
    };
  } catch (error) {
    logger.error('Error fetching goals analysis:', error);
    return {
      company: [],
      team: [],
      overallProgress: 0,
      overdueCount: 0,
      progressTrend: 'No data'
    };
  }
};

const fetchTasksAnalysis = async (userId: string, teamIds: string[], userRole: UserRole) => {
  try {
    // Try fast_tasks first, fallback to legacy tables if needed
    let personalTasks, teamTasks;
    
    try {
      const [fastPersonalResult, fastTeamResult] = await Promise.all([
        supabase
          .from('fast_tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('task_type', 'personal'),
        supabase
          .from('fast_tasks')
          .select('*')
          .in('team_id', teamIds)
          .eq('task_type', 'team')
      ]);

      personalTasks = fastPersonalResult;
      teamTasks = fastTeamResult;
      
      // If fast_tasks queries fail, fallback to legacy tables
      if (fastPersonalResult.error || fastTeamResult.error) {
        logger.warn('⚠️ fast_tasks queries failed, falling back to legacy tables');
        const [legacyPersonalResult, legacyTeamResult] = await Promise.all([
          supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId),
          supabase
            .from('team_tasks')
            .select('*')
            .in('team_id', teamIds)
        ]);
        
        personalTasks = legacyPersonalResult;
        teamTasks = legacyTeamResult;
      }
    } catch (error) {
      logger.error('Error fetching tasks data:', error);
      personalTasks = { data: [], error: null };
      teamTasks = { data: [], error: null };
    }

    const analyzeTaskData = (tasks: any[]): TaskAnalysis => {
      if (!tasks || tasks.length === 0) {
        return {
          total: 0,
          completed: 0,
          overdue: 0,
          avgCompletionTime: 0,
          bottleneckAreas: []
        };
      }

      const total = tasks.length;
      // Handle both fast_tasks format (status) and legacy format (completed)
      const completed = tasks.filter(t => 
        t.status === 'done' || t.completed
      ).length;
      const overdue = tasks.filter(t => 
        t.due_date && new Date(t.due_date) < new Date() && 
        !(t.status === 'done' || t.completed)
      ).length;

      return {
        total,
        completed,
        overdue,
        avgCompletionTime: calculateAvgCompletionTime(tasks),
        bottleneckAreas: identifyTaskBottlenecks(tasks)
      };
    };

    const personalAnalysis = analyzeTaskData(personalTasks.data || []);
    const teamAnalysis = analyzeTaskData(teamTasks.data || []);

    const totalTasks = personalAnalysis.total + teamAnalysis.total;
    const totalCompleted = personalAnalysis.completed + teamAnalysis.completed;
    const completionRate = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;
    const overdueCount = personalAnalysis.overdue + teamAnalysis.overdue;

    return {
      personal: personalAnalysis,
      team: teamAnalysis,
      completionRate,
      overdueCount,
      bottlenecks: [...personalAnalysis.bottleneckAreas, ...teamAnalysis.bottleneckAreas]
    };
  } catch (error) {
    logger.error('Error fetching tasks analysis:', error);
    return {
      personal: { total: 0, completed: 0, overdue: 0, avgCompletionTime: 0, bottleneckAreas: [] },
      team: { total: 0, completed: 0, overdue: 0, avgCompletionTime: 0, bottleneckAreas: [] },
      completionRate: 0,
      overdueCount: 0,
      bottlenecks: []
    };
  }
};

const fetchIssuesAnalysis = async (teamIds: string[], userRole: UserRole) => {
  if (teamIds.length === 0) {
    return {
      unresolved: [],
      resolved: [],
      resolutionRate: 0,
      recurringThemes: [],
      teamHealthIndicators: []
    };
  }

  try {
    const { data: issues } = await supabase
      .from('issues')
      .select(`
        *,
        owner:profiles!issues_owner_id_fkey(full_name)
      `)
      .in('team_id', teamIds)
      .eq('archived', false);

    if (!issues) {
      return {
        unresolved: [],
        resolved: [],
        resolutionRate: 0,
        recurringThemes: [],
        teamHealthIndicators: []
      };
    }

    const unresolved = issues
      .filter(issue => issue.status === 'open')
      .map(issue => ({
        id: issue.id,
        title: issue.title,
        type: issue.issue_type,
        age: Math.ceil((Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        votes: 0, // Would need to fetch from issue_votes table
        owner: (issue.owner as any)?.full_name || 'Unassigned',
        theme: categorizeIssue(issue.title, issue.description)
      }));

    const resolved = issues
      .filter(issue => issue.status === 'resolved')
      .map(issue => ({
        id: issue.id,
        title: issue.title,
        type: issue.issue_type,
        age: Math.ceil((new Date(issue.updated_at).getTime() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        votes: 0,
        owner: (issue.owner as any)?.full_name || 'Unassigned',
        theme: categorizeIssue(issue.title, issue.description)
      }));

    const totalIssues = issues.length;
    const resolvedCount = resolved.length;
    const resolutionRate = totalIssues > 0 ? (resolvedCount / totalIssues) * 100 : 0;

    const recurringThemes = identifyRecurringThemes([...unresolved, ...resolved]);
    const teamHealthIndicators = assessTeamHealth(unresolved, resolved);

    return {
      unresolved,
      resolved,
      resolutionRate,
      recurringThemes,
      teamHealthIndicators
    };
  } catch (error) {
    logger.error('Error fetching issues analysis:', error);
    return {
      unresolved: [],
      resolved: [],
      resolutionRate: 0,
      recurringThemes: [],
      teamHealthIndicators: []
    };
  }
};

const fetchOrgChartAnalysis = async (companyId: string, userRole: UserRole) => {
  try {
    const [roles, assignments] = await Promise.all([
      supabase
        .from('org_roles')
        .select('*')
        .eq('company_id', companyId),
      supabase
        .from('role_assignments')
        .select(`
          *,
          role:org_roles(*),
          user:profiles(*)
        `)
    ]);

    const gaps = identifyOrgGaps(roles.data || [], assignments.data || []);
    const effectivenessScore = calculateOrgEffectiveness(roles.data || [], assignments.data || []);

    return {
      roles: roles.data || [],
      assignments: assignments.data || [],
      gaps,
      effectivenessScore
    };
  } catch (error) {
    logger.error('Error fetching org chart analysis:', error);
    return {
      roles: [],
      assignments: [],
      gaps: ['Unable to load organizational data'],
      effectivenessScore: 0
    };
  }
};

const identifyRecurringThemes = (issues: IssueAnalysis[]): string[] => {
  const themes = new Map<string, number>();
  
  issues.forEach(issue => {
    const theme = issue.theme;
    themes.set(theme, (themes.get(theme) || 0) + 1);
  });
  
  return Array.from(themes.entries())
    .filter(([_, count]) => (count as number) > 1)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([theme, count]) => `${theme} (${count} issues)`)
    .slice(0, 5);
};

const assessTeamHealth = (unresolved: IssueAnalysis[], resolved: IssueAnalysis[]): string[] => {
  const indicators: string[] = [];
  
  const totalIssues = unresolved.length + resolved.length;
  if (totalIssues === 0) return ['No issues data available'];
  
  const unresolvedRatio = unresolved.length / totalIssues;
  if (unresolvedRatio > 0.7) {
    indicators.push('High unresolved issue ratio indicates potential team overwhelm');
  }
  
  const oldUnresolvedIssues = unresolved.filter(issue => issue.age > 30).length;
  if (oldUnresolvedIssues > unresolved.length * 0.5) {
    indicators.push('Many long-standing issues suggest resolution challenges');
  }
  
  const avgAge = unresolved.reduce((sum, issue) => sum + issue.age, 0) / unresolved.length;
  if (avgAge > 21) {
    indicators.push('Average issue age is concerning - may indicate systemic problems');
  }
  
  return indicators.length > 0 ? indicators : ['Team health indicators look positive'];
};

const identifyOrgGaps = (roles: any[], assignments: any[]): string[] => {
  const gaps: string[] = [];
  
  const unassignedRoles = roles.filter(role => 
    !assignments.some(assignment => assignment.role_id === role.id)
  );
  
  if (unassignedRoles.length > 0) {
    gaps.push(`${unassignedRoles.length} roles without assigned personnel`);
  }
  
  const multipleAssignments = assignments.reduce((acc, assignment) => {
    const userId = assignment.user_id;
    acc[userId] = (acc[userId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const overloadedUsers = Object.values(multipleAssignments).filter((count: unknown) => typeof count === 'number' && count > 2).length;
  if (overloadedUsers > 0) {
    gaps.push(`${overloadedUsers} people with multiple role assignments`);
  }
  
  return gaps.length > 0 ? gaps : ['Organizational structure appears well-balanced'];
};

const calculateOrgEffectiveness = (roles: any[], assignments: any[]): number => {
  if (roles.length === 0) return 0;
  
  const assignedRoles = assignments.length;
  const totalRoles = roles.length;
  
  const assignmentRatio = assignedRoles / totalRoles;
  
  // Simple effectiveness score based on assignment coverage
  return Math.min(100, assignmentRatio * 100);
};

const generateStrategicInsights = (data: {
  strategy: any;
  metrics: any;
  goals: any;
  tasks: any;
  issues: any;
  orgChart: any;
}, userRole: UserRole): {
  topConstraints: string[];
  growthLevers: string[];
  riskFactors: string[];
  recommendations: string[];
} => {
  const constraints: string[] = [];
  const growthLevers: string[] = [];
  const riskFactors: string[] = [];
  const recommendations: string[] = [];
  
  // Role-based insight generation
  if (userRole.permissions.canAccessConstraintAnalysis) {
    // Full constraint analysis for executives
    if (data.metrics.criticalMetrics.length > 0) {
      constraints.push(`Critical metrics declining: ${data.metrics.criticalMetrics.slice(0, 2).join(', ')}`);
    }
    
    if (data.tasks.completionRate < 60) {
      constraints.push(`Low task completion rate (${data.tasks.completionRate.toFixed(1)}%) limiting execution`);
    }
  } else if (userRole.level === 'manager') {
    // Team-focused insights for managers
    if (data.tasks.team.overdue > 5) {
      constraints.push(`Team has ${data.tasks.team.overdue} overdue tasks affecting delivery`);
    }
    if (data.issues.unresolved.length > 3) {
      constraints.push(`${data.issues.unresolved.length} unresolved team issues need attention`);
    }
  } else {
    // Individual-focused insights for members
    if (data.tasks.personal.overdue > 0) {
      constraints.push(`You have ${data.tasks.personal.overdue} overdue personal tasks`);
    }
  }

  // Role-appropriate recommendations
  if (userRole.level === 'executive') {
    if (constraints.length > 0) {
      recommendations.push('Focus on the primary constraint using Theory of Constraints methodology');
    }
    if (data.strategy.completionScore < 70) {
      recommendations.push('Complete strategic planning to provide clear organizational direction');
    }
  } else if (userRole.level === 'manager') {
    recommendations.push('Focus on improving team execution and resolving blocking issues');
    if (data.tasks.bottlenecks.length > 0) {
      recommendations.push('Address team workflow bottlenecks to improve delivery');
    }
  } else {
    recommendations.push('Focus on completing your assigned tasks and raising blocking issues');
  }

  // Default fallbacks
  if (constraints.length === 0) constraints.push('No major constraints identified at your access level');
  if (growthLevers.length === 0) growthLevers.push('Continue monitoring performance indicators in your scope');
  if (riskFactors.length === 0) riskFactors.push('Risk profile appears manageable within your area');
  if (recommendations.length === 0) recommendations.push('Continue current performance monitoring');
  
  return {
    topConstraints: constraints.slice(0, 5),
    growthLevers: growthLevers.slice(0, 5),
    riskFactors: riskFactors.slice(0, 5),
    recommendations: recommendations.slice(0, 5)
  };
};

export const formatStrategicDataForAI = (data: StrategicBusinessData, userRole: UserRole): string => {
  const baseReport = `
BUSINESS INTELLIGENCE REPORT - ${data.userContext.level.toUpperCase()} VIEW
Company: ${data.company.name}
Analysis Date: ${format(new Date(data.company.currentDate), 'PPP')}
User Role: ${data.userContext.role} (${data.userContext.level})
Access Level: ${data.userContext.accessibleTeams.length} teams accessible

=== USER CONTEXT ===
Role Level: ${data.userContext.level}
Permissions: ${Object.entries(data.userContext.permissions)
  .filter(([_, value]) => value)
  .map(([key, _]) => key.replace('can', '').replace(/([A-Z])/g, ' $1').toLowerCase())
  .join(', ')
}
`;

  // Role-based data inclusion
  let report = baseReport;

  if (userRole.permissions.canViewStrategicInsights) {
    report += `
=== STRATEGIC FOUNDATION ===
Current Plan Status: ${data.strategy.completionScore}% complete
Last Updated: ${data.strategy.lastUpdated}
Key Gaps: ${data.strategy.keyGaps.join(', ')}
`;
  }

  report += `
=== PERFORMANCE METRICS ===
Health Score: ${data.metrics.healthScore.toFixed(1)}/100
Performance Pattern: ${data.metrics.performancePattern}
Critical Metrics: ${data.metrics.criticalMetrics.join(', ') || 'None identified'}
`;

  if (userRole.permissions.canViewCrossTeamData) {
    report += `
=== ORGANIZATIONAL INSIGHTS ===
Overall Goal Progress: ${data.goals.overallProgress.toFixed(1)}%
Company Goals: ${data.goals.company.length}
Team Goals: ${data.goals.team.length}
`;
  }

  report += `
=== STRATEGIC INSIGHTS (${data.userContext.level.toUpperCase()} LEVEL) ===
TOP CONSTRAINTS:
${data.insights.topConstraints.map(c => `• ${c}`).join('\n')}

RECOMMENDATIONS:
${data.insights.recommendations.map(r => `• ${r}`).join('\n')}
`;

  return report;
};

const calculatePlanCompletionScore = (planData: any): number => {
  if (!planData) return 0;
  
  const sections = ['purpose', 'coreValues', 'niche', 'targetCustomer', 'uniqueEdge', 'longTermObjective'];
  const completedSections = sections.filter(section => 
    planData[section] && planData[section].trim().length > 0
  ).length;
  
  return (completedSections / sections.length) * 100;
};

const identifyStrategyGaps = (planData: any): string[] => {
  if (!planData) return ['No strategic plan exists'];
  
  const gaps: string[] = [];
  const sections = {
    purpose: 'Company purpose/mission',
    coreValues: 'Core values definition',
    niche: 'Market niche identification',
    targetCustomer: 'Target customer definition',
    uniqueEdge: 'Competitive advantage',
    longTermObjective: 'Long-term vision'
  };
  
  Object.entries(sections).forEach(([key, label]) => {
    if (!planData[key] || planData[key].trim().length === 0) {
      gaps.push(label);
    }
  });
  
  return gaps;
};

const analyzeMetricTrends = (metrics: any[]): MetricTrendAnalysis[] => {
  const metricGroups = new Map<string, any[]>();
  
  metrics.forEach(metric => {
    const key = `${metric.metric_name}-${metric.owner_id}`;
    if (!metricGroups.has(key)) {
      metricGroups.set(key, []);
    }
    metricGroups.get(key)!.push(metric);
  });
  
  return Array.from(metricGroups.entries()).map(([key, metricData]) => {
    const sortedData = metricData.sort((a, b) => 
      new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime()
    );
    
    const latest = sortedData[sortedData.length - 1];
    const previous = sortedData[sortedData.length - 2];
    
    const weeklyValues = sortedData.map(m => m.metric_value);
    const trend = determineTrend(weeklyValues);
    const consistency = calculateConsistency(weeklyValues);
    const volatility = calculateVolatility(weeklyValues);
    
    return {
      name: latest.metric_name,
      owner: (latest.owner as any)?.full_name || 'Unknown',
      unit: latest.unit,
      current: latest.metric_value,
      previous: previous?.metric_value || 0,
      trend,
      weeklyData: weeklyValues,
      targetStatus: determineTargetStatus(latest),
      consistency,
      volatility
    };
  });
};

const determineTrend = (values: number[]): 'improving' | 'declining' | 'stable' => {
  if (values.length < 2) return 'stable';
  
  const recent = values.slice(-4); // Last 4 weeks
  const earlier = values.slice(-8, -4); // Previous 4 weeks
  
  const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
  const earlierAvg = earlier.length > 0 ? earlier.reduce((sum, val) => sum + val, 0) / earlier.length : recentAvg;
  
  const changePercent = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  
  if (changePercent > 5) return 'improving';
  if (changePercent < -5) return 'declining';
  return 'stable';
};

const calculateConsistency = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, 100 - (stdDev / mean) * 100);
};

const calculateVolatility = (values: number[]): number => {
  if (values.length < 2) return 0;
  let changes = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i-1] !== 0) {
      changes.push(Math.abs((values[i] - values[i-1]) / values[i-1]) * 100);
    }
  }
  return changes.length > 0 ? changes.reduce((sum, change) => sum + change, 0) / changes.length : 0;
};

const determineTargetStatus = (metric: any): 'above' | 'below' | 'at' | 'no_target' => {
  if (metric.target_value === null || metric.target_value === undefined) return 'no_target';
  
  const current = metric.metric_value;
  const target = metric.target_value;
  const logic = metric.target_logic || 'greater_than_or_equal';
  
  switch (logic) {
    case 'greater_than_or_equal':
      return current >= target ? 'above' : 'below';
    case 'less_than_or_equal':
      return current <= target ? 'above' : 'below';
    case 'equal':
      return current === target ? 'at' : (current > target ? 'above' : 'below');
    default:
      return current >= target ? 'above' : 'below';
  }
};

const calculateMetricsHealthScore = (trends: MetricTrendAnalysis[]): number => {
  if (trends.length === 0) return 0;
  
  const scores = trends.map(trend => {
    let score = 0;
    
    // Trend direction (40% weight)
    if (trend.trend === 'improving') score += 40;
    else if (trend.trend === 'stable') score += 25;
    
    // Target achievement (35% weight)
    if (trend.targetStatus === 'above' || trend.targetStatus === 'at') score += 35;
    else if (trend.targetStatus === 'no_target') score += 20;
    
    // Consistency (25% weight)
    score += (trend.consistency * 0.25);
    
    return score;
  });
  
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

const identifyCriticalMetrics = (trends: MetricTrendAnalysis[]): string[] => {
  return trends
    .filter(trend => 
      trend.trend === 'declining' && 
      (trend.targetStatus === 'below' || trend.volatility > 30)
    )
    .map(trend => `${trend.name} (${trend.owner})`)
    .slice(0, 5); // Top 5 critical metrics
};

const identifyPerformancePattern = (trends: MetricTrendAnalysis[]): string => {
  if (trends.length === 0) return 'No metrics to analyze';
  
  const improving = trends.filter(t => t.trend === 'improving').length;
  const declining = trends.filter(t => t.trend === 'declining').length;
  const stable = trends.filter(t => t.trend === 'stable').length;
  
  const total = trends.length;
  const improvingPct = (improving / total) * 100;
  const decliningPct = (declining / total) * 100;
  
  if (improvingPct > 60) return 'Strong upward momentum across most metrics';
  if (decliningPct > 50) return 'Concerning downward trend in majority of metrics';
  if (stable > improving + declining) return 'Metrics showing stability with limited growth';
  return 'Mixed performance with balanced improvement and decline';
};

const getLatestMetrics = (metrics: any[]) => {
  const latest = new Map<string, any>();
  
  metrics.forEach(metric => {
    const key = `${metric.metric_name}-${metric.owner_id}`;
    const existing = latest.get(key);
    
    if (!existing || new Date(metric.week_start_date) > new Date(existing.week_start_date)) {
      latest.set(key, metric);
    }
  });
  
  return Array.from(latest.values());
};

const calculateGoalProgress = (goal: any): number => {
  switch (goal.status) {
    case 'completed': return 100;
    case 'on_track': return 60;
    case 'at_risk': return 30;
    case 'off_track': return 10;
    default: return 0;
  }
};

const assessGoalRisk = (goal: any): string => {
  if (goal.status === 'off_track') return 'high';
  if (goal.status === 'at_risk') return 'medium';
  return 'low';
};

const determineProgressTrend = (goals: GoalAnalysis[]): string => {
  const avgProgress = goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length;
  if (avgProgress > 70) return 'Strong';
  if (avgProgress > 40) return 'Moderate';
  return 'Needs attention';
};

const calculateAvgCompletionTime = (tasks: any[]): number => {
  const completedTasks = tasks.filter(t => t.completed && t.created_at);
  if (completedTasks.length === 0) return 0;
  
  const totalDays = completedTasks.reduce((sum, task) => {
    const created = new Date(task.created_at);
    const completed = new Date(task.updated_at);
    return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }, 0);
  
  return totalDays / completedTasks.length;
};

const identifyTaskBottlenecks = (tasks: any[]): string[] => {
  const bottlenecks: string[] = [];
  
  const overdueTasks = tasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && !t.completed
  );
  
  if (overdueTasks.length > tasks.length * 0.3) {
    bottlenecks.push('High overdue task ratio');
  }
  
  const oldTasks = tasks.filter(t => {
    const daysSinceCreated = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated > 30 && !t.completed;
  });
  
  if (oldTasks.length > tasks.length * 0.2) {
    bottlenecks.push('Tasks aging without completion');
  }
  
  return bottlenecks;
};

const categorizeIssue = (title: string, description?: string): string => {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  if (text.includes('communication') || text.includes('meeting') || text.includes('align')) {
    return 'Communication';
  }
  if (text.includes('process') || text.includes('workflow') || text.includes('procedure')) {
    return 'Process';
  }
  if (text.includes('resource') || text.includes('capacity') || text.includes('bandwidth')) {
    return 'Resources';
  }
  if (text.includes('quality') || text.includes('standard') || text.includes('error')) {
    return 'Quality';
  }
  return 'Other';
};
