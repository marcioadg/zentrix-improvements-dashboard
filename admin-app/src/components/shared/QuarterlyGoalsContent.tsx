import React from 'react';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { SharedGoalsView } from './SharedGoalsView';

interface QuarterlyGoalsContentProps {
  showHeader?: boolean;
  className?: string;
  teamId?: string;
  showBulkActions?: boolean;
  audienceType?: 'team' | 'members';
  showTeamSelector?: boolean;
}

const QuarterlyGoalsContentComponent: React.FC<QuarterlyGoalsContentProps> = ({
  showHeader = false,
  className = "",
  teamId,
  showBulkActions = false,
  audienceType = 'team',
  showTeamSelector
}) => {
  const { teams, loading } = useOptimizedUserTeams();

  return (
    <SharedGoalsView 
      teams={teams}
      loading={loading}
      showHeader={showHeader}
      className={className}
      teamId={teamId}
      showBulkActions={showBulkActions}
      audienceType={audienceType}
      showTeamSelector={showTeamSelector}
    />
  );
};

// Memoize to prevent re-renders from meeting timer context
export const QuarterlyGoalsContent = React.memo(QuarterlyGoalsContentComponent);