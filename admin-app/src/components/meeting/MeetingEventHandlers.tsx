import { useMeetingCreateHandlers } from '@/components/meeting/MeetingCreateHandlers';
import { useMeetingResults } from '@/hooks/useMeetingResults';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from 'sonner';
import { logger } from '@/utils/logger';

interface MeetingEventHandlersProps {
  teamId: string;
  meetingId?: string;
  updateIssue: (issueId: string, updates: any) => Promise<void>; // Accept updateIssue from IssuesList
  setShowTaskModal: (show: boolean) => void;
  setShowGoalModal: (show: boolean) => void;
  setShowMetricModal: (show: boolean) => void;
  setShowHeadlineModal: (show: boolean) => void;
  setShowIssueModal: (show: boolean) => void;
  setPrefilledTaskData: (data: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
  } | undefined) => void;
  createTask: (taskData: any) => Promise<void>;
  // NEW: Callbacks for real-time issue sync via FAB modal
  onIssueCreated?: (issue: any) => void;
  addIssueToLocalState?: (issue: any) => void;
}

export const useMeetingEventHandlers = ({
  teamId,
  meetingId,
  updateIssue, // Receive updateIssue from IssuesList
  setShowTaskModal,
  setShowGoalModal,
  setShowMetricModal,
  setShowHeadlineModal,
  setShowIssueModal,
  setPrefilledTaskData,
  createTask,
  onIssueCreated,
  addIssueToLocalState,
}: MeetingEventHandlersProps) => {
  const createHandlers = useMeetingCreateHandlers(teamId, meetingId);
  const { saveMeetingResults, getMeetingResults } = useMeetingResults();

  // Create button handlers
  const handleCreateTask = () => {
    setPrefilledTaskData(undefined);
    setShowTaskModal(true);
  };
  
  const handleCreateGoal = () => setShowGoalModal(true);
  const handleCreateMetric = () => setShowMetricModal(true);
  const handleCreateHeadline = () => setShowHeadlineModal(true);
  const handleCreateIssue = () => setShowIssueModal(true);

  // Updated handler - mark issue as resolved when called and update meeting results
  const handleIssueSolved = async (issueTitle?: string, issueDescription?: string, issueId?: string, ownerId?: string, issueTeamId?: string) => {
    logger.log('Meeting: Issue solved, updating status to resolved');
    if (issueId && meetingId) {
      try {
        // Fetch meeting details to determine type
        const { data: meetingData } = await supabase
          .from('meetings_state')
          .select('audience_type, team_id, company_id')
          .eq('id', meetingId)
          .single();
        
        const isMemberMeeting = meetingData?.audience_type === 'members' && meetingData?.team_id === null;
        
        // Use the updateIssue function to mark as resolved (already has optimistic updates)
        await updateIssue(issueId, { status: 'resolved' });
        logger.log('✅ Meeting: Issue marked as resolved successfully');
        
        // Update meeting results with the resolved issue in real-time
        try {
          const currentResults = await getMeetingResults(meetingId);
          const existingIssuesResolved = (currentResults?.issues_resolved as any[]) || [];
          
          // Add the newly resolved issue to the list (store original team for reference)
          const resolvedIssue = {
            id: issueId,
            title: issueTitle || 'Resolved Issue',
            description: issueDescription || '',
            resolved_at: new Date().toISOString(),
            owner_id: ownerId,
            original_team_id: issueTeamId || teamId // Use issue's actual team_id when available
          };
          
          const updatedIssuesResolved = [...existingIssuesResolved, resolvedIssue];
          
          // Save with appropriate team_id and company_id
          await saveMeetingResults({
            meeting_id: meetingId,
            team_id: isMemberMeeting ? null : teamId, // NULL for member meetings
            company_id: meetingData?.company_id || null, // Always include company_id
            issues_resolved: updatedIssuesResolved,
            // Preserve other existing data
            headlines_created: currentResults?.headlines_created || [],
            tasks_created: currentResults?.tasks_created || [],
            goals_created: currentResults?.goals_created || [],
            metrics_created: currentResults?.metrics_created || [],
            section_durations: currentResults?.section_durations || {},
            total_duration_seconds: currentResults?.total_duration_seconds || 0,
            attendees: currentResults?.attendees || [],
            meeting_ratings: currentResults?.meeting_ratings || {}
          }, 'issue_resolution');
          
          logger.log('✅ Meeting: Updated meeting results with resolved issue', {
            isMemberMeeting,
            team_id: isMemberMeeting ? null : teamId,
            company_id: meetingData?.company_id
          });
        } catch (resultsError) {
          logger.error('❌ Meeting: Error updating meeting results:', resultsError);
        }
        
        // Show success toast with issue title for better UX
        if (issueTitle) {
          logger.log(`🎉 Meeting: Issue "${issueTitle}" has been resolved and tracked in meeting results`);
        }
      } catch (error) {
        logger.error('❌ Meeting: Error solving issue:', error);
        // Error handling is already done in updateIssue function
      }
    }
  };

  // Issue creation handler for meeting context with duplicate detection
  const handleAddIssue = async (issueData: {
    title: string;
    description?: string;
    issueType: 'short_term' | 'long_term';
    teamId: string;
    ownerId?: string;
    isPublic?: boolean;
  }): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.error('No authenticated user');
        return false;
      }

      const normalizedTitle = issueData.title.trim();
      const normalizedDescription = issueData.description?.trim() || '';

      // Check for exact duplicates (same pattern as useSimpleIssues.addIssue)
      logger.log('🔧 handleAddIssue: Checking for duplicate issues...');
      const { data: existingIssues, error: fetchError } = await supabase
        .from('issues')
        .select('id, title, description, archived')
        .eq('team_id', issueData.teamId)
        .eq('issue_type', issueData.issueType)
        .eq('status', 'open')
        .neq('archived', true);

      if (fetchError) {
        logger.error('handleAddIssue: Error checking for duplicates:', fetchError);
      } else if (existingIssues) {
        const duplicates = existingIssues.filter(issue => {
          const existingTitle = issue.title.trim();
          const existingDescription = (issue.description || '').trim();
          return existingTitle === normalizedTitle && existingDescription === normalizedDescription;
        });

        if (duplicates.length > 0) {
          logger.log('⚠️ handleAddIssue: Found duplicate issue, preventing creation');
          toast({
            title: "Duplicate issue",
            description: `An issue with the same title and description already exists: "${normalizedTitle}"`,
            variant: "destructive"
          });
          return false; // Return false to indicate duplicate was prevented
        }
      }

      // Insert issue into database
      const { data: newIssue, error } = await supabase
        .from('issues')
        .insert({
          title: normalizedTitle,
          description: normalizedDescription,
          team_id: issueData.teamId,
          owner_id: issueData.ownerId || user.id,
          created_by: user.id,
          issue_type: issueData.issueType,
          status: 'open',
          is_public: issueData.issueType === 'long_term' ? (issueData.isPublic || false) : false
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating issue:', error);
        return false;
      }

      logger.log('✅ Issue created successfully:', newIssue);

      // Show success toast using sonnerToast (useToast filters success messages)
      sonnerToast.success('Issue created', {
        description: 'Your issue has been added successfully.',
      });

      // ✅ FIX: Add to local state for instant UI update (creator sees it immediately)
      if (newIssue && addIssueToLocalState) {
        logger.log('📥 handleAddIssue: Adding issue to local state for instant display');
        addIssueToLocalState(newIssue);
      }

      // ✅ FIX: Broadcast to other participants for real-time sync
      if (newIssue && onIssueCreated) {
        logger.log('📤 handleAddIssue: Broadcasting issue creation to other participants');
        onIssueCreated(newIssue);
      }

      // Update meeting results if in meeting context
      if (meetingId && newIssue) {
        try {
          const currentResults = await getMeetingResults(meetingId);
          
          // Note: issues_created tracking removed as column doesn't exist in database
          logger.log('✅ Issue created in meeting context (not tracked in meeting_results)');
        } catch (resultsError) {
          // Silent failure for non-critical meeting results update
          logger.error('Error checking meeting results (non-critical):', resultsError);
        }
      }

      return true;
    } catch (error) {
      logger.error('Error in handleAddIssue:', error);
      return false;
    }
  };

  // Enhanced task creation handler that uses the centralized createTask - fixed return type
  // Note: Meeting results tracking is handled by createTaskWrapper in Meeting.tsx
  const handleAddTask = async (taskData: {
    title: string;
    description: string;
    due_date: string;
    assigned_to: string | string[];
  }): Promise<void> => {
    try {
      const assignedArray = Array.isArray(taskData.assigned_to)
        ? taskData.assigned_to
        : (taskData.assigned_to ? [taskData.assigned_to] : []);

      const taskDataWithArray = {
        ...taskData,
        assigned_to: assignedArray
      };
      
      // Create the task (meeting results update handled by createTaskWrapper in Meeting.tsx)
      await createTask(taskDataWithArray);
    } catch (error) {
      logger.error('Meeting: Error creating task:', error);
      throw error;
    }
  };

  return {
    handleCreateTask,
    handleCreateGoal,
    handleCreateMetric,
    handleCreateHeadline,
    handleCreateIssue,
    handleIssueSolved,
    handleAddIssue,
    handleAddTask,
    createHandlers,
  };
};
