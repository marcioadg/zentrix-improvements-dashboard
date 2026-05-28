
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMeetingResults } from '@/hooks/useMeetingResults';
import { useMeetingEndState } from '@/contexts/MeetingEndStateContext';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

// Module-level deduplication to prevent duplicate success toasts
const toastShownForMeeting = new Set<string>();

export const useMeetingOperations = () => {
  const { saveMeetingResults } = useMeetingResults();
  const { registerOperation, unregisterOperation } = useMeetingEndState();

  const deleteMeeting = useCallback(async (meetingId: string) => {
    try {
      logger.log('🗑️ useMeetingOperations: Deleting meeting:', meetingId);
      
      // Delete from meeting_results first (foreign key constraint)
      const { error: resultsError } = await supabase
        .from('meeting_results')
        .delete()
        .eq('meeting_id', meetingId);

      if (resultsError) {
        logger.error('useMeetingOperations: Error deleting meeting results:', resultsError);
        throw new Error(`Failed to delete meeting results: ${resultsError.message}`);
      }

      // Delete from meetings_state
      logger.log('🗑️ useMeetingOperations: Attempting to delete from meetings_state for ID:', meetingId);
      const { data: deleteData, error: stateError, count } = await supabase
        .from('meetings_state')
        .delete()
        .eq('id', meetingId)
        .select('*');

      logger.log('🗑️ useMeetingOperations: Delete result:', { deleteData, count, error: stateError });

      if (stateError) {
        logger.error('useMeetingOperations: Error deleting meeting state:', stateError);
        throw new Error(`Failed to delete meeting: ${stateError.message}`);
      }

      if (!deleteData || deleteData.length === 0) {
        logger.warn('🗑️ useMeetingOperations: No rows were deleted from meetings_state. Meeting may not exist or access denied.');
        throw new Error('Meeting not found or access denied');
      }

      logger.log('✅ useMeetingOperations: Meeting deleted successfully');
      toast.success('Meeting deleted successfully');
      
    } catch (error) {
      logger.error('useMeetingOperations: Failed to delete meeting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to delete meeting: ${errorMessage}`);
      throw error;
    }
  }, []);

  const finalizeMeeting = useCallback(async (meetingId: string, teamId: string): Promise<{ companyId?: string | null }> => {
    // Register the meeting finalization operation to suppress subscriptions
    const operationId = `meeting-finalization-${meetingId}`;
    registerOperation(operationId, 'meeting-finalization');
    
    try {
      logger.log('🏁 useMeetingOperations: Starting finalization for meeting:', meetingId);
      
      // STEP 1: Get current meeting state and collect ratings
      logger.log('🔍 useMeetingOperations: Fetching meeting state and live ratings');
      const { data: meetingState, error: fetchError } = await supabase
        .from('meetings_state')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (fetchError) {
        logger.error('🚨 useMeetingOperations: Error fetching meeting state:', fetchError);
        throw new Error(`Failed to fetch meeting state: ${fetchError.message}`);
      }

      if (!meetingState) {
        throw new Error('Meeting state not found');
      }

      // Get live meeting ratings
      const { data: liveRatings, error: ratingsError } = await supabase
        .from('live_meeting_ratings')
        .select('*')
        .eq('meeting_state_id', meetingId);

      if (ratingsError) {
        logger.warn('⚠️ useMeetingOperations: Could not fetch live ratings:', ratingsError);
      }

      // Convert live ratings to meeting ratings format
      const meetingRatings: Record<string, number> = {};
      if (liveRatings) {
        liveRatings.forEach(rating => {
          meetingRatings[rating.rated_member_id] = rating.rating;
        });
      }

      logger.log('📊 useMeetingOperations: Collected ratings:', {
        ratingsCount: liveRatings?.length || 0,
        meetingRatings
      });

      // STEP 2: Calculate total duration
      const endedAt = new Date().toISOString();
      const totalDurationMs = new Date(endedAt).getTime() - new Date(meetingState.started_at).getTime();
      const totalDurationSeconds = Math.floor(totalDurationMs / 1000);

      logger.log('📊 useMeetingOperations: Duration calculated:', {
        totalDurationMs,
        totalDurationSeconds
      });

      // STEP 3: Get issues that were resolved during this meeting
      logger.log('🔍 useMeetingOperations: Fetching issues resolved during meeting');
      const { data: resolvedIssues, error: issuesError } = await supabase
        .from('issues')
        .select('id, title, description, created_at, updated_at, owner_id, created_by')
        .eq('team_id', teamId)
        .eq('status', 'resolved')
        .gte('updated_at', meetingState.started_at);

      if (issuesError) {
        logger.warn('⚠️ useMeetingOperations: Could not fetch resolved issues:', issuesError);
      }

      logger.log('📊 useMeetingOperations: Found resolved issues:', resolvedIssues?.length || 0);

      // STEP 4: Fetch tasks created during this meeting
      logger.log('🔍 useMeetingOperations: Fetching tasks created during meeting');
      const startTimeWithBuffer = new Date(new Date(meetingState.started_at).getTime() - 30 * 1000).toISOString();
      
      const { data: createdTasks, error: tasksError } = await supabase
        .from('fast_tasks')
        .select('id, title, description, created_at, assigned_to, due_date, status')
        .eq('team_id', teamId)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .gte('created_at', startTimeWithBuffer)
        .order('created_at', { ascending: false });

      if (tasksError) {
        logger.warn('⚠️ useMeetingOperations: Could not fetch created tasks:', tasksError);
      }

      logger.log('📊 useMeetingOperations: Found created tasks:', createdTasks?.length || 0);

      // STEP 4.5: Fetch headlines created during this meeting
      logger.log('🔍 useMeetingOperations: Fetching headlines created during meeting');
      const { data: createdHeadlines, error: headlinesError } = await supabase
        .from('headlines')
        .select('id, title, content, created_at, created_by')
        .eq('team_id', teamId)
        .eq('archived', false)
        .gte('created_at', startTimeWithBuffer)
        .order('created_at', { ascending: false });

      if (headlinesError) {
        logger.warn('⚠️ useMeetingOperations: Could not fetch created headlines:', headlinesError);
      }

      logger.log('📊 useMeetingOperations: Found created headlines:', createdHeadlines?.length || 0);

      // STEP 5: Fetch team company_id
      logger.log('🔍 useMeetingOperations: Fetching team company_id');
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('company_id')
        .eq('id', teamId)
        .single();

      if (teamError) {
        logger.warn('⚠️ useMeetingOperations: Could not fetch team company_id:', teamError);
      }

      // STEP 6: Get absent members from meeting state
      const absentMembers = (meetingState.absent_members || []) as string[];
      logger.log('💾 useMeetingOperations: Absent members:', absentMembers.length);

      // STEP 7: Save meeting results (non-critical operation)
      logger.log('💾 useMeetingOperations: Saving meeting results');
      logger.log('💾 useMeetingOperations: Section accumulated times:', meetingState.section_accumulated_times);
      const resultsData = {
        meeting_id: meetingId,
        team_id: teamId,
        company_id: teamData?.company_id,
        section_durations: meetingState.section_accumulated_times || {},
        total_duration_seconds: totalDurationSeconds,
        attendees: absentMembers, // Store absent members (not present members) for historical record
        meeting_ratings: meetingRatings,
        headlines_created: createdHeadlines || [],
        tasks_created: createdTasks || [],
        issues_resolved: resolvedIssues || [],
        goals_created: [],
        metrics_created: []
      };

      logger.log('💾 useMeetingOperations: Attempting to save meeting results:', {
        meetingId,
        teamId,
        ratingsCount: Object.keys(meetingRatings).length,
        issuesResolved: resolvedIssues?.length || 0,
        tasksCreated: createdTasks?.length || 0,
        totalDurationSeconds
      });

      // Try to save results, but don't fail the entire meeting end if this fails
      let resultsSaved = false;
      try {
        await saveMeetingResults(resultsData, 'meeting_end');
        logger.log('✅ useMeetingOperations: Meeting results saved successfully');
        resultsSaved = true;
        
        // NOTE: Email sending is now handled by the caller after user confirmation
        logger.log('📧 useMeetingOperations: Email will be sent after user confirmation');
        
      } catch (resultsError) {
        logger.error('⚠️ useMeetingOperations: Failed to save meeting results (non-critical):', {
          error: resultsError,
          errorMessage: resultsError instanceof Error ? resultsError.message : 'Unknown error',
          errorCode: (resultsError as any)?.code,
          errorDetails: (resultsError as any)?.details,
          errorHint: (resultsError as any)?.hint,
          errorStack: resultsError instanceof Error ? resultsError.stack : undefined,
          resultsData,
          currentUserId: (await supabase.auth.getUser()).data.user?.id,
          teamId: teamId
        });
        // Continue with meeting finalization even if results saving fails
      }

      // STEP 7: Update meeting status to ended (CRITICAL OPERATION)
      logger.log('🔄 useMeetingOperations: Updating meeting status to ended');
      
      const { error: updateError } = await supabase
        .from('meetings_state')
        .update({
          status: 'ended',
          ended_at: endedAt,
          updated_at: endedAt
        })
        .eq('id', meetingId);

      if (updateError) {
        logger.error('🚨 useMeetingOperations: Failed to update meeting status:', updateError);
        throw new Error(`Failed to finalize meeting: ${updateError.message}`);
      }

      logger.log('✅ useMeetingOperations: Meeting status updated to ended successfully');

      // STEP 8: Clean up live ratings
      logger.log('🧹 useMeetingOperations: Cleaning up live ratings');
      const { error: cleanupError } = await supabase
        .from('live_meeting_ratings')
        .delete()
        .eq('meeting_state_id', meetingId);

      if (cleanupError) {
        logger.warn('⚠️ useMeetingOperations: Failed to cleanup live ratings:', cleanupError);
        // Don't throw error for cleanup failure
      }

      logger.log('✅ useMeetingOperations: Meeting finalized successfully', {
        resultsSaved,
        meetingId
      });
      
      // Track meeting completion events for Statsig based on meeting type
      try {
        const { data: userData } = await supabase.auth.getUser();
        const meetingType = meetingState.meeting_type;
        
        if (meetingType === 'quarterly') {
          const { trackQuarterlyReviewCompleted } = await import('@/lib/statsigAnalytics');
          trackQuarterlyReviewCompleted({
            user_id: userData.user?.id,
            company_id: teamData?.company_id || undefined,
            review_id: meetingId,
            duration: Math.round(totalDurationSeconds / 60),
            goals_set: 0, // Could be enhanced to count goals created during meeting
          });
        } else if (meetingType === 'annual') {
          const { trackAnnualReviewCompleted } = await import('@/lib/statsigAnalytics');
          trackAnnualReviewCompleted({
            user_id: userData.user?.id,
            company_id: teamData?.company_id || undefined,
            review_id: meetingId,
            duration: Math.round(totalDurationSeconds / 60),
            objectives_set: 0, // Could be enhanced to count objectives created
          });
        } else if (meetingType === 'custom') {
          const { trackCustomMeetingCompleted } = await import('@/lib/statsigAnalytics');
          trackCustomMeetingCompleted({
            user_id: userData.user?.id,
            company_id: teamData?.company_id || undefined,
            meeting_id: meetingId,
            duration: Math.round(totalDurationSeconds / 60),
          });
        } else {
          // Weekly L10 meeting
          const { trackL10Completed } = await import('@/lib/statsigAnalytics');
          trackL10Completed({
            user_id: userData.user?.id,
            company_id: teamData?.company_id || undefined,
            meeting_id: meetingId,
            meeting_duration_minutes: Math.round(totalDurationSeconds / 60),
            action_items_created: createdTasks?.length || 0
          });
        }
      } catch (e) {
        // Non-blocking
      }
      
      // Show success toast only once per meeting (prevent duplicates from race conditions)
      if (!toastShownForMeeting.has(meetingId)) {
        toastShownForMeeting.add(meetingId);
        toast.success('🎉 Meeting Ended Successfully', {
          description: resultsSaved 
            ? 'All results have been saved and tasks updated.' 
            : 'Meeting ended. Some results may not have been saved.',
        });
        
        // Clear after 10 seconds to allow future toasts for same meeting if restarted
        setTimeout(() => toastShownForMeeting.delete(meetingId), 10000);
      }
      
      // Return company ID so caller can trigger email after user confirmation
      return { companyId: teamData?.company_id };
      
    } catch (error) {
      logger.error('🚨 useMeetingOperations: Error in finalization process:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        errorStack: error instanceof Error ? error.stack : undefined,
        meetingId,
        teamId
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Provide more specific error feedback
      if (errorMessage.includes('Failed to fetch meeting state')) {
        toast.error('Failed to finalize meeting: Could not retrieve meeting data');
      } else if (errorMessage.includes('Failed to finalize meeting')) {
        toast.error(`Failed to finalize meeting: ${errorMessage}`);
      } else {
        toast.error('Failed to finalize meeting', {
          description: 'An unexpected error occurred. Please try again.'
        });
      }
      
      throw error;
    } finally {
      // Always unregister the operation, even on error
      unregisterOperation(operationId);
      logger.log('🔄 useMeetingOperations: Meeting finalization operation completed');
    }
  }, [saveMeetingResults, registerOperation, unregisterOperation]);

  return {
    deleteMeeting,
    finalizeMeeting
  };
};
