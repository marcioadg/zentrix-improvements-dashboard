import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useHeadlines } from '@/hooks/useHeadlines';
import { createMetric as createMetricService } from '@/services/metricOperations';
import { logger } from '@/utils/logger';

interface CreateHandlers {
  createHeadline: (title: string, content: string) => Promise<void>;
  createTask: (title: string, description?: string) => Promise<void>;
  createIssue: (title: string, description?: string, ownerId?: string) => Promise<void>;
  createGoal: (title: string, description?: string) => Promise<void>;
  createMetric: (name: string, value: number) => Promise<void>;
  handleAddTask: (taskData: any) => Promise<void>;
  handleAddGoal: (goalData: any) => Promise<void>;
  handleAddMetric: (metricData: any) => Promise<void>;
  handleAddHeadline: (title: string, content: string, teamId?: string, meetingId?: string, ownerId?: string, targetMeetingType?: 'weekly' | 'quarterly') => Promise<void>;
}

export const useMeetingCreateHandlers = (
  teamId: string,
  contextMeetingId?: string // Rename to avoid confusion with parameter names
): CreateHandlers => {
  const { toast } = useToast();
  const { addHeadline } = useHeadlines(teamId, contextMeetingId);

  const createHeadline = async (title: string, content: string) => {
    await addHeadline(title, content, teamId, contextMeetingId);
  };

  const createTask = async (title: string, description?: string) => {
    try {
      // Get current user for assignment (trigger will handle auto-assignment as fallback)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Dual-write: Create in fast_tasks (primary) and team_tasks (legacy)
      const taskData = {
        title,
        description,
        team_id: teamId,
        task_type: 'team' as const,
        status: 'todo' as const,
        assigned_to: [user.id] // Ensure team tasks are assigned to creator
      };

      // Primary write to fast_tasks
      const { error: fastTaskError } = await supabase
        .from('fast_tasks')
        .insert([taskData]);

      if (fastTaskError) throw fastTaskError;

      // Legacy write to team_tasks for compatibility
      const { error: teamTaskError } = await supabase
        .from('team_tasks')
        .insert([{
          title,
          description,
          team_id: teamId,
          priority: 'medium'
        }]);

      if (teamTaskError) {
        logger.warn('⚠️ Legacy team_tasks write failed:', teamTaskError);
        // Don't throw - fast_tasks write succeeded
      }
      
      // Removed success toast - modal closing and task list update is sufficient
    } catch (error) {
      logger.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const createIssue = async (title: string, description?: string, ownerId?: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('issues')
        .insert([{
          title,
          description,
          team_id: teamId,
          meeting_id: contextMeetingId,
          owner_id: ownerId || user.id, // Use provided ownerId or fallback to current user
          created_by: user.id
        }]);

      if (error) throw error;
      
      // Removed success toast - modal closing and issue list update is sufficient
    } catch (error) {
      logger.error('Error creating issue:', error);
      toast({
        title: "Error",
        description: "Failed to create issue",
        variant: "destructive",
      });
    }
  };

  const createGoal = async (title: string, description?: string) => {
    try {
      const { error } = await supabase
        .from('team_goals')
        .insert([{
          title,
          description,
          team_id: teamId,
          owner_id: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;
      
      // Removed success toast - modal closing and goal list update is sufficient
    } catch (error) {
      logger.error('Error creating goal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
    }
  };

  const createMetric = async (name: string, value: number) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Use centralized service that handles both metrics and weekly_metrics tables
      await createMetricService(
        name,
        'Number',
        user.id,
        undefined, // target_value
        'greater_than_or_equal',
        user.id,
        teamId,
        false, // is_formula
        [],
        'total'
      );
      
      // Removed success toast - modal closing and metric list update is sufficient
    } catch (error) {
      logger.error('Error creating metric:', error);
      toast({
        title: "Error",
        description: "Failed to create metric",
        variant: "destructive",
      });
    }
  };

  // Add the handle methods for compatibility
  const handleAddTask = async (taskData: any) => {
    return createTask(taskData.title, taskData.description);
  };

  const handleAddGoal = async (goalData: any) => {
    return createGoal(goalData.title, goalData.description);
  };

  const handleAddMetric = async (metricData: any) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Use centralized service that handles both metrics and weekly_metrics tables
      await createMetricService(
        metricData.metric_name,
        metricData.unit,
        metricData.owner_id,
        metricData.target_value,
        metricData.target_logic || 'greater_than_or_equal',
        user.id,
        metricData.team_id || teamId,
        metricData.is_formula || false,
        metricData.formula_components || [],
        metricData.aggregation_type || 'total'
      );
      
      // Removed success toast - modal closing and metric list update is sufficient
    } catch (error) {
      logger.error('Error creating metric:', error);
      toast({
        title: "Error",
        description: "Failed to create metric",
        variant: "destructive",
      });
    }
  };

  const handleAddHeadline = async (title: string, content: string, teamId?: string, meetingId?: string, ownerId?: string, targetMeetingType?: 'weekly' | 'quarterly') => {
    logger.log('📊 MeetingCreateHandlers: handleAddHeadline called with:', { title, content, teamId, meetingId, ownerId, targetMeetingType });
    
    // Only use contextMeetingId if meetingId was not explicitly passed
    // If targetMeetingType is provided, this is an upcoming headline, so use undefined for meetingId
    const finalMeetingId = targetMeetingType ? undefined : (meetingId ?? contextMeetingId);
    
    logger.log('📊 MeetingCreateHandlers: Using meetingId:', finalMeetingId, '(parameter:', meetingId, ', context:', contextMeetingId, ', targetMeetingType:', targetMeetingType, ')');
    // Note: ownerId is ignored since addHeadline uses current user automatically
    return addHeadline(title, content, teamId, finalMeetingId, targetMeetingType);
  };

  return {
    createHeadline,
    createTask,
    createIssue,
    createGoal,
    createMetric,
    handleAddTask,
    handleAddGoal,
    handleAddMetric,
    handleAddHeadline
  };
};
