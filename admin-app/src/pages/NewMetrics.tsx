import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUserSettings, createFallbackUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedTeamData } from '@/hooks/useUnifiedTeamData';
import { NewConsolidatedMetricsPageContent } from '@/components/dashboard/NewConsolidatedMetricsPageContent';
import { useSimpleIssues } from '@/hooks/useSimpleIssues';
import { AddIssueModal } from '@/components/modals/AddIssueModal';
import { MetricsLoadingSkeleton } from '@/components/metrics/MetricsPageSkeleton';
import { EmptyMetricsState } from '@/components/dashboard/EmptyMetricsState';
import { VersionBanner } from '@/components/ui/VersionBanner';
import { Button } from '@/components/ui/button';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { trackMetricsViewed } from '@/lib/statsigAnalytics';
import { logger } from '@/utils/logger';


export const NewMetrics = () => {
  const location = useLocation();
  const openAddMetric = !!(location.state as any)?.openAddMetric;
  const hasTrackedViewRef = useRef(false);

  // Always call all hooks first to maintain consistent hook order
  const { user, loading: authLoading } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { teams, selectedTeamId, selectTeam, loading } = useUnifiedTeamData();
  const {
    settings: userSettings,
    loading: settingsLoading,
    updateMetricsSettings
  } = useUserSettings();
  const [isAddIssueModalOpen, setIsAddIssueModalOpen] = React.useState(false);
  const { addIssue } = useSimpleIssues(selectedTeamId || '', undefined, undefined, undefined, { silent: true });

  // Track metrics_viewed (once per page visit)
  useEffect(() => {
    if (!hasTrackedViewRef.current && user?.id && currentCompany?.id && !loading && !authLoading) {
      trackMetricsViewed({
        user_id: user.id,
        company_id: currentCompany?.id,
      });
      hasTrackedViewRef.current = true;
    }
  }, [user?.id, currentCompany?.id, loading, authLoading]);


  // Set global selectedTeamId for AppLayout to access (similar to goals)
  React.useEffect(() => {
    (window as any).selectedTeamId = selectedTeamId;
  }, [selectedTeamId]);

  // Create fallback settings if needed
  const effectiveSettings = userSettings || (user ? createFallbackUserSettings(user.id) : createFallbackUserSettings('anonymous'));

  // Wrapper for updateMetricsSettings to match expected interface
  const wrappedUpdateMetricsSettings = React.useCallback(async (settings: any): Promise<void> => {
    await updateMetricsSettings(settings);
  }, [updateMetricsSettings]);

  const handleIssueAdd = async (data: {
    title: string;
    description?: string;
    issueType: 'short_term' | 'long_term';
    teamId: string;
    ownerId?: string;
  }): Promise<boolean> => {
    return await addIssue(data.title, data.description, data.issueType, data.ownerId);
  };

  const handleCreateIssueFromMetric = useCallback(async (title: string, description: string, ownerId?: string): Promise<void> => {
    logger.log('📝 New Metrics Page - Creating issue from metric:', { title, description, ownerId });
    try {
      const success = await addIssue(title, description, 'short_term', ownerId);
      if (success) {
        logger.log('✅ New Metrics Page - Issue created successfully from metric');
      }
    } catch (error) {
      logger.error('❌ New Metrics Page - Failed to create issue from metric:', error);
    }
  }, [addIssue]);

  // Convert to compatible format
  const compatibleTeams = React.useMemo(() => {
    return teams.map(team => ({
      id: team.id,
      name: team.name,
      company_id: team.company_id,
      description: team.description || null,
      created_by: '',
      created_at: '',
      updated_at: ''
    }));
  }, [teams]);

  return (
    <>
      <VersionBanner />

      {/* Loading state */}
      {(authLoading || loading) && (
        <MetricsLoadingSkeleton />
      )}

      {/* Authentication required */}
      {!user && !(authLoading || loading) && (
        <div className="px-6 py-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center space-y-4">
              <h2 className="text-[20px] font-semibold text-foreground">Authentication Required</h2>
              <p className="text-muted-foreground">You need to sign in to view your metrics and teams.</p>
              <div className="space-y-2">
                <Link to="/login" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  Sign In
                </Link>
                <p className="text-xs text-muted-foreground">
                  If you're already logged in, try refreshing the page
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No teams available */}
      {user && !loading && teams.length === 0 && (
        <div className="space-y-4 md:space-y-6 px-6 py-6">
          <div className="flex flex-col gap-2 md:gap-1">
            <div>
              <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Metrics (New)</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Track weekly metrics and key performance indicators
              </p>
            </div>
          </div>
          <EmptyMetricsState message="No teams available. You need to be assigned to a team to track metrics." />
        </div>
      )}

      {/* Main metrics content */}
      {user && !loading && teams.length > 0 && (
        <div className="space-y-4 md:space-y-6 px-6 py-6">
          <div className="flex flex-col gap-2 md:gap-1">
            <div>
              <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Metrics (New)</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Track weekly metrics and key performance indicators
              </p>
            </div>
          </div>


          {selectedTeamId && selectedTeamId.trim() !== '' && (
            <NewConsolidatedMetricsPageContent
              teams={compatibleTeams}
              selectedTeam={selectedTeamId}
              setSelectedTeam={selectTeam}
              userSettings={effectiveSettings}
              updateMetricsSettings={wrappedUpdateMetricsSettings}
              settingsLoading={settingsLoading}
              onCreateIssue={handleCreateIssueFromMetric}
              initialShowAddMetric={openAddMetric}
            />
          )}

          {teams.length > 0 && (!selectedTeamId || selectedTeamId.trim() === '') && (
            <div className="text-center py-6 md:py-8">
              <p className="text-[13px] text-muted-foreground">Choose a team above to view and manage metrics.</p>
            </div>
          )}

          <AddIssueModal
            open={isAddIssueModalOpen}
            onOpenChange={setIsAddIssueModalOpen}
            onAdd={handleIssueAdd}
            defaultTeamId={selectedTeamId || ''}
          />
        </div>
      )}
    </>
  );
};

export default NewMetrics;
