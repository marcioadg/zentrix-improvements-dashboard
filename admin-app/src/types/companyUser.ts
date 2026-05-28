
export interface CompanyUser {
  id: string;
  user_id?: string; // Added for UnifiedUser compatibility
  email: string;
  full_name: string;
  role: string;
  permission_level?: string;
  status?: string; // Added for inactive status detection
  avatar_url?: string;
  created_at: string;
  joined_at?: string; // Added for UnifiedUser compatibility
  capabilities?: string[]; // Added for UnifiedUser compatibility
  access_type: 'direct' | 'team_member' | 'linked_company';
  email_confirmed_at?: string | null;
  company_memberships?: Array<{
    company_id: string;
    permission_level: string; // Already correct - using permission_level
  }>;
  primary_company_id?: string | null;
  last_reminder_sent_at?: string | null;
  reminder_count?: number;
  image_url?: string | null; // Personality profile chart image URL from company_members
}
