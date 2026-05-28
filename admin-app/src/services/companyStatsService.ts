import { supabase } from '@/integrations/supabase/client';
import type { CompanyStats } from '@/types/superAdmin';
import { calculateHealthScore, type HealthScoreBreakdown } from '@/utils/companyHealthScore';
import { debugLogger } from '@/utils/debugLogger';

// Optimized batch query to get all company stats in minimal queries
export const loadCompanies = async (): Promise<CompanyStats[]> => {
  // Get all companies first
  const { data: companiesData, error: companiesError } = await supabase
    .from('companies')
    .select('*, status')
    .order('created_at', { ascending: false });

  if (companiesError) throw companiesError;
  if (!companiesData || companiesData.length === 0) return [];

  const companyIds = companiesData.map(c => c.id);
  debugLogger.admin.debug('📊 Starting loadCompanies', { 
    companyCount: companiesData.length,
    companyNames: companiesData.map(c => c.name).slice(0, 5) 
  });
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // First get teams to filter metrics query
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('id, company_id')
    .in('company_id', companyIds);

  if (teamsError) {
    debugLogger.admin.error('Error fetching teams', teamsError);
  }

  const teamIds = teamsData?.map(t => t.id) || [];
  
  // Log teams per company
  const teamsPerCompany = new Map<string, string[]>();
  teamsData?.forEach((team: any) => {
    if (!teamsPerCompany.has(team.company_id)) {
      teamsPerCompany.set(team.company_id, []);
    }
    teamsPerCompany.get(team.company_id)!.push(team.id);
  });
  
  debugLogger.admin.debug('📊 Teams fetched', { 
    totalTeams: teamIds.length,
    teamsPerCompany: Object.fromEntries(
      Array.from(teamsPerCompany.entries()).map(([companyId, teams]) => {
        const company = companiesData.find(c => c.id === companyId);
        return [company?.name || companyId, teams.length];
      })
    )
  });

  // Batch fetch all stats in parallel using Promise.allSettled for error resilience
  const [
    activeMembersResult,
    pendingMembersResult,
    metricsResult,
    goalsResult,
    meetingsResult,
    orgRolesResult,
    strategyResult,
    lastLoginsResult,
    usageResult,
    subscriptionsResult
  ] = await Promise.allSettled([
    // Get active user counts per company
    supabase
      .from('company_members')
      .select('company_id')
      .in('company_id', companyIds)
      .eq('status', 'active'),
    
    // Get pending user counts per company
    supabase
      .from('company_members')
      .select('company_id')
      .in('company_id', companyIds)
      .eq('status', 'pending'),
    
    // Get metrics counts per team (will aggregate by company) - filter by team IDs
    teamIds.length > 0 
      ? supabase
          .from('metrics')
          .select('id, team_id')
          .in('team_id', teamIds)
          .is('deleted_at', null)
      : Promise.resolve({ data: [] }),
    
    // Get goals counts per team (will aggregate by company)
    teamIds.length > 0
      ? supabase
          .from('team_goals')
          .select('team_id')
          .in('team_id', teamIds)
      : Promise.resolve({ data: [] }),
    
    // Get meetings counts per team (will aggregate by company)
    teamIds.length > 0
      ? supabase
          .from('meetings_state')
          .select('team_id')
          .in('team_id', teamIds)
      : Promise.resolve({ data: [] }),
    
    // Get org roles per company
    supabase
      .from('org_roles')
      .select('company_id')
      .in('company_id', companyIds),
    
    // Get strategy plans per company
    supabase
      .from('strategic_plans')
      .select('company_id')
      .in('company_id', companyIds)
      .eq('is_active', true),
    
    // Get login dates for all company members (for median calculation, including pending)
    (async () => {
      const { data: members } = await supabase
        .from('company_members')
        .select('user_id, company_id, status')
        .in('company_id', companyIds)
        .in('status', ['active', 'pending']);
      
      if (!members || members.length === 0) return { data: [], memberMap: new Map(), pendingMap: new Map() };
      
      // Get user IDs for active members with accounts
      const userIds = [...new Set(members.filter(m => m.user_id).map(m => m.user_id))];
      const memberMap = new Map(members.map(m => [m.user_id || `pending-${m.company_id}`, m.company_id]));
      
      // Track pending users per company (users without user_id)
      const pendingByCompany = new Map<string, number>();
      members.forEach(m => {
        if (!m.user_id && m.status === 'pending') {
          const count = pendingByCompany.get(m.company_id) || 0;
          pendingByCompany.set(m.company_id, count + 1);
        }
      });
      
      // Get all profiles including those without login dates
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, last_login_at')
        .in('id', userIds);
      
      return { data: profiles || [], memberMap, pendingByCompany };
    })(),
    
    // Get 7-day usage stats
    supabase
      .from('company_usage_stats')
      .select('company_id, total_minutes')
      .in('company_id', companyIds)
      .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0]),
    
    // Get subscription data
    supabase
      .from('company_subscriptions')
      .select('company_id, subscription_tier, subscription_end, trial_end, extended_trial_end, subscribed, cancelled_at')
      .in('company_id', companyIds)
  ]);

  // Build lookup maps for O(1) access
  const activeUsersMap = new Map<string, number>();
  const pendingUsersMap = new Map<string, number>();
  const teamsMap = new Map<string, number>();
  const metricsMap = new Map<string, number>();
  const goalsMap = new Map<string, number>();
  const meetingsMap = new Map<string, number>();
  const orgRolesMap = new Map<string, number>();
  const strategyMap = new Map<string, number>();
  const lastLoginMap = new Map<string, string>();
  const usageMap = new Map<string, number>();
  const subscriptionMap = new Map<string, 'Free' | 'Trial' | 'Paid' | 'Blocked' | 'Cancelled'>();
  const trialEndMap = new Map<string, string | null>();
  const subscribedMap = new Map<string, boolean>();

  // Process active users
  if (activeMembersResult.status === 'fulfilled' && activeMembersResult.value.data) {
    activeMembersResult.value.data.forEach((member: any) => {
      const count = activeUsersMap.get(member.company_id) || 0;
      activeUsersMap.set(member.company_id, count + 1);
    });
  }

  // Process pending users
  if (pendingMembersResult.status === 'fulfilled' && pendingMembersResult.value.data) {
    pendingMembersResult.value.data.forEach((member: any) => {
      const count = pendingUsersMap.get(member.company_id) || 0;
      pendingUsersMap.set(member.company_id, count + 1);
    });
  }

  // Build team->company mapping from teamsData
  const teamToCompanyMap = new Map<string, string>();
  if (teamsData) {
    teamsData.forEach((team: any) => {
      const count = teamsMap.get(team.company_id) || 0;
      teamsMap.set(team.company_id, count + 1);
      teamToCompanyMap.set(team.id, team.company_id);
    });
  }

  // Process metrics (aggregate by company via team mapping, counting unique metrics)
  if (metricsResult.status === 'fulfilled' && metricsResult.value.data) {
    debugLogger.admin.debug('📊 Metrics query result', { 
      totalMetricsFetched: metricsResult.value.data.length,
      sampleMetrics: metricsResult.value.data.slice(0, 3)
    });
    
    const metricsWithoutCompany: any[] = [];
    
    metricsResult.value.data.forEach((metric: any) => {
      const companyId = teamToCompanyMap.get(metric.team_id);
      if (companyId) {
        const count = metricsMap.get(companyId) || 0;
        metricsMap.set(companyId, count + 1);
      } else {
        metricsWithoutCompany.push(metric);
      }
    });
    
    if (metricsWithoutCompany.length > 0) {
      debugLogger.admin.warn('⚠️ Metrics without company mapping', {
        count: metricsWithoutCompany.length,
        sampleTeamIds: metricsWithoutCompany.slice(0, 5).map(m => m.team_id)
      });
    }
    
    debugLogger.admin.debug('📊 Metrics aggregated by company', { 
      metricsByCompany: Object.fromEntries(
        Array.from(metricsMap.entries()).map(([companyId, count]) => {
          const company = companiesData.find(c => c.id === companyId);
          return [company?.name || companyId, count];
        })
      )
    });
  } else {
    debugLogger.admin.warn('⚠️ Metrics query failed or empty', { 
      status: metricsResult.status,
      reason: metricsResult.status === 'rejected' ? metricsResult.reason : 'No data'
    });
  }

  // Process goals
  if (goalsResult.status === 'fulfilled' && goalsResult.value.data) {
    debugLogger.admin.debug('🎯 Goals query result', { 
      totalGoalsFetched: goalsResult.value.data.length,
      sampleGoals: goalsResult.value.data.slice(0, 3)
    });
    
    goalsResult.value.data.forEach((goal: any) => {
      const companyId = teamToCompanyMap.get(goal.team_id);
      if (companyId) {
        const count = goalsMap.get(companyId) || 0;
        goalsMap.set(companyId, count + 1);
      }
    });
    
    debugLogger.admin.debug('🎯 Goals aggregated by company', { 
      goalsByCompany: Object.fromEntries(
        Array.from(goalsMap.entries()).map(([companyId, count]) => {
          const company = companiesData.find(c => c.id === companyId);
          return [company?.name || companyId, count];
        })
      )
    });
  } else {
    debugLogger.admin.error('❌ Goals query failed', { 
      status: goalsResult.status,
      reason: goalsResult.status === 'rejected' ? goalsResult.reason : 'No data'
    });
  }

  // Process meetings
  if (meetingsResult.status === 'fulfilled' && meetingsResult.value.data) {
    debugLogger.admin.debug('📅 Meetings query result', { 
      totalMeetingsFetched: meetingsResult.value.data.length,
      sampleMeetings: meetingsResult.value.data.slice(0, 3)
    });
    
    meetingsResult.value.data.forEach((meeting: any) => {
      const companyId = teamToCompanyMap.get(meeting.team_id);
      if (companyId) {
        const count = meetingsMap.get(companyId) || 0;
        meetingsMap.set(companyId, count + 1);
      }
    });
    
    debugLogger.admin.debug('📅 Meetings aggregated by company', { 
      meetingsByCompany: Object.fromEntries(
        Array.from(meetingsMap.entries()).map(([companyId, count]) => {
          const company = companiesData.find(c => c.id === companyId);
          return [company?.name || companyId, count];
        })
      )
    });
  } else {
    debugLogger.admin.error('❌ Meetings query failed', { 
      status: meetingsResult.status,
      reason: meetingsResult.status === 'rejected' ? meetingsResult.reason : 'No data'
    });
  }

  // Process org roles
  if (orgRolesResult.status === 'fulfilled' && orgRolesResult.value.data) {
    debugLogger.admin.debug('🏢 Org roles query result', { 
      totalOrgRolesFetched: orgRolesResult.value.data.length,
      sampleRoles: orgRolesResult.value.data.slice(0, 3)
    });
    
    orgRolesResult.value.data.forEach((role: any) => {
      const count = orgRolesMap.get(role.company_id) || 0;
      orgRolesMap.set(role.company_id, count + 1);
    });
    
    debugLogger.admin.debug('🏢 Org roles aggregated by company', { 
      orgRolesByCompany: Object.fromEntries(
        Array.from(orgRolesMap.entries()).map(([companyId, count]) => {
          const company = companiesData.find(c => c.id === companyId);
          return [company?.name || companyId, count];
        })
      )
    });
  } else {
    debugLogger.admin.error('❌ Org roles query failed', { 
      status: orgRolesResult.status,
      reason: orgRolesResult.status === 'rejected' ? orgRolesResult.reason : 'No data'
    });
  }

  // Process strategy plans
  if (strategyResult.status === 'fulfilled' && strategyResult.value.data) {
    debugLogger.admin.debug('💡 Strategy query result', { 
      totalStrategyFetched: strategyResult.value.data.length,
      sampleStrategy: strategyResult.value.data.slice(0, 3)
    });
    
    strategyResult.value.data.forEach((plan: any) => {
      const count = strategyMap.get(plan.company_id) || 0;
      strategyMap.set(plan.company_id, count + 1);
    });
    
    debugLogger.admin.debug('💡 Strategy aggregated by company', { 
      strategyByCompany: Object.fromEntries(
        Array.from(strategyMap.entries()).map(([companyId, count]) => {
          const company = companiesData.find(c => c.id === companyId);
          return [company?.name || companyId, count];
        })
      )
    });
  } else {
    debugLogger.admin.error('❌ Strategy query failed', { 
      status: strategyResult.status,
      reason: strategyResult.status === 'rejected' ? strategyResult.reason : 'No data'
    });
  }

  // Process median logins (median login date across all users in each company, including pending as "Never")
  if (lastLoginsResult.status === 'fulfilled') {
    const { data: profiles, memberMap, pendingByCompany } = lastLoginsResult.value as any;
    const companyLogins = new Map<string, (Date | null)[]>();
    
    // Collect all login dates per company (including null for users who never logged in)
    profiles.forEach((profile: any) => {
      const companyId = memberMap.get(profile.id);
      if (companyId) {
        if (!companyLogins.has(companyId)) {
          companyLogins.set(companyId, []);
        }
        const loginDate = profile.last_login_at ? new Date(profile.last_login_at) : null;
        companyLogins.get(companyId)!.push(loginDate);
      }
    });
    
    // Add pending users as null login dates
    pendingByCompany.forEach((count: number, companyId: string) => {
      if (!companyLogins.has(companyId)) {
        companyLogins.set(companyId, []);
      }
      // Add 'count' number of null entries for pending users
      for (let i = 0; i < count; i++) {
        companyLogins.get(companyId)!.push(null);
      }
    });
    
    // Calculate median for each company
    companyLogins.forEach((loginDates, companyId) => {
      if (loginDates.length === 0) return;
      
      // Sort dates: nulls first (representing "Never"), then actual dates from oldest to newest
      const sortedDates = loginDates.sort((a, b) => {
        if (a === null && b === null) return 0;
        if (a === null) return -1; // null comes first (oldest/never)
        if (b === null) return 1;
        return a.getTime() - b.getTime();
      });
      
      // Calculate median
      const mid = Math.floor(sortedDates.length / 2);
      let medianDate: Date | null;
      
      if (sortedDates.length % 2 === 0) {
        const date1 = sortedDates[mid - 1];
        const date2 = sortedDates[mid];
        
        // If either median element is null, median is null (Never)
        if (date1 === null || date2 === null) {
          medianDate = null;
        } else {
          medianDate = new Date((date1.getTime() + date2.getTime()) / 2);
        }
      } else {
        medianDate = sortedDates[mid];
      }
      
      // Only set if we have a valid date (null means "Never", which we don't store)
      if (medianDate !== null) {
        lastLoginMap.set(companyId, medianDate.toISOString());
      }
    });
  }

  // Process usage stats
  if (usageResult.status === 'fulfilled' && usageResult.value.data) {
    const usageByCompany = new Map<string, number>();
    usageResult.value.data.forEach((stat: any) => {
      const current = usageByCompany.get(stat.company_id) || 0;
      usageByCompany.set(stat.company_id, current + (stat.total_minutes || 0));
    });
    
    usageByCompany.forEach((totalMinutes, companyId) => {
      usageMap.set(companyId, Math.round((totalMinutes / 60) * 10) / 10);
    });
  }

  // Process subscription data
  if (subscriptionsResult.status === 'fulfilled' && subscriptionsResult.value.data) {
    subscriptionsResult.value.data.forEach((sub: any) => {
      const now = new Date();
      let tier: 'Free' | 'Trial' | 'Paid' | 'Blocked' | 'Cancelled' = 'Free';

      // Store subscribed status
      subscribedMap.set(sub.company_id, sub.subscribed ?? true);

      // Store trial end date if exists
      const trialEnd = sub.extended_trial_end || sub.trial_end;
      if (trialEnd) {
        trialEndMap.set(sub.company_id, trialEnd);
      }

      // Check if paid subscription is active
      if (sub.subscription_tier === 'Premium' || sub.subscription_tier === 'Basic' || sub.subscription_tier === 'Enterprise' || sub.subscription_tier === 'Paid') {
        if (sub.subscription_end && new Date(sub.subscription_end) > now) {
          tier = 'Paid';
        }
      }
      // Check if trial is active
      else if (sub.subscription_tier === 'Trial') {
        if (trialEnd && new Date(trialEnd) > now) {
          tier = 'Trial';
        }
      }

      // Override tier to Blocked if explicitly unsubscribed
      if (sub.subscribed === false) {
        tier = 'Blocked';
      }

      // Cancelled takes top priority — a row with cancelled_at set is the
      // user-initiated cancellation flow, regardless of whether their paid
      // period or trial is still active. Match the same precedence used by
      // useCompanyManagement.ts so the admin UI is consistent across both
      // code paths.
      if (sub.cancelled_at) {
        tier = 'Cancelled';
      }

      subscriptionMap.set(sub.company_id, tier);
    });
  }

  // Map companies with their stats
  return companiesData.map(company => {
    const userCount = activeUsersMap.get(company.id) || 0;
    const pendingCount = pendingUsersMap.get(company.id) || 0;
    const usageHours = usageMap.get(company.id) || 0;
    const lastLogin = lastLoginMap.get(company.id) || null;
    const metricsCount = metricsMap.get(company.id) || 0;
    
    // Debug log for each company's final stats
    const teamIds = Array.from(teamToCompanyMap.entries())
      .filter(([_, cId]) => cId === company.id)
      .map(([teamId]) => teamId);
    
    debugLogger.admin.debug(`📊 Final stats for ${company.name}`, {
      companyId: company.id,
      userCount,
      pendingCount,
      teamCount: teamsMap.get(company.id) || 0,
      metricsCount,
      goalsCount: goalsMap.get(company.id) || 0,
      meetingsCount: meetingsMap.get(company.id) || 0,
      orgRolesCount: orgRolesMap.get(company.id) || 0,
      strategyCount: strategyMap.get(company.id) || 0,
      teamIds,
      hasTeamsInMap: teamIds.length > 0,
      metricsInMap: metricsMap.has(company.id)
    });
    
    // Calculate health score
    const health_score = calculateHealthScore(
      lastLogin,
      usageHours,
      userCount,
      pendingCount,
      company.created_at
    );
    
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      user_count: userCount,
      pending_user_count: pendingCount,
      team_count: teamsMap.get(company.id) || 0,
      metrics_count: metricsCount,
      goals_count: goalsMap.get(company.id) || 0,
      meetings_count: meetingsMap.get(company.id) || 0,
      org_roles_count: orgRolesMap.get(company.id) || 0,
      strategy_count: strategyMap.get(company.id) || 0,
      created_at: company.created_at,
      last_login_at: lastLogin,
      usage_hours_7d: usageHours,
      status: 'active' as const,
      company_status: (company.status as 'Active' | 'Working' | 'Stuck') || 'Active',
      health_score,
      subscription_tier: subscriptionMap.get(company.id) || 'Free',
      trial_end: trialEndMap.get(company.id) || null,
      subscribed: subscribedMap.get(company.id) ?? true
    };
  });
};

export const getRecentCompanies = async (limit: number = 5): Promise<CompanyStats[]> => {
  const companies = await loadCompanies();
  return companies
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
};

export const getRecentlyActiveCompanies = async (limit: number = 1000): Promise<CompanyStats[]> => {
  const companies = await loadCompanies();
  return companies
    .sort((a, b) => {
      // Companies with logins first, sorted by most recent
      if (a.last_login_at && b.last_login_at) {
        return new Date(b.last_login_at).getTime() - new Date(a.last_login_at).getTime();
      }
      if (a.last_login_at) return -1;
      if (b.last_login_at) return 1;
      // Companies without logins sorted by creation date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);
};
