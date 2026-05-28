
export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  role?: string;
  joined_at?: string;
  auto_create_overdue_issues?: boolean;
  zentrix_support_access?: boolean;
  default_vote_limit?: number;
  require_task_before_solve?: boolean;
  auto_solve_on_task_create?: boolean;
  ai_meeting_transcription?: boolean;
  /** Gates the tool-using Zentrix Agent + third-party integrations (beta allowlist). */
  ai_agent_enabled?: boolean;
}

export interface MultiCompanyContextType {
  companies: Company[];
  currentCompany: Company | null;
  loading: boolean;
  error: string | null;
  switchCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}
