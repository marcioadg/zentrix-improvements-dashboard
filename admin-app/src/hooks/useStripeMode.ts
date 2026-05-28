import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useStripeMode = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stripeMode, isLoading } = useQuery({
    queryKey: ['stripe-mode'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_stripe_mode');
      if (error) throw error;
      return data as 'test' | 'live';
    },
  });

  const setModeMutation = useMutation({
    mutationFn: async (mode: 'test' | 'live') => {
      const { data, error } = await supabase.rpc('set_stripe_mode', { p_mode: mode });
      if (error) throw error;
      if (!data.success) {
        throw new Error(data.error || 'Failed to update Stripe mode');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stripe-mode'] });
      toast({
        title: 'Stripe Mode Updated',
        description: `Switched from ${data.old_mode} to ${data.new_mode} mode`,
      });
      // Reload the page to ensure all components use the new mode
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    stripeMode,
    isLoading,
    setStripeMode: setModeMutation.mutate,
    isUpdating: setModeMutation.isPending,
  };
};
