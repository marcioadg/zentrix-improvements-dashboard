import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

export interface MinorStep {
  id: string;
  major_step_id: string;
  title: string;
  hyperlink: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface MajorStep {
  id: string;
  process_id: string;
  title: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  minor_steps: MinorStep[];
}

export interface BusinessProcess {
  id: string;
  company_id: string;
  name: string;
  owner: string | null;
  description: string | null;
  created_by: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  major_steps: MajorStep[];
}

export const useBusinessProcesses = () => {
  const { currentCompany } = useMultiCompany();

  return useQuery({
    queryKey: ['business-processes', currentCompany?.id],
    queryFn: async (): Promise<BusinessProcess[]> => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('business_processes')
        .select(`
          *,
          major_steps:process_major_steps(
            *,
            minor_steps:process_minor_steps(*)
          )
        `)
        .eq('company_id', currentCompany?.id)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('Error fetching business processes:', error);
        throw error;
      }

      // Sort major steps and minor steps by display_order
      return (data || []).map((process: any) => ({
        ...process,
        major_steps: (process.major_steps || [])
          .sort((a: MajorStep, b: MajorStep) => a.display_order - b.display_order)
          .map((step: any) => ({
            ...step,
            minor_steps: (step.minor_steps || [])
              .sort((a: MinorStep, b: MinorStep) => a.display_order - b.display_order),
          })),
      }));
    },
    enabled: !!currentCompany?.id,
    staleTime: 60_000,
  });
};
