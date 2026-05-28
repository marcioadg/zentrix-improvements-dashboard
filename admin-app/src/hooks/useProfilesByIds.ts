import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  role: string;
}

/**
 * Optimized hook to fetch only specific profiles by their IDs
 * More efficient than fetching all profiles globally
 */
export const useProfilesByIds = (userIds: string[]) => {
  // Filter out empty/null IDs and deduplicate
  const validUserIds = Array.from(new Set(userIds.filter(id => id && id.trim() !== '')));

  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: ['profiles-by-ids', validUserIds.sort()], // Sort for consistent cache keys
    queryFn: async () => {
      if (validUserIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, role')
        .in('id', validUserIds);

      if (error) {
        logger.error('Error fetching profiles by IDs:', error);
        throw error;
      }

      return (data || []) as Profile[];
    },
    enabled: validUserIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  // Create helper functions similar to the global useProfiles hook
  const getProfileName = (userId: string): string => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || 'Unknown User';
  };

  const getProfile = (userId: string): Profile | undefined => {
    return profiles.find(p => p.id === userId);
  };

  return { 
    profiles, 
    isLoading, 
    getProfileName, 
    getProfile 
  };
};