import React, { useRef, useMemo, useState, useCallback } from 'react';
import { UserTeamSelector } from '@/components/shared/UserTeamSelector';
import { useSimpleGoalsTeamSelection } from '@/hooks/useSimpleGoalsTeamSelection';
import { useLocation } from 'react-router-dom';
import QuarterlyProgressIndicator from './QuarterlyProgressIndicator';
import { CombinedGoalsBoard } from '@/components/shared/CombinedGoalsBoard';
import { EducationalEmptyState } from '@/components/ui/universal-states';
import { motion } from 'framer-motion';
import { GoalsViewSettings } from '@/components/goals/GoalsViewSettings';
import { Target, Building2 } from 'lucide-react';
import { useLeadershipAccess } from '@/hooks/useLeadershipAccess';
import { useSettings } from '@/contexts/SettingsContext';

interface SharedGoalsViewProps {
  teams: any[];
  loading: boolean;
  showBulkActions?: boolean;
  showHeader?: boolean;
  className?: string;
  teamId?: string;
  audienceType?: 'team' | 'members';
  showTeamSelector?: boolean;
}

const SharedGoalsViewComponent: React.FC<SharedGoalsViewProps> = ({
  teams,
  loading,
  showHeader = true,
  className = "",
  teamId,
  showBulkActions = false,
  audienceType = 'team',
  showTeamSelector
}) => {
  const location = useLocation();
  const { selectedTeamId: selectedTeam, setSelectedTeamId: setSelectedTeam } = useSimpleGoalsTeamSelection(teams);
  const refreshRef = useRef<(() => void) | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { settings, updateSettings } = useSettings();
  const hideEmptyUsers = settings?.hide_members_without_goals ?? false;
  const setHideEmptyUsers = useCallback((value: boolean) => {
    updateSettings({ hide_members_without_goals: value });
  }, [updateSettings]);

  // Check if we're in a meeting context
  const isInMeeting = location.pathname.includes('/meeting/');
  
  // Extract teamId from meeting URL if we're in a meeting
  const meetingTeamId = useMemo(() => {
    if (isInMeeting) {
      // Use explicit teamId prop if provided, otherwise fallback to first team
      return teamId || (teams.length > 0 ? teams[0].id : selectedTeam);
    }
    return selectedTeam;
  }, [isInMeeting, teamId, teams, selectedTeam]);

  // Use meeting team ID if in meeting, otherwise use selected team
  const effectiveTeamId = isInMeeting ? meetingTeamId : selectedTeam;
  
  // Check leadership access for the effective team
  const { isLeadershipMember } = useLeadershipAccess(effectiveTeamId);

  // Memoize team data to prevent unnecessary re-renders
  const { isLeadershipTeamSelected, selectedTeamData } = useMemo(() => {
    const teamData = teams.find(team => team.id === selectedTeam);
    const isLeadership = teamData?.is_leadership || false;
    return { isLeadershipTeamSelected: isLeadership, selectedTeamData: teamData };
  }, [teams, selectedTeam]);

  // Determine if team selector should be shown (independent of header)
  const shouldShowTeamSelector = showTeamSelector !== undefined 
    ? showTeamSelector 
    : showHeader; // Fallback to showHeader for backward compatibility


  // Expose selected team ID globally for AppLayout to use when creating goals
  React.useEffect(() => {
    (window as any).selectedTeamId = selectedTeam;
    return () => {
      delete (window as any).selectedTeamId;
    };
  }, [selectedTeam]);

  // Function to refresh goals from parent
  const refreshGoals = React.useCallback(() => {
    refreshRef.current?.();
  }, []);

  // Only show loading skeleton if no teams at all - optimistic UI shows immediately
  if (loading && teams.length === 0) {
    return (
      <motion.div 
        className="flex items-center justify-center py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center space-y-4">
          <div className="w-8 h-8 mx-auto bg-primary/20 rounded-full animate-pulse" />
          <p className="text-[13px] text-muted-foreground">Loading teams...</p>
        </div>
      </motion.div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        {showHeader && (
          <div className="space-y-1">
            <h1 className="text-[20px] font-semibold text-foreground">Goals</h1>
          </div>
        )}
        <EducationalEmptyState
          icon={Target}
          title="Let's set your first goal!"
          subtitle="Goals help teams stay focused and aligned on what matters most"
          steps={[
            "Define what success looks like (e.g., 'Increase sales by 20%')",
            "Set a realistic timeline (quarterly works best)",
            "Break it into measurable milestones"
          ]}
          tip="Start with weekly 30-minute check-ins to review progress"
        />
      </div>
    );
  }

  return (
    <motion.div 
      className={`flex flex-col h-full ${className}`}
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {showHeader && (
        <motion.div 
          className="sticky top-14 z-20 bg-background pt-6 pb-6 px-6 flex flex-col gap-4 border-b border-border/30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-[20px] font-semibold text-foreground">Goals</h1>
              <p className="text-[13px] text-muted-foreground">
                Manage goals and milestones
              </p>
            </div>
            {/* Right side: Quarterly progress */}
            <div className="flex items-center gap-4">
              <QuarterlyProgressIndicator />
            </div>
          </div>

          {/* Team Selector & View Settings inside sticky header so they never get cut */}
          {shouldShowTeamSelector && (!isInMeeting || audienceType === 'members') && (
            <div className="flex items-center justify-start gap-2">
              <UserTeamSelector 
                selectedTeamId={selectedTeam} 
                onTeamChange={setSelectedTeam} 
                placeholder="Select a team"
                className="w-[280px]"
                teams={teams}
                loading={false}
              />
              <GoalsViewSettings 
                showArchived={showArchived}
                onArchivedToggle={setShowArchived}
                hideEmptyUsers={hideEmptyUsers}
                onHideEmptyUsersToggle={setHideEmptyUsers}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Team Selector & View Settings when header is hidden (e.g. embedded views) */}
      {!showHeader && shouldShowTeamSelector && (!isInMeeting || audienceType === 'members') && (
        <div className="flex items-center justify-start gap-2 pt-2 mb-4">
          <UserTeamSelector 
            selectedTeamId={selectedTeam} 
            onTeamChange={setSelectedTeam} 
            placeholder="Select a team"
            className="w-[280px]"
            teams={teams}
            loading={false}
          />
          <GoalsViewSettings 
            showArchived={showArchived}
            onArchivedToggle={setShowArchived}
            hideEmptyUsers={hideEmptyUsers}
            onHideEmptyUsersToggle={setHideEmptyUsers}
          />
        </div>
      )}

      {/* Combined Goals Board - Optimistic by default, fill remaining space */}
      <div data-tour="goals-content" className="flex-1 overflow-y-auto px-6 pt-4">
        <CombinedGoalsBoard
          teams={teams}
          teamId={effectiveTeamId}
          showBulkActions={showBulkActions}
          showArchived={showArchived}
          hideEmptyUsers={hideEmptyUsers}
        />
      </div>
    </motion.div>
  );
};

// Memoize to prevent re-renders from meeting timer context
export const SharedGoalsView = React.memo(SharedGoalsViewComponent);