import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface SystemStatus {
  totalUsers: number;
  activeUsers: number;
  totalCompanies: number;
  activeSessions: number;
}

/**
 * Fetch system-wide status metrics
 */
export const fetchSystemStatus = async (): Promise<SystemStatus> => {
  logger.log('🔍 [Analytics2] Fetching system status');

  const [usersRes, companiesRes, sessionsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('company_usage_stats')
      .select('user_id, session_count')
      .gte('stat_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  ]);

  const activeUsers = new Set(sessionsRes.data?.map(s => s.user_id)).size;
  const activeSessions = sessionsRes.data?.reduce((sum, s) => sum + (s.session_count || 0), 0) || 0;

  return {
    totalUsers: usersRes.count || 0,
    activeUsers,
    totalCompanies: companiesRes.count || 0,
    activeSessions
  };
};

export interface UserAnalytics {
  id: string;
  full_name: string | null;
  email: string;
  company_id: string;
  company_name: string;
  account_status: string;
  role: string;
  created_at: string;
  last_login_at: string | null;
  total_sessions: number;
  avg_session_length: number;
  total_time_in_app: number;
  plan_tier: string | null;
  subscribed: boolean;
  renewal_date: string | null;
  churn_risk: 'low' | 'medium' | 'high';
  churn_score: number;
}

export interface ChurnCalculation {
  recency_score: number;
  usage_trend_score: number;
  frequency_score: number;
  total_score: number;
  risk_level: 'low' | 'medium' | 'high';
}

/**
 * Fetch all users with comprehensive analytics metrics
 */
export const fetchAllUsersWithMetrics = async (): Promise<UserAnalytics[]> => {
  logger.log('🔍 [Analytics2] Fetching all users with metrics');

  // Fetch users with company and subscription data
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      created_at,
      last_login_at
    `)
    .order('created_at', { ascending: false });

  if (usersError) {
    logger.error('🚨 [Analytics2] Error fetching users:', usersError);
    throw usersError;
  }

  // Fetch company memberships
  const { data: memberships, error: membershipsError } = await supabase
    .from('company_members')
    .select(`
      user_id,
      company_id,
      status,
      permission_level,
      companies (
        id,
        name
      )
    `);

  if (membershipsError) {
    logger.error('🚨 [Analytics2] Error fetching memberships:', membershipsError);
    throw membershipsError;
  }

  // Fetch usage stats
  const { data: usageStats, error: usageError } = await supabase
    .from('company_usage_stats')
    .select('user_id, total_minutes, session_count, average_session_minutes');

  if (usageError) {
    logger.error('🚨 [Analytics2] Error fetching usage stats:', usageError);
    throw usageError;
  }

  // Fetch subscription data
  const { data: subscriptions, error: subsError } = await supabase
    .from('company_subscriptions')
    .select('company_id, subscription_tier, subscribed, stripe_current_period_end');

  if (subsError) {
    logger.error('🚨 [Analytics2] Error fetching subscriptions:', subsError);
    throw subsError;
  }

  // Aggregate usage stats by user
  const userUsageMap = new Map<string, { total_minutes: number; total_sessions: number; avg_minutes: number }>();
  
  usageStats?.forEach(stat => {
    const existing = userUsageMap.get(stat.user_id) || { total_minutes: 0, total_sessions: 0, avg_minutes: 0 };
    existing.total_minutes += stat.total_minutes || 0;
    existing.total_sessions += stat.session_count || 0;
    userUsageMap.set(stat.user_id, existing);
  });

  // Calculate averages
  userUsageMap.forEach((value, key) => {
    if (value.total_sessions > 0) {
      value.avg_minutes = value.total_minutes / value.total_sessions;
    }
  });

  // Create subscription map
  const subscriptionMap = new Map(
    subscriptions?.map(sub => [sub.company_id, sub]) || []
  );

  // Create membership map
  const membershipMap = new Map(
    memberships?.map(m => [m.user_id, m]) || []
  );

  // Combine all data
  const userAnalytics: UserAnalytics[] = users?.map(user => {
    const membership = membershipMap.get(user.id);
    const usage = userUsageMap.get(user.id) || { total_minutes: 0, total_sessions: 0, avg_minutes: 0 };
    const subscription = membership ? subscriptionMap.get(membership.company_id) : null;

    const churnCalc = calculateChurnRisk(user, usage);

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      company_id: membership?.company_id || '',
      company_name: (membership?.companies as any)?.name || 'No Company',
      account_status: membership?.status || 'inactive',
      role: membership?.permission_level || 'member',
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      total_sessions: usage.total_sessions,
      avg_session_length: Math.round(usage.avg_minutes),
      total_time_in_app: usage.total_minutes,
      plan_tier: subscription?.subscription_tier || null,
      subscribed: subscription?.subscribed || false,
      renewal_date: subscription?.stripe_current_period_end || null,
      churn_risk: churnCalc.risk_level,
      churn_score: churnCalc.total_score,
    };
  }) || [];

  logger.log('✅ [Analytics2] Fetched user analytics:', {
    total_users: userAnalytics.length,
    with_usage: userAnalytics.filter(u => u.total_sessions > 0).length,
  });

  return userAnalytics;
};

// ============================================================================
// COMPANY PRODUCTIVITY DATA
// ============================================================================

export interface CompanyProductivityData {
  company_id: string;
  company_name: string;
  // Team & Member Stats
  team_count: number;
  member_count: number;
  // Task Metrics
  tasks_total: number;
  tasks_completed: number;
  tasks_pending: number;
  task_completion_rate: number;
  // Goal Metrics
  goals_total: number;
  goals_active: number;
  avg_goal_progress: number;
  // Issue Metrics
  issues_total: number;
  issues_resolved: number;
  issues_open: number;
  issue_resolution_rate: number;
  // Meeting Metrics
  meetings_count: number;
  avg_meeting_duration_minutes: number;
  // Usage Metrics
  total_usage_minutes: number;
  active_users_count: number;
  // Calculated Scores
  productivity_score: number;
  engagement_level: 'high' | 'medium' | 'low';
}

export async function fetchCompanyProductivityData(): Promise<CompanyProductivityData[]> {
  logger.log('🔍 [Analytics2] Fetching company productivity data');
  
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .order('name');

  if (companiesError) throw companiesError;
  if (!companies) return [];

  const productivityData = await Promise.all(
    companies.map(async (company) => {
      // Team & Member counts
      const { count: teamCount } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);

      const { count: memberCount } = await supabase
        .from('company_members')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'active');

      // Task metrics
      const { data: tasks } = await supabase
        .from('fast_tasks')
        .select('status, is_deleted')
        .eq('company_id', company.id)
        .eq('is_deleted', false);

      const tasksTotal = tasks?.length || 0;
      const tasksCompleted = tasks?.filter(t => t.status === 'done').length || 0;
      const tasksPending = tasksTotal - tasksCompleted;
      const taskCompletionRate = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

      // Goal metrics
      const { data: goals } = await supabase
        .from('team_goals')
        .select('progress, status')
        .eq('company_id', company.id)
        .eq('is_archived', false);

      const goalsTotal = goals?.length || 0;
      const goalsActive = goals?.filter(g => g.status !== 'completed').length || 0;
      const avgGoalProgress = goalsTotal > 0
        ? goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goalsTotal
        : 0;

      // Issue metrics
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('company_id', company.id);
      
      const teamIds = teams?.map(t => t.id) || [];
      
      const { data: issues } = teamIds.length > 0 
        ? await supabase
            .from('issues')
            .select('status, is_deleted')
            .in('team_id', teamIds)
            .eq('is_deleted', false)
        : { data: null };

      const issuesTotal = issues?.length || 0;
      const issuesResolved = issues?.filter(i => i.status === 'resolved').length || 0;
      const issuesOpen = issuesTotal - issuesResolved;
      const issueResolutionRate = issuesTotal > 0 ? (issuesResolved / issuesTotal) * 100 : 0;

      // Meeting metrics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: meetings } = teamIds.length > 0 
        ? await supabase
            .from('meeting_results')
            .select('duration_minutes')
            .in('team_id', teamIds)
            .gte('created_at', thirtyDaysAgo.toISOString())
        : { data: null };

      const meetingsCount = meetings?.length || 0;
      const totalMeetingMinutes = meetings ? meetings.reduce((sum, m) => sum + (m.duration_minutes || 0), 0) : 0;
      const avgMeetingDuration = meetingsCount > 0 ? totalMeetingMinutes / meetingsCount : 0;

      // Usage metrics (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: usageStats } = await supabase
        .from('company_usage_stats')
        .select('total_minutes, user_id')
        .eq('company_id', company.id)
        .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0]);

      const totalUsageMinutes = usageStats?.reduce((sum, s) => sum + s.total_minutes, 0) || 0;
      const activeUsersCount = new Set(usageStats?.map(s => s.user_id)).size;

      // Calculate productivity score (0-100)
      const taskScore = taskCompletionRate * 0.25;
      const issueScore = issueResolutionRate * 0.25;
      const goalScore = avgGoalProgress * 0.20;
      const meetingScore = Math.min((meetingsCount / 4) * 100, 100) * 0.15; // 4+ meetings = max score
      const engagementScore = (memberCount || 0) > 0
        ? Math.min((totalUsageMinutes / (memberCount * 60)) * 100, 100) * 0.15
        : 0;

      const productivityScore = Math.round(taskScore + issueScore + goalScore + meetingScore + engagementScore);

      // Determine engagement level
      let engagementLevel: 'high' | 'medium' | 'low';
      if (productivityScore >= 70) engagementLevel = 'high';
      else if (productivityScore >= 40) engagementLevel = 'medium';
      else engagementLevel = 'low';

      return {
        company_id: company.id,
        company_name: company.name,
        team_count: teamCount || 0,
        member_count: memberCount || 0,
        tasks_total: tasksTotal,
        tasks_completed: tasksCompleted,
        tasks_pending: tasksPending,
        task_completion_rate: Math.round(taskCompletionRate),
        goals_total: goalsTotal,
        goals_active: goalsActive,
        avg_goal_progress: Math.round(avgGoalProgress),
        issues_total: issuesTotal,
        issues_resolved: issuesResolved,
        issues_open: issuesOpen,
        issue_resolution_rate: Math.round(issueResolutionRate),
        meetings_count: meetingsCount,
        avg_meeting_duration_minutes: Math.round(avgMeetingDuration),
        total_usage_minutes: totalUsageMinutes,
        active_users_count: activeUsersCount,
        productivity_score: productivityScore,
        engagement_level: engagementLevel,
      };
    })
  );

  logger.log('✅ [Analytics2] Fetched productivity data for', productivityData.length, 'companies');
  return productivityData;
}

/**
 * Calculate churn risk for a user based on multiple factors
 */
export const calculateChurnRisk = (
  user: { last_login_at: string | null; created_at: string },
  usage: { total_minutes: number; total_sessions: number }
): ChurnCalculation => {
  let recency_score = 0;
  let usage_trend_score = 0;
  let frequency_score = 0;

  // 1. Recency Score (40% weight) - Days since last login
  if (user.last_login_at) {
    const daysSinceLogin = Math.floor(
      (Date.now() - new Date(user.last_login_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLogin <= 1) recency_score = 40;
    else if (daysSinceLogin <= 3) recency_score = 35;
    else if (daysSinceLogin <= 7) recency_score = 25;
    else if (daysSinceLogin <= 14) recency_score = 15;
    else if (daysSinceLogin <= 30) recency_score = 5;
    else recency_score = 0;
  }

  // 2. Usage Trend Score (30% weight) - Total time spent
  const hoursSpent = usage.total_minutes / 60;
  if (hoursSpent >= 50) usage_trend_score = 30;
  else if (hoursSpent >= 20) usage_trend_score = 25;
  else if (hoursSpent >= 10) usage_trend_score = 20;
  else if (hoursSpent >= 5) usage_trend_score = 15;
  else if (hoursSpent >= 1) usage_trend_score = 10;
  else usage_trend_score = 0;

  // 3. Frequency Score (30% weight) - Session count
  if (usage.total_sessions >= 50) frequency_score = 30;
  else if (usage.total_sessions >= 20) frequency_score = 25;
  else if (usage.total_sessions >= 10) frequency_score = 20;
  else if (usage.total_sessions >= 5) frequency_score = 15;
  else if (usage.total_sessions >= 1) frequency_score = 10;
  else frequency_score = 0;

  const total_score = recency_score + usage_trend_score + frequency_score;

  let risk_level: 'low' | 'medium' | 'high';
  if (total_score >= 70) risk_level = 'low';
  else if (total_score >= 40) risk_level = 'medium';
  else risk_level = 'high';

  return {
    recency_score,
    usage_trend_score,
    frequency_score,
    total_score,
    risk_level,
  };
};

// ============= USAGE ANALYTICS FUNCTIONS =============

export interface UsageMetrics {
  dau: number;
  wau: number;
  mau: number;
  avg_session_minutes: number;
  total_platform_hours: number;
}

export interface DAUDataPoint {
  date: string;
  dau: number;
  wau: number;
  mau: number;
}

export interface HeatmapCell {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  sessions: number;
}

export interface SessionDurationDataPoint {
  date: string;
  avg_duration: number;
}

/**
 * Fetch key usage metrics (DAU, WAU, MAU, etc.)
 */
export const fetchUsageMetrics = async (): Promise<UsageMetrics> => {
  logger.log('🔍 [Analytics2] Fetching usage metrics');

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all session data for the last 30 days
  const { data: sessions, error } = await supabase
    .from('user_activity_sessions')
    .select('user_id, session_start, duration_minutes')
    .gte('session_start', oneMonthAgo.toISOString())
    .order('session_start', { ascending: false });

  if (error) {
    logger.error('🚨 [Analytics2] Error fetching sessions:', error);
    throw error;
  }

  // Calculate DAU (unique users in last 24h)
  const dauUsers = new Set(
    sessions
      ?.filter(s => new Date(s.session_start) >= oneDayAgo)
      .map(s => s.user_id) || []
  );

  // Calculate WAU (unique users in last 7 days)
  const wauUsers = new Set(
    sessions
      ?.filter(s => new Date(s.session_start) >= oneWeekAgo)
      .map(s => s.user_id) || []
  );

  // Calculate MAU (unique users in last 30 days)
  const mauUsers = new Set(sessions?.map(s => s.user_id) || []);

  // Calculate average session duration
  const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
  const avgSessionMinutes = sessions && sessions.length > 0 ? totalMinutes / sessions.length : 0;

  // Calculate total platform hours
  const totalPlatformHours = totalMinutes / 60;

  const metrics = {
    dau: dauUsers.size,
    wau: wauUsers.size,
    mau: mauUsers.size,
    avg_session_minutes: Math.round(avgSessionMinutes),
    total_platform_hours: Math.round(totalPlatformHours),
  };

  logger.log('✅ [Analytics2] Usage metrics:', metrics);
  return metrics;
};

/**
 * Fetch DAU trend for the last 30 days
 */
export const fetchDAUTrend = async (): Promise<DAUDataPoint[]> => {
  logger.log('🔍 [Analytics2] Fetching DAU trend');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: sessions, error } = await supabase
    .from('user_activity_sessions')
    .select('user_id, session_start')
    .gte('session_start', thirtyDaysAgo.toISOString())
    .order('session_start', { ascending: true });

  if (error) {
    logger.error('🚨 [Analytics2] Error fetching DAU trend:', error);
    throw error;
  }

  // Group by date and count unique users
  const dateMap = new Map<string, Set<string>>();

  sessions?.forEach(session => {
    const date = new Date(session.session_start).toISOString().split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, new Set());
    }
    dateMap.get(date)!.add(session.user_id);
  });

  // Generate all dates for the last 30 days
  const trend: DAUDataPoint[] = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Calculate WAU and MAU for this date
    const sevenDaysAgo = new Date(date);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(date);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const wauUsers = new Set<string>();
    const mauUsers = new Set<string>();

    dateMap.forEach((users, d) => {
      const sessionDate = new Date(d);
      if (sessionDate >= sevenDaysAgo && sessionDate <= date) {
        users.forEach(u => wauUsers.add(u));
      }
      if (sessionDate >= thirtyDaysAgo && sessionDate <= date) {
        users.forEach(u => mauUsers.add(u));
      }
    });

    trend.push({
      date: dateStr,
      dau: dateMap.get(dateStr)?.size || 0,
      wau: wauUsers.size,
      mau: mauUsers.size,
    });
  }

  logger.log('✅ [Analytics2] DAU trend points:', trend.length);
  return trend;
};

/**
 * Fetch activity heatmap (day x hour grid)
 */
export const fetchActivityHeatmap = async (): Promise<HeatmapCell[]> => {
  logger.log('🔍 [Analytics2] Fetching activity heatmap');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: sessions, error } = await supabase
    .from('user_activity_sessions')
    .select('session_start')
    .gte('session_start', thirtyDaysAgo.toISOString());

  if (error) {
    logger.error('🚨 [Analytics2] Error fetching heatmap data:', error);
    throw error;
  }

  // Initialize grid (7 days x 24 hours)
  const grid = new Map<string, number>();
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      grid.set(`${day}-${hour}`, 0);
    }
  }

  // Count sessions by day/hour
  sessions?.forEach(session => {
    const date = new Date(session.session_start);
    const day = date.getDay(); // 0-6
    const hour = date.getHours(); // 0-23
    const key = `${day}-${hour}`;
    grid.set(key, (grid.get(key) || 0) + 1);
  });

  // Convert to array
  const heatmap: HeatmapCell[] = [];
  grid.forEach((sessions, key) => {
    const [day, hour] = key.split('-').map(Number);
    heatmap.push({ day, hour, sessions });
  });

  logger.log('✅ [Analytics2] Heatmap cells:', heatmap.length);
  return heatmap;
};

/**
 * Fetch average session duration trend over last 30 days
 */
export const fetchSessionDurationTrend = async (): Promise<SessionDurationDataPoint[]> => {
  logger.log('🔍 [Analytics2] Fetching session duration trend');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: sessions, error } = await supabase
    .from('user_activity_sessions')
    .select('session_start, duration_minutes')
    .gte('session_start', thirtyDaysAgo.toISOString())
    .order('session_start', { ascending: true });

  if (error) {
    logger.error('🚨 [Analytics2] Error fetching duration trend:', error);
    throw error;
  }

  // Group by date and calculate average
  const dateMap = new Map<string, { total: number; count: number }>();

  sessions?.forEach(session => {
    const date = new Date(session.session_start).toISOString().split('T')[0];
    const existing = dateMap.get(date) || { total: 0, count: 0 };
    existing.total += session.duration_minutes || 0;
    existing.count += 1;
    dateMap.set(date, existing);
  });

  // Generate all dates for the last 30 days
  const trend: SessionDurationDataPoint[] = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const data = dateMap.get(dateStr);
    const avgDuration = data && data.count > 0 ? data.total / data.count : 0;

    trend.push({
      date: dateStr,
      avg_duration: Math.round(avgDuration),
    });
  }

  logger.log('✅ [Analytics2] Duration trend points:', trend.length);
  return trend;
};

// ============= CUSTOMER HEALTH FUNCTIONS =============

export interface CompanyHealthData {
  company_id: string;
  company_name: string;
  health_score: import('@/utils/companyHealthScore').HealthScoreBreakdown;
  manual_health: string | null;
  account_stage: string | null;
  subs_status: string | null;
  mrr: number;
  user_count: number;
  pending_count: number;
  usage_hours_7d: number;
  last_login_at: string | null;
  created_at: string;
  trial_end: string | null;
  subscribed: boolean;
  category: 'at_risk' | 'stable' | 'expansion_ready';
  red_flags: string[];
  suggested_actions: string[];
  usage_trend: 'declining' | 'stable' | 'growing';
}

/**
 * Fetch comprehensive company health data with scoring and risk analysis
 */
export const fetchCompanyHealthData = async (): Promise<CompanyHealthData[]> => {
  logger.log('🔍 [Analytics2] Fetching company health data');

  // Import health score calculation
  const { calculateHealthScore } = await import('@/utils/companyHealthScore');

  // Fetch companies with basic info
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, created_at')
    .order('name', { ascending: true });

  if (companiesError) {
    logger.error('🚨 [Analytics2] Error fetching companies:', companiesError);
    throw companiesError;
  }

  // Fetch customer success tracking data
  const { data: csTracking, error: csError } = await supabase
    .from('customer_success_tracking')
    .select('company_id, account_stage, customer_health, subs_status');

  if (csError) {
    logger.error('🚨 [Analytics2] Error fetching CS tracking:', csError);
    throw csError;
  }

  // Fetch subscription data
  const { data: subscriptions, error: subsError } = await supabase
    .from('company_subscriptions')
    .select('company_id, trial_end, subscribed, period_amount_charged');

  if (subsError) {
    logger.error('🚨 [Analytics2] Error fetching subscriptions:', subsError);
    throw subsError;
  }

  // Fetch company members count
  const { data: members, error: membersError } = await supabase
    .from('company_members')
    .select('company_id, user_id, status');

  if (membersError) {
    logger.error('🚨 [Analytics2] Error fetching members:', membersError);
    throw membersError;
  }

  // Fetch usage stats (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: usageStats, error: usageError } = await supabase
    .from('company_usage_stats')
    .select('company_id, total_minutes, stat_date')
    .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0]);

  if (usageError) {
    logger.error('🚨 [Analytics2] Error fetching usage stats:', usageError);
    throw usageError;
  }

  // Fetch last login per company
  const { data: lastLogins, error: loginsError } = await supabase
    .from('profiles')
    .select('id, last_login_at')
    .order('last_login_at', { ascending: false });

  if (loginsError) {
    logger.error('🚨 [Analytics2] Error fetching last logins:', loginsError);
    throw loginsError;
  }

  // Create maps for efficient lookup
  const csTrackingMap = new Map(csTracking?.map(cs => [cs.company_id, cs]) || []);
  const subscriptionMap = new Map(subscriptions?.map(sub => [sub.company_id, sub]) || []);
  
  // Aggregate member counts by company
  const memberCountMap = new Map<string, { active: number; pending: number }>();
  members?.forEach(member => {
    const existing = memberCountMap.get(member.company_id) || { active: 0, pending: 0 };
    if (member.status === 'active') existing.active++;
    else if (member.status === 'pending') existing.pending++;
    memberCountMap.set(member.company_id, existing);
  });

  // Aggregate usage by company (last 7 days)
  const usageMap = new Map<string, number>();
  usageStats?.forEach(stat => {
    const existing = usageMap.get(stat.company_id) || 0;
    usageMap.set(stat.company_id, existing + (stat.total_minutes || 0));
  });

  // Get last login per company
  const companyLastLoginMap = new Map<string, string>();
  members?.forEach(member => {
    if (member.status === 'active') {
      const profile = lastLogins?.find(p => p.id === member.user_id);
      if (profile?.last_login_at) {
        const existing = companyLastLoginMap.get(member.company_id);
        if (!existing || profile.last_login_at > existing) {
          companyLastLoginMap.set(member.company_id, profile.last_login_at);
        }
      }
    }
  });

  // Combine all data and calculate health scores
  const healthData: CompanyHealthData[] = companies?.map(company => {
    const csData = csTrackingMap.get(company.id);
    const subscription = subscriptionMap.get(company.id);
    const memberCounts = memberCountMap.get(company.id) || { active: 0, pending: 0 };
    const usageMinutes = usageMap.get(company.id) || 0;
    const usageHours = usageMinutes / 60;
    const lastLogin = companyLastLoginMap.get(company.id) || null;

    // Calculate health score
    const healthScore = calculateHealthScore(
      lastLogin,
      usageHours,
      memberCounts.active,
      memberCounts.pending,
      company.created_at
    );

    // Calculate MRR
    const mrr = subscription?.period_amount_charged || 0;

    // Detect red flags
    const redFlags: string[] = [];
    const now = new Date();
    
    if (lastLogin) {
      const daysSinceLogin = Math.floor((now.getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLogin > 14) redFlags.push('No login in 14+ days');
    } else {
      redFlags.push('Never logged in');
    }

    if (usageHours === 0) redFlags.push('Zero usage this week');

    if (subscription?.trial_end && !subscription.subscribed) {
      const trialEnd = new Date(subscription.trial_end);
      const daysUntilExpiry = Math.floor((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        redFlags.push('Trial expiring soon');
      } else if (daysUntilExpiry <= 0) {
        redFlags.push('Trial expired');
      }
    }

    if (memberCounts.pending > memberCounts.active) {
      redFlags.push('Low user adoption');
    }

    // Determine usage trend (simplified)
    const usageTrend: 'declining' | 'stable' | 'growing' = 
      usageHours === 0 ? 'declining' : 
      usageHours < 5 ? 'stable' : 'growing';

    if (usageTrend === 'declining' && usageHours > 0) {
      redFlags.push('Declining usage');
    }

    // Generate suggested actions
    const suggestedActions: string[] = [];
    redFlags.forEach(flag => {
      if (flag.includes('No login') || flag.includes('Never logged')) {
        suggestedActions.push('Send re-engagement email');
      } else if (flag === 'Zero usage this week') {
        suggestedActions.push('Schedule check-in call');
      } else if (flag === 'Trial expiring soon') {
        suggestedActions.push('Send trial extension offer');
      } else if (flag === 'Trial expired') {
        suggestedActions.push('Send win-back campaign');
      } else if (flag === 'Low user adoption') {
        suggestedActions.push('Offer onboarding session');
      } else if (flag === 'Declining usage') {
        suggestedActions.push('Review account for blockers');
      }
    });

    // Determine category
    let category: 'at_risk' | 'stable' | 'expansion_ready';
    const manualHealthRisk = csData?.customer_health === 'Unhealthy' || csData?.customer_health === 'Not Good';
    
    if (healthScore.total < 55 || manualHealthRisk) {
      category = 'at_risk';
    } else if (healthScore.total >= 85 && subscription?.subscribed && usageTrend === 'growing') {
      category = 'expansion_ready';
    } else {
      category = 'stable';
    }

    // Filter out test/internal companies
    const isTestOrInternal = 
      csData?.account_stage === 'Internal Company' || 
      csData?.account_stage === 'Test Company';

    return {
      company_id: company.id,
      company_name: company.name,
      health_score: healthScore,
      manual_health: csData?.customer_health || null,
      account_stage: csData?.account_stage || null,
      subs_status: csData?.subs_status || null,
      mrr,
      user_count: memberCounts.active,
      pending_count: memberCounts.pending,
      usage_hours_7d: usageHours,
      last_login_at: lastLogin,
      created_at: company.created_at,
      trial_end: subscription?.trial_end || null,
      subscribed: subscription?.subscribed || false,
      category,
      red_flags: redFlags,
      suggested_actions: suggestedActions,
      usage_trend: usageTrend,
      _isTestOrInternal: isTestOrInternal, // Hidden field for filtering
    } as CompanyHealthData & { _isTestOrInternal?: boolean };
  }).filter(company => !(company as any)._isTestOrInternal) || [];

  logger.log('✅ [Analytics2] Company health data:', {
    total: healthData.length,
    at_risk: healthData.filter(c => c.category === 'at_risk').length,
    stable: healthData.filter(c => c.category === 'stable').length,
    expansion: healthData.filter(c => c.category === 'expansion_ready').length,
  });

  return healthData;
};

// ============= SESSION DETAIL FUNCTIONS =============

export interface UserSessionDetail {
  id: string;
  user_id: string;
  session_start: string;
  session_end: string | null;
  last_heartbeat: string | null;
  duration_minutes: number | null;
  status: string;
  end_reason: string | null;
  company_id: string;
  company_name: string;
}

/**
 * Fetch all sessions for a specific user
 */
export const fetchUserSessions = async (userId: string): Promise<UserSessionDetail[]> => {
  logger.log('🔍 [Analytics2] Fetching sessions for user:', userId);

  const { data: sessions, error } = await supabase
    .from('user_activity_sessions')
    .select(`
      id,
      user_id,
      session_start,
      session_end,
      last_heartbeat,
      duration_minutes,
      status,
      end_reason,
      company_id
    `)
    .eq('user_id', userId)
    .order('session_start', { ascending: false });

  if (error) {
    logger.error('🚨 [Analytics2] Error fetching user sessions:', error);
    throw error;
  }

  // Fetch company names
  const companyIds = [...new Set(sessions?.map(s => s.company_id).filter(Boolean) || [])];
  
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .in('id', companyIds);

  if (companiesError) {
    logger.error('🚨 [Analytics2] Error fetching companies:', companiesError);
  }

  const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);

  const sessionsWithCompany: UserSessionDetail[] = sessions?.map(session => ({
    ...session,
    company_name: companyMap.get(session.company_id) || 'Unknown',
  })) || [];

  logger.log('✅ [Analytics2] Fetched user sessions:', sessionsWithCompany.length);
  return sessionsWithCompany;
};
