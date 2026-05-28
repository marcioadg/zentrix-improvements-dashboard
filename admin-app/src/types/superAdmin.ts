export interface CompanyStats {
  id: string;
  name: string;
  slug: string;
  user_count: number;
  pending_user_count: number;
  team_count: number;
  metrics_count: number;
  goals_count?: number;
  meetings_count?: number;
  org_roles_count?: number;
  strategy_count?: number;
  created_at: string;
  last_login_at: string | null;
  status: 'active' | 'suspended';
  usage_hours_7d?: number;
  company_status?: 'Active' | 'Working' | 'Stuck';
  health_score?: import('@/utils/companyHealthScore').HealthScoreBreakdown;
  subscription_tier?: 'Free' | 'Trial' | 'Paid' | 'Blocked' | 'Cancelled';
  trial_end?: string | null;
  cancelled_at?: string | null;
  subscribed?: boolean;
}

export interface SystemTest {
  id: string;
  test_name: string;
  test_type: 'automated' | 'manual';
  test_category: string;
  description?: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  executed_at?: string;
  duration_ms?: number;
  error_message?: string;
}

export interface AdminAction {
  id: string;
  action_type: string;
  target_type?: string;
  target_id?: string;
  description: string;
  details?: any;
  created_at: string;
  admin_user_id: string;
  company_id?: string;
  user_affected_id?: string;
  user_ip_address?: string;
  success?: boolean;
  session_id?: string;
  // Joined data from queries
  admin_user_name?: string;
  affected_user_name?: string;
  company_name?: string;
}
