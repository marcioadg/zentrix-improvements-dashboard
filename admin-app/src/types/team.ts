
export interface Team {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  is_leadership?: boolean;
  has_strategic_plan?: boolean;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
}
