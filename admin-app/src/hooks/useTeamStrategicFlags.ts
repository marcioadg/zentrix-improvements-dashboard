import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useTeamStrategicFlags = (teamId?: string) => {
  const [hasStrategicPlan, setHasStrategicPlan] = useState(false);
  const [isLeadershipTeam, setIsLeadershipTeam] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTeamFlags = async () => {
      if (!teamId) {
        setHasStrategicPlan(false);
        setIsLeadershipTeam(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const { data: teamData, error } = await supabase
          .from('teams')
          .select('has_strategic_plan, is_leadership')
          .eq('id', teamId)
          .single();

        if (error) {
          logger.error('Error checking team strategic flags:', error);
          setHasStrategicPlan(false);
          setIsLeadershipTeam(false);
        } else {
          setHasStrategicPlan(teamData?.has_strategic_plan || false);
          setIsLeadershipTeam(teamData?.is_leadership || false);
        }
      } catch (error) {
        logger.error('Error checking team strategic flags:', error);
        setHasStrategicPlan(false);
        setIsLeadershipTeam(false);
      } finally {
        setLoading(false);
      }
    };

    checkTeamFlags();
  }, [teamId]);

  return {
    hasStrategicPlan,
    isLeadershipTeam,
    loading,
  };
};