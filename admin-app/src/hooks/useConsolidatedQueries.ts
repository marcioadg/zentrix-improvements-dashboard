/**
 * 🎯 PHASE 4: Consolidated Queries Hook
 * Batches multiple existence checks into single queries
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { requestDeduplicator } from '@/utils/requestDeduplicator';

interface ExistenceCheck {
  meetings: boolean;
  weeklyMetrics: boolean;
  teamGoals: boolean;
  orgRoles: boolean;
  strategicPlans: boolean;
  goals: boolean;
}

export const useConsolidatedQueries = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();

  // 🎯 PHASE 4: Consolidated existence checks in parallel
  const queries = useQueries({
    queries: [
      {
        queryKey: ['existence-check', 'meetings', currentCompany?.id],
        queryFn: async () => {
          if (!currentCompany?.id || !user?.id) return false;
          
          return requestDeduplicator.deduplicate(
            `meetings-exist-${currentCompany?.id}`,
            async () => {
              const { data } = await supabase
                .from('meetings_state')
                .select('id')
                .limit(1);
              return (data?.length || 0) > 0;
            },
            5 * 60 * 1000 // 5 minutes cache
          );
        },
        enabled: !!currentCompany?.id && !!user,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['existence-check', 'weekly-metrics', currentCompany?.id],
        queryFn: async () => {
          if (!currentCompany?.id) return false;
          
          return requestDeduplicator.deduplicate(
            `weekly-metrics-exist-${currentCompany?.id}`,
            async () => {
              const { data } = await supabase
                .from('weekly_metrics')
                .select('id')
                .limit(1);
              return (data?.length || 0) > 0;
            },
            5 * 60 * 1000
          );
        },
        enabled: !!currentCompany?.id,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['existence-check', 'team-goals', currentCompany?.id],
        queryFn: async () => {
          if (!currentCompany?.id) return false;
          
          return requestDeduplicator.deduplicate(
            `team-goals-exist-${currentCompany?.id}`,
            async () => {
              const { data } = await supabase
                .from('team_goals')
                .select('id')
                .limit(1);
              return (data?.length || 0) > 0;
            },
            5 * 60 * 1000
          );
        },
        enabled: !!currentCompany?.id,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['existence-check', 'org-roles', currentCompany?.id],
        queryFn: async () => {
          if (!currentCompany?.id) return false;
          
          return requestDeduplicator.deduplicate(
            `org-roles-exist-${currentCompany?.id}`,
            async () => {
              const { data } = await supabase
                .from('org_roles')
                .select('id')
                .eq('company_id', currentCompany?.id)
                .limit(1);
              return (data?.length || 0) > 0;
            },
            10 * 60 * 1000 // 10 minutes cache (more stable)
          );
        },
        enabled: !!currentCompany?.id,
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ['existence-check', 'strategic-plans', currentCompany?.id],
        queryFn: async () => {
          if (!currentCompany?.id) return false;
          
          return requestDeduplicator.deduplicate(
            `strategic-plans-exist-${currentCompany?.id}`,
            async () => {
              const { data } = await supabase
                .from('strategic_plans')
                .select('id')
                .eq('company_id', currentCompany?.id)
                .eq('is_active', true)
                .limit(1);
              return (data?.length || 0) > 0;
            },
            10 * 60 * 1000 // Strategic plans change infrequently
          );
        },
        enabled: !!currentCompany?.id,
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ['existence-check', 'goals', currentCompany?.id],
        queryFn: async () => {
          if (!currentCompany?.id) return false;
          
          return requestDeduplicator.deduplicate(
            `goals-exist-${currentCompany?.id}`,
            async () => {
              const { data } = await supabase
                .from('team_goals')
                .select('id')
                .eq('is_company_goal', false)
                .limit(1);
              return (data?.length || 0) > 0;
            },
            5 * 60 * 1000
          );
        },
        enabled: !!currentCompany?.id,
        staleTime: 5 * 60 * 1000,
      }
    ],
  });

  // Extract results
  const [
    meetingsQuery,
    weeklyMetricsQuery,
    teamGoalsQuery,
    orgRolesQuery,
    strategicPlansQuery,
    goalsQuery
  ] = queries;

  const existenceCheck: ExistenceCheck = {
    meetings: meetingsQuery.data || false,
    weeklyMetrics: weeklyMetricsQuery.data || false,
    teamGoals: teamGoalsQuery.data || false,
    orgRoles: orgRolesQuery.data || false,
    strategicPlans: strategicPlansQuery.data || false,
    goals: goalsQuery.data || false,
  };

  const loading = queries.some(query => query.isLoading);
  const error = queries.find(query => query.error)?.error;

  return {
    existenceCheck,
    loading,
    error,
    refetch: () => {
      // Invalidate cache and refetch all
      requestDeduplicator.invalidateCache(`${currentCompany?.id}`);
      queries.forEach(query => query.refetch());
    }
  };
};