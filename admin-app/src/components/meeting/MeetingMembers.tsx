import React from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { useMeetingParticipants } from '@/hooks/useMeetingParticipants';
import { useActiveTeamMeeting } from '@/hooks/useActiveTeamMeeting';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { Crown, User } from 'lucide-react';

interface MeetingMembersProps {
  teamId: string | null;
  meetingType: string | null;
  isActive?: boolean;
}

export const MeetingMembers: React.FC<MeetingMembersProps> = ({
  teamId,
  meetingType,
  isActive = false
}) => {
  const { activeMeeting, loading: meetingLoading } = useActiveTeamMeeting(teamId, meetingType || undefined);
  const { scriberId: contextScriberId } = useNewMeetingTimer(); // ✅ Use context as primary source for instant sync
  
  // Use new database-driven hook with the active meeting ID
  const { participants, loading: participantsLoading } = useMeetingParticipants(activeMeeting?.id || null);

  // Helper function to check if a member is the scriber
  // ✅ Use context scriberId as primary (instant via broadcast), fallback to activeMeeting (Postgres Changes)
  const isScriber = (memberId: string) => {
    return contextScriberId === memberId || activeMeeting?.scriber_id === memberId;
  };

  const loading = meetingLoading || participantsLoading;

  if (loading && participants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {[1, 2].map((i) => (
            <div key={i} className="w-8 h-8 bg-muted border-2 border-white rounded-full animate-pulse"></div>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!isActive || !teamId || participants.length === 0) {
    return null;
  }

  const displayMembers = participants.slice(0, 3);
  const remainingCount = Math.max(0, participants.length - 3);

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {displayMembers.map((member) => {
          const memberIsScriber = isScriber(member.user_id);
          
          return (
            <div 
              key={member.user_id}
              className="relative"
              title={`${member.full_name}${member.email ? ` (${member.email})` : ''} - ${memberIsScriber ? 'Scriber' : 'Participant'}`}
            >
              <UserAvatar
                userId={member.user_id}
                fullName={member.full_name}
                email={member.email}
                avatarUrl={member.avatar_url}
                size="sm"
                className={`border-2 ${
                  memberIsScriber ? 'border-yellow-400' : 'border-white ring-1 ring-green-200'
                }`}
              />
              
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              
              {/* Scriber indicator - yellow crown to match meeting attendees */}
              {memberIsScriber && (
                <div className="absolute -top-1 -left-1 bg-yellow-500 rounded-full p-0.5 border border-white">
                  <Crown className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div className="relative flex items-center justify-center w-8 h-8 bg-muted border-2 border-white rounded-full text-xs font-medium text-secondary-foreground">
            +{remainingCount}
          </div>
        )}
      </div>
      <span className="text-xs text-success font-medium">
        {participants.length} active
      </span>
    </div>
  );
};

