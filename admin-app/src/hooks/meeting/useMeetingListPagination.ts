
import { useState } from 'react';
import { INITIAL_DISPLAY_COUNT } from '@/constants/meetingList';
import type { MeetingWithTeam } from '@/types/meetingList';

export const useMeetingListPagination = (meetings: MeetingWithTeam[]) => {
  const [showAll, setShowAll] = useState(false);

  const displayedMeetings = showAll ? meetings : meetings.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreMeetings = meetings.length > INITIAL_DISPLAY_COUNT;

  return {
    showAll,
    setShowAll,
    displayedMeetings,
    hasMoreMeetings
  };
};
