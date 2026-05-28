import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { toast } from 'sonner';
import { useGlobalReorderLock } from '@/hooks/useGlobalReorderLock';
import { logger } from '@/utils/logger';

interface Goal {
  id: string;
  title: string;
  description?: string;
  status: string;
  target_date?: string;
  progress?: number;
  type: 'personal' | 'company' | 'team';
  team_id?: string;
  assigned_team_ids?: string[];
  team_assignments?: Array<{ team_id: string }>;
  created_at: string;
}

interface GoalsData {
  personalGoals: Goal[];
  companyGoals: Goal[];
  teamGoals: Goal[];
  allGoals: Goal[];
}

const emptyGoalsData: GoalsData = {
  personalGoals: [],
  companyGoals: [],
  teamGoals: [],
  allGoals: []
};

// Module-level cache to prevent flash on re-mount
let dashboardGoalsCache: { companyId: string; data: GoalsData } | null = null;

export const useDashboardGoals = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const { isGloballyReordering } = useGlobalReorderLock();

  // Initialize from cache — if currentCompany is null (still loading from context),
  // use whatever is in cache regardless of companyId to prevent skeleton flash.
  // Once currentCompany loads, if it's a different company the effect will refetch.
  const cached = dashboardGoalsCache?.data ?? null;
  const [goalsData, setGoalsData] = useState<GoalsData>(cached || emptyGoalsData);
  const [loading, setLoading] = useState(!cached);

  // Stable company ID to avoid object reference issues
  const companyId = currentCompany?.id;

  const fetchGoals = useCallback(async (silent = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      if (!currentCompany) {
        // Don't clear data if we have cache — currentCompany is just still loading
        if (!dashboardGoalsCache) {
          setGoalsData(emptyGoalsData);
        }
        setLoading(false);
        return;
      }
      
      // Fetch personal goals for current company with team assignments
      const { data: personalGoals, error: personalError } = await supabase
        .from('team_goals')
        .select(`
          *,
          teams!inner(company_id),
          goal_team_assignments(team_id)
        `)
        .eq('teams.company_id', currentCompany?.id)
        .eq('owner_id', user.id)
        .eq('is_company_goal', false)
        .or('archived.is.null,archived.eq.false')
        .order('created_at', { ascending: false });

      if (personalError) {
        logger.error('🎯 Personal goals error:', personalError);
      }

      // For now, we'll consider all non-company goals as personal goals
      // so we don't need a separate team goals query to avoid duplicates

      // Fetch company goals for current company (only owned by current user) with team assignments
      const { data: companyGoals, error: companyError } = await supabase
        .from('team_goals')
        .select(`
          *,
          teams!inner(company_id),
          goal_team_assignments(team_id)
        `)
        .eq('teams.company_id', currentCompany?.id)
        .eq('is_company_goal', true)
        .eq('owner_id', user.id)
        .or('archived.is.null,archived.eq.false')
        .order('display_order', { ascending: true });

      if (companyError) {
        logger.error('🎯 Company goals error:', companyError);
      }

      logger.log('🎯 Found goals:', {
        personal: personalGoals?.length || 0,
        company: companyGoals?.length || 0
      });

      // Transform goals to consistent format with assigned_team_ids AND team_assignments
      // team_assignments is the format expected by EditGoalModal (array of {team_id: string} objects)
      const transformedPersonalGoals: Goal[] = (personalGoals || []).map(goal => ({
        ...goal,
        type: 'personal' as const,
        assigned_team_ids: (goal.goal_team_assignments || []).map((a: any) => a.team_id),
        team_assignments: (goal.goal_team_assignments || []).map((a: any) => ({ team_id: a.team_id }))
      }));

      const transformedCompanyGoals: Goal[] = (companyGoals || []).map(goal => ({
        ...goal,
        type: 'company' as const,
        assigned_team_ids: (goal.goal_team_assignments || []).map((a: any) => a.team_id),
        team_assignments: (goal.goal_team_assignments || []).map((a: any) => ({ team_id: a.team_id }))
      }));

      // Since we removed the separate team goals query, teamGoals is empty
      const allGoals = [...transformedPersonalGoals, ...transformedCompanyGoals];

      const newData: GoalsData = {
        personalGoals: transformedPersonalGoals,
        companyGoals: transformedCompanyGoals,
        teamGoals: [], // Empty since we removed duplicate team goals
        allGoals
      };

      setGoalsData(newData);
      if (currentCompany?.id) {
        dashboardGoalsCache = { companyId: currentCompany.id, data: newData };
      }

      logger.log('🎯 Final dashboard goals data:', {
        personal: transformedPersonalGoals.length,
        company: transformedCompanyGoals.length,
        total: allGoals.length
      });

    } catch (error) {
      logger.error('🎯 Error fetching goals:', error);
      setGoalsData(emptyGoalsData);
    } finally {
      setLoading(false);
    }
  }, [user?.id, companyId]);

  // Update goals state optimistically
  const updateGoalStatus = (goalId: string, newStatus: string, goalType: 'personal' | 'team' | 'company') => {
    setGoalsData(prev => {
      const updateGoalInArray = (goals: Goal[]) => 
        goals.map(goal => 
          goal.id === goalId ? { ...goal, status: newStatus } : goal
        );

      const updatedPersonalGoals = goalType === 'personal' 
        ? updateGoalInArray(prev.personalGoals)
        : prev.personalGoals;

      const updatedTeamGoals = goalType === 'team'
        ? updateGoalInArray(prev.teamGoals)
        : prev.teamGoals;

      const updatedCompanyGoals = goalType === 'company'
        ? updateGoalInArray(prev.companyGoals)
        : prev.companyGoals;

      const updatedAllGoals = [...updatedPersonalGoals, ...updatedTeamGoals, ...updatedCompanyGoals];

      return {
        personalGoals: updatedPersonalGoals,
        companyGoals: updatedCompanyGoals,
        teamGoals: updatedTeamGoals,
        allGoals: updatedAllGoals
      };
    });
  };

  // Archive goal function (soft delete)
  const deleteGoal = async (goalId: string): Promise<boolean> => {
    try {
      const targetGoal = goalsData.allGoals.find(g => g.id === goalId);
      if (!targetGoal) {
        logger.error('🎯 Goal not found for archiving:', goalId);
        return false;
      }

      // Use team_goals table - archive instead of delete
      const { error } = await supabase
        .from('team_goals')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (error) {
        logger.error('🎯 Error archiving goal:', error);
        toast.error(`Failed to archive goal: ${error.message}`);
        return false;
      }

      logger.log('🎯 Goal archived successfully');
      toast.success('Goal archived successfully');
      
      // Refresh the goals data silently
      await fetchGoals(true);
      return true;
    } catch (error) {
      logger.error('🎯 Error in deleteGoal:', error);
      toast.error('Failed to archive goal');
      return false;
    }
  };

  useEffect(() => {
    if (!user?.id || !companyId) return;
    // Always silent refresh — we show cached data immediately, update in background
    fetchGoals(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, companyId]);

  // Set up real-time subscriptions for goals
  useEffect(() => {
    if (!user || !companyId) return;

    // Subscribe to personal goals changes (now in team_goals table)
    const personalGoalsChannel = supabase
      .channel('dashboard_personal_goals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_goals',
          filter: `owner_id=eq.${user.id}`
        },
        () => {
          if (!isGloballyReordering()) {
            fetchGoals(true);
          }
        }
      )
      .subscribe();

    // Subscribe to company goals changes (simplified filter to avoid syntax errors)
    const companyGoalsChannel = supabase
      .channel('dashboard_company_goals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_goals',
          filter: `is_company_goal=eq.true`
        },
        () => {
          if (!isGloballyReordering()) {
            fetchGoals(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(personalGoalsChannel);
      supabase.removeChannel(companyGoalsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, companyId]);

  return {
    ...goalsData,
    loading,
    updateGoalStatus,
    deleteGoal,
    refetch: fetchGoals
  };
};