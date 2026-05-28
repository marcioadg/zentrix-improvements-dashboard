import { supabase } from '@/integrations/supabase/client';

export interface CompanyStateReport {
  id: string;
  company_id: string;
  generated_by: string | null;
  week_start: string;
  report_data: ReportData;
  created_at: string;
  updated_at: string;
}

export interface ReportData {
  executive_summary: string;
  goal_progress: Array<{
    name: string;
    status: 'on_track' | 'at_risk' | 'off_track';
    completion: number;
    note: string;
  }>;
  metrics_health: Array<{
    name: string;
    value: string;
    target: string;
    status: 'healthy' | 'warning' | 'critical';
    trend: 'up' | 'down' | 'flat';
    note: string;
  }>;
  team_performance: {
    summary: string;
    highlights: string[];
  };
  risks: Array<{
    title: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    mitigation: string;
  }>;
  wins: Array<{
    title: string;
    description: string;
  }>;
  recommendations: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    impact: string;
  }>;
  action_items: Array<{
    action: string;
    owner: string;
    priority: 'high' | 'medium' | 'low';
    deadline: string;
  }>;
}

export async function generateReport(
  companyId: string,
  userId: string,
  forceRefresh = false
): Promise<CompanyStateReport> {
  // Fetch metrics directly as fallback context for the AI prompt
  const { data: metricsData } = await supabase
    .from("weekly_metrics")
    .select("metric_name, target_value, target_logic, unit, owner_id")
    .eq("company_id", companyId)
    .limit(20);

  const { data, error } = await supabase.functions.invoke('company-state-report', {
    body: {
      company_id: companyId,
      user_id: userId,
      force_refresh: forceRefresh,
      metrics_context: metricsData || [],
    },
  });

  if (error) throw new Error(error.message || 'Failed to generate report');
  if (data?.error) throw new Error(data.error);

  return data.report as CompanyStateReport;
}

export async function getLatestReport(
  companyId: string
): Promise<CompanyStateReport | null> {
  const { data, error } = await supabase
    .from('company_state_reports' as any)
    .select('*')
    .eq('company_id', companyId)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as CompanyStateReport | null;
}

export async function getReportHistory(
  companyId: string,
  limit = 10
): Promise<CompanyStateReport[]> {
  const { data, error } = await supabase
    .from('company_state_reports' as any)
    .select('*')
    .eq('company_id', companyId)
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as CompanyStateReport[];
}
