
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSafeUserTeams } from './useSafeUserTeams';
import { useMultiCompanyAccess } from './useMultiCompanyAccess';
import { logger } from '@/utils/logger';

export interface IssueCount {
  id: string;
  name: string;
  shortTermCount: number;
  longTermCount: number;
  totalCount: number;
}

export const useIssueCounts = () => {
  const [issueCounts, setIssueCounts] = useState<IssueCount[]>([]);
  const [loading, setLoading] = useState(true);
  const { teams } = useSafeUserTeams();
  const { currentCompany } = useMultiCompanyAccess();

  // Stabilize dependency values to prevent subscription churn
  const companyId = currentCompany?.id;
  const teamIdsKey = teams.map(t => t.id).sort().join(',');

  const fetchIssueCounts = async () => {
    if (teams.length === 0 || !companyId) {
      setIssueCounts([]);
      setLoading(false);
      return;
    }

    const companyIdForQuery = companyId;

    // Filter teams by current company
    const currentCompanyTeams = teams.filter(team => team.company_id === companyIdForQuery);
    
    if (currentCompanyTeams.length === 0) {
      logger.log('useIssueCounts: No teams found for current company');
      setIssueCounts([]);
      setLoading(false);
      return;
    }

    logger.log('useIssueCounts: Fetching issue counts for current company teams:', currentCompanyTeams.map(t => ({ id: t.id, name: t.name, company: t.company_id })));

    try {
      const teamIds = currentCompanyTeams.map(team => team.id);
      
      // Fetch counts for all teams at once with proper filtering
      const { data: issues, error } = await supabase
        .from('issues')
        .select('team_id, issue_type, status, archived')
        .in('team_id', teamIds)
        .eq('status', 'open')
        .neq('archived', true);

      if (error) {
        logger.error('useIssueCounts: Error fetching issues:', error);
        throw error;
      }

      logger.log('useIssueCounts: Raw issues data:', issues);

      // Group issues by team and type
      const countsMap = new Map<string, { shortTerm: number; longTerm: number }>();
      
      // Initialize all teams with zero counts
      currentCompanyTeams.forEach(team => {
        countsMap.set(team.id, { shortTerm: 0, longTerm: 0 });
      });

      // Count issues
      issues?.forEach(issue => {
        const teamCount = countsMap.get(issue.team_id);
        if (teamCount) {
          if (issue.issue_type === 'short_term') {
            teamCount.shortTerm++;
          } else if (issue.issue_type === 'long_term') {
            teamCount.longTerm++;
          }
        }
      });

      // Convert to final format
      const counts: IssueCount[] = currentCompanyTeams.map(team => {
        const teamCount = countsMap.get(team.id) || { shortTerm: 0, longTerm: 0 };
        return {
          id: team.id,
          name: team.name,
          shortTermCount: teamCount.shortTerm,
          longTermCount: teamCount.longTerm,
          totalCount: teamCount.shortTerm + teamCount.longTerm,
        };
      });

      logger.log('useIssueCounts: Final counts:', counts);
      setIssueCounts(counts);
    } catch (error) {
      logger.error('useIssueCounts: Exception fetching issue counts:', error);
      setIssueCounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueCounts();
  }, [teamIdsKey, companyId]);

  // Set up real-time subscription to update counts
  useEffect(() => {
    if (!teamIdsKey || !companyId) return;

    // Filter teams by current company for subscription
    const currentCompanyTeams = teams.filter(team => team.company_id === companyId);
    if (currentCompanyTeams.length === 0) return;

    const teamIds = currentCompanyTeams.map(t => t.id);
    const channelName = `issue_counts_${companyId}_${teamIds.join('_')}`;
    
    logger.log('useIssueCounts: Setting up real-time subscription for current company teams');
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
          filter: `team_id=in.(${teamIds.join(',')})`,
        },
        (payload) => {
          logger.log('useIssueCounts: Real-time change detected:', payload);
          // Refetch counts when issues change
          fetchIssueCounts();
        }
      )
      .subscribe((status) => {
        logger.log('useIssueCounts: Subscription status:', status);
      });

    return () => {
      logger.log('useIssueCounts: Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [teamIdsKey, companyId]);

  const getDefaultSelection = () => {
    logger.log('🔍 useIssueCounts: getDefaultSelection called', { 
      issueCountsLength: issueCounts.length, 
      teamsLength: teams.length,
      issueCounts: issueCounts.map(ic => ({ id: ic.id, name: ic.name, total: ic.totalCount }))
    });
    
    // If no issue counts but we have teams, use the first team as fallback
    if (issueCounts.length === 0) {
      const currentCompanyTeams = teams.filter(team => companyId && team.company_id === companyId);
      if (currentCompanyTeams.length > 0) {
        logger.log('🔍 useIssueCounts: No issue counts but teams exist, using first team as fallback');
        return { 
          teamId: currentCompanyTeams[0].id, 
          issueType: 'short_term' as const 
        };
      }
      logger.log('🔍 useIssueCounts: No issue counts and no teams, returning empty');
      return { teamId: '', issueType: 'short_term' as const };
    }

    // Find team with most issues
    const teamWithMostIssues = issueCounts.reduce((max, current) => 
      current.totalCount > max.totalCount ? current : max
    );

    // Prefer short-term if it has issues, otherwise long-term
    const issueType = teamWithMostIssues.shortTermCount > 0 ? 'short_term' : 'long_term';

    logger.log('🔍 useIssueCounts: Returning default selection', {
      teamId: teamWithMostIssues.id,
      teamName: teamWithMostIssues.name,
      issueType,
      shortTermCount: teamWithMostIssues.shortTermCount,
      longTermCount: teamWithMostIssues.longTermCount
    });

    return {
      teamId: teamWithMostIssues.id,
      issueType: issueType as 'short_term' | 'long_term'
    };
  };

  return {
    issueCounts,
    loading,
    refetch: fetchIssueCounts,
    getDefaultSelection,
  };
};
