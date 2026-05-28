
import { AgendaItem } from '@/types/meeting';

export const quarterlyAgendaItems: AgendaItem[] = [
  { id: '1', title: 'Check-In', duration: 15, completed: false, type: 'check_in' },
  { id: '2', title: 'Review Prior Quarter', duration: 30, completed: false, type: 'review_prior_quarter' },
  { id: '3', title: 'Review Strategy/Execution', duration: 60, completed: false, type: 'review_strategy/execution' },
  { id: '4', title: 'Tools Review', duration: 60, completed: false, type: 'tools_review' },
  { id: '5', title: 'Quarterly Goals', duration: 120, completed: false, type: 'quarterly_goals' },
  { id: '6', title: 'Issues', duration: 180, completed: false, type: 'issues' },
  { id: '7', title: 'Next Steps', duration: 7, completed: false, type: 'next_steps' },
  { id: '8', title: 'Wrap Up', duration: 8, completed: false, type: 'wrap_up' },
];
