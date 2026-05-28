import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useAllActiveMeetings } from '@/hooks/useAllActiveMeetings';
import { MeetingActionDialog } from '@/components/meeting/MeetingActionDialog';
import { ErrorState } from '@/components/meeting/MeetingListStates';
import { EducationalEmptyState } from '@/components/ui/universal-states';
import { MeetingsActiveSkeleton } from '@/components/meetings/MeetingsPageSkeleton';
import { MeetingCard } from '@/components/meeting/MeetingCard';
import { useMeetingListPagination } from '@/hooks/meeting/useMeetingListPagination';
import { useMeetingConflictDetection } from '@/hooks/meeting/useMeetingConflictDetection';
import { useMeetingActions } from '@/hooks/meeting/useMeetingActions';

export const ActiveMeetingsList = () => {
  const { meetings, loading, error, deleteMeeting, finalizeMeeting, forceRefetch } = useAllActiveMeetings();
  
  // Smart visibility logic: only show completed meetings if there are active meetings
  const activeMeetings = meetings.filter(meeting => meeting.status === 'active');
  const completedMeetings = meetings.filter(meeting => meeting.status === 'ended');
  
  // Show completed meetings only if there are active meetings
  const shouldShowCompleted = activeMeetings.length > 0;
  const filteredMeetings = shouldShowCompleted 
    ? meetings 
    : activeMeetings;

  const { showAll, setShowAll, displayedMeetings, hasMoreMeetings } = useMeetingListPagination(filteredMeetings);
  const { conflictingMeetings } = useMeetingConflictDetection(meetings);
  const {
    actionDialog,
    setActionDialog,
    actionLoading,
    handleJoinMeeting,
    handleDeleteClick,
    handleFinalizeClick,
    handleConfirmAction,
    sendRecapEmailChecked,
    setSendRecapEmailChecked
  } = useMeetingActions(deleteMeeting, finalizeMeeting);

  // NOTE: Initial fetch is handled by useAllActiveMeetings hook
  // Real-time sync is handled by useMeetingSubscriptions and useMeetingStateBroadcast

  if (loading) {
    return <MeetingsActiveSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={forceRefetch} />;
  }

  if (filteredMeetings.length === 0) {
    return (
      <EducationalEmptyState
        icon={Calendar}
        title="No active meetings right now"

        benefits={[
          "Review progress together",
          "Solve blockers faster",
          "Build team accountability"
        ]}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Active meetings section */}
      {activeMeetings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[16px] font-medium text-foreground">Active meetings</h2>
          <div className="space-y-2">
            {activeMeetings.map((meeting) => (
              <div 
                key={meeting.id}
                className="bg-card border border-border rounded-[6px] p-4 transition-colors duration-150 hover:bg-muted/30"
              >
                <MeetingCard
                  meeting={meeting}
                  onJoin={handleJoinMeeting}
                  onDelete={handleDeleteClick}
                  onFinalize={handleFinalizeClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed meetings section - only show if there are active meetings */}
      {shouldShowCompleted && completedMeetings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-medium text-foreground">Recent meetings</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showAll ? 'Show less' : `Show all ${completedMeetings.length}`}
            </Button>
          </div>
          <div className="space-y-2">
            {(showAll ? completedMeetings : completedMeetings.slice(0, 3)).map((meeting) => (
              <div 
                key={meeting.id}
                className="bg-card border border-border rounded-[6px] p-4 transition-colors duration-150 hover:bg-muted/30"
              >
                <MeetingCard
                  meeting={meeting}
                  onJoin={handleJoinMeeting}
                  onDelete={handleDeleteClick}
                  onFinalize={handleFinalizeClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <MeetingActionDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}
        onConfirm={handleConfirmAction}
        actionType={actionDialog.type}
        meetingName={actionDialog.teamName}
        meetingDuration={actionDialog.duration}
        loading={actionLoading}
        sendRecapEmail={sendRecapEmailChecked}
        onSendRecapEmailChange={setSendRecapEmailChecked}
      />
    </div>
  );
};
