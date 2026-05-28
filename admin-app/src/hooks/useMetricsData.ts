
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { getWeekStartsForPeriod } from '@/lib/weekUtils';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { fetchMetricsData } from '@/services/metricDataService';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useMetricsRealtime } from '@/hooks/useMetricsRealtime';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useMetricsData = (
  teamId?: string, 
  timePeriod: string = 'last_13_weeks', 
  customRange?: { start: Date; end: Date }
) => {
  const { user } = useAuth();
  const { currentCompany, loading: companyLoading } = useMultiCompany();
  const { settings } = useSettings();
  const { toast } = useToast();
  const { teams } = useUserTeams();
  const [metrics, setMetrics] = useState<WeeklyMetricWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deletionInProgress = useRef(false);
  const [teamCompanyInfo, setTeamCompanyInfo] = useState<{ id: string; name: string } | null>(null);
  
  // Track previous company ID to detect actual company changes
  const previousCompanyIdRef = useRef<string | null>(null);

  // Get user's preferred week start day, default to sunday if not set
  const weekStartDay = settings?.week_start_day || 'sunday';

  const getLast13WeeksStartDates = useCallback((overrideWeekStartDay?: 'monday' | 'sunday') => {
    const effectiveWeekStartDay = overrideWeekStartDay || weekStartDay;
    return getWeekStartsForPeriod(timePeriod, customRange, effectiveWeekStartDay);
  }, [timePeriod, customRange, weekStartDay]);

  // Clear metrics data when company changes
  useEffect(() => {
    const currentCompanyId = currentCompany?.id || null;
    const previousCompanyId = previousCompanyIdRef.current;
    
    if (previousCompanyId !== null && previousCompanyId !== currentCompanyId) {
      logger.log('useMetricsData: Company changed from', previousCompanyId, 'to', currentCompanyId, '- clearing metrics');
      setMetrics([]);
      setError(null);
      setTeamCompanyInfo(null);
      setLoading(true);
    }
    
    previousCompanyIdRef.current = currentCompanyId;
  }, [currentCompany?.id]);

  // Fetch team's company information if we have a teamId but no current company
  useEffect(() => {
    const fetchTeamCompany = async () => {
      if (teamId && !currentCompany && !companyLoading) {
        try {
          const { data: teamData, error } = await supabase
            .from('teams')
            .select(`
              company_id,
              companies!inner(id, name)
            `)
            .eq('id', teamId)
            .single();

          if (error) throw error;

          if (teamData?.companies) {
            // Fix array access for companies relationship
            const companiesArray = Array.isArray(teamData.companies) ? teamData.companies : [teamData.companies];
            const company = companiesArray?.[0];
            
            if (company) {
              setTeamCompanyInfo({
                id: company.id,
                name: company.name
              });
            }
          }
        } catch (error) {
          logger.error('useMetricsData: Error fetching team company:', error);
        }
      }
    };

    fetchTeamCompany();
  }, [teamId, currentCompany, companyLoading]);

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      logger.log('useMetricsData: No user, clearing metrics');
      setMetrics([]);
      setLoading(false);
      return;
    }

    // Wait for company context to load, unless we have team company info
    if (companyLoading && !teamCompanyInfo) {
      logger.log('useMetricsData: Company context still loading');
      return;
    }

    const effectiveCompany = currentCompany || teamCompanyInfo;
    
    if (!effectiveCompany) {
      logger.log('useMetricsData: No company context available, clearing metrics');
      setMetrics([]);
      setLoading(false);
      return;
    }

    // If we have a specific teamId, validate it belongs to the effective company
    if (teamId) {
      // Check if the team exists in our teams list (filtered by current company)
      const userTeamIds = teams.map(t => t.id);
      const hasTeamAccess = userTeamIds.includes(teamId);
      
      // If user doesn't have access through teams list, check if team belongs to effective company
      if (!hasTeamAccess) {
        try {
          const { data: teamData, error } = await supabase
            .from('teams')
            .select('company_id')
            .eq('id', teamId)
            .single();

          if (error || !teamData || teamData.company_id !== effectiveCompany.id) {
            logger.log('useMetricsData: Team does not belong to effective company:', teamId, 'clearing metrics');
            setMetrics([]);
            setError('Selected team does not belong to current company');
            setLoading(false);
            return;
          }
        } catch (error) {
          logger.error('useMetricsData: Error validating team access:', error);
          setMetrics([]);
          setError('Error validating team access');
          setLoading(false);
          return;
        }
      }
    } else {
      // No specific team requested, check if user has any teams in effective company
      if (teams.length === 0) {
        logger.log('useMetricsData: User has no teams in effective company, clearing metrics');
        setMetrics([]);
        setLoading(false);
        return;
      }
    }

    // Skip fetching if deletion is in progress to avoid interference
    if (deletionInProgress.current) {
      logger.log('useMetricsData: Skipping fetch due to deletion in progress');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      logger.log('useMetricsData: Fetching metrics data for company:', effectiveCompany.name, 'team:', teamId, 'weekStartDay:', weekStartDay);
      const fetchedMetrics = await fetchMetricsData(
        user.id,
        teamId,
        timePeriod,
        customRange,
        getLast13WeeksStartDates
      );
      logger.log('useMetricsData: Fetched metrics for company:', effectiveCompany.name, fetchedMetrics.length);
      setMetrics(fetchedMetrics);
      setError(null);
    } catch (err) {
      logger.error('useMetricsData: Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany, teamCompanyInfo, teamId, timePeriod, customRange, getLast13WeeksStartDates, teams, companyLoading, weekStartDay]);

  // Set up real-time subscription
  useMetricsRealtime(teamId, metrics, setMetrics, fetchMetrics);

  // Refresh when dependencies change (including weekStartDay)
  useEffect(() => {
    logger.log('useMetricsData: Dependencies changed, fetching metrics. weekStartDay:', weekStartDay);
    fetchMetrics();
    
    // Set up auto-refresh for weekly progression, but only if no deletion is in progress
    const interval = setInterval(() => {
      if (timePeriod === 'last_13_weeks' && !deletionInProgress.current) {
        logger.log('useMetricsData: Auto-refresh triggered');
        fetchMetrics();
      }
    }, 60 * 60 * 1000); // Refresh every hour

    return () => clearInterval(interval);
  }, [fetchMetrics, timePeriod]);

  return {
    metrics,
    setMetrics,
    loading,
    error,
    fetchMetrics,
    getLast13WeeksStartDates,
    deletionInProgress
  };
};
