import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Hook to fetch all team IDs that a specific user belongs to
 * Used to determine which teams a user can be assigned to as goal owner
 */
export const useUserTeamMemberships = (userId: string | null | undefined) => {
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If no userId provided, reset and return early
    if (!userId) {
      setTeamIds([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchTeamMemberships = async () => {
      try {
        setLoading(true);
        setError(null);

        logger.log('🔍 useUserTeamMemberships: Fetching team memberships for user:', userId);

        const { data, error: fetchError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId);

        if (fetchError) {
          logger.error('❌ Error fetching team memberships:', fetchError);
          setError(fetchError.message);
          setTeamIds([]);
        } else {
          const memberTeamIds = data?.map(tm => tm.team_id) || [];
          logger.log('✅ User team memberships fetched:', memberTeamIds);
          setTeamIds(memberTeamIds);
        }
      } catch (err) {
        logger.error('❌ Unexpected error fetching team memberships:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setTeamIds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMemberships();
  }, [userId]); // Re-fetch when userId changes

  return { teamIds, loading, error };
};
