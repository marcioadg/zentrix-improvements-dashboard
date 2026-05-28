
import React, { memo, useState, useCallback } from 'react';
import { CombinedGoalsBoard } from '@/components/shared/CombinedGoalsBoard';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useLeadershipAccess } from '@/hooks/useLeadershipAccess';
import QuarterlyProgressIndicator from '@/components/shared/QuarterlyProgressIndicator';
import { ModalErrorBoundary } from '@/components/modals/ModalErrorBoundary';
import { UserTeamSelector } from '@/components/shared/UserTeamSelector';
import { GoalsViewSettings } from '@/components/goals/GoalsViewSettings';
import { useSettings } from '@/contexts/SettingsContext';
import { logger } from '@/utils/logger';

interface TeamGoalReviewSectionProps {
  meetingId: string;
  teamId: string;
  meetingType?: string;
}

export const TeamGoalReviewSection = memo<TeamGoalReviewSectionProps>(({ 
  meetingId, 
  teamId, 
  meetingType
}) => {
  const { teams, loading: teamsLoading } = useOptimizedUserTeams();
  const { isLeadershipMember, loading: leadershipLoading } = useLeadershipAccess(teamId);
  const { settings, updateSettings } = useSettings();
  const [showArchived, setShowArchived] = useState(false);
  const hideEmptyUsers = settings?.hide_members_without_goals ?? false;
  const setHideEmptyUsers = useCallback((value: boolean) => {
    updateSettings({ hide_members_without_goals: value });
  }, [updateSettings]);

  logger.log('🎯 TeamGoalReviewSection: Render state', { 
    teamId, 
    teamsLoading, 
    leadershipLoading, 
    teamsCount: teams?.length || 0 
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* STICKY HEADER - Goal Review title and controls */}
      <div className="sticky top-0 bg-background z-10 border-b border-border/30 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Goal Review</h1>
            <p className="text-muted-foreground mt-1">
              Review company-wide and team goals during this meeting
            </p>
          </div>
          <div className="flex items-center gap-4">
            <GoalsViewSettings
              showArchived={showArchived}
              onArchivedToggle={setShowArchived}
              hideEmptyUsers={hideEmptyUsers}
              onHideEmptyUsersToggle={setHideEmptyUsers}
            />
            <QuarterlyProgressIndicator />
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT - Goals Board */}
      <div className="flex-1 overflow-y-auto">
        <ModalErrorBoundary
            fallback={
              <div className="text-center py-8">
                <p className="text-muted-foreground">Unable to load goals view. Please refresh the page.</p>
              </div>
            }
          >
            {teamsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <CombinedGoalsBoard
                teams={teams ?? []}
                teamId={teamId}
                showBulkActions={false}
                showArchived={showArchived}
                hideEmptyUsers={hideEmptyUsers}
              />
            )}
          </ModalErrorBoundary>
      </div>
    </div>
  );
});

TeamGoalReviewSection.displayName = 'TeamGoalReviewSection';
