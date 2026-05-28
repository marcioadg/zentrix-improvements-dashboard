
import { useMemo } from 'react';
import type { MeetingWithTeam } from '@/types/meetingList';

export const useMeetingConflictDetection = (meetings: MeetingWithTeam[]) => {
  const conflictingMeetings = useMemo(() => {
    const activeMeetingsByTeamType = meetings
      .filter(meeting => meeting.status === 'active')
      .reduce((acc, meeting) => {
        const key = `${meeting.team_id}-${meeting.meeting_type}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(meeting);
        return acc;
      }, {} as Record<string, typeof meetings>);

    return Object.values(activeMeetingsByTeamType).filter(group => group.length > 1);
  }, [meetings]);

  return { conflictingMeetings };
};
