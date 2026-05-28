import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BusinessProcess, MajorStep, MinorStep } from './useBusinessProcesses';
import { logger } from '@/utils/logger';

export const useProcessDetail = (processId: string) => {
  return useQuery({
    queryKey: ['business-process', processId],
    queryFn: async (): Promise<BusinessProcess | null> => {
      if (!processId) return null;

      const { data, error } = await supabase
        .from('business_processes')
        .select(`
          *,
          major_steps:process_major_steps(
            *,
            minor_steps:process_minor_steps(*)
          )
        `)
        .eq('id', processId)
        .single();

      if (error) {
        logger.error('Error fetching process detail:', error);
        throw error;
      }

      if (!data) return null;

      // Sort major steps and minor steps by display_order
      return {
        ...data,
        major_steps: (data.major_steps || [])
          .sort((a: MajorStep, b: MajorStep) => a.display_order - b.display_order)
          .map((step: any) => ({
            ...step,
            minor_steps: (step.minor_steps || [])
              .sort((a: MinorStep, b: MinorStep) => a.display_order - b.display_order),
          })),
      } as BusinessProcess;
    },
    enabled: !!processId,
    staleTime: 30_000,
  });
};
