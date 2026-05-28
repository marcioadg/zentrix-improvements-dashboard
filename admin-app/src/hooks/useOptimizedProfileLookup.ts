
import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ProfileCache {
  [userId: string]: {
    full_name: string | null;
    email: string;
    avatar_url?: string;
  };
}

export const useOptimizedProfileLookup = (userIds: string[]) => {
  // Memoize unique user IDs to prevent unnecessary requests
  const uniqueUserIds = useMemo(() => {
    return Array.from(new Set(userIds.filter(Boolean)));
  }, [userIds]);

  const { data: profiles = {}, isLoading } = useQuery({
    queryKey: ['profiles-batch', uniqueUserIds],
    queryFn: async (): Promise<ProfileCache> => {
      if (uniqueUserIds.length === 0) return {};

      

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', uniqueUserIds);

      if (error) {
        logger.error('Error fetching profiles:', error);
        return {};
      }

      // Convert to cache format
      const profileCache: ProfileCache = {};
      data?.forEach(profile => {
        profileCache[profile.id] = {
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url
        };
      });

      return profileCache;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: uniqueUserIds.length > 0,
  });

  // Memoized profile name getter
  const getProfileName = useCallback((userId: string): string => {
    if (!userId) return 'Unknown';
    
    const profile = profiles[userId];
    if (!profile) return 'Loading...';
    
    return profile.full_name || profile.email || 'Unknown';
  }, [profiles]);

  // Memoized initials getter
  const getInitials = useCallback((userId: string): string => {
    const name = getProfileName(userId);
    if (name === 'Loading...' || name === 'Unknown') return '?';
    
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [getProfileName]);

  return {
    profiles,
    isLoading,
    getProfileName,
    getInitials,
  };
};
