import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useCompanyGoals } from '@/hooks/useCompanyGoals';
import { useCompanyUsers } from '@/hooks/useCompanyUsers';
import { useMetricsOverview } from '@/hooks/useMetricsOverview';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { logger } from '@/utils/logger';
import { safeStorage } from '@/utils/safeStorage';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  inProgress: boolean;
}

interface OnboardingContextType {
  steps: OnboardingStep[];
  isVisible: boolean;
  completedCount: number;
  totalSteps: number;
  progressPercentage: number;
  allCompleted: boolean;
  isInitiallyCompleted: boolean;
  celebrationShown: boolean;
  completeStep: (stepId: string) => void;
  optimisticallyCompleteTeamCreation: () => void;
  optimisticallyCompleteGoalCreation: () => void;
  optimisticallyCompleteMeetingCreation: () => void;
  optimisticallyCompleteOrgChart: () => void;
  hideWidget: () => void;
  showWidget: () => void;
  resetProgress: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
  initialSteps: OnboardingStep[];
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ 
  children, 
  initialSteps 
}) => {
  // Removed excessive logging that caused infinite loop
  
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { teams, loading: teamsLoading } = useTeamManagement();
  
  // Filter teams to only current company teams
  const companyTeams = useMemo(() => 
    teams.filter(t => t.company_id === currentCompany?.id), 
    [teams, currentCompany?.id]
  );
  
  const { goals, loading: goalsLoading } = useCompanyGoals(companyTeams);
  const { users, loading: usersLoading } = useCompanyUsers();
  const { myMetrics, loading: metricsLoading } = useMetricsOverview();
  const { hasDirectorAccess } = useCurrentUserPermissionLevel();

  // Don't calculate completion while core data is loading
  const isDataLoading = teamsLoading || goalsLoading || usersLoading || metricsLoading;

  // Removed context data logging to prevent excessive console output

  const [steps, setSteps] = useState<OnboardingStep[]>(initialSteps);
  const [isVisible, setIsVisible] = useState(false); // Start as false to prevent flash
  const [isInitiallyCompleted, setIsInitiallyCompleted] = useState(false);
  const [celebrationShown, setCelebrationShown] = useState(false);
  const [optimisticTeamCount, setOptimisticTeamCount] = useState(0);
  const [optimisticGoalCount, setOptimisticGoalCount] = useState(0);
  const [optimisticMeetingCount, setOptimisticMeetingCount] = useState(0);
  const [optimisticOrgChartCount, setOptimisticOrgChartCount] = useState(0);
  const [optimisticStrategyCount, setOptimisticStrategyCount] = useState(0);
  const lastCheckRef = useRef<string>('');

  // Reset optimistic counts when company changes
  useEffect(() => {
    setOptimisticGoalCount(0);
    setOptimisticTeamCount(0);
    setOptimisticMeetingCount(0);
    setOptimisticOrgChartCount(0);
    setOptimisticStrategyCount(0);
  }, [currentCompany?.id]);

  // Check if onboarding was previously completed for this company
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      logger.log('🎯 OnboardingContext: Starting initial completion check');
      if (user?.id && currentCompany?.id) {
        try {
          logger.log('🎯 Checking onboarding completion status for:', { userId: user.id, companyId: currentCompany?.id });
          
          const { data: isCompleted, error } = await supabase.rpc('is_onboarding_completed', {
            p_user_id: user.id,
            p_company_id: currentCompany?.id
          });
          
          if (error) {
            logger.error('Error checking onboarding completion:', error);
            return;
          }
          
          logger.log('🎯 Onboarding completion check result:', isCompleted);
          
          if (isCompleted) {
            setIsVisible(false);
            setIsInitiallyCompleted(true);
            setCelebrationShown(true); // Mark celebration as already shown for completed onboarding
            logger.log('🎯 Onboarding already completed for this company, keeping widget hidden');
          } else {
            // Check if widget was manually dismissed for this company
            const dismissedKey = `onboarding-widget-dismissed-${currentCompany?.id}`;
            let wasDismissed = false;
            wasDismissed = safeStorage.getItem(dismissedKey) === 'true';
            
            if (wasDismissed) {
              setIsVisible(false);
              logger.log('🎯 Onboarding widget was previously dismissed, keeping hidden');
            } else {
              setIsVisible(true); // Only show widget if onboarding not completed and not dismissed
              logger.log('🎯 Onboarding not completed, showing widget');
            }
            setIsInitiallyCompleted(false);
            setCelebrationShown(false);
          }
        } catch (error) {
          logger.error('Error in onboarding status check:', error);
        }
      } else {
        logger.log('🎯 OnboardingContext: Missing user or company context', { userId: user?.id, companyId: currentCompany?.id });
      }
    };
    
    checkOnboardingStatus();
  }, [user?.id, currentCompany?.id]);

  // Listen for optimistic team creation events
  useEffect(() => {
    const handleOptimisticTeamCreation = () => {
      logger.log('🎯 OnboardingContext: Received optimistic team creation event');
      setOptimisticTeamCount(prev => prev + 1);
    };

    const handleOptimisticGoalCreation = () => {
      logger.log('🎯 OnboardingContext: Received optimistic goal creation event');
      setOptimisticGoalCount(prev => prev + 1);
    };

    const handleOptimisticMeetingCreation = () => {
      logger.log('🎯 OnboardingContext: Received optimistic meeting creation event');
      setOptimisticMeetingCount(prev => prev + 1);
    };

    const handleOptimisticOrgChartCreation = () => {
      logger.log('🎯 OnboardingContext: Received optimistic org chart creation event');
      setOptimisticOrgChartCount(prev => prev + 1);
    };

    const handleOptimisticMetricCreation = () => {
      logger.log('🎯 OnboardingContext: Received optimistic metric creation event');
      // Metric creation contributes to org chart completion
      setOptimisticOrgChartCount(prev => prev + 1);
    };

    const handleOptimisticUserInvitation = () => {
      logger.log('🎯 OnboardingContext: Received optimistic user invitation event');
      // User invitation is tracked separately, no additional state needed
    };

    const handleOptimisticStrategyCreation = () => {
      logger.log('🎯 OnboardingContext: Received optimistic strategy creation event');
      setOptimisticStrategyCount(prev => prev + 1);
    };

    window.addEventListener('optimistic-team-creation', handleOptimisticTeamCreation);
    window.addEventListener('optimistic-goal-creation', handleOptimisticGoalCreation);
    window.addEventListener('optimistic-meeting-creation', handleOptimisticMeetingCreation);
    window.addEventListener('optimistic-org-chart-creation', handleOptimisticOrgChartCreation);
    window.addEventListener('optimistic-metric-creation', handleOptimisticMetricCreation);
    window.addEventListener('optimistic-user-invitation', handleOptimisticUserInvitation);
    window.addEventListener('optimistic-strategy-creation', handleOptimisticStrategyCreation);
    
    return () => {
      window.removeEventListener('optimistic-team-creation', handleOptimisticTeamCreation);
      window.removeEventListener('optimistic-goal-creation', handleOptimisticGoalCreation);
      window.removeEventListener('optimistic-meeting-creation', handleOptimisticMeetingCreation);
      window.removeEventListener('optimistic-org-chart-creation', handleOptimisticOrgChartCreation);
      window.removeEventListener('optimistic-metric-creation', handleOptimisticMetricCreation);
      window.removeEventListener('optimistic-user-invitation', handleOptimisticUserInvitation);
      window.removeEventListener('optimistic-strategy-creation', handleOptimisticStrategyCreation);
    };
  }, []);

  // Check completion status based on actual data (debounced to prevent loops)
  useEffect(() => {
    if (!user || !currentCompany || isDataLoading) {
      return;
    }
    
    // Use optimistic count for teams to ensure better UX
    const effectiveTeamCount = Math.max(teams.length, optimisticTeamCount);
    // Use optimistic count for goals as well 
    const effectiveGoalCount = Math.max(goals.length, optimisticGoalCount);
    
    const checkKey = `${currentCompany?.id}-${effectiveTeamCount}-${users.length}-${effectiveGoalCount}-${myMetrics.length}-${optimisticStrategyCount}`;
    if (lastCheckRef.current === checkKey) return; // Prevent duplicate checks
    
    lastCheckRef.current = checkKey;

    const checkCompletionStatus = async () => {
      try {
        const companyTeamIds = teams.filter(t => t.company_id === currentCompany?.id).map(t => t.id);
        const hasTeamsInCompany = companyTeamIds.length > 0;
        
        // Initialize variables with defaults
        let meetings: any[] = [];
        let meetingsError: any = null;
        let companyMetrics: any[] = [];
        let teamGoals: any[] = [];
        
        // Only make team-scoped queries if we have teams in this company
        if (hasTeamsInCompany) {
          const { data, error } = await supabase
            .from('meetings_state')
            .select('id')
            .in('team_id', companyTeamIds)
            .limit(1);
          meetings = data || [];
          meetingsError = error;
          
          // Get metrics for company teams
          const { data: metricsData } = await supabase
            .from('weekly_metrics')
            .select('id')
            .in('team_id', companyTeamIds)
            .limit(1);
          companyMetrics = metricsData || [];
          
          // Get team goals
          const { data: teamGoalsData } = await supabase
            .from('team_goals')
            .select('id')
            .in('team_id', companyTeamIds)
            .limit(1);
          teamGoals = teamGoalsData || [];
        }
        
        // Use optimistic count for meetings
        const effectiveMeetingCount = Math.max((meetings?.length || 0), optimisticMeetingCount);

        // Check for org chart roles
        const { data: orgRoles, error: orgRolesError } = await supabase
          .from('org_roles')
          .select('id')
          .eq('company_id', currentCompany?.id)
          .limit(1);

        // Check for strategy sessions (updated to check strategic_plans instead of deep_strategy_responses)
        const { data: strategySessions } = await supabase
          .from('strategic_plans')
          .select('id')
          .eq('company_id', currentCompany?.id)
          .eq('is_active', true)
          .limit(1);

        // Initialize personal goals with defaults
        let personalGoals: any[] = [];
        
        // Only check for personal goals if we have teams in this company
        if (hasTeamsInCompany) {
          const { data } = await supabase
            .from('team_goals')
            .select('id')
            .eq('is_company_goal', false)
            .eq('owner_id', user.id)
            .in('team_id', companyTeamIds)
            .limit(1);
          personalGoals = data || [];
        }

        // Calculate total real goals across all types
        const totalRealGoals = (personalGoals?.length || 0) + (teamGoals?.length || 0) + goals.length;
        // Apply optimistic count to the total (not to each type separately)
        const totalEffectiveGoals = totalRealGoals + optimisticGoalCount;


        setSteps(prev => {
          let changed = false;
          const next = prev.map(step => {
            let completed = false;
            const effectiveTeamCount = Math.max(teams.length, optimisticTeamCount);
            switch (step.id) {
              case 'create-team':
                completed = effectiveTeamCount > 0;
                break;
              case 'create-goal':
                // Use corrected total goal count with optimistic updates
                completed = totalEffectiveGoals > 0;
                break;
              case 'create-metric':
                completed = (companyMetrics?.length || 0) > 0;
                break;
              case 'invite-team':
                completed = users.length > 1;
                break;
              case 'run-meeting':
                completed = effectiveMeetingCount > 0;
                break;
              case 'org-chart':
                completed = Math.max((orgRoles?.length || 0), optimisticOrgChartCount) > 0;
                break;
              case 'strategy':
                completed = Math.max((strategySessions?.length || 0), optimisticStrategyCount) > 0;
                break;
              default:
                completed = step.completed;
            }
            if (completed !== step.completed) changed = true;
            return { ...step, completed };
          });
          return changed ? next : prev;
        });
      } catch (error) {
        logger.error('Error checking onboarding completion status:', error);
      }
    };

    checkCompletionStatus();
  }, [user, currentCompany, teams.length, optimisticTeamCount, goals.length, optimisticGoalCount, optimisticMeetingCount, optimisticOrgChartCount, optimisticStrategyCount, users.length, myMetrics.length, isDataLoading]);

  const completedCount = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedCount / totalSteps) * 100;
  const allCompleted = completedCount === totalSteps;

  // Auto-hide when all completed and store completion state in database per company
  useEffect(() => {
    // Add data loading check to prevent race conditions during company switching
    if (allCompleted && user?.id && currentCompany?.id && !isInitiallyCompleted && !celebrationShown && !isDataLoading && completedCount === totalSteps) {
      logger.log('🎯 All onboarding steps completed, storing completion status');
      
      let isMounted = true;
      
      const storeCompletion = async () => {
        try {
          logger.log('🎯 Calling upsert_user_onboarding_completion RPC function');
          
          const { data: result, error } = await supabase.rpc('upsert_user_onboarding_completion', {
            p_user_id: user.id,
            p_company_id: currentCompany?.id
          });
          
          if (error) {
            logger.error('❌ Error calling onboarding completion RPC:', error);
            throw error;
          }
          
          logger.log('🎯 Onboarding completion RPC result:', result);
          
          if (result?.success) {
            logger.log('✅ Onboarding completion stored successfully');
            if (isMounted) {
              setCelebrationShown(true);
              logger.log('🎯 Marked celebration as shown for new completion');
            }
          } else {
            logger.error('❌ Onboarding completion storage failed:', result?.error);
            throw new Error(result?.error || 'Unknown error');
          }
        } catch (error) {
          logger.error('❌ Failed to store onboarding completion:', error);
          // Don't mark celebration as shown if storage failed
        }
      };
      
      // Execute storage
      storeCompletion();
      
      const timer = setTimeout(() => {
        if (isMounted) {
          setIsVisible(false);
          logger.log('🎯 Hiding onboarding widget after completion');
        }
      }, 5000);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [allCompleted, user?.id, currentCompany?.id, isInitiallyCompleted, celebrationShown, isDataLoading, completedCount, totalSteps]);

  const completeStep = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, completed: true, inProgress: false }
        : step
    ));
  };

  // Add optimistic team creation handler
  const optimisticallyCompleteTeamCreation = useCallback(() => {
    setOptimisticTeamCount(prev => {
      logger.log('🎯 Optimistically completing team creation, count:', prev + 1);
      return prev + 1;
    });
  }, []);

  // Add optimistic goal creation handler
  const optimisticallyCompleteGoalCreation = useCallback(() => {
    setOptimisticGoalCount(prev => {
      logger.log('🎯 Optimistically completing goal creation, count:', prev + 1);
      return prev + 1;
    });
  }, []);

  // Add optimistic meeting creation handler
  const optimisticallyCompleteMeetingCreation = useCallback(() => {
    setOptimisticMeetingCount(prev => {
      logger.log('🎯 Optimistically completing meeting creation, count:', prev + 1);
      return prev + 1;
    });
  }, []);

  // Add optimistic org chart creation handler
  const optimisticallyCompleteOrgChart = useCallback(() => {
    setOptimisticOrgChartCount(prev => {
      logger.log('🎯 Optimistically completing org chart creation, count:', prev + 1);
      return prev + 1;
    });
  }, []);

  const hideWidget = () => {
    setIsVisible(false);
    // Persist dismissal to localStorage per company
    if (currentCompany?.id) {
      safeStorage.setItem(`onboarding-widget-dismissed-${currentCompany?.id}`, 'true');
      logger.log('🎯 Widget dismissed and saved to localStorage');
    }
  };
  const showWidget = () => setIsVisible(true);

  const resetProgress = () => {
    setSteps(prev => prev.map(step => ({ 
      ...step, 
      completed: false, 
      inProgress: false 
    })));
    setIsVisible(true);
    setIsInitiallyCompleted(false);
    setCelebrationShown(false);
    setOptimisticTeamCount(0);
    setOptimisticGoalCount(0);
    setOptimisticMeetingCount(0);
    setOptimisticOrgChartCount(0);
    // Clear dismissal flag when resetting
    if (currentCompany?.id) {
      safeStorage.removeItem(`onboarding-widget-dismissed-${currentCompany?.id}`);
      logger.log('🎯 Widget dismissal flag cleared');
    }
  };

  const value: OnboardingContextType = {
    steps,
    isVisible: isVisible && hasDirectorAccess, // Only show for Directors and Super Admins
    completedCount,
    totalSteps,
    progressPercentage,
    allCompleted,
    isInitiallyCompleted,
    celebrationShown,
    completeStep,
    optimisticallyCompleteTeamCreation,
    optimisticallyCompleteGoalCreation,
    optimisticallyCompleteMeetingCreation,
    optimisticallyCompleteOrgChart,
    hideWidget,
    showWidget,
    resetProgress,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};