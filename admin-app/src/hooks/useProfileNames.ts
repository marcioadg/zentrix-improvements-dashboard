import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const useProfileNames = (userIds: string[]) => {
  const [profiles, setProfiles] = useState<Map<string, ProfileData>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userIds.length === 0) {
      setProfiles(new Map());
      return;
    }

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (error) {
          logger.error('Error fetching profiles:', error);
          return;
        }

        const profileMap = new Map(
          data?.map(profile => [profile.id, profile]) || []
        );
        setProfiles(profileMap);
      } catch (err) {
        logger.error('Error fetching profiles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [userIds.join(',')]);

  const getProfileName = (userId: string) => {
    return profiles.get(userId)?.full_name || null;
  };

  const getProfileAvatar = (userId: string) => {
    return profiles.get(userId)?.avatar_url || null;
  };

  return {
    profiles,
    loading,
    getProfileName,
    getProfileAvatar
  };
};