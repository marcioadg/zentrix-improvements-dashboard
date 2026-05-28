import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface TaskAssignmentWebhookPayload {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  assigneeUserId: string;
  assignedByUserId: string;
  assignedByName: string;
  assignedByEmail: string;
  dueDate?: string;
  teamName?: string;
  companyId: string;
  status?: string;
}

/**
 * Sends a webhook notification when a task is assigned to a user.
 * This is a non-blocking fire-and-forget operation.
 */
export const sendTaskAssignedWebhook = async (payload: TaskAssignmentWebhookPayload): Promise<void> => {
  try {
    logger.log('📤 Sending task assignment webhook:', {
      taskId: payload.taskId,
      assignee: payload.assigneeUserId,
    });

    // Fire and forget - don't await the response
    supabase.functions.invoke('send-webhook-event', {
      body: {
        event_type: 'task_assigned',
        company_id: payload.companyId,
        user_id: payload.assigneeUserId,
        event_data: {
          task_id: payload.taskId,
          task_title: payload.taskTitle,
          task_description: payload.taskDescription || '',
          assigned_by_name: payload.assignedByName,
          assigned_by_email: payload.assignedByEmail,
          assigned_at: new Date().toISOString(),
          due_date: payload.dueDate || null,
          priority: 'medium',
          task_url: 'https://zentrixos.com/tasks',
          workspace_name: payload.teamName || '',
          team_name: payload.teamName || '',
          status: payload.status || 'todo',
        },
      },
    }).then(({ data, error }) => {
      if (error) {
        logger.warn('⚠️ Task assignment webhook failed (non-blocking):', error);
      } else if (data?.success) {
        logger.log('✅ Task assignment webhook sent successfully');
      } else {
        logger.warn('⚠️ Task assignment webhook returned unsuccessful:', data);
      }
    }).catch((err) => {
      logger.warn('⚠️ Task assignment webhook error (non-blocking):', err);
    });

  } catch (error) {
    // Non-blocking - just log the error
    logger.warn('⚠️ Error preparing task assignment webhook:', error);
  }
};

/**
 * Helper to get user profile for webhook payload
 */
export const getUserProfileForWebhook = async (userId: string): Promise<{ fullName: string; email: string } | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (error || !data) {
      logger.warn('⚠️ Could not fetch user profile for webhook:', error);
      return null;
    }

    return {
      fullName: data.full_name || 'Unknown User',
      email: data.email || '',
    };
  } catch (err) {
    logger.warn('⚠️ Error fetching user profile for webhook:', err);
    return null;
  }
};
