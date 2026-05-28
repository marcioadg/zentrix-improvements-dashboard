import React, { useState, useCallback } from 'react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useAllActiveMeetings } from '@/hooks/useAllActiveMeetings';
import { useLiveMeetingRatings } from '@/hooks/useLiveMeetingRatings';
import { useMeetingArchiveOperations } from '@/hooks/useMeetingArchiveOperations';
import { useMeetingNewTeamTasks } from '@/hooks/meeting/useMeetingNewTeamTasks';
import { MeetingSummaryCards } from './MeetingSummaryCards';
import { MeetingRatingSystem } from './MeetingRatingSystem';
import { WrapUpHeader } from './WrapUpHeader';
import { WrapUpActions } from './WrapUpActions';
import { useWrapUpState, useCurrentUser } from '@/hooks/meeting/useWrapUpState';
import { useWrapUpData } from '@/hooks/meeting/useWrapUpData';
import { useWrapUpActions } from '@/hooks/meeting/useWrapUpActions';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useRealtimeAbsences } from '@/hooks/meeting/useRealtimeAbsences';
import { useRatingBroadcast } from '@/hooks/meeting/useRatingBroadcast';
import { useCanEndMeeting } from '@/hooks/useCanEndMeeting';
import { EditTaskModal } from '@/components/modals/EditTaskModal';
import { UnifiedTeamTask } from '@/types/tasks';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WrapUpSectionProps {
  teamId: string;
  meetingType?: string;
}

export const WrapUpSection: React.FC<WrapUpSectionProps> = ({
  teamId,
  meetingType
}) => {
  const [editingTask, setEditingTask] = useState<UnifiedTeamTask | null>(null);
  const { members, loading: membersLoading } = useTeamMembers(teamId);
  const { meetingId, calculations, timerState, endMeeting, scriberId, currentUserId: timerUserId } = useNewMeetingTimer();
  const { currentCompany } = useMultiCompany();
  const { finalizeMeeting } = useAllActiveMeetings();
  const { saveRating, getRating, getCompletionStatus, getRatingsSummary, updateRatingLocalState } = useLiveMeetingRatings(meetingId, members);
  const { archiveCompletedTasks, cleanupLiveRatings } = useMeetingArchiveOperations();

  // Real-time rating broadcast for bulletproof sync
  const handleRemoteRatingChange = useCallback((userId: string, rating: number) => {
    updateRatingLocalState(userId, rating);
  }, [updateRatingLocalState]);

  const { publishRatingChange } = useRatingBroadcast({
    meetingId,
    onRatingChanged: handleRemoteRatingChange
  });

  // Use timer context for scriber status (in-memory, no async race condition)
  const isCurrentUserScriber = timerUserId === scriberId;
  const meetingCompanyId = currentCompany?.id || null;

  // Check if current user can end the meeting (scriber or director+)
  const { canEnd: canEndMeeting } = useCanEndMeeting(scriberId);
  
  // Use optimized hook for meeting-specific tasks only
  const { tasks: newTasks, loading: tasksLoading, updateTask, refetch } = useMeetingNewTeamTasks(
    teamId, 
    timerState.meetingStartTime, 
    meetingId
  );
  
  const currentUserId = useCurrentUser();
  const {
    ratingInputs,
    absentMembers,
    isRefreshing,
    hasAutoRefreshed,
    setIsRefreshing,
    setHasAutoRefreshed,
    setAbsentMembers,
    handleRatingChange,
    handleAbsentToggle
  } = useWrapUpState(members, currentUserId, getRating);

  const { handleManualRefresh } = useWrapUpData(
    meetingId,
    refetch,
    hasAutoRefreshed,
    setHasAutoRefreshed,
    setIsRefreshing
  );

  const completionStatus = getCompletionStatus();

  // Realtime absences: subscribe and publish updates
  const { publish } = useRealtimeAbsences(meetingId, (ids) => setAbsentMembers(new Set(ids)));

  const onAbsentToggleWithSync = React.useCallback((memberId: string, isAbsent: boolean) => {
    if (!isCurrentUserScriber) return;
    handleAbsentToggle(memberId, isAbsent);
    const next = new Set(absentMembers);
    if (isAbsent) next.add(memberId); else next.delete(memberId);
    publish(next);
  }, [isCurrentUserScriber, handleAbsentToggle, absentMembers, publish]);
  const ratingsSummary = getRatingsSummary();

  const { 
    adjustedCompletionStatus, 
    handleEndMeeting,
    isEnding
  } = useWrapUpActions(
    members,
    absentMembers,
    ratingsSummary,
    meetingId,
    teamId,
    meetingCompanyId,
    finalizeMeeting,
    endMeeting,
    archiveCompletedTasks,
    cleanupLiveRatings
  );

  // Handle task click to open edit modal
  const handleTaskClick = (task: UnifiedTeamTask) => {
    setEditingTask(task);
  };

  // Transform UnifiedTeamTask to EditTaskModal compatible format
  const transformTaskForModal = (task: UnifiedTeamTask) => {
    return {
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: 'todo',
      due_date: task.due_date,
      assigned_to: task.assigned_to,
      task_type: 'team' as const,
      team_id: task.team_id,
      user_id: currentUserId || teamId,
      created_at: task.created_at,
      updated_at: task.updated_at,
      completed: false,
      priority: 'medium' as const
    };
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <WrapUpHeader />

      <ScrollArea className="flex-1 w-full">
        <div className="space-y-6 pr-4">
          <MeetingSummaryCards 
            newTasks={newTasks} 
            members={members}
            loading={tasksLoading || membersLoading}
            onTaskClick={handleTaskClick}
          />

          <MeetingRatingSystem 
            members={members} 
            saveRating={saveRating} 
            getRating={getRating} 
            currentUserId={currentUserId} 
            absentMembers={absentMembers} 
            ratingInputs={ratingInputs} 
            onRatingChange={handleRatingChange} 
            canEditAllRatings={isCurrentUserScriber}
            onAbsentToggle={onAbsentToggleWithSync}
            onRatingPublish={publishRatingChange}
          />
        </div>
      </ScrollArea>

      <WrapUpActions 
        adjustedCompletionStatus={adjustedCompletionStatus}
        onEndMeeting={handleEndMeeting}
        loading={isEnding}
        canEndMeeting={canEndMeeting}
      />

      {/* Task Edit Modal */}
      {editingTask && (
        <EditTaskModal
          open={!!editingTask}
          onOpenChange={open => !open && setEditingTask(null)}
          task={transformTaskForModal(editingTask)}
          onUpdate={async (taskId: string, updates: any) => {
            // Normalize assigned_to handling: only wrap in array if it's a string
            const normalizedUpdates: Partial<UnifiedTeamTask> = { ...updates };
            if (updates.assigned_to !== undefined) {
              if (Array.isArray(updates.assigned_to)) {
                normalizedUpdates.assigned_to = updates.assigned_to;
              } else if (typeof updates.assigned_to === 'string' && updates.assigned_to.trim()) {
                normalizedUpdates.assigned_to = [updates.assigned_to];
              } else {
                normalizedUpdates.assigned_to = [];
              }
            }
            // Actually update the task instead of just refetching
            await updateTask(taskId, normalizedUpdates);
          }}
        />
      )}
    </div>
  );
};

