import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface StrategyTeam {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  has_strategic_plan: boolean;
  is_leadership: boolean;
}

export const useStrategyTeams = () => {
  const [teams, setTeams] = useState<StrategyTeam[]>([]);
  const [optimisticTeams, setOptimisticTeams] = useState<StrategyTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();

  useEffect(() => {
    let isMounted = true;

    const fetchTeams = async () => {
      if (!user || !currentCompany) {
        // Don't set loading to false - we're waiting for auth/company context to load
        return;
      }

      const startTime = performance.now();
      logger.log('🚀 useStrategyTeams: Starting fetch for company:', currentCompany?.id);

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

        // Then query teams where user is a member AND has_strategic_plan is true
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
          .eq('has_strategic_plan', true)
          .in('id', teamIds)
          .order('name');

        if (teamsError) throw teamsError;

        if (isMounted) {
          setTeams(teamsData || []);
          const endTime = performance.now();
          logger.log('✅ useStrategyTeams: Fetched', teamsData?.length || 0, 'strategy teams in', endTime - startTime, 'ms');
        }
      } catch (err: any) {
        logger.error('🚨 useStrategyTeams: Error:', err);
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
      .channel('strategy-teams-realtime')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'teams',
          filter: `company_id=eq.${currentCompany?.id}`
        }, 
        () => {
          logger.log('🔄 useStrategyTeams: Teams table changed, refetching...');
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
          logger.log('🔄 useStrategyTeams: Team membership changed, refetching...');
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(teamsChannel);
    };
  }, [user?.id, currentCompany?.id]);

  // Listen for optimistic team creation events
  useEffect(() => {
    const handleOptimisticTeamCreation = (event: CustomEvent<StrategyTeam>) => {
      const newTeam = event.detail;
      logger.log('🚀 useStrategyTeams: Received optimistic team creation:', newTeam.name);
      
      // Add team optimistically if it has strategic plan and user is member
      if (newTeam.has_strategic_plan && newTeam.company_id === currentCompany?.id) {
        setOptimisticTeams(prev => {
          const exists = prev.some(t => t.id === newTeam.id);
          if (!exists) {
            logger.log('✅ useStrategyTeams: Adding optimistic team:', newTeam.name);
            return [...prev, newTeam];
          }
          return prev;
        });

        // Remove from optimistic list after a delay to let real-time catch up
        setTimeout(() => {
          setOptimisticTeams(prev => prev.filter(t => t.id !== newTeam.id));
        }, 3000);
      }
    };

    window.addEventListener('optimistic-team-created', handleOptimisticTeamCreation as EventListener);
    
    return () => {
      window.removeEventListener('optimistic-team-created', handleOptimisticTeamCreation as EventListener);
    };
  }, [currentCompany?.id]);

  // Combine real teams with optimistic ones, removing duplicates
  const allTeams = React.useMemo(() => {
    const realTeamIds = new Set(teams.map(t => t.id));
    const uniqueOptimisticTeams = optimisticTeams.filter(t => !realTeamIds.has(t.id));
    return [...teams, ...uniqueOptimisticTeams];
  }, [teams, optimisticTeams]);

  return { teams: allTeams, loading, error };
};