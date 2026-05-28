import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useIssuesTeamSelection } from '@/hooks/useIssuesTeamSelection';
import { logger } from '@/utils/logger';

export interface IssueCount {
  id: string;
  name: string;
  shortTermCount: number;
  longTermCount: number;
  totalCount: number;
}

interface UseSimplifiedIssuesProps {
  teams: Array<{ id: string; name: string; company_id: string }>;
}

export const useSimplifiedIssues = ({ teams }: UseSimplifiedIssuesProps) => {
  const { currentCompany } = useMultiCompany();
  
  // Filter teams for current company
  const currentCompanyTeams = teams.filter(
    team => currentCompany?.id && team.company_id === currentCompany?.id
  );

  // Use persistent team selection
  const { selectedTeamId, setSelectedTeamId } = useIssuesTeamSelection(currentCompanyTeams);
  const [selectedIssueType, setSelectedIssueType] = useState<'short_term' | 'long_term'>('short_term');
  // Issue counts query
  const {
    data: issueCounts = [],
    isLoading: countsLoading,
    error: countsError,
    refetch: refetchCounts
  } = useQuery({
    queryKey: ['simplified-issue-counts', currentCompany?.id, currentCompanyTeams.map(t => t.id)],
    queryFn: async (): Promise<IssueCount[]> => {
      if (currentCompanyTeams.length === 0) {
        logger.log('useSimplifiedIssues: No teams for current company');
        return [];
      }

      logger.log('useSimplifiedIssues: Fetching issue counts for teams:', currentCompanyTeams.length);

      const teamIds = currentCompanyTeams.map(team => team.id);
      
      // Fetch all open issues from current company teams only
      // Using team_id.in already scopes to the current company since teamIds
      // only contains teams from currentCompany - no need for separate is_public filter
      const { data: issues, error } = await supabase
        .from('issues')
        .select('team_id, issue_type, status, archived, is_public')
        .in('team_id', teamIds)
        .eq('status', 'open')
        .neq('archived', true);

      if (error) {
        logger.error('useSimplifiedIssues: Error fetching issues:', error);
        throw error;
      }

      // Count issues by team and type
      const countsMap = new Map<string, { shortTerm: number; longTerm: number }>();
      
      // Initialize all teams
      currentCompanyTeams.forEach(team => {
        countsMap.set(team.id, { shortTerm: 0, longTerm: 0 });
      });

      // Count team-specific issues
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

      // Count public issues separately (these show on every team)
      const publicIssues = issues?.filter(issue => issue.is_public === true) || [];
      const publicCounts = {
        shortTerm: publicIssues.filter(issue => issue.issue_type === 'short_term').length,
        longTerm: publicIssues.filter(issue => issue.issue_type === 'long_term').length,
      };

      logger.log('useSimplifiedIssues: Public issues found:', {
        shortTerm: publicCounts.shortTerm,
        longTerm: publicCounts.longTerm,
        total: publicCounts.shortTerm + publicCounts.longTerm
      });

      // Convert to final format, adding public counts to each team
      const counts: IssueCount[] = currentCompanyTeams.map(team => {
        const teamCount = countsMap.get(team.id) || { shortTerm: 0, longTerm: 0 };
        // Add public counts to each team's totals
        const finalShortTerm = teamCount.shortTerm + publicCounts.shortTerm;
        const finalLongTerm = teamCount.longTerm + publicCounts.longTerm;
        
        return {
          id: team.id,
          name: team.name,
          shortTermCount: finalShortTerm,
          longTermCount: finalLongTerm,
          totalCount: finalShortTerm + finalLongTerm,
        };
      });

      logger.log('useSimplifiedIssues: Issue counts calculated:', counts.length);
      return counts;
    },
    enabled: currentCompanyTeams.length > 0,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });


  // Update issue type preference when counts become available
  useEffect(() => {
    if (issueCounts.length > 0 && selectedTeamId) {
      const selectedTeamCounts = issueCounts.find(team => team.id === selectedTeamId);
      if (selectedTeamCounts && selectedTeamCounts.shortTermCount === 0 && selectedTeamCounts.longTermCount > 0) {
        setSelectedIssueType('long_term');
      }
    }
  }, [issueCounts, selectedTeamId]);

  // Real-time subscription for issue changes
  useEffect(() => {
    if (currentCompanyTeams.length === 0) return;

    const teamIds = currentCompanyTeams.map(t => t.id);
    const channelName = `simplified_issues_${currentCompany?.id}`;
    
    logger.log('useSimplifiedIssues: Setting up real-time subscription');
    
    // Debounce refetch to prevent excessive re-renders
    let debounceTimeout: NodeJS.Timeout;
    
    const debouncedRefetch = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        logger.log('useSimplifiedIssues: Debounced refetch executing');
        refetchCounts();
      }, 250);
    };
    
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
          logger.log('useSimplifiedIssues: Real-time change detected');
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      logger.log('useSimplifiedIssues: Cleaning up subscription');
      clearTimeout(debounceTimeout);
      supabase.removeChannel(channel);
    };
  }, [currentCompanyTeams, currentCompany?.id, refetchCounts]);

  const selectTeam = useCallback((teamId: string, issueType?: 'short_term' | 'long_term') => {
    setSelectedTeamId(teamId);
    if (issueType) {
      setSelectedIssueType(issueType);
    }
  }, []);

  return {
    issueCounts,
    selectedTeamId,
    selectedIssueType,
    loading: countsLoading,
    error: countsError?.message || null,
    selectTeam,
    setSelectedIssueType,
    refetchCounts,
  };
};