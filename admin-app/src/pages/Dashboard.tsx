import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { UserMetricsTable } from '@/components/dashboard-home/UserMetricsTable';
import { UserGoalsSection } from '@/components/dashboard-home/UserGoalsSection';
import { UserTasksSection } from '@/components/dashboard-home/UserTasksSection';
import { DashboardKPIs } from '@/components/dashboard-home/DashboardKPIs';
import { DashboardPageSkeleton } from '@/components/skeletons/DashboardPageSkeleton';
import QuarterlyProgressIndicator from '@/components/shared/QuarterlyProgressIndicator';
import { UserOrgPositionsIndicator } from '@/components/dashboard/UserOrgPositionsIndicator';
import { DashboardTeamSelector } from '@/components/dashboard-home/DashboardTeamSelector';
import { FirstMeetingBanner } from '@/components/dashboard-home/FirstMeetingBanner';


import { useOptimizedDashboardData } from '@/hooks/useOptimizedDashboardData';
import { useHasCompanyMeetings } from '@/hooks/useHasCompanyMeetings';
import { useProfile } from '@/hooks/useProfile';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh-indicator';
import { useIsMobile } from '@/hooks/use-mobile';
import { isActualMobileDevice } from '@/utils/mobileDetection';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
import { reloadWithTelemetry } from '@/utils/refreshTelemetry';


const Dashboard = () => {
  const { profile } = useProfile();
  const { currentCompany, loading: companyLoading } = useMultiCompanyAccess();
  const { loading: dashboardLoading, updateGoalCompletionOptimistically, ...dashboardData } = useOptimizedDashboardData();
  const { hasMeetings, loading: hasMeetingsLoading } = useHasCompanyMeetings();
  const [showVersionBanner, setShowVersionBanner] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation('navigation');
  
  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    await queryClient.invalidateQueries({ queryKey: ['userPersonalTasks'] });
    await queryClient.invalidateQueries({ queryKey: ['userPersonalMetrics'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboardGoals'] });
    toast.success(t('dashboard.refreshed'));
  }, [queryClient, t]);

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    disabled: !isMobile,
  });

  // Track dashboard view
  useEffect(() => {
    import('@/lib/analytics').then(({ trackDashboardView }) => {
      trackDashboardView();
    }).catch(err => logger.warn('Failed to load analytics:', err));
  }, []);

  // Simple version check - show banner if DB version is not "1.0"
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('system_version')
          .eq('setting_key', 'app_version')
          .single();

        if (error) {
          logger.debug('Version check failed:', error.message);
          return;
        }

        if (data?.system_version && data.system_version !== "1.2") {
          setShowVersionBanner(true);
        }
      } catch (err) {
        logger.debug('Version check error:', err);
      }
    };
    checkVersion();
  }, []);

  // Redirect mobile users to mobile tasks view
  // Uses hardware detection (UA, touch signals) - NOT viewport width
  // Desktop users resizing their window will NOT be redirected
  useEffect(() => {
    if (isActualMobileDevice()) {
      navigate('/m/tasks', { replace: true });
    }
  }, [navigate]);

  // Early return with loading state during redirect (hardware-based check)
  if (isActualMobileDevice()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="mobile-body text-muted-foreground">{t('dashboard.redirectingMobile')}</p>
        </div>
      </div>
    );
  }

  const firstName = profile?.full_name?.trim()?.split(' ')[0] || profile?.email?.split('@')[0] || 'Leader';
  const currentDate = new Date().toLocaleDateString(t === undefined ? 'en-US' : undefined, {
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const isNewUser = profile?.created_at 
    ? (Date.now() - new Date(profile.created_at).getTime()) < 24 * 60 * 60 * 1000 
    : false;
  const welcomeMessage = isNewUser ? t('dashboard.welcome') : t('dashboard.welcomeBack');

  // Loading is handled by PageSuspense - no need for additional skeleton here

  return (
    <div 
      className="flex min-h-screen w-full"
      {...(isMobile ? pullToRefresh.handlers : {})}
    >
      {/* Pull to Refresh Indicator */}
      {isMobile && (
        <PullToRefreshIndicator
          isPulling={pullToRefresh.isPulling}
          isRefreshing={pullToRefresh.isRefreshing}
          progress={pullToRefresh.progress}
          pullDistance={pullToRefresh.pullDistance}
        />
      )}
      
      {/* Main Dashboard Content */}
      <div 
        className="flex-1 px-6 py-6 pb-20 md:pb-12 page-content w-full safe-area-inset"
        style={isMobile ? {
          transform: pullToRefresh.isPulling || pullToRefresh.isRefreshing 
            ? `translateY(${pullToRefresh.pullDistance}px)` 
            : undefined,
          transition: pullToRefresh.isPulling ? 'none' : 'transform 0.3s ease-out',
        } : undefined}
      >
        {/* Version Banner - Small Popup */}
        {showVersionBanner && (
          <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-[6px] shadow-sm card-padding-sm max-w-sm animate-in slide-in-from-top-2">
            <div className="flex items-start gap-content">
              <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 stack-xs">
                <p className="text-[13px] font-medium text-foreground">
                  {t('dashboard.newVersionAvailable')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('dashboard.refreshPrompt')}
                </p>
                <Button 
                  onClick={() => reloadWithTelemetry('manual-dashboard-error-refresh')}
                  size="sm"
                  className="w-full"
                >
                  {t('dashboard.refreshNow')}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Header with Welcome and KPIs */}
        <div className="page-header">
          <div className="flex justify-between items-start">
            <div className="stack-sm">
              <div>
                <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
                  {welcomeMessage}, {firstName} 👋
                </h1>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  {currentDate}
                </p>
              </div>
              {/* Quarterly Progress and Team Selector */}
              <div className="flex items-center gap-4 flex-wrap">
                <QuarterlyProgressIndicator />
                <DashboardTeamSelector 
                  selectedTeamId={selectedTeamId} 
                  onTeamChange={setSelectedTeamId} 
                />
              </div>
            </div>
            
            {/* KPI Metrics - Top Right */}
            <DashboardKPIs data={dashboardData} />
          </div>
        </div>

        {/* Run-your-first-meeting prompt — only shown until the company has run a meeting */}
        {!hasMeetingsLoading && !hasMeetings && <FirstMeetingBanner />}

        {/* Main Dashboard Grid - Tasks, Goals, Metrics side by side */}
        <div data-tour="dashboard-content" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card">
          {/* Tasks Section */}
          <div className="bg-card border border-border rounded-[6px] h-[calc(100vh-220px)] max-h-[600px] min-h-[360px] flex flex-col overflow-hidden transition-colors duration-150 ease-out hover:border-border/80">
            <div className="p-4 flex-1 flex flex-col min-h-0">
              <UserTasksSection selectedTeamId={selectedTeamId} />
            </div>
          </div>

          {/* Goals Section */}
          <div className="bg-card border border-border rounded-[6px] h-[calc(100vh-220px)] max-h-[600px] min-h-[360px] flex flex-col overflow-hidden transition-colors duration-150 ease-out hover:border-border/80">
            <div className="p-4 flex-1 flex flex-col min-h-0">
              <UserGoalsSection updateGoalCompletionOptimistically={updateGoalCompletionOptimistically} selectedTeamId={selectedTeamId} />
            </div>
          </div>

          {/* Metrics Section */}
          <div className="bg-card border border-border rounded-[6px] h-[calc(100vh-220px)] max-h-[600px] min-h-[360px] flex flex-col overflow-hidden transition-colors duration-150 ease-out hover:border-border/80">
            <div className="p-4 flex-1 flex flex-col min-h-0">
              <UserMetricsTable selectedTeamId={selectedTeamId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;