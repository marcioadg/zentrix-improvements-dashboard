// Drill-down data types for analytics charts

export interface GoalDrillDownData {
  id: string;
  title: string;
  team_name: string;
  status: string;
  owner_name: string | null;
  updated_at: string;
}

export interface ScorecardDrillDownData {
  id: string;
  metric_name: string;
  team_name: string;
  metric_value: number | null;
  target_value: number | null;
  status: 'On Track' | 'Off Track';
  week_start_date: string;
}

export interface MeetingRatingDrillDownData {
  id: string;
  meeting_date: string;
  team_name: string;
  num_ratings: number;
  avg_rating: number;
  ratings: Record<string, number>;
}

export interface TaskDrillDownData {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  assignee_name: string | null;
  team_name: string;
  completion_status: 'On Time' | 'Late' | 'Overdue';
}

export interface MeetingProductivityDrillDownData {
  id: string;
  meeting_date: string;
  team_name: string;
  issues_count: number;
  tasks_count: number;
  avg_time_per_issue: number | null;
  issues_resolved: any[];
  tasks_created: any[];
}

export interface TasksCompletedDrillDownData {
  id: string;
  title: string;
  completed_at: string | null;
  assignee_name: string;
  team_name: string;
}

export interface PersonProductivityDrillDownData {
  id: string;
  person_name: string;
  tasks_completed?: number;
  issues_resolved?: number;
}

export type DrillDownData = 
  | GoalDrillDownData 
  | ScorecardDrillDownData 
  | MeetingRatingDrillDownData 
  | TaskDrillDownData 
  | MeetingProductivityDrillDownData
  | TasksCompletedDrillDownData
  | PersonProductivityDrillDownData;

export interface DrillDownColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}
