import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role?: string; // Temporarily optional to support legacy code during migration
  company_id?: string;
  created_at: string;
  updated_at: string;
  company?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
  };
}

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    throw new Error(`Profile fetch failed: ${profileError.message}`);
  }

  return profileData;
};

export const useProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['profile', user?.id];

  const { data: profile, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Realtime: invalidate when public.profiles changes for this user
  // so cross-app updates (from CRM or Insights) reflect immediately in OS
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('os-profile-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { 
    profile, 
    loading: isLoading || authLoading, 
    error: error instanceof Error ? error.message : null 
  };
};
