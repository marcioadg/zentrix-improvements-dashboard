
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMeetingParticipants } from '@/hooks/useMeetingParticipants';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useProfile } from '@/hooks/useProfile';
import { Users, Crown } from 'lucide-react';

interface MeetingAttendeesProps {
  teamId: string;
  meetingId?: string | null;
}

export const MeetingAttendees: React.FC<MeetingAttendeesProps> = ({ teamId, meetingId }) => {
  const { meetingId: contextMeetingId, scriberId } = useNewMeetingTimer();
  const effectiveMeetingId = meetingId || contextMeetingId;
  const { participants, loading } = useMeetingParticipants(effectiveMeetingId);
  const { profile } = useProfile();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fallback: if participants is empty but we have a profile, show current user
  const effectiveParticipants = participants.length > 0 ? participants : (profile ? [{
    user_id: profile.id,
    full_name: profile.full_name || 'You',
    avatar_url: profile.avatar_url,
    email: profile.email,
    role: 'participant',
  }] : []);

  // Sort participants to put scriber first, then limit to display count
  const sortedParticipants = [...effectiveParticipants].sort((a, b) => {
    const aIsScriber = a.user_id === scriberId;
    const bIsScriber = b.user_id === scriberId;
    if (aIsScriber && !bIsScriber) return -1;
    if (!aIsScriber && bIsScriber) return 1;
    return 0;
  });
  
  const displayedParticipants = sortedParticipants.slice(0, 6);
  const overflowCount = effectiveParticipants.length - 6;

  // Show loading state only on initial load
  if (loading && effectiveParticipants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <Badge variant="secondary" className="text-xs flex items-center gap-1">
          <Users className="h-3 w-3" />
          Loading...
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {displayedParticipants.map((participant, index) => {
          const isScriber = participant.user_id === scriberId;
          return (
            <div 
              key={participant.user_id} 
              className="relative"
              style={{ zIndex: isScriber ? 10 : 6 - index }} // Scriber gets highest z-index
            >
              <Avatar className={`h-8 w-8 border-2 ${isScriber ? 'border-yellow-400' : 'border-background'}`}>
                <AvatarImage src={participant.avatar_url} />
                <AvatarFallback className="text-xs font-medium">
                  {getInitials(participant.full_name)}
                </AvatarFallback>
              </Avatar>
              {isScriber && (
                <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                  <Crown className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
          );
        })}
        {overflowCount > 0 && (
          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">+{overflowCount}</span>
          </div>
        )}
      </div>
      <Badge variant="secondary" className="text-xs flex items-center gap-1">
        <Users className="h-3 w-3" />
        {effectiveParticipants.length} online
      </Badge>
    </div>
  );
};
