import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useStripeAccount = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stripeAccount, isLoading } = useQuery({
    queryKey: ['stripe-account'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_stripe_account');
      if (error) throw error;
      return (data as 'old' | 'new') || 'old';
    },
  });

  const setAccountMutation = useMutation({
    mutationFn: async (account: 'old' | 'new') => {
      const { data, error } = await supabase.rpc('set_stripe_account', { p_account: account });
      if (error) throw error;
      if (!data.success) {
        throw new Error(data.error || 'Failed to update Stripe account');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stripe-account'] });
      queryClient.invalidateQueries({ queryKey: ['stripe-mode'] });
      toast({
        title: 'Stripe Account Updated',
        description: `Switched from ${data.old_account} to ${data.new_account} account`,
      });
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
    stripeAccount: stripeAccount || 'old',
    isLoading,
    setStripeAccount: setAccountMutation.mutate,
    isUpdating: setAccountMutation.isPending,
  };
};
