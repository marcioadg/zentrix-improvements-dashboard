
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface TransferResult {
  success: boolean;
  message: string;
  transferredCounts?: {
    goals: number;
    tasks: number;
    kanbanTasks: number;
    teamGoals: number;
    teamTasks: number;
    metricsOwnership: number;
    issuesOwnership: number;
  };
}

export const transferUserData = async (fromUserId: string, toUserId: string): Promise<TransferResult> => {
  logger.log('userDataTransferService: Starting data transfer from:', fromUserId, 'to:', toUserId);
  
  try {
    const transferredCounts = {
      goals: 0,
      tasks: 0,
      kanbanTasks: 0,
      teamGoals: 0,
      teamTasks: 0,
      metricsOwnership: 0,
      issuesOwnership: 0,
    };

    // Verify target user exists and is not inactive
    const { data: targetUser, error: targetUserError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', toUserId)
      .single();

    if (targetUserError || !targetUser) {
      throw new Error('Target user not found or inaccessible');
    }

    if (targetUser.role === 'inactive') {
      throw new Error('Cannot transfer data to an inactive user');
    }

    logger.log('userDataTransferService: Target user verified:', targetUser.full_name);

    // Transfer personal goals (now in team_goals table)
    const { data: goalsData, error: goalsError } = await supabase
      .from('team_goals')
      .update({ owner_id: toUserId })
      .eq('owner_id', fromUserId)
      .eq('is_company_goal', false)
      .select();

    if (goalsError) {
      logger.error('userDataTransferService: Error transferring goals:', goalsError);
      throw new Error(`Failed to transfer goals: ${goalsError.message}`);
    }

    transferredCounts.goals = goalsData?.length || 0;
    logger.log('userDataTransferService: Transferred', transferredCounts.goals, 'goals');

    // Transfer personal tasks (both legacy tasks and fast_tasks)
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .update({ user_id: toUserId })
      .eq('user_id', fromUserId)
      .select();

    if (tasksError) {
      logger.error('userDataTransferService: Error transferring tasks:', tasksError);
      throw new Error(`Failed to transfer tasks: ${tasksError.message}`);
    }

    // Also transfer fast_tasks personal tasks
    const { data: fastTasksData, error: fastTasksError } = await supabase
      .from('fast_tasks')
      .update({ user_id: toUserId })
      .eq('user_id', fromUserId)
      .eq('task_type', 'personal')
      .select();

    if (fastTasksError) {
      logger.error('userDataTransferService: Error transferring fast_tasks:', fastTasksError);
      throw new Error(`Failed to transfer fast_tasks: ${fastTasksError.message}`);
    }

    transferredCounts.tasks = (tasksData?.length || 0) + (fastTasksData?.length || 0);
    logger.log('userDataTransferService: Transferred', transferredCounts.tasks, 'tasks');

    // Transfer personal kanban tasks (where team_id is null)
    const { data: kanbanTasksData, error: kanbanTasksError } = await supabase
      .from('kanban_tasks')
      .update({ user_id: toUserId })
      .eq('user_id', fromUserId)
      .is('team_id', null)
      .select();

    if (kanbanTasksError) {
      logger.error('userDataTransferService: Error transferring kanban tasks:', kanbanTasksError);
      throw new Error(`Failed to transfer kanban tasks: ${kanbanTasksError.message}`);
    }

    transferredCounts.kanbanTasks = kanbanTasksData?.length || 0;
    logger.log('userDataTransferService: Transferred', transferredCounts.kanbanTasks, 'kanban tasks');

    // Transfer team goals ownership
    const { data: teamGoalsData, error: teamGoalsError } = await supabase
      .from('team_goals')
      .update({ owner_id: toUserId })
      .eq('owner_id', fromUserId)
      .select();

    if (teamGoalsError) {
      logger.error('userDataTransferService: Error transferring team goals ownership:', teamGoalsError);
      throw new Error(`Failed to transfer team goals ownership: ${teamGoalsError.message}`);
    }

    transferredCounts.teamGoals = teamGoalsData?.length || 0;
    logger.log('userDataTransferService: Transferred ownership of', transferredCounts.teamGoals, 'team goals');

    // Transfer team tasks assignments (both legacy team_tasks and fast_tasks)
    const { data: teamTasksData, error: teamTasksError } = await supabase
      .from('team_tasks')
      .update({ assigned_to: toUserId })
      .eq('assigned_to', fromUserId)
      .select();

    if (teamTasksError) {
      logger.error('userDataTransferService: Error transferring team tasks assignments:', teamTasksError);
      throw new Error(`Failed to transfer team tasks assignments: ${teamTasksError.message}`);
    }

    // Also transfer fast_tasks team assignments
    const { data: fastTeamTasksData, error: fastTeamTasksError } = await supabase
      .from('fast_tasks')
      .update({ assigned_to: toUserId })
      .eq('assigned_to', fromUserId)
      .eq('task_type', 'team')
      .select();

    if (fastTeamTasksError) {
      logger.error('userDataTransferService: Error transferring fast_tasks team assignments:', fastTeamTasksError);
      throw new Error(`Failed to transfer fast_tasks team assignments: ${fastTeamTasksError.message}`);
    }

    transferredCounts.teamTasks = (teamTasksData?.length || 0) + (fastTeamTasksData?.length || 0);
    logger.log('userDataTransferService: Transferred', transferredCounts.teamTasks, 'team task assignments');

    // Transfer metrics ownership
    const { data: metricsData, error: metricsError } = await supabase
      .from('weekly_metrics')
      .update({ owner_id: toUserId })
      .eq('owner_id', fromUserId)
      .select();

    if (metricsError) {
      logger.error('userDataTransferService: Error transferring metrics ownership:', metricsError);
      throw new Error(`Failed to transfer metrics ownership: ${metricsError.message}`);
    }

    transferredCounts.metricsOwnership = metricsData?.length || 0;
    logger.log('userDataTransferService: Transferred ownership of', transferredCounts.metricsOwnership, 'metrics');

    // Transfer issues ownership
    const { data: issuesData, error: issuesError } = await supabase
      .from('issues')
      .update({ owner_id: toUserId })
      .eq('owner_id', fromUserId)
      .select();

    if (issuesError) {
      logger.error('userDataTransferService: Error transferring issues ownership:', issuesError);
      throw new Error(`Failed to transfer issues ownership: ${issuesError.message}`);
    }

    transferredCounts.issuesOwnership = issuesData?.length || 0;
    logger.log('userDataTransferService: Transferred ownership of', transferredCounts.issuesOwnership, 'issues');

    logger.log('userDataTransferService: Data transfer completed successfully');
    
    return {
      success: true,
      message: 'User data transferred successfully',
      transferredCounts
    };

  } catch (error) {
    logger.error('userDataTransferService: Data transfer failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred during transfer'
    };
  }
};
