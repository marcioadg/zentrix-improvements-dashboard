export interface CompanyUsageStats {
  company_id: string;
  company_name: string;
  total_hours: number;
  total_minutes: number;
  total_sessions: number;
  active_users_count: number;
  average_session_minutes: number;
  last_activity_date: string | null;
  created_at: string;
  trend?: 'up' | 'down' | 'stable';
}

export type SortOption = 
  | 'name_asc'        // A-Z
  | 'name_desc'       // Z-A
  | 'created_newest'  // Created (Newest first)
  | 'created_oldest'  // Created (Oldest first)
  | 'hours_desc'      // Total Hours (Most to Least)
  | 'hours_asc'       // Total Hours (Least to Most)
  | 'avg_session_desc' // Avg Session (Longest to Shortest)
  | 'avg_session_asc'  // Avg Session (Shortest to Longest)
  | 'last_activity'   // Last Activity (Recent first)
  | 'active_users'    // Active Users (Most to Least)
  | 'sessions_desc';  // Sessions (Most to Least)

export interface PlatformOverviewStats {
  total_companies: number;
  total_hours: number;
  average_hours_per_company: number;
  most_active_company: {
    name: string;
    hours: number;
  } | null;
}

export type TimePeriod = '7d' | '30d' | '90d' | 'all';
