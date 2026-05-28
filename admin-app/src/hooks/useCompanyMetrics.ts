import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

interface CompanyTeam {
  id: string;
  name: string;
  company_id: string;
}

interface CompanyMetric {
  id: string;
  metric_name: string;
  owner_id: string;
  owner_name: string;
  team_id: string;
  team_name: string;
  unit: string;
  target_value: number;
  created_at: string;
  updated_at: string;
}

interface CompanyData {
  teams: CompanyTeam[];
  metrics: CompanyMetric[];
}

export const useCompanyMetrics = () => {
  const { currentCompany } = useMultiCompany();
  const { user } = useAuth();

  const fetchCompanyData = useCallback(async (): Promise<CompanyData> => {
    if (!user || !currentCompany) {
      logger.log('❌ useCompanyMetrics: No user or company:', { user: !!user, company: !!currentCompany });
      return { teams: [], metrics: [] };
    }

    logger.log('🔍 Fetching company data for:', {
      userId: user.id,
      companyId: currentCompany?.id,
      companyName: currentCompany?.name
    });

    // Step 1: Get teams where the current user is a member
    const { data: userTeamMemberships, error: membershipError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams!inner (
          id,
          name,
          company_id
        )
      `)
      .eq('user_id', user.id)
      .eq('teams.company_id', currentCompany?.id);

    if (membershipError) {
      logger.error('❌ Team membership fetch error:', membershipError);
      throw new Error(`Failed to fetch team memberships: ${membershipError.message}`);
    }

    logger.log('✅ User team memberships fetched:', userTeamMemberships?.length || 0, 'teams');
    
    const formattedTeams: CompanyTeam[] = (userTeamMemberships || []).map(membership => ({
      id: membership.team_id,
      name: (membership as any).teams.name,
      company_id: (membership as any).teams.company_id
    }));

    if (!userTeamMemberships || userTeamMemberships.length === 0) {
      logger.log('⚠️ User is not a member of any teams in this company');
      return { teams: formattedTeams, metrics: [] };
    }

    // Step 2: Fetch metrics and profiles in PARALLEL for performance
    const userTeamIds = userTeamMemberships.map(m => m.team_id);
    logger.log('📊 Fetching metrics for team IDs:', userTeamIds);

    const [metricsResult, profilesResult] = await Promise.all([
      supabase
        .from('weekly_metrics')
        .select('id, metric_name, owner_id, team_id, unit, target_value, created_at, updated_at')
        .in('team_id', userTeamIds)
        .is('deleted_at', null)
        .order('metric_name'),
      // Fetch all profiles upfront to avoid sequential query
      supabase
        .from('profiles')
        .select('id, full_name, email')
    ]);

    if (metricsResult.error) {
      logger.error('❌ Metrics fetch error:', metricsResult.error);
      throw new Error(`Failed to fetch metrics: ${metricsResult.error.message}`);
    }

    const metricsData = metricsResult.data || [];
    const profilesData = profilesResult.data || [];

    logger.log('✅ Raw metrics fetched:', metricsData.length, 'records');

    if (metricsData.length === 0) {
      logger.log('⚠️ No metrics found');
      return { teams: formattedTeams, metrics: [] };
    }

    // Step 3: Process and deduplicate metrics efficiently
    logger.log('🔄 Processing metrics...');
    const uniqueMetrics = new Map();
    
    // Create lookup maps for better performance
    const teamLookup = new Map(formattedTeams.map(t => [t.id, t]));
    const profileLookup = new Map(profilesData.map(p => [p.id, p]));
    
    metricsData.forEach((metric) => {
      const key = `${metric.metric_name}-${metric.owner_id}-${metric.team_id}`;
      
      if (!uniqueMetrics.has(key)) {
        const team = teamLookup.get(metric.team_id);
        const profile = profileLookup.get(metric.owner_id);
        
        uniqueMetrics.set(key, {
          id: metric.id,
          metric_name: metric.metric_name,
          owner_id: metric.owner_id,
          owner_name: profile?.full_name || profile?.email || 'Unknown Owner',
          team_id: metric.team_id,
          team_name: team?.name || 'Unknown Team',
          unit: metric.unit || 'number',
          target_value: metric.target_value || 0,
          created_at: metric.created_at,
          updated_at: metric.updated_at,
        });
      }
    });

    const processedMetrics = Array.from(uniqueMetrics.values());
    logger.log('✅ Processed metrics:', processedMetrics.length, 'unique metrics');

    return { teams: formattedTeams, metrics: processedMetrics };
  }, [user, currentCompany]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['company-metrics', currentCompany?.id],
    queryFn: fetchCompanyData,
    enabled: !!user && !!currentCompany,
    staleTime: 2 * 60 * 1000, // 2 minutes - prevents redundant fetches
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    retry: 1,
  });

  return {
    teams: data?.teams ?? [],
    metrics: data?.metrics ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch
  };
};
