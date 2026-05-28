
import { useMemo } from 'react';
import { AgendaItem } from '@/types/meeting';
import { quarterlyAgendaItems } from '@/components/meeting/QuarterlyMeetingAgenda';
import { annualAgendaItems } from '@/components/meeting/AnnualMeetingAgenda';

export const useMeetingAgenda = (
  meetingType: string = 'weekly',
  customAgenda?: AgendaItem[]
) => {
  const agendaItems: AgendaItem[] = useMemo(() => {
    // If custom agenda provided, use it
    if (customAgenda && customAgenda.length > 0) {
      return customAgenda;
    }
    
    if (meetingType === 'quarterly') {
      return quarterlyAgendaItems;
    }
    
    if (meetingType === 'annual') {
      return annualAgendaItems;
    }
    
    if (meetingType === 'custom') {
      // Default custom meeting starts with just Good News
      return [
        { id: '1', title: 'Good News', duration: 5, completed: false, type: 'good_news' }
      ];
    }
    
    // Default weekly agenda
    return [
      { id: '1', title: 'Good News', duration: 5, completed: false },
      { id: '2', title: 'Metrics', duration: 5, completed: false },
      { id: '3', title: 'Goals', duration: 5, completed: false },
      { id: '4', title: 'Headlines', duration: 5, completed: false },
      { id: '5', title: 'Tasks', duration: 5, completed: false },
      { id: '6', title: 'Issues', duration: 60, completed: false },
      { id: '7', title: 'Wrap Up', duration: 5, completed: false },
    ];
  }, [meetingType, customAgenda]);

  const totalPlannedTimeMinutes = useMemo(() => {
    return agendaItems.reduce((total, item) => total + item.duration, 0);
  }, [agendaItems]);

  return {
    agendaItems,
    totalPlannedTimeMinutes,
  };
};
