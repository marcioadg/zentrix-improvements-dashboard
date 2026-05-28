
import { supabase } from '@/integrations/supabase/client';

// Re-export the canonical Supabase client (hardcoded to bprlchkedecbyoaqlbfz)
// Do NOT use VITE_SUPABASE_URL env vars — they may point to the old project.
export { supabase };

// Database types
export interface Company {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  auto_create_overdue_issues?: boolean;
  zentrix_support_access?: boolean;
  require_task_before_solve?: boolean;
  ai_meeting_transcription?: boolean;
}

export interface Profile {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'owner' | 'manager' | 'member';
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface Team {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  permission_level: 'super_admin' | 'director' | 'manager' | 'member' | 'view-only';
  joined_at: string;
  team?: Team;
  profile?: Profile;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'on_track' | 'off_track' | 'complete';
  target_date?: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyMetric {
  id: string;
  user_id: string;
  week_start_date: string;
  metric_name: string;
  metric_value: number;
  target_value?: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

// New meeting-related types
export interface Meeting {
  id: string;
  team_id: string;
  title: string;
  date: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  rating?: number;
  facilitator_id: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingUpdate {
  id: string;
  meeting_id: string;
  user_id: string;
  content: string;
  type: 'personal' | 'professional';
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface MeetingNote {
  id: string;
  meeting_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface MeetingIssue {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  priority: number;
  status: 'open' | 'resolved';
  vote_count: number;
  voted_users: string[];
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface TeamGoal {
  id: string;
  team_id: string;
  title: string;
  description?: string;
  status: 'on_track' | 'off_track' | 'complete';
  owner_id: string;
  target_date?: string;
  created_at: string;
  updated_at: string;
  owner?: Profile;
}

export interface TeamTask {
  id: string;
  team_id: string;
  title: string;
  description?: string;
  completed: boolean;
  assigned_to?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  assignee?: Profile;
}

// New Issues type
export interface Issue {
  id: string;
  team_id: string;
  meeting_id?: string;
  title: string;
  description?: string;
  priority: number;
  status: 'open' | 'resolved';
  vote_count: number;
  voted_users: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// User Settings type
export interface UserSettings {
  id: string;
  user_id: string;
  vote_limit: number;
  created_at: string;
  updated_at: string;
}
