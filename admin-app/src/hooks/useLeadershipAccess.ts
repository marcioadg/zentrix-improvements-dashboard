
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export const useLeadershipAccess = (teamId?: string) => {
  const [isLeadershipMember, setIsLeadershipMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const { teams } = useUserTeams();
  const { user } = useAuth();

  const checkLeadershipAccess = async () => {
    if (!user || !teamId) {
      setIsLeadershipMember(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      logger.log('🔍 useLeadershipAccess: Checking if team is leadership:', { teamId });
      
      // Check if the specific team being viewed has is_leadership = true
      // AND the user is a member of that team
      const { data: teamData, error } = await supabase
        .from('teams')
        .select('id, name, is_leadership')
        .eq('id', teamId)
        .eq('is_leadership', true)
        .maybeSingle();

      if (error) {
        logger.error('Error checking leadership access:', error);
        setIsLeadershipMember(false);
        return;
      }

      // If team is not a leadership team, return false immediately
      if (!teamData) {
        logger.log('🔍 useLeadershipAccess: Team is not a leadership team');
        setIsLeadershipMember(false);
        setLoading(false);
        return;
      }

      // Check if user is a member of this specific leadership team
      const userTeam = teams.find(t => t.id === teamId);
      const isUserMember = !!userTeam;

      logger.log('🔍 useLeadershipAccess: Leadership team check result:', { 
        teamData, 
        isUserMember,
        userTeams: teams.map(t => ({ id: t.id, name: t.name }))
      });
      
      setIsLeadershipMember(isUserMember);
    } catch (error) {
      logger.error('Error checking leadership access:', error);
      setIsLeadershipMember(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLeadershipAccess();
  }, [teams, user, teamId]);

  return {
    isLeadershipMember,
    loading,
    refetch: checkLeadershipAccess,
  };
};
