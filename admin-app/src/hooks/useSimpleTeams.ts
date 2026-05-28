import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface SimpleTeam {
  id: string;
  name: string;
  description?: string;
  company_id: string;
}

export const useSimpleTeams = () => {
  const [teams, setTeams] = useState<SimpleTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();

  useEffect(() => {
    let isMounted = true;

    const fetchTeams = async () => {
      if (!user || !currentCompany) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First get team IDs where user is a member
        const { data: membershipData, error: membershipError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id);

        if (membershipError) throw membershipError;

        if (!membershipData || membershipData.length === 0) {
          if (isMounted) {
            setTeams([]);
            setLoading(false);
          }
          return;
        }

        const teamIds = membershipData.map(m => m.team_id);

        // Then query all teams where user is a member
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select(`
            id, 
            name, 
            description, 
            company_id,
            has_strategic_plan,
            is_leadership
          `)
          .eq('company_id', currentCompany?.id)
          .in('id', teamIds)
          .order('name');

        if (teamsError) throw teamsError;

        if (isMounted) {
          setTeams(teamsData || []);
        }
      } catch (err: any) {
        logger.error('🚨 useSimpleTeams: Error:', err);
        if (isMounted) {
          setError(err.message);
          setTeams([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTeams();

    // Set up real-time subscriptions for teams and team membership changes
    const teamsChannel = supabase
      .channel('teams-realtime')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'teams',
          filter: `company_id=eq.${currentCompany?.id}`
        }, 
        () => {
          fetchTeams();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'team_members',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(teamsChannel);
    };
  }, [user?.id, currentCompany?.id]);

  return { teams, loading, error };
};