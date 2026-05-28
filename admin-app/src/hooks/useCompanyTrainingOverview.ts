
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiCompanyAccess } from "@/hooks/useMultiCompanyAccess";

// Defines a row returned from get_company_training_overview
export interface CompanyTrainingRow {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  assignment_id: string | null;
  playbook_id: string | null;
  playbook_title: string | null;
  playbook_description: string | null;
  status: string | null;
  due_date: string | null;
  assigned_at: string | null;
  progress_percentage: number | null;
}

// Grouped structure for users and their playbooks
export interface CompanyTrainingUser {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  assignments: Array<{
    assignment_id: string;
    playbook_id: string;
    playbook_title: string;
    playbook_description: string;
    status: string;
    due_date: string | null;
    assigned_at: string | null;
    progress_percentage: number;
  }>;
}

export function useCompanyTrainingOverview() {
  const { currentCompany, loading: companyLoading } = useMultiCompanyAccess();

  return useQuery({
    queryKey: ["company-training-overview", currentCompany?.id],
    enabled: !!currentCompany?.id && !companyLoading,
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .rpc("get_company_training_overview", { p_company_id: currentCompany?.id });

      if (error) {
        throw new Error(error.message);
      }
      return data as CompanyTrainingRow[];
    },
  });
}
