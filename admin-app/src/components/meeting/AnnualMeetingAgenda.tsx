
import { AgendaItem } from '@/types/meeting';

// Day 1: 8 hours (480 minutes)
export const annualDay1AgendaItems: AgendaItem[] = [
  { id: 'a1', title: 'Opening & Check-In', duration: 30, completed: false, type: 'annual_opening' },
  { id: 'a2', title: 'Review Prior Year', duration: 30, completed: false, type: 'annual_review_prior_year' },
  { id: 'a3', title: 'Team Building', duration: 180, completed: false, type: 'annual_team_building' },
  { id: 'a4', title: 'Company Assessment', duration: 60, completed: false, type: 'annual_company_assessment' },
  { id: 'a5', title: 'SWOT Analysis', duration: 60, completed: false, type: 'annual_strategic_analysis' },
  { id: 'a6', title: 'Strategy Review', duration: 60, completed: false, type: 'annual_vision_review' },
  { id: 'a7', title: '3-Year Goals', duration: 60, completed: false, type: 'annual_three_year_goals' },
];

// Day 2: 8 hours (480 minutes)
export const annualDay2AgendaItems: AgendaItem[] = [
  { id: 'a8', title: 'Day 2 Opening', duration: 15, completed: false, type: 'annual_day2_opening' },
  { id: 'a9', title: 'Review 3-Year Plan & Key Challenges', duration: 15, completed: false, type: 'annual_review_issues' },
  { id: 'a10', title: 'Annual Plan', duration: 120, completed: false, type: 'annual_plan' },
  { id: 'a11', title: 'Quarterly Focus', duration: 120, completed: false, type: 'annual_90_day_priorities' },
  { id: 'a12', title: 'Issues', duration: 200, completed: false, type: 'annual_problem_solving' },
  { id: 'a13', title: 'Wrap Up', duration: 10, completed: false, type: 'wrap_up' },
];

// Combined agenda for full annual meeting
export const annualAgendaItems: AgendaItem[] = [
  ...annualDay1AgendaItems,
  ...annualDay2AgendaItems,
];

// Helper to get total time per day
export const getAnnualDay1Duration = () => annualDay1AgendaItems.reduce((sum, item) => sum + item.duration, 0);
export const getAnnualDay2Duration = () => annualDay2AgendaItems.reduce((sum, item) => sum + item.duration, 0);
