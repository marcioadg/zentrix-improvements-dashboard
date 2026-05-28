/**
 * Custom type definitions for team_members table
 * These override the stale auto-generated types that still reference deleted columns
 * (role, team_role, permission_level)
 */

export interface TeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string | null;
  is_temporary: boolean | null;
  temp_meeting_id: string | null;
  auto_cleanup_at: string | null;
  last_accessed_at: string | null;
  updated_at: string | null;
}

export interface TeamMemberInsert {
  id?: string;
  team_id: string;
  user_id: string;
  joined_at?: string | null;
  is_temporary?: boolean | null;
  temp_meeting_id?: string | null;
  auto_cleanup_at?: string | null;
  last_accessed_at?: string | null;
  updated_at?: string | null;
}

export interface TeamMemberUpdate {
  id?: string;
  team_id?: string;
  user_id?: string;
  joined_at?: string | null;
  is_temporary?: boolean | null;
  temp_meeting_id?: string | null;
  auto_cleanup_at?: string | null;
  last_accessed_at?: string | null;
  updated_at?: string | null;
}

/**
 * Helper type for Supabase queries that returns team_members with profiles
 */
export interface TeamMemberWithProfile extends TeamMemberRow {
  profiles?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    role?: string;
  };
}
