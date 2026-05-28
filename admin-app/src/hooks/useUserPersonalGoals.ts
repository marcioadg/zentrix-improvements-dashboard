import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

interface UserGoal {
  id: string;
  title: string;
  description?: string;
  status: string;
  target_date?: string;
  progress?: number;
  type: 'personal' | 'company' | 'team';
  created_at: string;
  owner_id?: string;
  is_company_goal?: boolean;
}

interface GoalsData {
  personalGoals: UserGoal[];
  companyGoals: UserGoal[];
  allGoals: UserGoal[];
}

export const useUserPersonalGoals = () => {
  const [goalsData, setGoalsData] = useState<GoalsData>({
    personalGoals: [],
    companyGoals: [],
    allGoals: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();

  useEffect(() => {
    if (!user) {
      logger.log('🔍 useUserPersonalGoals: No authenticated user found');
      setLoading(false);
      return;
    }
    
    if (!currentCompany) {
      logger.log('🔍 useUserPersonalGoals: No current company found for user:', user.id);
      setLoading(false);
      return;
    }
    
    logger.log('🔍 useUserPersonalGoals: Starting fetch for user:', user.id, 'company:', currentCompany?.id);

    const fetchUserGoals = async () => {
      try {
        logger.log('🔍 useUserPersonalGoals: Fetching for user:', user.id);
        
        // Fetch personal goals (now stored in team_goals)
        const { data: personalGoals, error: personalError } = await supabase
          .from('team_goals')
          .select('*')
          .eq('owner_id', user.id)
          .eq('is_company_goal', false)
          .order('created_at', { ascending: false });

        if (personalError) {
          logger.log('🔍 useUserPersonalGoals: Personal goals error (may not exist):', personalError.message);
        }

        // Fetch company goals that user has access to through team membership
        const { data: companyGoals, error: companyError } = await supabase
          .from('team_goals')
          .select(`
            *,
            teams!inner(
              company_id,
              name
            )
          `)
          .eq('teams.company_id', currentCompany?.id)
          .eq('is_company_goal', true)
          .is('archived', null)
          .order('created_at', { ascending: false });

        if (companyError) {
          logger.log('🔍 useUserPersonalGoals: Company goals error (may not exist):', companyError.message);
        }

        // Fetch team goals that user has access to through team membership  
        const { data: teamGoals, error: teamError } = await supabase
          .from('team_goals')
          .select(`
            *,
            teams!inner(
              company_id,
              name
            )
          `)
          .eq('teams.company_id', currentCompany?.id)
          .eq('is_company_goal', false)
          .is('archived', null)
          .order('created_at', { ascending: false });

        if (teamError) {
          logger.log('🔍 useUserPersonalGoals: Team goals error (may not exist):', teamError.message);
        }

        // Filter goals by user's team membership (do this in JavaScript since we can't do complex joins)
        const userTeamIds = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id);

        const userTeamIdSet = new Set(userTeamIds.data?.map(tm => tm.team_id) || []);
        
        const filteredCompanyGoals = (companyGoals || []).filter(goal => 
          userTeamIdSet.has(goal.team_id)
        );
        
        const filteredTeamGoals = (teamGoals || []).filter(goal => 
          userTeamIdSet.has(goal.team_id)
        );

        logger.log('🔍 useUserPersonalGoals: Found personal goals:', personalGoals?.length || 0);
        logger.log('🔍 useUserPersonalGoals: Found company goals (before filter):', companyGoals?.length || 0);
        logger.log('🔍 useUserPersonalGoals: Found team goals (before filter):', teamGoals?.length || 0);
        logger.log('🔍 useUserPersonalGoals: User team IDs:', Array.from(userTeamIdSet));
        logger.log('🔍 useUserPersonalGoals: Filtered company goals:', filteredCompanyGoals?.length || 0);
        logger.log('🔍 useUserPersonalGoals: Filtered team goals:', filteredTeamGoals?.length || 0);

        // Transform personal goals
        const transformedPersonalGoals = (personalGoals || []).map((goal: any) => ({
          ...goal,
          type: 'personal' as const,
          progress: Math.floor(Math.random() * 80) + 10 // Placeholder progress
        }));

        // Transform company goals
        const transformedCompanyGoals = (filteredCompanyGoals || []).map((goal: any) => ({
          ...goal,
          type: 'company' as const,
          progress: goal.progress || Math.floor(Math.random() * 80) + 10
        }));

        // Transform team goals
        const transformedTeamGoals = (filteredTeamGoals || []).map((goal: any) => ({
          ...goal,
          type: 'team' as const,
          progress: goal.progress || Math.floor(Math.random() * 80) + 10
        }));

        const allGoals = [...transformedPersonalGoals, ...transformedCompanyGoals, ...transformedTeamGoals]
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        setGoalsData({
          personalGoals: transformedPersonalGoals,
          companyGoals: [...transformedCompanyGoals, ...transformedTeamGoals], // Combine for display
          allGoals
        });
      } catch (error) {
        logger.error('❌ useUserPersonalGoals: Error fetching goals:', error);
        setGoalsData({
          personalGoals: [],
          companyGoals: [],
          allGoals: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserGoals();
  }, [user, currentCompany]);

  // Calculate completion stats
  const completedGoals = goalsData.allGoals.filter(goal => goal.status === 'complete').length;
  const totalGoals = goalsData.allGoals.length;
  const completedPercentage = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return { 
    personalGoals: goalsData.personalGoals,
    companyGoals: goalsData.companyGoals,
    allGoals: goalsData.allGoals,
    loading,
    completedGoals,
    totalGoals,
    completedPercentage
  };
};