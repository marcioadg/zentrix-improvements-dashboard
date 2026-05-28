import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TeamGoal } from './useTeamGoals';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface UseBulkArchiveGoalsProps {
  teamId: string;
  companyId: string;
  refetchTeamGoals: () => Promise<void>;
  refetchCompanyGoals: () => Promise<void>;
}

/**
 * Hook for bulk archiving completed goals - SIMPLE RELOAD APPROACH
 * SAFETY: Only archives goals with status 'complete' from BOTH team and company goals
 * - Archives goals in database
 * - Reloads both lists to show updated state
 * - Shows toast with "Undo All" action
 * - Provides undo functionality to restore and reload
 */
export const useBulkArchiveGoals = ({ 
  teamId,
  companyId,
  refetchTeamGoals,
  refetchCompanyGoals
}: UseBulkArchiveGoalsProps) => {
  const [isArchiving, setIsArchiving] = useState(false);

  // Fetch completed goals FRESH from database at click-time
  const fetchCompletedGoals = useCallback(async () => {
    logger.log('🔍 Fetching fresh completed goals from database...');
    
    // Query team goals that are complete and not archived
    const { data: teamData, error: teamError } = await supabase
      .from('team_goals')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'complete')
      .eq('is_company_goal', false)
      .or('archived.is.null,archived.eq.false');
    
    if (teamError) {
      logger.error('Error fetching team goals:', teamError);
    }
    
    // Query company goals that are complete and not archived
    const { data: companyData, error: companyError } = await supabase
      .from('team_goals')
      .select('*, teams!inner(company_id)')
      .eq('teams.company_id', companyId)
      .eq('status', 'complete')
      .eq('is_company_goal', true)
      .or('archived.is.null,archived.eq.false');
    
    if (companyError) {
      logger.error('Error fetching company goals:', companyError);
    }
    
    const teamGoals = (teamData || []) as TeamGoal[];
    const companyGoals = (companyData || []) as TeamGoal[];
    
    logger.log('📊 Fresh data from database:', {
      teamGoalsCount: teamGoals.length,
      companyGoalsCount: companyGoals.length,
      teamGoalIds: teamGoals.map(g => g.id),
      companyGoalIds: companyGoals.map(g => g.id)
    });
    
    return { teamGoals, companyGoals };
  }, [teamId, companyId]);

  // Archive goals in database sequentially
  const archiveInDatabase = useCallback(async (goals: TeamGoal[]) => {
    let successCount = 0;
    let failCount = 0;

    for (const goal of goals) {
      try {
        const { error } = await supabase
          .from('team_goals')
          .update({ 
            archived: true,
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', goal.id);

        if (error) throw error;
        successCount++;
      } catch (error) {
        logger.error(`Failed to archive goal ${goal.id}:`, error);
        failCount++;
      }
    }

    return { successCount, failCount };
  }, []);

  // Restore goals in database
  const restoreInDatabase = useCallback(async (goals: TeamGoal[]) => {
    for (const goal of goals) {
      try {
        await supabase
          .from('team_goals')
          .update({ 
            archived: false,
            archived_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', goal.id);
      } catch (error) {
        logger.error(`Failed to restore goal ${goal.id}:`, error);
      }
    }
  }, []);

  // Undo function - restores all archived goals and reloads lists
  const undoArchiveAll = useCallback(async (snapshot: { team: TeamGoal[]; company: TeamGoal[] }) => {
    logger.log('🔄 Undoing bulk archive:', snapshot);
    
    // 1. Restore goals in database
    await restoreInDatabase([...snapshot.team, ...snapshot.company]);

    // 2. Reload both lists to show restored goals
    await Promise.all([
      refetchTeamGoals(),
      refetchCompanyGoals()
    ]);

    // 3. Show success feedback
    toast.success("Goals Restored", {
      description: `${snapshot.team.length + snapshot.company.length} goals restored`
    });
  }, [restoreInDatabase, refetchTeamGoals, refetchCompanyGoals]);

  const archiveAllCompleted = async () => {
    // Fetch FRESH completed goals from database
    const { teamGoals: completedTeam, companyGoals: completedCompany } = 
      await fetchCompletedGoals();
    
    const completedGoals = [...completedCompany, ...completedTeam];
    
    if (completedGoals.length === 0) {
      toast.info("No completed goals", {
        description: "There are no completed goals to archive"
      });
      return;
    }

    // 1. Create snapshot for undo functionality
    const snapshot = { team: completedTeam, company: completedCompany };

    logger.log('📦 Bulk archiving:', { 
      teamCount: completedTeam.length, 
      companyCount: completedCompany.length 
    });

    // 2. Show loading and archive in database
    setIsArchiving(true);
    const { successCount, failCount } = await archiveInDatabase(completedGoals);
    setIsArchiving(false);

    // 3. Reload both lists to show updated state
    await Promise.all([
      refetchTeamGoals(),
      refetchCompanyGoals()
    ]);

    // 4. Show success toast with Undo All action
    toast.success(`${completedGoals.length} goal${completedGoals.length !== 1 ? 's' : ''} archived`, {
      action: {
        label: "Undo All",
        onClick: () => undoArchiveAll(snapshot)
      },
      duration: 5000
    });

    logger.log('✅ Bulk archive complete:', { successCount, failCount });
    
    if (failCount > 0) {
      toast.warning("Partial Success", {
        description: `${successCount} archived, ${failCount} failed. Check console for details.`
      });
    }
  };

  return {
    archiveAllCompleted,
    isArchiving
  };
};
