
export interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  completed: boolean;
  type?: string; // Section type for mapping to components
  required?: boolean; // Mark as required/fixed section that cannot be deleted
  customDescription?: string; // Custom description for custom sections
}

export interface CustomMeetingTemplate {
  id: string;
  name: string;
  meeting_title?: string;
  description?: string;
  icon?: string;
  sections: AgendaItem[];
  company_id: string;
  team_id?: string;
  created_by: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  shared: boolean;
}

export interface MeetingBuilderState {
  meetingName: string;
  sections: AgendaItem[];
  selectedSectionIndex: number | null;
}
