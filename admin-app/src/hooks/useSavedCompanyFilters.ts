import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface SavedFilter {
  id: string;
  name: string;
  filter_data: {
    searchQuery?: string;
    excludedCompanyIds?: string[];
    showAtRisk?: boolean;
    subscriptionTier?: string;
  };
  created_at: string;
  updated_at: string;
}

export const useSavedCompanyFilters = () => {
  const queryClient = useQueryClient();

  // Fetch all saved filters
  const { data: savedFilters, isLoading } = useQuery({
    queryKey: ['saved-company-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_company_filters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavedFilter[];
    },
  });

  // Save a new filter
  const saveFilterMutation = useMutation({
    mutationFn: async ({ name, filterData }: { name: string; filterData: SavedFilter['filter_data'] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('saved_company_filters')
        .insert({
          user_id: user.id,
          name,
          filter_data: filterData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-company-filters'] });
      toast.success('Filter saved successfully');
    },
    onError: (error: any) => {
      if (error.message?.includes('unique')) {
        toast.error('A filter with this name already exists');
      } else {
        toast.error('Failed to save filter');
      }
      logger.error('Save filter error:', error);
    },
  });

  // Delete a saved filter
  const deleteFilterMutation = useMutation({
    mutationFn: async (filterId: string) => {
      const { error } = await supabase
        .from('saved_company_filters')
        .delete()
        .eq('id', filterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-company-filters'] });
      toast.success('Filter deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete filter');
      logger.error('Delete filter error:', error);
    },
  });

  // Update a saved filter
  const updateFilterMutation = useMutation({
    mutationFn: async ({ id, name, filterData }: { id: string; name: string; filterData: SavedFilter['filter_data'] }) => {
      const { data, error } = await supabase
        .from('saved_company_filters')
        .update({
          name,
          filter_data: filterData,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-company-filters'] });
      toast.success('Filter updated');
    },
    onError: (error) => {
      toast.error('Failed to update filter');
      logger.error('Update filter error:', error);
    },
  });

  return {
    savedFilters: savedFilters || [],
    isLoading,
    saveFilter: saveFilterMutation.mutate,
    deleteFilter: deleteFilterMutation.mutate,
    updateFilter: updateFilterMutation.mutate,
    isSaving: saveFilterMutation.isPending,
    isDeleting: deleteFilterMutation.isPending,
  };
};
