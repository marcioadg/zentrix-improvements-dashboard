import React, { Suspense, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CheckSquare, Target, MessageCircleQuestion, BarChart3 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { MobileContainer } from './MobileContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { MobileUnifiedFAB } from '@/components/mobile/MobileUnifiedFAB';
import MobileBottomNav from '@/components/MobileBottomNav';
import { MobileMeetingModalsManager } from '@/components/mobile/MobileMeetingModalsManager';
import { MobileShellProvider, useMobileShell } from '@/contexts/MobileShellContext';
import { MobileTasksListSkeleton, MobileGoalsSkeleton, MobileIssuesSkeleton, MobileMetricsSkeleton } from '@/components/mobile/MobileSkeletons';
import { createMetric } from '@/services/metricOperations';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

// Route-based configuration
const routeConfig: Record<string, { title: string; icon: any }> = {
  '/m/tasks': { title: 'Tasks', icon: CheckSquare },
  '/m/goals': { title: 'Goals', icon: Target },
  '/m/issues': { title: 'Issues', icon: MessageCircleQuestion },
  '/m/metrics': { title: 'Metrics', icon: BarChart3 },
};

// Route-based skeleton selection
const getSkeletonForRoute = (pathname: string) => {
  if (pathname.includes('/m/tasks')) return <MobileTasksListSkeleton />;
  if (pathname.includes('/m/goals')) return <MobileGoalsSkeleton />;
  if (pathname.includes('/m/issues')) return <MobileIssuesSkeleton />;
  if (pathname.includes('/m/metrics')) return <MobileMetricsSkeleton />;
  return <MobileTasksListSkeleton />;
};

/**
 * MobileShell - Persistent layout for main mobile pages
 * Header, FAB, and BottomNav stay mounted during navigation
 * Only the content area (Outlet) changes with route-specific skeletons
 */
const MobileShellContent: React.FC = () => {
  const location = useLocation();
  const shell = useMobileShell();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const config = routeConfig[location.pathname] || routeConfig['/m/tasks'];
  const skeleton = getSkeletonForRoute(location.pathname);

  // Handle metric creation from FAB modal
  const handleAddMetric = useCallback(async (metricData: {
    metric_name: string;
    unit: string;
    target_value: number;
    target_logic?: string;
    owner_id: string;
    team_id?: string;
    is_formula?: boolean;
    formula_components?: any[];
    aggregation_type?: string;
  }) => {
    if (!user?.id) return;

    const effectiveTeamId = metricData.team_id || shell.selectedTeamId;
    if (!effectiveTeamId) {
      toast({
        title: "Error",
        description: "Please select a team for the metric.",
        variant: "destructive"
      });
      return;
    }

    try {
      const createdMetric = await createMetric(
        metricData.metric_name,
        metricData.unit,
        metricData.owner_id,
        metricData.target_value,
        metricData.target_logic || 'greater_than_or_equal',
        user.id,
        effectiveTeamId,
        metricData.is_formula || false,
        metricData.formula_components || [],
        metricData.aggregation_type || 'total',
        settings?.week_start_day || 'monday'
      );

      // Invalidate metrics cache so any page using useSimplifiedMetrics will refetch
      // This works regardless of which mobile page the user is on
      await queryClient.invalidateQueries({
        queryKey: ['simplified-metrics']
      });

      // Dispatch event for any additional listeners (backward compatibility)
      window.dispatchEvent(new CustomEvent('metric-created-success', {
        detail: {
          team_id: effectiveTeamId,
          metric_name: metricData.metric_name,
          metric_id: createdMetric?.id
        }
      }));
    } catch (error) {
      logger.error('Error adding metric:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add metric.",
        variant: "destructive"
      });
      throw error; // Re-throw so modal knows it failed
    }
  }, [user?.id, shell.selectedTeamId, settings?.week_start_day, toast, queryClient]);

  return (
    <MobileContainer withHeader={false}>
      {/* Persistent Header */}
      <MobilePageHeader 
        title={config.title} 
        icon={config.icon} 
        showSearch
      >
        {/* Content-specific controls are rendered by child components via portal or context */}
      </MobilePageHeader>

      {/* Content Area - Only this part shows skeleton during navigation */}
      <div className="flex-1 min-h-0">
        <Suspense fallback={
          <div className="px-4 py-4">
            {skeleton}
          </div>
        }>
          <Outlet />
        </Suspense>
      </div>

      {/* Persistent FAB */}
      <MobileUnifiedFAB
        onAddTask={shell.openTaskModal}
        onAddIssue={shell.openIssueModal}
        onAddGoal={shell.openGoalModal}
        onAddMetric={shell.openMetricModal}
        onAddHeadline={shell.openHeadlineModal}
      />

      {/* Persistent Bottom Navigation */}
      <MobileBottomNav />

      {/* Persistent Modal Manager */}
      <MobileMeetingModalsManager
        teamId={shell.selectedTeamId}
        showTaskModal={shell.showTaskModal}
        showGoalModal={shell.showGoalModal}
        showMetricModal={shell.showMetricModal}
        showHeadlineModal={shell.showHeadlineModal}
        showIssueModal={shell.showIssueModal}
        setShowTaskModal={shell.setShowTaskModal}
        setShowGoalModal={shell.setShowGoalModal}
        setShowMetricModal={shell.setShowMetricModal}
        setShowHeadlineModal={shell.setShowHeadlineModal}
        setShowIssueModal={shell.setShowIssueModal}
        onAddTask={async () => {}}
        onAddGoal={async () => {}}
        onAddMetric={handleAddMetric}
        onAddHeadline={async () => {}}
        onAddIssue={async () => false}
        forceUpcomingHeadline
      />
    </MobileContainer>
  );
};

/**
 * MobileShell with Provider wrapper
 * Provides shared state for FAB modals and team selection across all child routes
 */
export const MobileShell: React.FC = () => {
  return (
    <MobileShellProvider>
      <MobileShellContent />
    </MobileShellProvider>
  );
};
