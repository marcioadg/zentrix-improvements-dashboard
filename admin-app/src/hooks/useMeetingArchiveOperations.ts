
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { getMeetingCycleBoundaryISO } from '@/utils/meetingCycleUtils';

export const useMeetingArchiveOperations = () => {
  const { toast } = useToast();

  const archiveCompletedTasks = useCallback(async (teamId: string) => {
    if (!teamId) return;
    
    try {
      logger.log('useMeetingArchiveOperations: Archiving completed tasks for team:', teamId);
      
      // NOTE: This function only runs at the END of a meeting.
      // During the meeting, tasks marked as completed remain visible and are NOT archived.
      // Only when the meeting wraps up, all tasks with status='done' get archived together.

      // Get current user to ensure we only archive tasks they have permission to update
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.log('useMeetingArchiveOperations: No authenticated user, skipping task archiving');
        return;
      }

      // First, fetch completed tasks that the user can access/modify based on RLS
      const { data: completedTasks, error: fetchError } = await supabase
        .from('fast_tasks')
        .select('id, title, user_id, assigned_to, task_type')
        .eq('status', 'done')
        .eq('team_id', teamId)
        .eq('is_deleted', false)
        .eq('is_archived', false);

      if (fetchError) {
        logger.error('Error fetching completed tasks:', fetchError);
        throw fetchError;
      }

      if (!completedTasks || completedTasks.length === 0) {
        logger.log('useMeetingArchiveOperations: No completed tasks found to archive');
        return;
      }

      logger.log(`useMeetingArchiveOperations: Found ${completedTasks.length} completed tasks to potentially archive`);

      // Filter tasks to archive: all team tasks from this team + user's personal tasks
      const archivableTasks = completedTasks.filter(task => {
        // Personal tasks: user must be the owner (don't archive other users' personal tasks)
        if (task.task_type === 'personal') {
          return task.user_id === user.id;
        }
        
        // Team tasks: archive ALL completed team tasks from this team
        // (RLS policies ensure we can only update tasks from teams we're members of)
        if (task.task_type === 'team') {
          return true; // Archive all team tasks - let RLS handle permissions
        }
        
        return false;
      });

      if (archivableTasks.length === 0) {
        logger.log('useMeetingArchiveOperations: No tasks found that current user can archive');
        return;
      }

      logger.log(`useMeetingArchiveOperations: Archiving ${archivableTasks.length} out of ${completedTasks.length} completed tasks`);

      // Archive tasks in batches to avoid overwhelming the database
      const batchSize = 10;
      let totalArchived = 0;
      
      for (let i = 0; i < archivableTasks.length; i += batchSize) {
        const batch = archivableTasks.slice(i, i + batchSize);
        const taskIds = batch.map(task => task.id);
        
        const { data: archivedBatch, error: batchError } = await supabase
          .from('fast_tasks')
          .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', taskIds)
          .select('id, title');

        if (batchError) {
          logger.error(`Error archiving batch ${i/batchSize + 1}:`, batchError);
          // Continue with other batches instead of failing completely
          continue;
        }

        totalArchived += archivedBatch?.length || 0;
        logger.log(`useMeetingArchiveOperations: Batch ${i/batchSize + 1} archived ${archivedBatch?.length || 0} tasks`);
      }

      // CYCLE CLEANUP: Also archive any completed tasks from cycles older than the previous one
      // This ensures old completed tasks never resurface in future meetings
      const cycleBoundary = getMeetingCycleBoundaryISO();
      const { data: oldCycleTasks, error: oldCycleError } = await supabase
        .from('fast_tasks')
        .select('id')
        .eq('status', 'done')
        .eq('team_id', teamId)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .lt('created_at', cycleBoundary);

      if (oldCycleError) {
        logger.warn('useMeetingArchiveOperations: Error fetching old cycle tasks:', oldCycleError);
      } else if (oldCycleTasks && oldCycleTasks.length > 0) {
        const oldTaskIds = oldCycleTasks.map(t => t.id);
        logger.log(`useMeetingArchiveOperations: Archiving ${oldTaskIds.length} old-cycle completed tasks`);
        
        const { error: oldArchiveError } = await supabase
          .from('fast_tasks')
          .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', oldTaskIds);

        if (oldArchiveError) {
          logger.warn('useMeetingArchiveOperations: Error archiving old cycle tasks:', oldArchiveError);
        } else {
          totalArchived += oldTaskIds.length;
          logger.log('useMeetingArchiveOperations: Old cycle tasks archived:', oldTaskIds.length);
        }
      }

      logger.log('useMeetingArchiveOperations: Total tasks archived successfully:', totalArchived);

      if (totalArchived > 0) {
        toast({
          title: "Tasks archived",
          description: `${totalArchived} completed task${totalArchived === 1 ? '' : 's'} archived.`
        });
      }
    } catch (error) {
      logger.error('useMeetingArchiveOperations: Failed to archive completed tasks:', error);
      toast({
        title: "Warning", 
        description: "Some completed tasks could not be archived, but meeting ended successfully.",
        variant: "destructive"
      });
      // Don't throw - we still want to end the meeting even if archiving fails
    }
  }, [toast]);

  const archiveHeadlines = useCallback(async (activeMeetingId: string, meetingHeadlines: any[]) => {
    if (!activeMeetingId || meetingHeadlines.length === 0) return;
    
    try {
      logger.log('useMeetingArchiveOperations: Archiving headlines for meeting:', activeMeetingId);
      const headlineIds = meetingHeadlines.map(h => h.id);
      
      const {
        data: archivedHeadlines,
        error
      } = await supabase.from('headlines').update({
        archived: true,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).in('id', headlineIds).select('id, title');

      if (error) {
        logger.error('Error archiving headlines:', error);
        throw error;
      }
      
      logger.log('useMeetingArchiveOperations: Headlines archived successfully:', archivedHeadlines?.length || 0);
      
      if (archivedHeadlines && archivedHeadlines.length > 0) {
        toast({
          title: "Headlines archived",
          description: `${archivedHeadlines.length} headline${archivedHeadlines.length === 1 ? '' : 's'} archived.`
        });
      }
    } catch (error) {
      logger.error('useMeetingArchiveOperations: Failed to archive headlines:', error);
      toast({
        title: "Warning",
        description: "Failed to archive headlines, but meeting ended successfully.",
        variant: "destructive"
      });
      // Don't throw - we still want to end the meeting even if archiving fails
    }
  }, [toast]);

  const cleanupLiveRatings = useCallback(async (activeMeetingId: string) => {
    if (!activeMeetingId) return;
    
    try {
      await supabase.from('live_meeting_ratings').delete().eq('meeting_state_id', activeMeetingId);
      logger.log('useMeetingArchiveOperations: Live ratings cleaned up successfully');
    } catch (error) {
      logger.error('useMeetingArchiveOperations: Failed to cleanup live ratings:', error);
      // Don't throw - this is just cleanup
    }
  }, []);

  return {
    archiveCompletedTasks,
    archiveHeadlines,
    cleanupLiveRatings
  };
};
