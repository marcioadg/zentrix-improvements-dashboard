import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Target, ListTodo, BarChart3, Newspaper, AlertTriangle } from 'lucide-react';
import { logger } from '@/utils/logger';
import { AppSidebar } from './AppSidebar';
import { ToolsSidebar } from './tools/ToolsSidebar';
import { ToolsProvider, useTools } from '@/contexts/ToolsContext';
import { JoinMeetingButton } from './JoinMeetingButton';
import { ThemeToggle } from './ThemeToggle';
import FloatingActionMenu from '@/components/ui/floating-action-menu';
import { MobileCompanySwitcher } from '@/components/shared/MobileCompanySwitcher';
import FloatingFeatureAnnouncements from '@/components/ui/floating-feature-announcements';
import { featureAnnouncementService } from '@/services/featureAnnouncementService';
import { FeatureArticle } from '@/components/ui/feature-news';

import { SidebarRecoveryButton } from './sidebar/SidebarRecoveryButton';
import { EnhancedAddTaskModal, AddGoalModal, AddHeadlineModal, AddMetricModal, AddIssueModal } from './modals';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { FloatingOnboardingWidget } from '@/components/dashboard/FloatingOnboardingWidget';
import { onboardingStepsData } from '@/components/dashboard/OnboardingStepsData';
import { DemoOnboardingWrapper } from '@/components/dashboard/DemoOnboardingWrapper';
// OnboardingVariantRouter is mounted at the App.tsx level (outside the
// per-route AppLayout) so the tour overlay stays mounted across step
// navigations — see the comment near where it's rendered in App.tsx.


import { useToast } from '@/hooks/use-toast';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { BusinessLoading } from '@/components/ui/business-loading';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SimpleAppSkeleton } from '@/components/skeletons/SimpleAppSkeleton';
import { createTask as createTaskOperation } from '@/hooks/fast-tasks/operations';
import MobileBottomNav from './MobileBottomNav';
import { useTeamMetrics } from '@/hooks/useTeamMetrics';
import { useHeadlines } from '@/hooks/useHeadlines';
import { SystemAnnouncementBanner } from '@/components/announcements/SystemAnnouncementBanner';
import { SearchTrigger } from './SearchTrigger';
import { useGlobalKeyboardShortcuts, exposeGlobalActions } from '@/hooks/useGlobalKeyboardShortcuts';

import { issuesTeamPreferenceService } from '@/services/issuesTeamPreferenceService';

interface AppLayoutProps {
  children: React.ReactNode;
}

const ALLOWED_NO_COMPANY_PATHS = new Set([
  '/dashboard',
  '/settings',
  '/metrics',
  '/tasks',
  '/goals',
  '/issues',
  '/meetings',
  '/people',
  '/process',
  '/strategy',
  '/org-chart',
  '/zentrixai',
]);

declare global {
  interface Window {
    selectedTeamId?: string;
    refreshGoals?: () => void;
  }
}

export function AppLayout({ children }: AppLayoutProps) {
  const { loading: multiCompanyLoading, currentCompany } = useMultiCompany();
  const navigate = useNavigate();
  const location = useLocation();

  // Track initialization to prevent full-page skeletons on team switches
  const hasInitializedRef = useRef(false);

  // Initialize notification toasts

  // If user has no current company after initial load, gently redirect to onboarding (except on allowed pages)
  useEffect(() => {
    if (!multiCompanyLoading && !currentCompany && !ALLOWED_NO_COMPANY_PATHS.has(location.pathname)) {
      const id = setTimeout(() => {
        if (!currentCompany && !ALLOWED_NO_COMPANY_PATHS.has(location.pathname)) {
          logger.debug('🔁 AppLayout: No current company after load, redirecting to /onboarding');
          navigate('/onboarding', { replace: true });
        }
      }, 1500);
      return () => clearTimeout(id);
    }
  }, [multiCompanyLoading, currentCompany, navigate, location.pathname]);

  // Only show app layout skeleton during initial load, not on team switches
  const shouldShowSkeleton = multiCompanyLoading || (!currentCompany && !ALLOWED_NO_COMPANY_PATHS.has(location.pathname));
  
  if (shouldShowSkeleton && !hasInitializedRef.current) {
    logger.log('🔄 AppLayout: Showing initial skeleton during app load');
    return <SimpleAppSkeleton contentType="dashboard" />;
  }
  
  // Mark as initialized once we've loaded successfully
  if (!shouldShowSkeleton && !hasInitializedRef.current) {
    hasInitializedRef.current = true;
  }

  return <AppLayoutContent>{children}</AppLayoutContent>;
}

// Wrapper component for ToolsSidebar that uses context
function ToolsSidebarWrapper() {
  const { activeTool, setActiveTool } = useTools();
  return <ToolsSidebar activeTool={activeTool} onToolSelect={setActiveTool} />;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading: multiCompanyLoading, currentCompany } = useMultiCompany();
  const { user } = useAuth();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [showAddHeadline, setShowAddHeadline] = useState(false);
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [mostLikelyIssueTeam, setMostLikelyIssueTeam] = useState<string>('');
  const [featureNews, setFeatureNews] = useState<FeatureArticle[]>([]);

  const isToolsRoute = location.pathname.startsWith('/tools');

  // Get selected team ID from global state for metrics
  const selectedTeamId = window.selectedTeamId || '';
  const { addMetric: addTeamMetric } = useTeamMetrics(selectedTeamId);
  const { addHeadline } = useHeadlines();
  
  const { toast } = useToast();

  // Enable global keyboard shortcuts
  useGlobalKeyboardShortcuts();

  // Demo variant trigger: /dashboard?variant=a|b|c resets onboarding and activates variant
  // variant=a → Meeting Wizard (was B), variant=b → Spotlight Tour (was C),
  // variant=c → Ad2 Spotlight Tour (Metrics→Tasks→Goals→Meetings)
  const variantResetDone = useRef(false);
  useEffect(() => {
    if (variantResetDone.current || !user) return;
    const params = new URLSearchParams(window.location.search);
    const variant = params.get('variant');
    if (!variant || !['a', 'b', 'c'].includes(variant)) return;
    variantResetDone.current = true;

    // Clean URL immediately
    params.delete('variant');
    const clean = params.toString();
    window.history.replaceState({}, '', location.pathname + (clean ? '?' + clean : ''));

    // Map: a → Meeting Wizard (onboarding_variant 'b'), b → Spotlight Tour (onboarding_variant 'c'),
    //      c → Ad2 Spotlight Tour (onboarding_variant 'd')
    const variantMap: Record<string, string> = { a: 'b', b: 'c', c: 'd' };
    sessionStorage.setItem('onboarding_variant', variantMap[variant]);
    sessionStorage.removeItem('spotlight_tour_step');
    sessionStorage.removeItem('ad2_tour_step');

    // Reset onboarding completion in DB then reload so all components pick up fresh state
    supabase
      .from('profiles')
      .update({ onboarding_completed_at: null })
      .eq('id', user.id)
      .then(() => {
        window.location.href = location.pathname;
      });
  }, [user, location.pathname]);

  // Check if we're on the Goals page to determine goal creation type
  const isOnGoalsPage = location.pathname === '/goals';

  // Fetch most likely issue team on mount
  useEffect(() => {
    const fetchMostLikelyIssueTeam = async () => {
      if (user?.id) {
        const teamId = await issuesTeamPreferenceService.getMostLikelyTeam(user.id);
        if (teamId) {
          setMostLikelyIssueTeam(teamId);
        }
      }
    };

    fetchMostLikelyIssueTeam();
  }, [user?.id]);

  // Load feature news from backend
  useEffect(() => {
    const loadFeatureNews = async () => {
      try {
        const features = await featureAnnouncementService.getActiveAnnouncementsForUser();
        setFeatureNews(features);
      } catch (error) {
        logger.error('Error loading feature news:', error);
        setFeatureNews([]);
      }
    };
    loadFeatureNews();
  }, []);

  const handleCreateTask = useCallback(() => {
    setShowAddTask(true);
  }, []);

  const handleCreateGoal = useCallback(() => {
    setShowAddGoal(true);
  }, []);

  const handleCreateMetric = useCallback(() => {
    setShowAddMetric(true);
  }, []);

  const handleCreateHeadline = useCallback(() => {
    setShowAddHeadline(true);
  }, []);

  const handleCreateIssue = useCallback(() => {
    setShowAddIssue(true);
  }, []);

  const handleAddTask = async (
    title: string,
    description: string,
    teamSelection: { type: 'personal' | 'team'; teamId?: string },
    dueDate?: string,
    assignedTo?: string[],
    status?: 'todo' | 'in-progress' | 'done',
    _sourceIssueId?: string,
    splitPerMember?: boolean
  ) => {
    try {
      logger.debug('🔧 AppLayout: Creating task with teamSelection:', teamSelection, { assignedTo, dueDate, status });

      const finalStatus: 'todo' | 'in-progress' | 'done' = status || 'todo';
      
      // Determine task type and team info
      let task_type: 'personal' | 'team' = 'personal';
      let team_id: string | null = null;
      let team_name: string | null = null;

      if (teamSelection.type === 'team' && teamSelection.teamId) {
        task_type = 'team';
        team_id = teamSelection.teamId;
        
        // Get team name for proper display
        const { data: teamData } = await supabase
          .from('teams')
          .select('name')
          .eq('id', teamSelection.teamId)
          .single();
        
        team_name = teamData?.name || null;
      }

      // Resolve assignees list
      const assignees: string[] = (() => {
        if (task_type === 'team') {
          const arr = (assignedTo || []).filter(Boolean);
          // Default to current user if none provided
          return arr.length > 0 ? arr : (user?.id ? [user.id] : []);
        }
        // personal -> current user
        return user?.id ? [user.id] : [];
      })();

      logger.debug('🔧 AppLayout: Creating single task with multiple assignees:', assignees);

      // Create single task with multiple assignees properly structured
      const taskData = {
        title,
        description,
        task_type,
        user_id: user?.id,
        status: finalStatus,
        team_id,
        team_name,
        due_date: dueDate || null,
        assigned_to: assignees, // Use array directly
      };

      logger.debug('🔧 AppLayout: Creating task via operations with proper assignment structure:', {
        assigned_to: assignees,
        task_type,
        team_id,
        companyId: currentCompany?.id
      });

      // Use createTask from operations.ts to ensure webhook is sent
      await createTaskOperation(
        user.id,
        title,
        description,
        dueDate || undefined,
        task_type,
        team_id || undefined,
        team_name || undefined,
        assignees,
        finalStatus,
        currentCompany?.id,
        splitPerMember || false
      );

      setShowAddTask(false);

      // Trigger a custom event to refresh task lists across the app
      window.dispatchEvent(new CustomEvent('taskCreated', { detail: { title, description, task_type, assignees } }));

      const taskCount = splitPerMember && assignees.length > 1 ? assignees.length : 1;
      toast({
        title: splitPerMember && assignees.length > 1
          ? `${taskCount} individual tasks created`
          : 'Task created successfully',
        description: assignees.length > 1 && !splitPerMember
          ? `Assigned to ${assignees.length} users${dueDate ? ` • Due: ${new Date(dueDate).toLocaleDateString()}` : ''}`
          : dueDate ? `Due: ${new Date(dueDate).toLocaleDateString()}` : undefined,
        variant: 'default',
      });
    } catch (error) {
      logger.error('❌ AppLayout: Error adding task:', error);
      toast({
        title: 'Failed to create task',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  interface MetricComponent {
    component_id: string;
    operator: '+' | '-' | '*' | '/';
    weight?: number;
  }

  const handleAddMetric = async (metricData: {
    metric_name: string;
    unit: string;
    target_value: number;
    target_logic?: string;
    owner_id: string;
    team_id?: string;
    additional_team_ids?: string[]; // NEW: Multi-team support
    meeting_id?: string;
    is_formula?: boolean;
    formula_components?: MetricComponent[];
    aggregation_type?: string;
  }) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!metricData.team_id) {
        throw new Error('Team ID is required');
      }

      logger.debug('🔧 AppLayout: Creating metric with optimistic updates:', metricData);

      // Use optimistic update via useTeamMetrics hook
      const result = await addTeamMetric(metricData);
      
      // If there are additional teams, add the assignments
      if (metricData.additional_team_ids && metricData.additional_team_ids.length > 0 && result?.id) {
        const { addMetricTeamAssignment } = await import('@/services/metricOperations');
        
        // Add each additional team assignment
        for (const additionalTeamId of metricData.additional_team_ids) {
          try {
            // Get the metric_id from the metrics table (result.id is weekly_metrics id)
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: metricRecord } = await supabase
              .from('metrics')
              .select('id')
              .eq('metric_name', metricData.metric_name)
              .eq('owner_id', metricData.owner_id)
              .eq('team_id', metricData.team_id)
              .is('deleted_at', null)
              .single();
            
            if (metricRecord?.id) {
              await addMetricTeamAssignment(metricRecord.id, additionalTeamId);
            }
          } catch (assignmentError) {
            logger.error('⚠️ AppLayout: Error adding team assignment:', assignmentError);
            // Don't fail the whole operation for assignment errors
          }
        }
      }
      
      setShowAddMetric(false);
      
      logger.debug('✅ AppLayout: Metric created successfully with optimistic updates');
    } catch (error) {
      logger.error('❌ AppLayout: Error adding metric:', error);
      // Don't show generic error - useTeamMetrics already shows specific error messages
    }
  };

  const handleAddIssue = async (issueData: {
    title: string;
    description?: string;
    issueType: 'short_term' | 'long_term';
    teamId: string;
    ownerId?: string;
    isPublic?: boolean;
  }) => {
    try {
      const { error } = await supabase
        .from('issues')
        .insert({
          title: issueData.title,
          description: issueData.description,
          issue_type: issueData.issueType,
          team_id: issueData.teamId,
          owner_id: issueData.ownerId || user?.id,
          created_by: user?.id,
          status: 'open',
          is_public: issueData.issueType === 'long_term' ? (issueData.isPublic || false) : false
        });

      if (error) throw error;

      // Update team preference for future issue creation
      if (user?.id && issueData.teamId) {
        try {
          await issuesTeamPreferenceService.updateTeamPreference(user.id, issueData.teamId);
        } catch (prefError) {
          logger.warn('Failed to update issue team preference:', prefError);
          // Don't fail the whole operation if preference update fails
        }
      }

      toast({
        title: "Issue added successfully",
        variant: "default",
      });
      return true;
    } catch (error) {
      logger.error('Error adding issue:', error);
      toast({
        title: "Failed to add issue. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleAddHeadline = async (title: string, content: string, teamId?: string, meetingId?: string, ownerId?: string, targetMeetingType?: 'weekly' | 'quarterly') => {
    try {
      // Set team ID for communication (similar to metrics)
      if (teamId) {
        window.selectedTeamId = teamId;
      }
      
      // Use useHeadlines hook for consistent creation
      await addHeadline(title, content, teamId, meetingId, targetMeetingType);
      
      toast({
        title: "Headline added successfully",
        variant: "default",
      });
      return true;
    } catch (error) {
      logger.error('Error adding headline:', error);
      toast({
        title: "Failed to add headline. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Expose global actions for keyboard shortcuts
  useEffect(() => {
    exposeGlobalActions({
      openCreateTaskModal: handleCreateTask,
      openCreateIssueModal: handleCreateIssue,
      openCreateGoalModal: handleCreateGoal,
      openCreateMetricModal: handleCreateMetric,
      openCreateHeadlineModal: handleCreateHeadline,
      toggleTheme: () => {
        // Find and click the theme toggle button
        const themeButton = document.querySelector('[data-theme-toggle]') as HTMLButtonElement;
        if (themeButton) themeButton.click();
      },
      toggleSidebar: () => {
        // Find and click the sidebar trigger
        const sidebarTrigger = document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement;
        if (sidebarTrigger) sidebarTrigger.click();
      },
    });
  }, [handleCreateTask, handleCreateIssue, handleCreateGoal, handleCreateMetric, handleCreateHeadline]);

  // Floating action menu options
  const floatingMenuOptions = [
    {
      label: "Create Issue",
      Icon: <AlertTriangle className="w-4 h-4" />,
      onClick: handleCreateIssue,
    },
    {
      label: "Create Task",
      Icon: <ListTodo className="w-4 h-4" />,
      onClick: handleCreateTask,
    },
    {
      label: "Create Headline",
      Icon: <Newspaper className="w-4 h-4" />,
      onClick: handleCreateHeadline,
    },
    {
      label: "Create Goal",
      Icon: <Target className="w-4 h-4" />,
      onClick: handleCreateGoal,
    },
    {
      label: "Create Metric",
      Icon: <BarChart3 className="w-4 h-4" />,
      onClick: handleCreateMetric,
    },
  ];

  return (
    <OnboardingProvider initialSteps={onboardingStepsData}>
      <DemoOnboardingWrapper>
        <ToolsProvider>
          <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full">
          {/* Hide sidebar on mobile */}
          <div className="hidden lg:block">
            {isToolsRoute ? <ToolsSidebarWrapper /> : <AppSidebar />}
          </div>
          
          <SidebarInset className="flex-1 flex flex-col min-w-0 md:ml-0">
             {/* Header - visible on all screen sizes */}
            <header className="sticky top-0 z-50 flex bg-background flex-shrink-0 w-full" style={{borderBottom: '1px solid var(--border)'}}>
              <div className="flex h-12 items-center justify-between px-2 sm:px-4 w-full">
                <div className="flex items-center gap-2 flex-1 max-w-2xl">
                  <SidebarTrigger className="flex-shrink-0 hidden lg:flex" />
                  <div className="ml-4">
                    <SearchTrigger />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {['/m/metrics', '/m/tasks', '/m/goals', '/m/issues', '/m/company'].includes(location.pathname) ? (
                    <MobileCompanySwitcher />
                  ) : (
                    <JoinMeetingButton />
                  )}
                </div>
              </div>
            </header>
            <main className={`flex-1 min-w-0 ${['/m/tasks', '/m/issues', '/m/goals', '/m/metrics', '/m/company'].includes(location.pathname) ? 'pb-0' : 'pb-20'} lg:pb-0`}>
              <div className="min-w-0 h-full">
                {ALLOWED_NO_COMPANY_PATHS.has(location.pathname) && !currentCompany && !multiCompanyLoading && (
                  <div className="mb-4 rounded-md border border-border bg-muted/30 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">You’re not a member of any company yet</p>
                        <p className="text-sm text-muted-foreground">Create your first company to unlock all features.</p>
                      </div>
                      <button
                        onClick={() => navigate('/new-company')}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        Create company
                      </button>
                    </div>
                  </div>
                )}
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>

        {/* Desktop sidebar recovery button */}
        <div className="hidden md:block">
          <SidebarRecoveryButton />
        </div>

        {/* Mobile bottom navigation - hidden on mobile pages that have their own */}
        {!['/m/tasks', '/m/issues', '/m/goals', '/m/metrics', '/m/company'].includes(location.pathname) && (
          <MobileBottomNav />
        )}



        {/* Performance indicator - only visible to super admins */}

        <EnhancedAddTaskModal
          open={showAddTask}
          onOpenChange={setShowAddTask}
          onAddTask={handleAddTask}
        />

        <AddGoalModal
          open={showAddGoal}
          onOpenChange={setShowAddGoal}
          teamId={isOnGoalsPage ? window.selectedTeamId || '' : undefined}
          isTeamGoal={isOnGoalsPage}
          onSuccess={() => {
            // Call the global refresh function if on Goals page
            if (isOnGoalsPage && window.refreshGoals) {
              window.refreshGoals();
            }
          }}
        />

        <AddMetricModal
          open={showAddMetric}
          onOpenChange={setShowAddMetric}
          onAdd={handleAddMetric}
        />

        <AddHeadlineModal
          open={showAddHeadline}
          onOpenChange={setShowAddHeadline}
          onAdd={handleAddHeadline}
        />

        <AddIssueModal
          open={showAddIssue}
          onOpenChange={setShowAddIssue}
          onAdd={handleAddIssue}
          defaultTeamId={mostLikelyIssueTeam}
        />

        {/* Global Floating Action Menu + WhatsApp - hidden on mobile pages that have their own */}
        {!['/m/tasks', '/m/issues', '/m/goals', '/m/metrics', '/m/company'].includes(location.pathname) && (
          <FloatingActionMenu options={floatingMenuOptions} />
        )}
        
        {/* Global Floating Feature Announcements */}
        <FloatingFeatureAnnouncements articles={featureNews} />
        </SidebarProvider>
        </ToolsProvider>

        {/* Global Floating Onboarding Widget */}
        <FloatingOnboardingWidget />

        {/* OnboardingVariantRouter is hoisted up to App.tsx (outside the
            per-route AppLayout) so the spotlight tour stays mounted as
            the user navigates between steps. Otherwise the dim overlay
            disappears on every route change and the page flashes. */}
      </DemoOnboardingWrapper>
    </OnboardingProvider>
  );
}
