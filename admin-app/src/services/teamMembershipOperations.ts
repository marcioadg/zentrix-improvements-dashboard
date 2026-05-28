
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface MembershipOperationParams {
  userId: string;
  teamId: string;
  toast: ReturnType<typeof useToast>['toast'];
}

export const addMemberToTeam = async ({ userId, teamId, toast }: MembershipOperationParams): Promise<boolean> => {
  try {
    logger.log('teamMembershipOperations: Attempting to insert team membership...');
    
    // Try the insert with detailed error logging
    const { data: insertData, error: insertError } = await supabase
      .from('team_members')
      .insert({ 
        user_id: userId, 
        team_id: teamId
      })
      .select();

    if (insertError) {
      logger.error('teamMembershipOperations: Insert error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      throw insertError;
    }

    logger.log('teamMembershipOperations: Successfully inserted team member:', insertData);
    
    toast({
      title: "Success",
      description: "User added to team successfully",
    });
    return true;
  } catch (error) {
    logger.error('teamMembershipOperations: Error adding user to team:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to add user to team",
      variant: "destructive",
    });
    return false;
  }
};

export const removeMemberFromTeam = async ({ userId, teamId, toast }: MembershipOperationParams): Promise<boolean> => {
  try {
    logger.log('🔴 teamMembershipOperations.removeMemberFromTeam CALLED with:', { userId, teamId });
    logger.log('🔴 userId type:', typeof userId, 'teamId type:', typeof teamId);
    
    // AUTO-UNASSIGN: Remove user from all team items before deletion
    logger.log('🔴 Calling unassign_member_from_team RPC...');
    const { data: unassignResult, error: unassignError } = await supabase.rpc('unassign_member_from_team', {
      p_user_id: userId,
      p_team_id: teamId
    });

    logger.log('🔴 unassign_member_from_team response:', { data: unassignResult, error: unassignError, dataType: typeof unassignResult });

    if (unassignError) {
      logger.error('🔴 unassign_member_from_team ERROR:', JSON.stringify(unassignError, null, 2));
      toast({
        title: "Error",
        description: `Failed to unassign member items: ${(unassignError as any)?.message || 'Unknown error'}`,
        variant: "destructive",
      });
      return false;
    }

    logger.log('🔴 Unassign result (stringified):', JSON.stringify(unassignResult));
    
    // Proceed with removal
    logger.log('🔴 Calling admin_remove_team_member RPC...');
    const { data, error } = await supabase.rpc('admin_remove_team_member', {
      p_user_id: userId,
      p_team_id: teamId
    });

    logger.log('🔴 admin_remove_team_member response:', { data: JSON.stringify(data), error: error ? JSON.stringify(error) : null, dataType: typeof data });

    if (error) {
      logger.error('🔴 admin_remove_team_member ERROR:', JSON.stringify(error, null, 2));
      
      toast({
        title: "Failed to Remove Member",
        description: `Unable to remove this team member. Error: ${(error as any)?.message || 'Unknown error'}`,
        variant: "destructive",
      });
      return false;
    }

    logger.log('🔴 data?.success:', data?.success, 'data?.error:', data?.error);

    if (data && !data.success) {
      logger.error('🔴 RPC returned success=false:', JSON.stringify(data));
      
      let errorTitle = "Failed to Remove Member";
      let errorDescription = data.error;
      
      // Check for common error patterns
      if (data.error.includes('permission') || data.error.includes('Insufficient')) {
        errorTitle = "Permission Denied";
        errorDescription = "You don't have permission to remove this team member.";
      } else if (data.error.includes('not a member')) {
        errorTitle = "Not a Team Member";
        errorDescription = "This user is not a member of this team.";
      } else if (data.error.includes('foreign key') || data.error.includes('constraint')) {
        errorTitle = "Cannot Remove Member";
        errorDescription = "This member has associated data (goals, tasks, or metrics) that must be handled first. Please reassign or delete their work items before removing them from the team.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
      return false;
    }

    // Build informative success message
    const unassigned = unassignResult as Record<string, number> | null;
    const unassignedParts: string[] = [];
    if (unassigned?.goals_unassigned) unassignedParts.push(`${unassigned.goals_unassigned} goal(s)`);
    if (unassigned?.metrics_unassigned) unassignedParts.push(`${unassigned.metrics_unassigned} metric(s)`);
    if (unassigned?.issues_unassigned) unassignedParts.push(`${unassigned.issues_unassigned} issue(s)`);
    if (unassigned?.kanban_tasks_unassigned || unassigned?.fast_tasks_unassigned) {
      const taskCount = (unassigned?.kanban_tasks_unassigned || 0) + (unassigned?.fast_tasks_unassigned || 0);
      unassignedParts.push(`${taskCount} task(s)`);
    }

    const description = unassignedParts.length > 0
      ? `User removed from team. ${unassignedParts.join(', ')} were unassigned.`
      : 'User removed from team successfully.';

    logger.log('teamMembershipOperations: Successfully removed user from team');
    toast({
      title: "Member Removed",
      description,
    });
    return true;
  } catch (error) {
    logger.error('teamMembershipOperations: Error removing user from team:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to remove user from team",
      variant: "destructive",
    });
    return false;
  }
};

export const checkMemberAssociations = async (userId: string, teamId: string) => {
  try {
    logger.log('teamMembershipOperations: Checking associations for user:', { userId, teamId });
    
    const associations = {
      goals: 0,
      metrics: 0,
      issues: 0,
      tasks: 0
    };

    // Check goals
    const { count: goalsCount } = await supabase
      .from('team_goals')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('team_id', teamId)
      .eq('archived', false)
      .or('is_deleted.is.null,is_deleted.eq.false');

    associations.goals = goalsCount || 0;

    // Check metrics
    const { count: metricsCount } = await supabase
      .from('weekly_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('team_id', teamId)
      .is('deleted_at', null);

    associations.metrics = metricsCount || 0;

    // Check issues
    const { count: issuesCount } = await supabase
      .from('issues')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('team_id', teamId)
      .eq('archived', false)
      .or('is_deleted.is.null,is_deleted.eq.false');

    associations.issues = issuesCount || 0;

    // Check kanban_tasks
    const { count: kanbanCount } = await supabase
      .from('kanban_tasks')
      .select('*', { count: 'exact', head: true })
      .contains('assigned_to', [userId])
      .eq('team_id', teamId)
      .eq('is_archived', false);

    associations.tasks = (kanbanCount || 0);

    // Check fast_tasks
    const { count: fastCount } = await supabase
      .from('fast_tasks')
      .select('*', { count: 'exact', head: true })
      .contains('assigned_to', [userId])
      .eq('team_id', teamId)
      .eq('is_archived', false)
      .or('is_deleted.is.null,is_deleted.eq.false');

    associations.tasks += (fastCount || 0);

    logger.log('teamMembershipOperations: Found associations:', associations);
    
    return associations;
  } catch (error) {
    logger.error('teamMembershipOperations: Error checking associations:', error);
    throw error;
  }
};

export const checkExistingMembership = async (userId: string, teamId: string) => {
  try {
    logger.log('teamMembershipOperations: Checking existing membership...');
    const { data: existingMembership, error: checkError } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (checkError) {
      logger.error('teamMembershipOperations: Error checking existing membership:', checkError);
      throw checkError;
    }

    return existingMembership;
  } catch (error) {
    logger.error('teamMembershipOperations: Error in membership check:', error);
    throw error;
  }
};
