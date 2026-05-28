import { supabase } from '@/integrations/supabase/client';
import { OrgChartPermissionsService } from '@/services/orgChartPermissionsService';
import { getCurrentWeekStart, getWeekStart, WeekStartDay } from '@/lib/weekUtils';
import { logger } from '@/utils/logger';

export interface ZentrixAIContext {
  // Scope identification - ALWAYS FIRST
  active_scope: {
    level: 'company' | 'team' | 'seat' | 'personal';
    entity_id?: string;
    entity_name?: string;
  };
  
  // Current user context
  current_user: {
    id: string;
    fullName: string;
    email: string;
    permissionLevel: string;
    role: string;
    can_see_user_ids: string[];
  };

  // Hierarchical data structure - MAINTAIN SEPARATION
  hierarchy: {
    // COMPANY LEVEL: Strategy, annual targets, long-term vision
    company: {
      id: string;
      name: string;
      strategy: {
        // Foundation
        purpose?: string;
        core_values?: Array<{
          id: string;
          value: string;
          explanation?: string;
        }>;
        long_term_objective?: string;
        long_term_timeframe?: number;
        niche?: string;
        unique_edge?: string;
        
        // 3-Year Vision
        three_year_milestones?: {
          key_descriptors?: string;
          revenue?: string;
          profit?: string;
          team_size?: string;
          what_it_looks_like?: string[];
        };
        
        // Marketing Strategy
        marketing?: {
          target_market?: string;
          competitive_advantages?: string[];
          guarantee?: string;
          process?: string;
        };
        target_customer?: {
          demographics?: string;
          psychographics?: string;
          behavior?: string;
        };
        
        // Goals
        yearly_goals?: Array<{
          id: string;
          text: string;
          completed: boolean;
        }>;
        quarterly_priorities?: string[];
        
        // 1-Year Execution Goals (Annual Financial Targets)
        one_year_goals?: {
          revenue?: string;
          profit?: string;
          metricTargets?: Array<{
            id: string;
            name: string;
            target: string;
            unit?: string;
          }>;
        };
        
        // Quarterly Execution Goals (Quarterly Financial Targets)
        quarterly_goals?: {
          revenue?: string;
          profit?: string;
          metricTargets?: Array<{
            id: string;
            name: string;
            target: string;
            unit?: string;
          }>;
        };
        
        // SWOT Analysis
        swot_analysis?: {
          strengths?: Array<{ id: string; text: string; }>;
          weaknesses?: Array<{ id: string; text: string; }>;
          opportunities?: Array<{ id: string; text: string; }>;
          threats?: Array<{ id: string; text: string; }>;
        };
        
        // Execution
        team_alignment?: any[];
        issues?: any[];
      };
      annual_metrics?: Array<{
        name: string;
        value: number | null;
        target: number | null;
        status: 'green' | 'yellow' | 'red';
      }>;
    };
    
    // ORGANIZATIONAL CHART: Role hierarchy, people, and responsibilities
    org_chart: Array<{
      id: string;
      title: string;
      person_assigned: {
        name: string;
        email?: string;
        avatar_url?: string;
      } | null;
      responsibilities: string[];
      reports_to: {
        role_title: string;
        person_name: string;
      } | null;
      direct_reports_count: number;
      level: number; // Hierarchy level (0 = top, increases with depth)
    }>;
    
    // TEAM LEVEL: Quarterly goals, team metrics, departmental KPIs
    teams: Array<{
      id: string;
      name: string;
      member_count: number;
      quarterly_goals: Array<{
        title: string;
        status: string;
        progress: number;
        owner: string;
        dueDate?: string;
      }>;
      metrics: Array<{
        name: string;
        value: number | null;
        target: number | null;
        status: 'green' | 'yellow' | 'red';
        owner: string;
        weekStart: string;
        lastUpdated: string;
        history: {
          lastWeek: { value: number | null; status: string } | null;
          fourWeeksAgo: { value: number | null; status: string } | null;
          thirteenWeeksAgo: { value: number | null; status: string } | null;
          fiftyTwoWeeksAgo: { value: number | null; status: string } | null;
        };
        comparisons: {
          vsLastWeek: { change: number; changePercent: number; improving: boolean } | null;
          vsFourWeeks: { change: number; changePercent: number; improving: boolean } | null;
          vsThirteenWeeks: { change: number; changePercent: number; improving: boolean } | null;
          vsFiftyTwoWeeks: { change: number; changePercent: number; improving: boolean } | null;
        };
      }>;
      issues: Array<{
        title: string;
        type: string;
        owner: string;
        daysOpen: number;
      }>;
    }>;
    
    // SEAT LEVEL: Accountability, role-based ownership
    seats: Array<{
      title: string;
      team: string;
      owner: string;
      user_role: string;
      responsibilities: string[];
      metrics_owned: Array<{
        name: string;
        value: number | null;
        target: number | null;
        status: 'green' | 'yellow' | 'red';
      }>;
      goals_owned: Array<{
        title: string;
        status: string;
        progress: number;
        dueDate?: string;
      }>;
    }>;
    
    // INDIVIDUAL LEVEL: Personal tasks and direct responsibilities
    individual: {
      personal_tasks: Array<{
        title: string;
        status: string;
        dueDate?: string;
        isOverdue: boolean;
      }>;
      assigned_tasks: Array<{
        title: string;
        status: string;
        team: string;
        isOverdue: boolean;
        dueDate?: string;
      }>;
    };
  };

  // Cross-cutting data (filtered by scope)
  people_analyzer: Array<{
    userName: string;
    scoreType: string;
    scoreValue: string;
    status: string;
    coreValueName?: string;
  }>;

  // Metadata for trend analysis
  trends: Array<{
    name: string;
    trend: 'improving' | 'declining' | 'stable';
    changePercent: number;
  }>;
}

// Helper: Get all role IDs that report to given role IDs (recursive)
const getAllReportingRoles = (
  roleIds: string[], 
  allOrgRoles: any[]
): string[] => {
  const reportingRoles = new Set<string>();
  
  const findReports = (managerRoleId: string) => {
    allOrgRoles.forEach(role => {
      if (role.reports_to_role_id === managerRoleId && !reportingRoles.has(role.id)) {
        reportingRoles.add(role.id);
        findReports(role.id); // Recursive: get their reports too
      }
    });
  };
  
  roleIds.forEach(roleId => findReports(roleId));
  return Array.from(reportingRoles);
};

export const aggregateZentrixContext = async (
  userId: string,
  companyId: string,
  viewContext: 'company' | 'team' | 'personal' = 'company',
  entityId?: string
): Promise<ZentrixAIContext> => {
  logger.log('🔍 Aggregating Zentrix AI context:', { userId, companyId, viewContext, entityId });

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', userId)
    .single();

  // Get user's permission level in company
  const { data: membership } = await supabase
    .from('company_members')
    .select('permission_level')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single();

  // Get user's week start day preference
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('week_start_day')
    .eq('user_id', userId)
    .single();

  const weekStartDay: WeekStartDay = (userSettings?.week_start_day as WeekStartDay) || 'sunday';
  logger.log('🔍 Zentrix AI: Using week start day:', weekStartDay);

  // Get company info
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single();

  // Get organizational cascade (all subordinates user can see)
  const { canSeeUserIds, userRole } = await OrgChartPermissionsService
    .getUserVisiblePeopleWithHierarchy(userId, companyId);

  logger.log('🔍 Zentrix AI: Org cascade returned', canSeeUserIds.length, 'visible users');

  // Filter by active users only
  const { data: activeMembers } = await supabase
    .from('company_members')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .in('user_id', canSeeUserIds);

  const relevantUserIds = (activeMembers || []).map(m => m.user_id);
  logger.log('🔍 Zentrix AI: Filtered to', relevantUserIds.length, 'active users');

  // Get user's permission level from company_members
  const { data: companyMemberData } = await supabase
    .from('company_members')
    .select('permission_level')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single();

  const userPermissionLevel = companyMemberData?.permission_level || 'member';

  // Get user's teams for context
  const { data: teamMemberships } = await supabase
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
    .eq('teams.company_id', companyId);

  const teams = (teamMemberships || []).map((tm: any) => ({
    id: tm.team_id,
    name: tm.teams?.name || 'Unknown',
    memberCount: 0
  }));

  const teamIds = teams.map(t => t.id);

  // Get ALL teams for this company to filter metrics properly (prevent cross-company data leakage)
  const { data: allCompanyTeams } = await supabase
    .from('teams')
    .select('id, name, is_leadership')
    .eq('company_id', companyId);

  // === FETCH ORGANIZATIONAL CHART DATA (needed for scope calculation) ===
  logger.log('🔍 Zentrix AI: Fetching org chart for company:', companyId);

  const { data: orgRoles } = await supabase
    .from('org_roles')
    .select(`
      id,
      title,
      responsibilities,
      reports_to_role_id
    `)
    .eq('company_id', companyId)
    .order('title');

  // Get user's org role(s) to determine reporting hierarchy
  const { data: userRoleAssignments } = await supabase
    .from('role_assignments')
    .select('role_id')
    .eq('user_id', userId);

  const userOrgRoleIds = (userRoleAssignments || []).map(ra => ra.role_id);
  logger.log('🔍 Zentrix AI: User has', userOrgRoleIds.length, 'org role(s)');

  // For managers/directors: get all users in their reporting hierarchy
  let reportingUserIds: string[] = [];
  let reportingTeamIds: string[] = [];

  if (['manager', 'director', 'super_admin'].includes(userPermissionLevel)) {
    logger.log('👥 User is', userPermissionLevel, '- calculating reporting scope...');
    
    // Get all roles that report to user's role(s)
    const reportingRoleIds = getAllReportingRoles(userOrgRoleIds, orgRoles || []);
    logger.log('👥 Found', reportingRoleIds.length, 'roles in reporting hierarchy');
    
    if (reportingRoleIds.length > 0) {
      // Get users assigned to those reporting roles
      const { data: reportingAssignments } = await supabase
        .from('role_assignments')
        .select('user_id')
        .in('role_id', reportingRoleIds);
      
      reportingUserIds = [...new Set((reportingAssignments || []).map(ra => ra.user_id))];
      logger.log('👥 Found', reportingUserIds.length, 'users in reporting hierarchy');
      
      // Get teams of all users in reporting hierarchy
      if (reportingUserIds.length > 0) {
        const { data: reportingTeamMembers } = await supabase
          .from('team_members')
          .select('team_id')
          .in('user_id', reportingUserIds);
        
        reportingTeamIds = [...new Set((reportingTeamMembers || []).map(tm => tm.team_id))];
        logger.log('👥 Reports are on', reportingTeamIds.length, 'team(s)');
      }
    }
  }

  // SECURITY: Filter teams based on organizational scope
  const accessibleTeams = (allCompanyTeams || []).filter(team => {
    // 1. Super admins see everything
    if (userPermissionLevel === 'super_admin') {
      logger.log('✅ Super admin access - including team:', team.name);
      return true;
    }
    
    // 2. User is directly on the team (member, manager, director)
    if (teamIds.includes(team.id)) {
      logger.log('✅ Team access (direct member):', team.name);
      return true;
    }
    
    // 3. User manages someone on this team (manager/director only)
    if (reportingTeamIds.includes(team.id)) {
      logger.log('✅ Team access (manages team member):', team.name);
      return true;
    }
    
    // Otherwise: not in user's scope
    logger.log('🔒 Filtering out team:', team.name, '(not in scope)');
    return false;
  });

  const companyTeamIds = accessibleTeams.map(t => t.id);
  const companyTeams = accessibleTeams; // Keep full objects for issue matching
  logger.log('🔍 Zentrix AI: User scope includes', companyTeamIds.length, 'of', allCompanyTeams?.length || 0, 'company teams');
  logger.log('🔍 Zentrix AI: Scope breakdown - Direct teams:', teamIds.length, ', Reporting hierarchy teams:', reportingTeamIds.length);
  
  if ((allCompanyTeams?.length || 0) > companyTeamIds.length) {
    logger.log('🔒 Filtered out', (allCompanyTeams?.length || 0) - companyTeamIds.length, 'leadership team(s) - not in user scope');
  }

  // Fetch role assignments (who occupies each role)
  const roleIds = (orgRoles || []).map(r => r.id);
  let roleAssignments: any[] = [];

  if (roleIds.length > 0) {
    const { data: assignments } = await supabase
      .from('role_assignments')
      .select(`
        role_id,
        user_id,
        profiles!inner(full_name, email, avatar_url, role)
      `)
      .in('role_id', roleIds)
      .neq('profiles.role', 'inactive');

    roleAssignments = assignments || [];
    logger.log('🔍 Zentrix AI: Fetched', roleAssignments.length, 'role assignments for org chart');
  }

  // Build org chart hierarchy map
  const orgChartMap = new Map();
  const childCountMap = new Map<string, number>();

  // First pass: count direct reports
  (orgRoles || []).forEach(role => {
    if (role.reports_to_role_id) {
      childCountMap.set(
        role.reports_to_role_id,
        (childCountMap.get(role.reports_to_role_id) || 0) + 1
      );
    }
  });

  // Second pass: build full org chart with all data
  (orgRoles || []).forEach(role => {
    // Find person assigned to this role
    const assignment = roleAssignments.find(a => a.role_id === role.id);
    const profileData = assignment?.profiles;
    
    // Find manager (reports_to) info
    let reportsTo = null;
    if (role.reports_to_role_id) {
      const managerRole = (orgRoles || []).find(r => r.id === role.reports_to_role_id);
      const managerAssignment = roleAssignments.find(a => a.role_id === role.reports_to_role_id);
      
      if (managerRole) {
        reportsTo = {
          role_title: managerRole.title,
          person_name: managerAssignment?.profiles?.full_name || 'Vacant'
        };
      }
    }
    
    // Parse responsibilities (stored as string, could be newline-separated)
    const responsibilities = role.responsibilities 
      ? role.responsibilities.split('\n').filter((r: string) => r.trim())
      : [];
    
    // Calculate hierarchy level (0 = top, increases with depth)
    let level = 0;
    let currentRoleId = role.reports_to_role_id;
    while (currentRoleId) {
      level++;
      const parentRole = (orgRoles || []).find(r => r.id === currentRoleId);
      currentRoleId = parentRole?.reports_to_role_id;
    }
    
    orgChartMap.set(role.id, {
      id: role.id,
      title: role.title,
      person_assigned: profileData ? {
        name: profileData.full_name,
        email: profileData.email,
        avatar_url: profileData.avatar_url
      } : null,
      responsibilities,
      reports_to: reportsTo,
      direct_reports_count: childCountMap.get(role.id) || 0,
      level
    });
  });

  // Sort org chart by hierarchy level, then by title
  const orgChartData = Array.from(orgChartMap.values()).sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.title.localeCompare(b.title);
  });

  logger.log('✅ Zentrix AI: Org chart loaded:', orgChartData.length, 'roles');

  // Get current week metrics using user's week start preference
  const weekStartStr = getCurrentWeekStart(weekStartDay);
  const currentWeekStart = new Date(weekStartStr); // For use in subsequent calculations
  logger.log('🔍 Zentrix AI: Current week start:', weekStartStr);

  // Calculate 3 weeks ago threshold for filtering stale metrics
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
  const threeWeeksAgoStr = threeWeeksAgo.toISOString().split('T')[0];

  let currentMetrics = null;
  try {
    if (relevantUserIds.length > 0 && companyTeamIds.length > 0) {
      const { data } = await supabase
        .from('weekly_metrics')
        .select(`
          metric_name,
          metric_value,
          target_value,
          unit,
          target_logic,
          week_start_date,
          updated_at,
          owner_id,
          profiles!owner_id (full_name),
          teams!team_id (name)
        `)
        .in('owner_id', relevantUserIds)
        .in('team_id', companyTeamIds)
        .eq('week_start_date', weekStartStr)
        .gte('updated_at', threeWeeksAgoStr)
        .is('deleted_at', null)
        .limit(50);
      currentMetrics = data;
    } else if (companyTeamIds.length === 0) {
      logger.warn('⚠️ Zentrix AI: No teams found for company, skipping current metrics fetch');
      currentMetrics = [];
    }
  } catch (error) {
    logger.error('🔍 Zentrix AI: Error fetching weekly metrics:', error);
    currentMetrics = [];
  }

  const metricsWithStatus = (currentMetrics || []).map(metric => {
    // Preserve NULL values - don't convert to 0
    const value = metric.metric_value;
    const target = metric.target_value;
    const logic = metric.target_logic || 'greater_than_or_equal';
    
    let status: 'green' | 'yellow' | 'red' = 'red';
    
    // Only calculate status if both value and target exist
    if (value !== null && value !== undefined && target !== null && target !== undefined && target > 0) {
      const percentage = (value / target) * 100;
      if (logic === 'greater_than_or_equal') {
        status = percentage >= 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';
      } else if (logic === 'less_than_or_equal') {
        status = percentage <= 100 ? 'green' : percentage <= 120 ? 'yellow' : 'red';
      }
    }

    return {
      name: metric.metric_name,
      value,
      target,
      status,
      owner: (metric.profiles as any)?.full_name || 'Unassigned',
      team: (metric.teams as any)?.name || 'Unknown',
      weekStart: metric.week_start_date
    };
  });

  // Calculate week start dates for historical comparisons using user's week start preference
  const oneWeekAgo = new Date(currentWeekStart);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = getWeekStart(oneWeekAgo, weekStartDay).toISOString().split('T')[0];

  const fourWeeksAgo = new Date(currentWeekStart);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksAgoStr = getWeekStart(fourWeeksAgo, weekStartDay).toISOString().split('T')[0];

  const thirteenWeeksAgo = new Date(currentWeekStart);
  thirteenWeeksAgo.setDate(thirteenWeeksAgo.getDate() - 91);
  const thirteenWeeksAgoStr = getWeekStart(thirteenWeeksAgo, weekStartDay).toISOString().split('T')[0];

  const fiftyTwoWeeksAgo = new Date(currentWeekStart);
  fiftyTwoWeeksAgo.setDate(fiftyTwoWeeksAgo.getDate() - 364);
  const fiftyTwoWeeksAgoStr = getWeekStart(fiftyTwoWeeksAgo, weekStartDay).toISOString().split('T')[0];

  logger.log('🔍 Zentrix AI: Historical week starts:', {
    oneWeekAgo: oneWeekAgoStr,
    fourWeeksAgo: fourWeeksAgoStr,
    thirteenWeeksAgo: thirteenWeeksAgoStr,
    fiftyTwoWeeksAgo: fiftyTwoWeeksAgoStr
  });

  // Fetch historical data (last 52 weeks for comprehensive analysis)
  let historicalMetrics = null;
  try {
    if (relevantUserIds.length > 0 && companyTeamIds.length > 0) {
      const { data } = await supabase
        .from('weekly_metrics')
        .select(`
          metric_name,
          metric_value,
          target_value,
          target_logic,
          week_start_date,
          updated_at,
          owner_id,
          profiles!owner_id (full_name),
          teams!team_id (name)
        `)
        .in('owner_id', relevantUserIds)
        .in('team_id', companyTeamIds)
      .gte('week_start_date', fiftyTwoWeeksAgoStr)
      .is('deleted_at', null)
        .order('metric_name', { ascending: true })
        .order('week_start_date', { ascending: true })
        .limit(2000);
      historicalMetrics = data;
    } else if (companyTeamIds.length === 0) {
      logger.warn('⚠️ Zentrix AI: No teams found for company, skipping historical metrics fetch');
      historicalMetrics = [];
    }
  } catch (error) {
    logger.error('🔍 Zentrix AI: Error fetching historical metrics:', error);
    historicalMetrics = [];
  }

  // Build simplified metrics map - store ALL weeks
  interface MetricHistory {
    name: string;
    owner_id: string;
    owner_name: string;
    team_name: string;
    allWeeks: Array<{
      value: number | null;
      target: number | null;
      logic: string;
      weekStart: string;
      updatedAt: string;
      status: 'green' | 'yellow' | 'red';
    }>;
  }

  const metricsHistoryMap = new Map<string, MetricHistory>();

  // Helper to calculate status for historical metrics
  const getMetricStatus = (value: number | null, target: number | null, logic: string | null): 'green' | 'yellow' | 'red' => {
    // If no data entered, return red
    if (value === null || value === undefined || target === null || target === undefined || target === 0) {
      return 'red';
    }
    
    const percentage = (value / target) * 100;
    const targetLogic = logic || 'greater_than_or_equal';
    
    if (targetLogic === 'greater_than_or_equal') {
      return percentage >= 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';
    } else if (targetLogic === 'less_than_or_equal') {
      return percentage <= 100 ? 'green' : percentage <= 120 ? 'yellow' : 'red';
    }
    return 'red';
  };

  // Group by metric name and owner, store ALL weeks
  (historicalMetrics || []).forEach(metric => {
    const key = `${metric.metric_name}-${metric.owner_id}`;
    
    if (!metricsHistoryMap.has(key)) {
      metricsHistoryMap.set(key, {
        name: metric.metric_name,
        owner_id: metric.owner_id,
        owner_name: (metric.profiles as any)?.full_name || 'Unassigned',
        team_name: (metric.teams as any)?.name || 'Unknown',
        allWeeks: []
      });
    }
    
    const history = metricsHistoryMap.get(key)!;
    const status = getMetricStatus(metric.metric_value, metric.target_value, metric.target_logic);
    
    // Add this week's data to the array
    history.allWeeks.push({
      value: metric.metric_value,
      target: metric.target_value,
      logic: metric.target_logic || 'greater_than_or_equal',
      weekStart: metric.week_start_date,
      updatedAt: metric.updated_at,
      status
    });
  });

  // Sort weeks newest first for each metric
  metricsHistoryMap.forEach(history => {
    history.allWeeks.sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
  });


  // Debug logging for metrics history
  logger.log('📊 Metrics History Map:', {
    totalMetrics: metricsHistoryMap.size,
    sample: Array.from(metricsHistoryMap.values()).slice(0, 2).map(m => ({
      name: m.name,
      owner: m.owner_name,
      team: m.team_name,
      weekCount: m.allWeeks.length,
      mostRecent: m.allWeeks[0]?.weekStart
    }))
  });

  // Keep minimal trends for backward compatibility
  const trends = Array.from(metricsHistoryMap.values())
    .filter(h => h.allWeeks.length >= 2)
    .map(h => {
      const recent = h.allWeeks[0];
      const previous = h.allWeeks[1];
      const changePercent = previous.value && previous.value !== 0
        ? ((recent.value ?? 0) - previous.value) / previous.value * 100
        : 0;
      return {
        name: h.name,
        trend: (changePercent > 5 ? 'improving' : changePercent < -5 ? 'declining' : 'stable') as 'improving' | 'declining' | 'stable',
        changePercent
      };
    });

  // Get team goals (rocks) for visible users
  let teamGoals = null;
  try {
    if (companyTeamIds.length > 0) {
    const { data, error, status } = await supabase
      .from('team_goals')
      .select(`
        title,
        status,
        progress,
        target_date,
        team_id,
        owner_id,
        profiles!team_goals_owner_id_fkey (full_name),
        teams!team_id (id, name)
      `)
      .in('team_id', companyTeamIds)
      .eq('is_company_goal', false)
      .or('archived.is.null,archived.eq.false')
      .or('is_deleted.is.null,is_deleted.eq.false')
      .limit(50);
      
      teamGoals = data;
    } else if (companyTeamIds.length === 0) {
      logger.warn('⚠️ Zentrix AI: No teams found for company, skipping team goals fetch');
      teamGoals = [];
    }
  } catch (error) {
    logger.error('🔍 Zentrix AI: Error fetching team goals:', error);
    teamGoals = [];
  }

  const rocks = (teamGoals || []).map(goal => ({
    title: goal.title,
    status: goal.status,
    progress: goal.progress || 0,
    owner: (goal.profiles as any)?.full_name || 'Unassigned',
    team: (goal.teams as any)?.name || 'Unknown',
    teamId: goal.team_id,
    dueDate: goal.target_date
  }));

  // Get strategic plans
  const { data: strategicPlans } = await supabase
    .from('strategic_plans')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get company-level annual metrics
  const { data: companyMetrics } = await supabase
    .from('company_annual_metrics')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Helper function to calculate metric status
  const calculateMetricStatus = (currentValue: number | null, targetValue: number | null, targetLogic: string | null): 'green' | 'yellow' | 'red' => {
    if (currentValue === null || targetValue === null) return 'yellow';
    
    switch (targetLogic) {
      case 'greater_than_or_equal':
        if (currentValue >= targetValue) return 'green';
        if (currentValue >= targetValue * 0.8) return 'yellow';
        return 'red';
      case 'less_than_or_equal':
        if (currentValue <= targetValue) return 'green';
        if (currentValue <= targetValue * 1.2) return 'yellow';
        return 'red';
      case 'equal':
        if (currentValue === targetValue) return 'green';
        if (Math.abs(currentValue - targetValue) / targetValue <= 0.1) return 'yellow';
        return 'red';
      default:
        return 'yellow';
    }
  };

  // Get tasks
  const today = new Date();
  
  const { data: personalTasks } = await supabase
    .from('fast_tasks')
    .select('title, status, due_date')
    .eq('user_id', userId)
    .eq('task_type', 'personal')
    .eq('company_id', companyId)
    .eq('is_archived', false);

  const { data: teamTasks } = await supabase
    .from('fast_tasks')
    .select(`
      title,
      status,
      due_date,
      assigned_to,
      user_id,
      teams!team_id (name)
    `)
    .eq('task_type', 'team')
    .eq('company_id', companyId)
    .eq('is_archived', false)
    .or(`user_id.in.(${relevantUserIds.join(',')}),assigned_to.ov.{${relevantUserIds.join(',')}}`);

  // Filter out completed tasks and tasks overdue by more than 60 days
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const filterTasks = (tasks: any[] | null) => {
    if (!tasks) return [];
    return tasks.filter(task => {
      // Remove completed tasks
      if (task.status === 'done') return false;
      
      // Remove tasks overdue by more than 60 days
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        if (dueDate < sixtyDaysAgo) {
          logger.log(`🧹 Filtering out old overdue task: "${task.title}" (due: ${task.due_date})`);
          return false;
        }
      }
      
      return true;
    });
  };
  
  const filteredPersonalTasks = filterTasks(personalTasks);
  const filteredTeamTasks = filterTasks(teamTasks);

  // Get issues for all accessible teams (no owner_id filter for team-level data)
  let issues = null;
  try {
    if (companyTeamIds.length > 0) {
      const { data, error, status } = await supabase
        .from('issues')
        .select(`
          id,
          team_id,
          title,
          issue_type,
          created_at,
          owner_id,
          created_by,
          profiles!issues_created_by_fkey (full_name),
          teams!team_id (name)
        `)
        .in('team_id', companyTeamIds)
        .eq('status', 'open')
        .neq('archived', true)
        .limit(100);
      
      issues = data;
    } else {
      logger.warn('⚠️ Zentrix AI: No teams found for company, skipping issues fetch');
      issues = [];
    }
  } catch (error) {
    logger.error('🔍 Zentrix AI: Error fetching issues:', error);
    issues = [];
  }

  // Get people analyzer data for visible users only (active users in cascade)
  // Fetch all scores with created_at, then keep only latest per (user_id, score_type, core_value_name)
  const { data: allPeopleScores } = await supabase
    .from('people_analyzer_scores')
    .select(`
      user_id,
      score_type,
      score_value,
      core_value_name,
      created_at,
      profiles!user_id (full_name)
    `)
    .eq('company_id', companyId)
    .in('user_id', relevantUserIds)
    .order('created_at', { ascending: false });

  // Group by user + score_type + core_value and keep only latest
  const latestScoresMap = new Map<string, any>();
  (allPeopleScores || []).forEach(score => {
    const key = `${score.user_id}-${score.score_type}-${score.core_value_name || 'null'}`;
    if (!latestScoresMap.has(key)) {
      latestScoresMap.set(key, score);
    }
  });

  const peopleScores = Array.from(latestScoresMap.values());

  const analyzerScores = peopleScores.map(score => ({
    userName: (score.profiles as any)?.full_name || 'Unknown',
    scoreType: score.score_type,
    scoreValue: score.score_value,
    status: score.score_value === '+' ? 'above_bar' : score.score_value === '+/-' ? 'at_bar' : 'below_bar',
    coreValueName: score.core_value_name
  }));

  const belowBarCount = analyzerScores.filter(s => s.status === 'below_bar').length;

  // Build hierarchical data structure based on viewContext
  logger.log('🎯 Building hierarchical context for scope:', viewContext);

  // COMPANY LEVEL DATA - Extract from plan_data JSONB
  const planData = strategicPlans?.plan_data || {};
  const companyData = {
    id: company?.id || companyId,
    name: company?.name || 'Unknown Company',
    strategy: {
      // Foundation
      purpose: planData.purpose,
      core_values: planData.coreValues?.map((cv: any) => ({
        id: cv.id?.toString() || '',
        value: cv.value || '',
        explanation: cv.explanation
      })),
      long_term_objective: planData.longTermObjective,
      long_term_timeframe: planData.longTermTimeframe,
      niche: planData.niche,
      unique_edge: planData.uniqueEdge,
      
      // 3-Year Vision
      three_year_milestones: planData.threeYearMilestones ? {
        key_descriptors: planData.threeYearMilestones.keyDescriptors,
        revenue: planData.threeYearMilestones.revenue,
        profit: planData.threeYearMilestones.profit,
        team_size: planData.threeYearMilestones.teamSize,
        what_it_looks_like: planData.threeYearMilestones.whatItLooksLike
      } : undefined,
      
      // Marketing Strategy
      marketing: planData.marketing ? {
        target_market: planData.marketing.targetMarket,
        competitive_advantages: planData.marketing.competitiveAdvantages,
        guarantee: planData.marketing.guarantee,
        process: planData.marketing.process
      } : undefined,
      target_customer: planData.targetCustomer ? {
        demographics: planData.targetCustomer.demographics,
        psychographics: planData.targetCustomer.psychographics,
        behavior: planData.targetCustomer.behavior
      } : undefined,
      
      // Goals
      yearly_goals: planData.yearlyGoals?.map((goal: any) => ({
        id: goal.id?.toString() || '',
        text: goal.text || '',
        completed: goal.completed || false
      })),
      quarterly_priorities: planData.quarterlyPriorities,
      
      // 1-Year Execution Goals
      one_year_goals: planData.oneYearGoals ? {
        revenue: planData.oneYearGoals.revenue,
        profit: planData.oneYearGoals.profit,
        metricTargets: planData.oneYearGoals.metricTargets?.map((target: any) => ({
          id: target.id?.toString() || '',
          name: target.name || '',
          target: target.target || '',
          unit: target.unit
        }))
      } : undefined,
      
      // Quarterly Execution Goals
      quarterly_goals: planData.quarterlyGoals ? {
        revenue: planData.quarterlyGoals.revenue,
        profit: planData.quarterlyGoals.profit,
        metricTargets: planData.quarterlyGoals.metricTargets?.map((target: any) => ({
          id: target.id?.toString() || '',
          name: target.name || '',
          target: target.target || '',
          unit: target.unit
        }))
      } : undefined,
      
      // SWOT Analysis
      swot_analysis: strategicPlans?.swot_data ? {
        strengths: strategicPlans.swot_data.strengths?.map((item: any) => ({
          id: item.id?.toString() || '',
          text: item.text || ''
        })),
        weaknesses: strategicPlans.swot_data.weaknesses?.map((item: any) => ({
          id: item.id?.toString() || '',
          text: item.text || ''
        })),
        opportunities: strategicPlans.swot_data.opportunities?.map((item: any) => ({
          id: item.id?.toString() || '',
          text: item.text || ''
        })),
        threats: strategicPlans.swot_data.threats?.map((item: any) => ({
          id: item.id?.toString() || '',
          text: item.text || ''
        }))
      } : undefined,
      
      // Execution
      team_alignment: planData.teamAlignment,
      issues: planData.issues
    },
    annual_metrics: (companyMetrics || []).map(metric => ({
      name: metric.metric_name,
      value: metric.current_value || 0,
      target: metric.target_value || 0,
      status: calculateMetricStatus(metric.current_value, metric.target_value, metric.target_logic)
    }))
  };

  // TEAM LEVEL DATA - Group by team
  const teamsMap = new Map<string, any>();
  
  // Initialize teams with ALL company teams (not just user's teams)
  companyTeams.forEach(team => {
    teamsMap.set(team.id, {
      id: team.id,
      name: team.name,
      member_count: 0,
      quarterly_goals: [],
      metrics: [],
      issues: []
    });
  });

  logger.log('🔍 Teams populated in map:', {
    teamsCount: teamsMap.size,
    teams: Array.from(teamsMap.values()).map(t => ({ 
      id: t.id, 
      name: t.name 
    }))
  });

  // Populate team metrics using most recent available data
  metricsHistoryMap.forEach(history => {
    // Skip if no data at all
    if (history.allWeeks.length === 0) return;
    
    // Find team by name from historical data
    const team = teams.find(t => t.name === history.team_name);
    if (!team || !teamsMap.has(team.id)) return;
    
    // Use most recent week (already sorted newest first)
    const mostRecent = history.allWeeks[0];
    
    // Calculate weeks ago
    const mostRecentDate = new Date(mostRecent.weekStart);
    const weeksDiff = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    
    // Skip metrics with data older than 4 weeks
    if (weeksDiff > 4) {
      logger.log(`⏭️ Skipping old metric: ${history.name} - Last data from ${weeksDiff} weeks ago`);
      return;
    }
    
    // Get historical weeks for comparison
    const lastWeek = history.allWeeks.length > 1 ? history.allWeeks[1] : null;
    const fourWeeksAgoData = history.allWeeks.find(w => w.weekStart === fourWeeksAgoStr);
    const thirteenWeeksAgoData = history.allWeeks.find(w => w.weekStart === thirteenWeeksAgoStr);
    const fiftyTwoWeeksAgoData = history.allWeeks.find(w => w.weekStart === fiftyTwoWeeksAgoStr);
    
    // Calculate comparison to previous week
    let vsLastWeek = null;
    if (lastWeek && mostRecent.value !== null && lastWeek.value !== null) {
      const change = mostRecent.value - lastWeek.value;
      vsLastWeek = {
        change,
        changePercent: lastWeek.value !== 0 ? (change / lastWeek.value) * 100 : 0,
        improving: change > 0
      };
    }
    
    // Calculate comparison to 4 weeks ago
    let vsFourWeeks = null;
    if (fourWeeksAgoData && mostRecent.value !== null && fourWeeksAgoData.value !== null) {
      const change = mostRecent.value - fourWeeksAgoData.value;
      vsFourWeeks = {
        change,
        changePercent: fourWeeksAgoData.value !== 0 ? (change / fourWeeksAgoData.value) * 100 : 0,
        improving: change > 0
      };
    }
    
    // Calculate comparison to 13 weeks ago
    let vsThirteenWeeks = null;
    if (thirteenWeeksAgoData && mostRecent.value !== null && thirteenWeeksAgoData.value !== null) {
      const change = mostRecent.value - thirteenWeeksAgoData.value;
      vsThirteenWeeks = {
        change,
        changePercent: thirteenWeeksAgoData.value !== 0 ? (change / thirteenWeeksAgoData.value) * 100 : 0,
        improving: change > 0
      };
    }
    
    // Calculate comparison to 52 weeks ago (1 year)
    let vsFiftyTwoWeeks = null;
    if (fiftyTwoWeeksAgoData && mostRecent.value !== null && fiftyTwoWeeksAgoData.value !== null) {
      const change = mostRecent.value - fiftyTwoWeeksAgoData.value;
      vsFiftyTwoWeeks = {
        change,
        changePercent: fiftyTwoWeeksAgoData.value !== 0 ? (change / fiftyTwoWeeksAgoData.value) * 100 : 0,
        improving: change > 0
      };
    }
    
    teamsMap.get(team.id).metrics.push({
      name: history.name,
      value: mostRecent.value, // Preserve NULL values
      target: mostRecent.target, // Preserve NULL values
      status: mostRecent.status,
      owner: history.owner_name,
      weekStart: mostRecent.weekStart,
      lastUpdated: mostRecent.updatedAt,
      history: {
        lastWeek: lastWeek ? {
          value: lastWeek.value,
          status: lastWeek.status
        } : null,
        fourWeeksAgo: fourWeeksAgoData ? {
          value: fourWeeksAgoData.value,
          status: fourWeeksAgoData.status
        } : null,
        thirteenWeeksAgo: thirteenWeeksAgoData ? {
          value: thirteenWeeksAgoData.value,
          status: thirteenWeeksAgoData.status
        } : null,
        fiftyTwoWeeksAgo: fiftyTwoWeeksAgoData ? {
          value: fiftyTwoWeeksAgoData.value,
          status: fiftyTwoWeeksAgoData.status
        } : null
      },
      comparisons: {
        vsLastWeek,
        vsFourWeeks,
        vsThirteenWeeks,
        vsFiftyTwoWeeks
      }
    });
  });

  // Populate team goals
  rocks.forEach(rock => {
    if (rock.teamId && teamsMap.has(rock.teamId)) {
      teamsMap.get(rock.teamId).quarterly_goals.push({
        title: rock.title,
        status: rock.status,
        progress: rock.progress,
        owner: rock.owner,
        dueDate: rock.dueDate
      });
    }
  });

  // Populate team issues
  (issues || []).forEach(issue => {
    logger.debug('Matching issue:', {
      issueTitle: issue.title,
      issueTeamId: issue.team_id,
      hasTeamInMap: teamsMap.has(issue.team_id)
    });
    
    const createdAt = new Date(issue.created_at);
    const daysOpen = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const team = companyTeams.find(t => t.id === issue.team_id);
    
    if (team && teamsMap.has(team.id)) {
      teamsMap.get(team.id).issues.push({
        title: issue.title,
        type: issue.issue_type,
        owner: (issue.profiles as any)?.full_name || 'Unassigned',
        daysOpen
      });
    }
  });

  logger.log('🔍 Zentrix AI: Teams with issues:', 
    Array.from(teamsMap.values())
      .filter(t => t.issues.length > 0)
      .map(t => ({ name: t.name, issuesCount: t.issues.length }))
  );


  // SEAT LEVEL DATA
  const seats = teams.map(team => {
    const userMetrics = metricsWithStatus.filter(m => m.team === team.name);
    const userRocks = rocks.filter(r => r.team === team.name);
    
    return {
      title: `${userPermissionLevel} - ${team.name}`,
      team: team.name,
      owner: profile?.full_name || 'Unknown',
      user_role: userPermissionLevel,
      responsibilities: userRole ? [`Manages ${relevantUserIds.length - 1} subordinate${relevantUserIds.length === 2 ? '' : 's'}`] : [],
      metrics_owned: userMetrics.map(m => ({
        name: m.name,
        value: m.value,
        target: m.target,
        status: m.status
      })),
      goals_owned: userRocks.map(r => ({
        title: r.title,
        status: r.status,
        progress: r.progress,
        dueDate: r.dueDate
      }))
    };
  });

  // INDIVIDUAL LEVEL DATA
  const individualData = {
    personal_tasks: filteredPersonalTasks.map(task => ({
      title: task.title,
      status: task.status,
      dueDate: task.due_date,
      isOverdue: task.due_date ? new Date(task.due_date) < today && task.status !== 'completed' : false
    })),
    assigned_tasks: filteredTeamTasks.map(task => ({
      title: task.title,
      status: task.status,
      team: (task.teams as any)?.name || 'Unknown',
      isOverdue: task.due_date ? new Date(task.due_date) < today && task.status !== 'completed' : false,
      dueDate: task.due_date
    }))
  };

  // Filter hierarchy based on active scope
  let filteredTeams = Array.from(teamsMap.values());
  let filteredSeats = seats;

  if (viewContext === 'team' && entityId) {
    // Only include data for specific team
    filteredTeams = filteredTeams.filter(t => t.id === entityId);
    filteredSeats = seats.filter(s => {
      const team = teams.find(t => t.name === s.team);
      return team?.id === entityId;
    });
    logger.log('🔍 Filtered to team:', entityId, 'Teams:', filteredTeams.length, 'Seats:', filteredSeats.length);
  }

  const entityName = viewContext === 'team' && entityId 
    ? teams.find(t => t.id === entityId)?.name 
    : undefined;

  logger.log('✅ Context built with scope:', viewContext, 'Teams:', filteredTeams.length, 'Seats:', filteredSeats.length);

  return {
    active_scope: {
      level: viewContext,
      entity_id: entityId,
      entity_name: entityName
    },
    current_user: {
      id: userId,
      fullName: profile?.full_name || 'Unknown',
      email: profile?.email || '',
      permissionLevel: membership?.permission_level || 'member',
      role: profile?.role || 'user',
      can_see_user_ids: relevantUserIds
    },
    hierarchy: {
      company: companyData,
      org_chart: orgChartData,
      teams: filteredTeams,
      seats: filteredSeats,
      individual: individualData
    },
    people_analyzer: analyzerScores,
    trends
  };
};

export const formatZentrixContextForAI = (context: ZentrixAIContext): string => {
  // Use the same well-structured markdown format for AI
  return formatZentrixContextForHuman(context);
};

export const formatZentrixContextByCategoryForHuman = (context: ZentrixAIContext): string => {
  try {
    const statusIcon = (status: 'green' | 'yellow' | 'red') => {
      switch (status) {
        case 'green': return '✅';
        case 'yellow': return '⚠️';
        case 'red': return '❌';
      }
    };

    let output = '';

    // Header
    output += '# ZENTRIX AI CONTEXT - BY CATEGORY\n\n';
    
    // Active Scope
    output += '## 📍 Active Scope\n';
    output += `**Level:** ${context.active_scope.level}\n`;
    if (context.active_scope.entity_name) {
      output += `**Entity:** ${context.active_scope.entity_name}\n`;
    }
    output += '\n---\n\n';

    // Current User
    output += '## 👤 Current User Context\n';
    output += `**Name:** ${context.current_user.fullName}\n`;
    output += `**Email:** ${context.current_user.email}\n`;
    output += `**Role:** ${context.current_user.role}\n`;
    output += `**Permission Level:** ${context.current_user.permissionLevel}\n`;
    output += `**Visible Users:** ${context.current_user.can_see_user_ids.length}\n`;
    output += '\n---\n\n';

    // === /STRATEGY ===
    const company = context.hierarchy.company;
    const strategy = company.strategy;
    output += '## 🎯 /strategy - Company Strategy\n\n';
    output += `**Company:** ${company.name}\n\n`;

    if (strategy.purpose) {
      output += '### Purpose\n';
      output += `${strategy.purpose}\n\n`;
    }

    if (strategy.core_values && strategy.core_values.length > 0) {
      output += '### Core Values\n';
      strategy.core_values.forEach(cv => {
        output += `• **${cv.value}**`;
        if (cv.explanation) output += ` - ${cv.explanation}`;
        output += '\n';
      });
      output += '\n';
    }

    if (strategy.long_term_objective) {
      output += '### Long-Term Objective\n';
      output += `${strategy.long_term_objective}`;
      if (strategy.long_term_timeframe) {
        output += ` (${strategy.long_term_timeframe} years)`;
      }
      output += '\n\n';
    }

    if (strategy.niche) {
      output += '### Niche\n';
      output += `${strategy.niche}\n\n`;
    }

    if (strategy.unique_edge) {
      output += '### Unique Edge\n';
      output += `${strategy.unique_edge}\n\n`;
    }

    // 3-Year Vision
    if (strategy.three_year_milestones) {
      const milestones = strategy.three_year_milestones;
      output += '### 3-Year Vision\n';
      if (milestones.key_descriptors) output += `**Key Descriptors:** ${milestones.key_descriptors}\n`;
      if (milestones.revenue) output += `**Revenue Target:** ${milestones.revenue}\n`;
      if (milestones.profit) output += `**Profit Target:** ${milestones.profit}\n`;
      if (milestones.team_size) output += `**Team Size:** ${milestones.team_size}\n`;
      if (milestones.what_it_looks_like && milestones.what_it_looks_like.length > 0) {
        output += '**What it looks like:**\n';
        milestones.what_it_looks_like.forEach(item => output += `  • ${item}\n`);
      }
      output += '\n';
    }

    // Marketing Strategy
    if (strategy.marketing) {
      const marketing = strategy.marketing;
      output += '### Marketing Strategy\n';
      if (marketing.target_market) output += `**Target Market:** ${marketing.target_market}\n`;
      if (marketing.competitive_advantages && marketing.competitive_advantages.length > 0) {
        output += '**Competitive Advantages:**\n';
        marketing.competitive_advantages.forEach(adv => output += `  • ${adv}\n`);
      }
      if (marketing.guarantee) output += `**Guarantee:** ${marketing.guarantee}\n`;
      if (marketing.process) output += `**Process:** ${marketing.process}\n`;
      output += '\n';
    }

    // Yearly & Quarterly Goals from strategy
    if (strategy.yearly_goals && strategy.yearly_goals.length > 0) {
      output += '### Yearly Goals\n';
      strategy.yearly_goals.forEach(goal => {
        output += `  • ${goal.text} ${goal.completed ? '✅' : '⏳'}\n`;
      });
      output += '\n';
    }

    if (strategy.one_year_goals) {
      const goals = strategy.one_year_goals;
      output += '### 1-Year Execution Goals\n';
      if (goals.revenue) output += `**Revenue:** ${goals.revenue}\n`;
      if (goals.profit) output += `**Profit:** ${goals.profit}\n`;
      if (goals.metricTargets && goals.metricTargets.length > 0) {
        output += '**Metric Targets:**\n';
        goals.metricTargets.forEach(m => output += `  • ${m.name}: ${m.target}${m.unit ? ` ${m.unit}` : ''}\n`);
      }
      output += '\n';
    }

    if (strategy.quarterly_goals) {
      const goals = strategy.quarterly_goals;
      output += '### Quarterly Execution Goals\n';
      if (goals.revenue) output += `**Revenue:** ${goals.revenue}\n`;
      if (goals.profit) output += `**Profit:** ${goals.profit}\n`;
      if (goals.metricTargets && goals.metricTargets.length > 0) {
        output += '**Metric Targets:**\n';
        goals.metricTargets.forEach(m => output += `  • ${m.name}: ${m.target}${m.unit ? ` ${m.unit}` : ''}\n`);
      }
      output += '\n';
    }

    // SWOT Analysis
    if (strategy.swot_analysis) {
      const swot = strategy.swot_analysis;
      output += '### SWOT Analysis\n';
      if (swot.strengths && swot.strengths.length > 0) {
        output += '**Strengths:**\n';
        swot.strengths.forEach(s => output += `  • ${s.text}\n`);
      }
      if (swot.weaknesses && swot.weaknesses.length > 0) {
        output += '**Weaknesses:**\n';
        swot.weaknesses.forEach(w => output += `  • ${w.text}\n`);
      }
      if (swot.opportunities && swot.opportunities.length > 0) {
        output += '**Opportunities:**\n';
        swot.opportunities.forEach(o => output += `  • ${o.text}\n`);
      }
      if (swot.threats && swot.threats.length > 0) {
        output += '**Threats:**\n';
        swot.threats.forEach(t => output += `  • ${t.text}\n`);
      }
      output += '\n';
    }

    // Company Annual Metrics
    if (company.annual_metrics && company.annual_metrics.length > 0) {
      output += '### Annual Metrics\n';
      company.annual_metrics.forEach(metric => {
        const valueDisplay = metric.value === null || metric.value === undefined ? 'no data entered' : `${metric.value}`;
        const targetDisplay = metric.target === null || metric.target === undefined ? 'no target' : `${metric.target}`;
        output += `• **${metric.name}:** ${valueDisplay} / ${targetDisplay} ${statusIcon(metric.status)}\n`;
      });
      output += '\n';
    }

    output += '\n---\n\n';

    // === /ORG-CHART ===
    if (context.hierarchy.org_chart && context.hierarchy.org_chart.length > 0) {
      output += '## 🏢 /org-chart - Organizational Structure\n\n';
      
      // Group by hierarchy level
      const levelMap = new Map<number, any[]>();
      context.hierarchy.org_chart.forEach(role => {
        if (!levelMap.has(role.level)) levelMap.set(role.level, []);
        levelMap.get(role.level)!.push(role);
      });
      
      // Display each level
      const sortedLevels = Array.from(levelMap.keys()).sort((a, b) => a - b);
      sortedLevels.forEach(level => {
        const roles = levelMap.get(level)!;
        
        roles.forEach(role => {
          const personInfo = role.person_assigned 
            ? `${role.person_assigned.name}` 
            : '👤 Vacant';
          
          output += `### ${role.title}\n`;
          output += `**Occupied by:** ${personInfo}\n`;
          
          if (role.reports_to) {
            output += `**Reports to:** ${role.reports_to.person_name} (${role.reports_to.role_title})\n`;
          } else {
            output += `**Reports to:** None (Top Level)\n`;
          }
          
          if (role.direct_reports_count > 0) {
            output += `**Direct Reports:** ${role.direct_reports_count}\n`;
          }
          
          if (role.responsibilities.length > 0) {
            output += `**Key Responsibilities:**\n`;
            role.responsibilities.forEach(resp => {
              output += `  • ${resp}\n`;
            });
          }
          
          output += '\n';
        });
      });

      output += '\n---\n\n';
    }

    // === /GOALS ===
    const hasGoals = context.hierarchy.teams.some(t => t.quarterly_goals.length > 0);
    if (hasGoals) {
      output += '## 🎯 /goals - Quarterly Goals\n\n';
      
      context.hierarchy.teams.forEach(team => {
        if (team.quarterly_goals.length > 0) {
          output += `### ${team.name}\n`;
          team.quarterly_goals.forEach(goal => {
            output += `  • ${goal.title} - ${goal.status} (${goal.progress}% complete)`;
            if (goal.owner) output += ` - Owner: ${goal.owner}`;
            if (goal.dueDate) output += ` - Due: ${goal.dueDate}`;
            output += '\n';
          });
          output += '\n';
        }
      });

      output += '\n---\n\n';
    }

    // === /METRICS ===
    const hasMetrics = context.hierarchy.teams.some(t => t.metrics.length > 0);
    if (hasMetrics) {
      output += '## 📊 /metrics - Team Metrics\n\n';
      
      context.hierarchy.teams.forEach(team => {
        if (team.metrics.length > 0) {
          output += `### ${team.name}\n`;
          team.metrics.forEach(metric => {
            let valueDisplay: string;
            if (metric.value === null || metric.value === undefined) {
              valueDisplay = 'no data';
            } else {
              valueDisplay = `${metric.value}`;
            }
            
            const targetDisplay = metric.target === null || metric.target === undefined ? 'no target' : `${metric.target}`;
            output += `  • **${metric.name}:** ${valueDisplay} / ${targetDisplay} ${statusIcon(metric.status)} - ${metric.owner}\n`;
            
            // Compact comparisons
            const comparisons: string[] = [];
            
            if (metric.comparisons.vsLastWeek) {
              const c = metric.comparisons.vsLastWeek;
              const arrow = c.improving ? '↗️' : '↘️';
              comparisons.push(`1w: ${arrow}${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(0)}%`);
            }
            
            if (metric.comparisons.vsFourWeeks) {
              const c = metric.comparisons.vsFourWeeks;
              const arrow = c.improving ? '↗️' : '↘️';
              comparisons.push(`4w: ${arrow}${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(0)}%`);
            }
            
            if (metric.comparisons.vsThirteenWeeks) {
              const c = metric.comparisons.vsThirteenWeeks;
              const arrow = c.improving ? '↗️' : '↘️';
              comparisons.push(`13w: ${arrow}${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(0)}%`);
            }
            
            if (metric.comparisons.vsFiftyTwoWeeks) {
              const c = metric.comparisons.vsFiftyTwoWeeks;
              const arrow = c.improving ? '↗️' : '↘️';
              comparisons.push(`1yr: ${arrow}${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(0)}%`);
            }
            
            if (comparisons.length > 0) {
              output += `    📊 Trends: ${comparisons.join(' | ')}\n`;
            }
            
            output += '\n';
          });
          output += '\n';
        }
      });

      output += '\n---\n\n';
    }

    // === /ISSUES ===
    const hasIssues = context.hierarchy.teams.some(t => t.issues.length > 0);
    if (hasIssues) {
      output += '## ⚠️ /issues - Open Issues\n\n';
      
      context.hierarchy.teams.forEach(team => {
        if (team.issues.length > 0) {
          output += `### ${team.name}\n`;
          team.issues.forEach(issue => {
            output += `  • ${issue.title} (${issue.type}) - ${issue.owner} - ${issue.daysOpen} days open\n`;
          });
          output += '\n';
        }
      });

      output += '\n---\n\n';
    }

    // === /TASKS ===
    const individual = context.hierarchy.individual;
    if (individual.personal_tasks.length > 0 || individual.assigned_tasks.length > 0) {
      output += '## ✅ /tasks - Individual Tasks\n\n';
      
      if (individual.personal_tasks.length > 0) {
        output += '### Personal Tasks\n';
        individual.personal_tasks.forEach(task => {
          output += `  • ${task.title} - ${task.status}`;
          if (task.isOverdue) output += ' ⚠️ OVERDUE';
          if (task.dueDate) output += ` - Due: ${task.dueDate}`;
          output += '\n';
        });
        output += '\n';
      }

      if (individual.assigned_tasks.length > 0) {
        output += '### Assigned Team Tasks\n';
        individual.assigned_tasks.forEach(task => {
          output += `  • ${task.title} (${task.team}) - ${task.status}`;
          if (task.isOverdue) output += ' ⚠️ OVERDUE';
          if (task.dueDate) output += ` - Due: ${task.dueDate}`;
          output += '\n';
        });
        output += '\n';
      }

      output += '\n---\n\n';
    }

    // === /PEOPLE ===
    const hasMembers = context.hierarchy.teams.some(t => t.member_count > 0);
    if (hasMembers) {
      output += '## 👥 /people - Team Members\n\n';
      
      context.hierarchy.teams.forEach(team => {
        output += `### ${team.name}\n`;
        output += `**Member Count:** ${team.member_count}\n\n`;
      });

      output += '\n---\n\n';
    }

    // === SEAT ACCOUNTABILITY ===
    if (context.hierarchy.seats.length > 0) {
      output += '## 💺 Seat Accountability\n\n';
      context.hierarchy.seats.forEach(seat => {
        output += `### ${seat.title}\n`;
        output += `**Team:** ${seat.team}\n`;
        output += `**Owner:** ${seat.owner}\n`;
        
        if (seat.responsibilities.length > 0) {
          output += '**Responsibilities:**\n';
          seat.responsibilities.forEach(resp => output += `  • ${resp}\n`);
          output += '\n';
        }

        if (seat.metrics_owned.length > 0) {
          output += '**Metrics Owned:**\n';
          seat.metrics_owned.forEach(metric => {
            const valueDisplay = metric.value === null || metric.value === undefined ? 'no data entered' : `${metric.value}`;
            const targetDisplay = metric.target === null || metric.target === undefined ? 'no target' : `${metric.target}`;
            output += `  • ${metric.name}: ${valueDisplay} / ${targetDisplay} ${statusIcon(metric.status)}\n`;
          });
          output += '\n';
        }

        if (seat.goals_owned.length > 0) {
          output += '**Goals Owned:**\n';
          seat.goals_owned.forEach(rock => {
            output += `  • ${rock.title} - ${rock.status} (${rock.progress}%)\n`;
          });
          output += '\n';
        }
      });
    }

    return output;
  } catch (error) {
    logger.error('Error formatting Zentrix context by category:', error);
    return 'Error formatting context data';
  }
};

export const formatZentrixContextForHuman = (context: ZentrixAIContext): string => {
  try {
    const statusIcon = (status: 'green' | 'yellow' | 'red') => {
      switch (status) {
        case 'green': return '✅';
        case 'yellow': return '⚠️';
        case 'red': return '❌';
      }
    };

    let output = '';

  // Header
  output += '# ZENTRIX AI CONTEXT\n\n';
  
  // Active Scope
  output += '## Active Scope\n';
  output += `**Level:** ${context.active_scope.level}\n`;
  if (context.active_scope.entity_name) {
    output += `**Entity:** ${context.active_scope.entity_name}\n`;
  }
  output += '\n';

  // Current User
  output += '## Current User\n';
  output += `**Name:** ${context.current_user.fullName}\n`;
  output += `**Email:** ${context.current_user.email}\n`;
  output += `**Role:** ${context.current_user.role}\n`;
  output += `**Permission Level:** ${context.current_user.permissionLevel}\n`;
  output += `**Visible Users:** ${context.current_user.can_see_user_ids.length}\n\n`;

  // Company Strategy
  const company = context.hierarchy.company;
  output += '## Company Strategy\n\n';
  output += `### ${company.name}\n\n`;

  const strategy = company.strategy;
  if (strategy.purpose) {
    output += '#### Purpose\n';
    output += `${strategy.purpose}\n\n`;
  }

  if (strategy.core_values && strategy.core_values.length > 0) {
    output += '#### Core Values\n';
    strategy.core_values.forEach(cv => {
      output += `• **${cv.value}**`;
      if (cv.explanation) output += ` - ${cv.explanation}`;
      output += '\n';
    });
    output += '\n';
  }

  if (strategy.long_term_objective) {
    output += '#### Long-Term Objective\n';
    output += `${strategy.long_term_objective}`;
    if (strategy.long_term_timeframe) {
      output += ` (${strategy.long_term_timeframe} years)`;
    }
    output += '\n\n';
  }

  if (strategy.niche) {
    output += '#### Niche\n';
    output += `${strategy.niche}\n\n`;
  }

  if (strategy.unique_edge) {
    output += '#### Unique Edge\n';
    output += `${strategy.unique_edge}\n\n`;
  }

  // 3-Year Vision
  if (strategy.three_year_milestones) {
    const milestones = strategy.three_year_milestones;
    output += '#### 3-Year Vision\n';
    if (milestones.key_descriptors) output += `**Key Descriptors:** ${milestones.key_descriptors}\n`;
    if (milestones.revenue) output += `**Revenue Target:** ${milestones.revenue}\n`;
    if (milestones.profit) output += `**Profit Target:** ${milestones.profit}\n`;
    if (milestones.team_size) output += `**Team Size:** ${milestones.team_size}\n`;
    if (milestones.what_it_looks_like && milestones.what_it_looks_like.length > 0) {
      output += '**What it looks like:**\n';
      milestones.what_it_looks_like.forEach(item => output += `  • ${item}\n`);
    }
    output += '\n';
  }

  // Marketing Strategy
  if (strategy.marketing) {
    const marketing = strategy.marketing;
    output += '#### Marketing Strategy\n';
    if (marketing.target_market) output += `**Target Market:** ${marketing.target_market}\n`;
    if (marketing.competitive_advantages && marketing.competitive_advantages.length > 0) {
      output += '**Competitive Advantages:**\n';
      marketing.competitive_advantages.forEach(adv => output += `  • ${adv}\n`);
    }
    if (marketing.guarantee) output += `**Guarantee:** ${marketing.guarantee}\n`;
    if (marketing.process) output += `**Process:** ${marketing.process}\n`;
    output += '\n';
  }

  // Target Customer
  if (strategy.target_customer) {
    const customer = strategy.target_customer;
    output += '#### Target Customer\n';
    if (customer.demographics) output += `**Demographics:** ${customer.demographics}\n`;
    if (customer.psychographics) output += `**Psychographics:** ${customer.psychographics}\n`;
    if (customer.behavior) output += `**Behavior:** ${customer.behavior}\n`;
    output += '\n';
  }

  // Financial Targets
  if (strategy.one_year_goals) {
    output += '#### 1-Year Financial Targets\n';
    if (strategy.one_year_goals.revenue) output += `**Revenue:** ${strategy.one_year_goals.revenue}\n`;
    if (strategy.one_year_goals.profit) output += `**Profit:** ${strategy.one_year_goals.profit}\n`;
    if (strategy.one_year_goals.metricTargets && strategy.one_year_goals.metricTargets.length > 0) {
      output += '**Metric Targets:**\n';
      strategy.one_year_goals.metricTargets.forEach(mt => {
        output += `  • ${mt.name}: ${mt.target}${mt.unit ? ' ' + mt.unit : ''}\n`;
      });
    }
    output += '\n';
  }

  if (strategy.quarterly_goals) {
    output += '#### Quarterly Financial Targets\n';
    if (strategy.quarterly_goals.revenue) output += `**Revenue:** ${strategy.quarterly_goals.revenue}\n`;
    if (strategy.quarterly_goals.profit) output += `**Profit:** ${strategy.quarterly_goals.profit}\n`;
    if (strategy.quarterly_goals.metricTargets && strategy.quarterly_goals.metricTargets.length > 0) {
      output += '**Metric Targets:**\n';
      strategy.quarterly_goals.metricTargets.forEach(mt => {
        output += `  • ${mt.name}: ${mt.target}${mt.unit ? ' ' + mt.unit : ''}\n`;
      });
    }
    output += '\n';
  }

  // SWOT Analysis
  if (strategy.swot_analysis) {
    const swot = strategy.swot_analysis;
    output += '#### SWOT Analysis\n\n';
    
    if (swot.strengths && swot.strengths.length > 0) {
      output += '**Strengths:**\n';
      swot.strengths.forEach(s => output += `  • ${s.text}\n`);
      output += '\n';
    }
    
    if (swot.weaknesses && swot.weaknesses.length > 0) {
      output += '**Weaknesses:**\n';
      swot.weaknesses.forEach(w => output += `  • ${w.text}\n`);
      output += '\n';
    }
    
    if (swot.opportunities && swot.opportunities.length > 0) {
      output += '**Opportunities:**\n';
      swot.opportunities.forEach(o => output += `  • ${o.text}\n`);
      output += '\n';
    }
    
    if (swot.threats && swot.threats.length > 0) {
      output += '**Threats:**\n';
      swot.threats.forEach(t => output += `  • ${t.text}\n`);
      output += '\n';
    }
  }

  // Yearly Goals
  if (strategy.yearly_goals && strategy.yearly_goals.length > 0) {
    output += '#### Yearly Goals\n';
    strategy.yearly_goals.forEach(goal => {
      output += `  ${goal.completed ? '✓' : '○'} ${goal.text}\n`;
    });
    output += '\n';
  }

  // Quarterly Priorities
  if (strategy.quarterly_priorities && strategy.quarterly_priorities.length > 0) {
    output += '#### Quarterly Priorities\n';
    strategy.quarterly_priorities.forEach(priority => output += `  • ${priority}\n`);
    output += '\n';
  }

  // Company Annual Metrics
  if (company.annual_metrics && company.annual_metrics.length > 0) {
    output += '#### Annual Metrics\n';
    company.annual_metrics.forEach(metric => {
      const valueDisplay = metric.value === null || metric.value === undefined ? 'no data entered' : `${metric.value}`;
      const targetDisplay = metric.target === null || metric.target === undefined ? 'no target' : `${metric.target}`;
      output += `• **${metric.name}:** ${valueDisplay} / ${targetDisplay} ${statusIcon(metric.status)}\n`;
    });
    output += '\n';
  }

  // Organizational Chart
  if (context.hierarchy.org_chart && context.hierarchy.org_chart.length > 0) {
    output += '## Organizational Chart\n\n';
    
    // Group by hierarchy level
    const levelMap = new Map<number, any[]>();
    context.hierarchy.org_chart.forEach(role => {
      if (!levelMap.has(role.level)) levelMap.set(role.level, []);
      levelMap.get(role.level)!.push(role);
    });
    
    // Display each level
    const sortedLevels = Array.from(levelMap.keys()).sort((a, b) => a - b);
    sortedLevels.forEach(level => {
      const roles = levelMap.get(level)!;
      
      roles.forEach(role => {
        // Role title and person
        const personInfo = role.person_assigned 
          ? `${role.person_assigned.name}` 
          : '👤 Vacant';
        
        output += `### ${role.title}\n`;
        output += `**Occupied by:** ${personInfo}\n`;
        
        // Reporting structure
        if (role.reports_to) {
          output += `**Reports to:** ${role.reports_to.person_name} (${role.reports_to.role_title})\n`;
        } else {
          output += `**Reports to:** None (Top Level)\n`;
        }
        
        // Team size
        if (role.direct_reports_count > 0) {
          output += `**Direct Reports:** ${role.direct_reports_count}\n`;
        }
        
        // Responsibilities
        if (role.responsibilities.length > 0) {
          output += `**Key Responsibilities:**\n`;
          role.responsibilities.forEach(resp => {
            output += `  • ${resp}\n`;
          });
        }
        
        output += '\n';
      });
    });
  }

  // Team Execution Data
  output += '## Team Execution Data\n\n';
  
  context.hierarchy.teams.forEach(team => {
    output += `### ${team.name}\n`;
    output += `**Members:** ${team.member_count}\n\n`;

    if (team.quarterly_goals.length > 0) {
      output += '**Quarterly Goals:**\n';
      team.quarterly_goals.forEach(goal => {
        output += `  • ${goal.title} - ${goal.status} (${goal.progress}% complete)`;
        if (goal.owner) output += ` - Owner: ${goal.owner}`;
        if (goal.dueDate) output += ` - Due: ${goal.dueDate}`;
        output += '\n';
      });
      output += '\n';
    }

    if (team.metrics.length > 0) {
      output += '**Weekly Metrics:**\n';
      team.metrics.forEach(metric => {
        // Main metric line - distinguish NULL from 0
        let valueDisplay: string;
        if (metric.value === null || metric.value === undefined) {
          valueDisplay = 'no data';
        } else {
          valueDisplay = `${metric.value}`;
        }
        
        const targetDisplay = metric.target === null || metric.target === undefined ? 'no target' : `${metric.target}`;
        output += `  • **${metric.name}:** ${valueDisplay} / ${targetDisplay} ${statusIcon(metric.status)} - ${metric.owner}\n`;
        
        // Compact comparisons on a single line
        const comparisons: string[] = [];
        
        if (metric.comparisons.vsLastWeek) {
          const c = metric.comparisons.vsLastWeek;
          const arrow = c.improving ? '↗️' : '↘️';
          comparisons.push(`1w: ${arrow}${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(0)}%`);
        }
        
        if (metric.comparisons.vsFourWeeks) {
          const c = metric.comparisons.vsFourWeeks;
          const arrow = c.improving ? '↗️' : '↘️';
          comparisons.push(`4w: ${arrow}${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(0)}%`);
        }
        
        if (metric.comparisons.vsThirteenWeeks) {
          const c = metric.comparisons.vsThirteenWeeks;
          const arrow = c.improving ? '↗️' : '↘️';
          comparisons.push(`13w: ${arrow}${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(0)}%`);
        }
        
        if (metric.comparisons.vsFiftyTwoWeeks) {
          const c = metric.comparisons.vsFiftyTwoWeeks;
          const arrow = c.improving ? '↗️' : '↘️';
          comparisons.push(`1yr: ${arrow}${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(0)}%`);
        }
        
        if (comparisons.length > 0) {
          output += `    📊 Trends: ${comparisons.join(' | ')}\n`;
        }
        
        output += '\n';
      });
      output += '\n';
    }

    if (team.issues.length > 0) {
      output += '**Open Issues:**\n';
      team.issues.forEach(issue => {
        output += `  • ${issue.title} (${issue.type}) - ${issue.owner} - ${issue.daysOpen} days open\n`;
      });
      output += '\n';
    }
  });

  // Seat Accountability
  if (context.hierarchy.seats.length > 0) {
    output += '## Seat Accountability\n\n';
    context.hierarchy.seats.forEach(seat => {
      output += `### ${seat.title}\n`;
      output += `**Team:** ${seat.team}\n`;
      output += `**Owner:** ${seat.owner}\n`;
      
      if (seat.responsibilities.length > 0) {
        output += '**Responsibilities:**\n';
        seat.responsibilities.forEach(resp => output += `  • ${resp}\n`);
        output += '\n';
      }

      if (seat.metrics_owned.length > 0) {
        output += '**Metrics Owned:**\n';
        seat.metrics_owned.forEach(metric => {
          const valueDisplay = metric.value === null || metric.value === undefined ? 'no data entered' : `${metric.value}`;
          const targetDisplay = metric.target === null || metric.target === undefined ? 'no target' : `${metric.target}`;
          output += `  • ${metric.name}: ${valueDisplay} / ${targetDisplay} ${statusIcon(metric.status)}\n`;
        });
        output += '\n';
      }

      if (seat.goals_owned.length > 0) {
        output += '**Goals Owned:**\n';
        seat.goals_owned.forEach(rock => {
          output += `  • ${rock.title} - ${rock.status} (${rock.progress}%)\n`;
        });
        output += '\n';
      }
    });
  }

  // Individual Tasks
  const individual = context.hierarchy.individual;
  if (individual.personal_tasks.length > 0 || individual.assigned_tasks.length > 0) {
    output += '## Individual Tasks\n\n';
    
    if (individual.personal_tasks.length > 0) {
      output += '**Personal Tasks:**\n';
      individual.personal_tasks.forEach(task => {
        output += `  • ${task.title} - ${task.status}`;
        if (task.isOverdue) output += ' ⚠️ OVERDUE';
        if (task.dueDate) output += ` - Due: ${task.dueDate}`;
        output += '\n';
      });
      output += '\n';
    }

    if (individual.assigned_tasks.length > 0) {
      output += '**Assigned Team Tasks:**\n';
      individual.assigned_tasks.forEach(task => {
        output += `  • ${task.title} (${task.team}) - ${task.status}`;
        if (task.isOverdue) output += ' ⚠️ OVERDUE';
        if (task.dueDate) output += ` - Due: ${task.dueDate}`;
        output += '\n';
      });
      output += '\n';
    }
  }

  // People Analyzer
  if (context.people_analyzer.length > 0) {
    output += '## People Analyzer Scores\n\n';
    const byUser = new Map<string, any[]>();
    context.people_analyzer.forEach(score => {
      if (!byUser.has(score.userName)) byUser.set(score.userName, []);
      byUser.get(score.userName)!.push(score);
    });

    byUser.forEach((scores, userName) => {
      output += `**${userName}:**\n`;
      scores.forEach(score => {
        const icon = score.status === 'above_bar' ? '✅' : score.status === 'at_bar' ? '⚠️' : '❌';
        output += `  ${icon} ${score.scoreType}: ${score.scoreValue}`;
        if (score.coreValueName) output += ` (${score.coreValueName})`;
        output += '\n';
      });
      output += '\n';
    });
  }

  return output;
  } catch (error) {
    logger.error('❌ Error formatting context for human:', error);
    return `Error formatting context: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};
