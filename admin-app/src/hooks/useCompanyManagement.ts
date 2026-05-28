import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { deleteCompanyCompletely } from '@/services/companyDeletionService';
import { calculateHealthScore, type HealthScoreBreakdown } from '@/utils/companyHealthScore';
import { logger } from '@/utils/logger';

export interface CompanyWithStats {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  user_count: number;
  team_count: number;
  metrics_count: number;
  goals_count?: number;
  meetings_count?: number;
  org_roles_count?: number;
  strategy_count?: number;
  status: 'Trial' | 'Free' | 'Paid' | 'Blocked';
  subscription_tier?: 'Trial' | 'Free' | 'Paid' | 'Blocked' | 'Cancelled';
  trial_end?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancellation_feedback?: string | null;
  subscription_end?: string | null;
  subscribed?: boolean;
  last_login: string | null;
  directors: string[];
  usage_hours_7d?: number;
  pending_user_count?: number;
  company_status?: 'Active' | 'Working' | 'Stuck';
  health_score?: HealthScoreBreakdown;
}

export const useCompanyManagement = () => {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      logger.log('useCompanyManagement: Fetching companies with stats');

      // Get all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (companiesError) throw companiesError;

      // Get stats for each company
      const companiesWithStats = (await Promise.all(
        (companiesData || []).map(async (company) => {
          try {
            const [
              { count: userCount },
              { count: teamCount },
              { count: metricsCount },
              goalsCountResult,
              meetingsCountResult,
              orgRolesCountResult,
              strategyCountResult,
              lastLoginResult,
              directorsResult
            ] = await Promise.all([
              // Count direct company members + users who have team access
              supabase
                .from('company_members')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id)
                .eq('status', 'active'),
              supabase
                .from('teams')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id),
              // Count unique metrics for teams in this company (not weekly data points)
              (async () => {
                const { data: teams } = await supabase
                  .from('teams')
                  .select('id')
                  .eq('company_id', company.id);
                
                if (!teams || teams.length === 0) {
                  logger.log(`📊 ${company.name}: No teams found`);
                  return { count: 0 };
                }
                
                const teamIds = teams.map(t => t.id);
                logger.log(`📊 ${company.name}: Found ${teams.length} teams:`, teamIds);
                
                // Get unique metric names across all teams
                const { data: metrics, error } = await supabase
                  .from('weekly_metrics')
                  .select('metric_name, team_id')
                  .in('team_id', teamIds)
                  .is('deleted_at', null);
                
                if (error) {
                  logger.error(`📊 ${company.name}: Error fetching metrics:`, error);
                  return { count: 0 };
                }
                
                if (!metrics) {
                  logger.log(`📊 ${company.name}: No metrics data returned`);
                  return { count: 0 };
                }
                
                logger.log(`📊 ${company.name}: Found ${metrics.length} metric rows`);
                
                // Count unique metric names per team
                const uniqueMetrics = new Set(
                  metrics.map(m => `${m.team_id}-${m.metric_name}`)
                );
                
                const count = uniqueMetrics.size;
                logger.log(`📊 ${company.name}: Unique metrics count: ${count}`);
                
                return { count };
              })(),
              // Count goals (team_goals for this company)
              (async () => {
                try {
                  const { data: teams } = await supabase
                    .from('teams')
                    .select('id')
                    .eq('company_id', company.id);
                  
                  if (!teams || teams.length === 0) {
                    logger.log(`🎯 ${company.name}: No teams for goals count`);
                    return { count: 0 };
                  }
                  
                  const teamIds = teams.map(t => t.id);
                  
                  const { count, error } = await supabase
                    .from('team_goals')
                    .select('*', { count: 'exact', head: true })
                    .in('team_id', teamIds);
                  
                  if (error) {
                    logger.error(`🎯 ${company.name}: Error counting goals:`, error);
                    return { count: 0 };
                  }
                  
                  logger.log(`🎯 ${company.name}: Goals count: ${count}`);
                  return { count: count || 0 };
                } catch (err) {
                  logger.error(`🎯 ${company.name}: Exception in goals count:`, err);
                  return { count: 0 };
                }
              })(),
              // Count meetings (meetings_state for this company)
              (async () => {
                try {
                  const { data: teams } = await supabase
                    .from('teams')
                    .select('id')
                    .eq('company_id', company.id);
                  
                  if (!teams || teams.length === 0) {
                    logger.log(`📅 ${company.name}: No teams for meetings count`);
                    return { count: 0 };
                  }
                  
                  const teamIds = teams.map(t => t.id);
                  
                  const { count, error } = await supabase
                    .from('meetings_state')
                    .select('*', { count: 'exact', head: true })
                    .in('team_id', teamIds);
                  
                  if (error) {
                    logger.error(`📅 ${company.name}: Error counting meetings:`, error);
                    return { count: 0 };
                  }
                  
                  logger.log(`📅 ${company.name}: Meetings count: ${count}`);
                  return { count: count || 0 };
                } catch (err) {
                  logger.error(`📅 ${company.name}: Exception in meetings count:`, err);
                  return { count: 0 };
                }
              })(),
              // Count org roles
              (async () => {
                try {
                  const { count, error } = await supabase
                    .from('org_roles')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', company.id);
                  
                  if (error) {
                    logger.error(`🏢 ${company.name}: Error counting org roles:`, error);
                    return { count: 0 };
                  }
                  
                  logger.log(`🏢 ${company.name}: Org roles count: ${count}`);
                  return { count: count || 0 };
                } catch (err) {
                  logger.error(`🏢 ${company.name}: Exception in org roles count:`, err);
                  return { count: 0 };
                }
              })(),
              // Count strategic plans
              (async () => {
                try {
                  const { count, error } = await supabase
                    .from('strategic_plans')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', company.id)
                    .eq('is_active', true);
                  
                  if (error) {
                    logger.error(`💡 ${company.name}: Error counting strategy:`, error);
                    return { count: 0 };
                  }
                  
                  logger.log(`💡 ${company.name}: Strategy count: ${count}`);
                  return { count: count || 0 };
                } catch (err) {
                  logger.error(`💡 ${company.name}: Exception in strategy count:`, err);
                  return { count: 0 };
                }
              })(),
              // Get most recent login from company members
              (async () => {
                const { data: members } = await supabase
                  .from('company_members')
                  .select('user_id')
                  .eq('company_id', company.id)
                  .eq('status', 'active');
                
                if (!members || members.length === 0) return { data: null };
                
                const userIds = members.map(m => m.user_id).filter(Boolean);
                if (userIds.length === 0) return { data: null };
                
                const { data } = await supabase
                  .from('profiles')
                  .select('last_login_at')
                  .in('id', userIds)
                  .not('last_login_at', 'is', null)
                  .order('last_login_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                
                return { data: data ? [{ profiles: { last_login_at: data.last_login_at } }] : null };
              })(),
              // Get directors for this company
              supabase
                .from('company_members')
                .select(`
                  user_id,
                  profiles!inner(full_name)
                `)
                .eq('company_id', company.id)
                .eq('permission_level', 'director')
                .eq('status', 'active')
            ]);

            // Extract last login date
            const lastLogin = lastLoginResult.data && lastLoginResult.data.length > 0 
              ? (lastLoginResult.data[0] as any).profiles.last_login_at 
              : null;

            // Extract directors' names
            const directors = directorsResult.data 
              ? directorsResult.data.map((d: any) => d.profiles.full_name).filter(Boolean)
              : [];

            // Get subscription status
            const { data: subscription } = await supabase
              .from('company_subscriptions')
              .select('subscription_tier, subscription_end, trial_end, extended_trial_end, subscribed, cancelled_at, cancellation_reason, cancellation_feedback')
              .eq('company_id', company.id)
              .maybeSingle();

            let status: 'Trial' | 'Free' | 'Paid' | 'Blocked' | 'Cancelled' = 'Free';
            let subscribed = false;

            if (subscription) {
              const now = new Date();
              const { subscription_tier, subscription_end, trial_end, extended_trial_end, subscribed: isSubscribed, cancelled_at } = subscription;
              subscribed = isSubscribed || false;

              // Check if subscription was cancelled (even if still active until period ends)
              if (cancelled_at) {
                status = 'Cancelled';
              } else {
                // Check if it's a paid tier with active subscription
                const isPaidTier = ['Basic', 'Premium', 'Enterprise', 'Paid'].includes(subscription_tier || '');
                const hasActiveSubscription = subscription_end ? new Date(subscription_end) > now : false;

                if (isPaidTier && hasActiveSubscription) {
                  status = 'Paid';
                } else if (subscription_tier === 'Trial') {
                  const trialEnd = extended_trial_end || trial_end;
                  const isInTrial = trialEnd && new Date(trialEnd) > now;

                  if (isInTrial) {
                    status = 'Trial';
                  } else {
                    // Trial has expired
                    status = isSubscribed ? 'Free' : 'Blocked';
                  }
                } else {
                  // Default for Free tier or expired subscriptions
                  status = (subscription_tier === 'Free' || isSubscribed) ? 'Free' : 'Blocked';
                }
              }
            }

            // Get 7-day usage hours
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { data: usageData } = await supabase
              .from('company_usage_stats')
              .select('total_minutes')
              .eq('company_id', company.id)
              .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0]);
            
            const totalMinutes = usageData?.reduce((sum, stat) => sum + (stat.total_minutes || 0), 0) || 0;
            const usage_hours_7d = Math.round((totalMinutes / 60) * 10) / 10;

            // Get pending user count
            const { count: pendingCount } = await supabase
              .from('company_members')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', company.id)
              .eq('status', 'pending');

            // Calculate health score
            const health_score = calculateHealthScore(
              lastLogin,
              usage_hours_7d,
              userCount || 0,
              pendingCount || 0,
              company.created_at
            );

            return {
              id: company.id,
              name: company.name,
              slug: company.slug,
              created_at: company.created_at,
              user_count: userCount || 0,
              team_count: teamCount || 0,
              metrics_count: metricsCount || 0,
              goals_count: goalsCountResult.count || 0,
              meetings_count: meetingsCountResult.count || 0,
              org_roles_count: orgRolesCountResult.count || 0,
              strategy_count: strategyCountResult.count || 0,
              status: status,
              subscription_tier: status === 'Cancelled' ? 'Cancelled' : (subscription?.subscription_tier || 'Free'),
              trial_end: subscription?.extended_trial_end || subscription?.trial_end || null,
              cancelled_at: subscription?.cancelled_at || null,
              cancellation_reason: subscription?.cancellation_reason || null,
              cancellation_feedback: subscription?.cancellation_feedback || null,
              subscription_end: subscription?.subscription_end || null,
              subscribed,
              last_login: lastLogin,
              directors: directors,
              usage_hours_7d,
              pending_user_count: pendingCount || 0,
              health_score
            };
          } catch (error) {
            logger.error(`useCompanyManagement: Error loading company ${company.name}:`, error);
            // Return a basic company object with zero stats if loading fails
            return {
              id: company.id,
              name: company.name,
              slug: company.slug,
              created_at: company.created_at,
              user_count: 0,
              team_count: 0,
              metrics_count: 0,
              goals_count: 0,
              meetings_count: 0,
              org_roles_count: 0,
              strategy_count: 0,
              status: 'Blocked' as const,
              last_login: null,
              directors: [],
              usage_hours_7d: 0,
              pending_user_count: 0
            };
          }
        })
      )).filter(Boolean);

      logger.log('useCompanyManagement: Loaded companies with stats:', companiesWithStats.length);
      setCompanies(companiesWithStats);
    } catch (error) {
      logger.error('useCompanyManagement: Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const updateCompanyStatus = async (companyId: string, status: 'Free' | 'Trial' | 'Paid', trialMonths?: number) => {
    try {
      logger.log('useCompanyManagement: Updating company status:', companyId, status);

      // Calculate dates based on status
      const now = new Date();
      let subscription_tier = status;
      let trial_end = null;
      let subscription_end = null;

      if (status === 'Trial') {
        const months = trialMonths || 1;
        trial_end = new Date(now);
        trial_end.setMonth(trial_end.getMonth() + months);
      } else if (status === 'Paid') {
        subscription_tier = 'Paid';
        subscription_end = new Date(now);
        subscription_end.setFullYear(subscription_end.getFullYear() + 10); // Set far future date
      }

      // Update or insert company subscription
      const { error } = await supabase
        .from('company_subscriptions')
        .upsert({
          company_id: companyId,
          subscription_tier,
          trial_end,
          subscription_end,
          subscribed: status === 'Paid',
          updated_at: now.toISOString()
        }, {
          onConflict: 'company_id'
        });

      if (error) throw error;

      // Refresh companies to get updated status
      await fetchCompanies();

      toast({
        title: "Success",
        description: `Company status updated to ${status}`,
      });

      logger.log('useCompanyManagement: Company status updated successfully');
    } catch (error) {
      logger.error('useCompanyManagement: Error updating company status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update company status",
        variant: "destructive",
      });
    }
  };

  const deleteCompany = async (companyId: string) => {
    try {
      logger.log('useCompanyManagement: Deleting company:', companyId);

      const result = await deleteCompanyCompletely(companyId);
      
      if (result.success) {
        // Remove from local state
        setCompanies(prev => prev.filter(c => c.id !== companyId));

        const counts = result.deletedCounts;
        const details = counts ? 
          `Deleted ${counts.companyMembers} users, ${counts.teams} teams, and all associated data.` :
          'All associated data has been removed.';

        toast({
          title: "Success",
          description: `Company deleted successfully. ${details}`,
        });

        logger.log('useCompanyManagement: Company deleted successfully:', result);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      logger.error('useCompanyManagement: Error deleting company:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete company",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return {
    companies,
    loading,
    updateCompanyStatus,
    deleteCompany,
    refetch: fetchCompanies,
  };
};