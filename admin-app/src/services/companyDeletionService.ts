
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CompanyDeletionResult {
  success: boolean;
  message: string;
  deletedCounts?: {
    teamMembers: number;
    teams: number;
    companyMembers: number;
    userSettings: number;
    kanbanTasks: number;
    weeklyMetrics: number;
    goals: number;
    teamGoals: number;
    tasks: number;
    teamTasks: number;
    issues: number;
    headlines: number;
  };
}

export const deleteCompanyCompletely = async (companyId: string): Promise<CompanyDeletionResult> => {
  logger.log('companyDeletionService: Starting cascade deletion for company:', companyId);
  
  try {
    const deletedCounts = {
      teamMembers: 0,
      teams: 0,
      companyMembers: 0,
      userSettings: 0,
      kanbanTasks: 0,
      weeklyMetrics: 0,
      goals: 0,
      teamGoals: 0,
      tasks: 0,
      teamTasks: 0,
      issues: 0,
      headlines: 0,
    };

    // IMPROVED: With the new foreign key constraint (ON DELETE SET NULL),
    // we no longer need to manually clear current_company_id as it will be handled automatically
    // However, we still count how many user settings were affected for reporting
    const { data: affectedSettings, error: settingsCountError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('current_company_id', companyId);

    if (settingsCountError) {
      logger.warn('companyDeletionService: Error counting affected user settings:', settingsCountError);
    } else {
      deletedCounts.userSettings = affectedSettings?.length || 0;
      logger.log('companyDeletionService: Found', deletedCounts.userSettings, 'user settings that will be updated');
    }

    // First, get all teams in the company
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .eq('company_id', companyId);

    if (teamsError) {
      logger.error('companyDeletionService: Error fetching teams:', teamsError);
      throw new Error(`Failed to fetch teams: ${teamsError.message}`);
    }

    const teamIds = teams?.map(t => t.id) || [];
    logger.log('companyDeletionService: Found teams to delete:', teamIds.length);

    // Get all users in the company
    const { data: companyMembers, error: membersError } = await supabase
      .from('company_members')
      .select('user_id')
      .eq('company_id', companyId);

    if (membersError) {
      logger.error('companyDeletionService: Error fetching company members:', membersError);
      throw new Error(`Failed to fetch company members: ${membersError.message}`);
    }

    const userIds = companyMembers?.map(m => m.user_id).filter(id => id !== null) || [];
    logger.log('companyDeletionService: Found users to clean up:', userIds.length);

    // Delete in the correct order to respect foreign key constraints

    // 1. Delete team-related data using the cascade delete function
    if (teamIds.length > 0) {
      logger.log('companyDeletionService: Deleting teams using cascade delete...');
      
      for (const teamId of teamIds) {
        const { data: result, error: deleteError } = await supabase
          .rpc('delete_team_cascade', { p_team_id: teamId });

        if (deleteError) {
          logger.error('companyDeletionService: Error deleting team via cascade:', deleteError);
          throw new Error(`Failed to delete team ${teamId}: ${deleteError.message}`);
        }

        if (!result?.success) {
          const errorMsg = result?.error || 'Unknown error during team deletion';
          logger.error('companyDeletionService: Team cascade delete failed:', errorMsg);
          throw new Error(`Failed to delete team ${teamId}: ${errorMsg}`);
        }

        logger.log('companyDeletionService: Successfully deleted team:', teamId);
      }
      
      deletedCounts.teams = teamIds.length;
      deletedCounts.teamMembers = teamIds.length; // Approximate - cascade function handles this
    }

    // 2. Delete user data for users in this company
    // CRITICAL: All queries must include company_id filter to prevent cross-company data deletion
    if (userIds.length > 0) {
      // Delete personal goals - filter by team's company_id via subquery
      // Goals belong to teams, so we delete goals where the team belongs to this company
      const { error: goalsError } = await supabase
        .from('team_goals')
        .delete()
        .in('owner_id', userIds)
        .eq('is_company_goal', false)
        .in('team_id', teamIds);

      if (goalsError) {
        logger.error('companyDeletionService: Error deleting goals:', goalsError);
        throw new Error(`Failed to delete goals: ${goalsError.message}`);
      }

      // Note: 'tasks' table no longer exists - it was replaced by 'fast_tasks'
      // Delete fast_tasks personal tasks - scope to this company only
      const { error: fastPersonalTasksError } = await supabase
        .from('fast_tasks')
        .delete()
        .eq('task_type', 'personal')
        .in('user_id', userIds)
        .eq('company_id', companyId);

      if (fastPersonalTasksError) {
        logger.error('companyDeletionService: Error deleting fast_tasks personal tasks:', fastPersonalTasksError);
        throw new Error(`Failed to delete fast_tasks personal tasks: ${fastPersonalTasksError.message}`);
      }

      // Note: kanban_tasks table was dropped in migration 20251120001957
      // All kanban tasks were migrated to fast_tasks, which is already handled above

      // Delete user weekly metrics - scope to teams in this company only
      const { error: userMetricsError } = await supabase
        .from('weekly_metrics')
        .delete()
        .in('user_id', userIds)
        .in('team_id', teamIds);

      if (userMetricsError) {
        logger.error('companyDeletionService: Error deleting user metrics:', userMetricsError);
        throw new Error(`Failed to delete user metrics: ${userMetricsError.message}`);
      }

      // Note: company_id column no longer exists in profiles table
      // Company associations are now managed through company_members table
    }

    // 3. Delete company_members, user_billing_events, and company using RPC function
    // The RPC function safely disables triggers that insert into user_billing_events,
    // deletes company_members, re-enables triggers, deletes user_billing_events, and finally deletes the company
    const { data: deleteResult, error: deleteError } = await supabase
      .rpc('delete_company_cascade', { p_company_id: companyId });

    if (deleteError) {
      logger.error('companyDeletionService: Error deleting company via RPC:', deleteError);
      throw new Error(`Failed to delete company: ${deleteError.message}`);
    }

    if (!deleteResult?.success) {
      const errorMsg = deleteResult?.error || 'Unknown error during company deletion';
      logger.error('companyDeletionService: Company cascade delete failed:', errorMsg);
      throw new Error(`Failed to delete company: ${errorMsg}`);
    }

    deletedCounts.companyMembers = userIds.length;
    logger.log('companyDeletionService: Company deleted successfully via RPC function');

    logger.log('companyDeletionService: Company deletion completed successfully');
    
    return {
      success: true,
      message: 'Company and all associated data deleted successfully',
      deletedCounts
    };

  } catch (error) {
    logger.error('companyDeletionService: Company deletion failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred during deletion'
    };
  }
};
