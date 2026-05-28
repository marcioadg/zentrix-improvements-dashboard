
export interface MeetingWithTeam {
  id: string;
  team_id: string;
  team_name: string;
  company_name: string;
  meeting_type: string;
  meeting_title?: string;
  current_section: number;
  started_at: string;
  ended_at: string | null;
  scriber_id: string | null;
  status: string;
  average_rating?: number;
  total_duration_seconds?: number;
}

export interface ActionDialogState {
  open: boolean;
  type: 'delete' | 'finalize';
  meetingId: string;
  teamId: string;
  teamName: string;
  duration?: string;
}
