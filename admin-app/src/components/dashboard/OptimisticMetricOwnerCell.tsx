import React from 'react';
import { ClickableUserAvatar } from '@/components/ClickableUserAvatar';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';
import { useTeamMemberSelector } from '@/hooks/useTeamMemberSelector';
import { SessionLogger } from '@/utils/sessionLogger';
import { useToast } from '@/hooks/use-toast';
import { useProfiles } from '@/hooks/useProfiles';
import { logger } from '@/utils/logger';

interface OptimisticMetricOwnerCellProps {
  metric: any;
  getOwnerInitials: (fullName: string) => string;
  optimisticOwnershipHandler?: (
    metricId: string,
    currentOwnerId: string | null,
    currentOwnerName: string,
    newOwnerId: string | null,
    newOwnerName: string
  ) => Promise<boolean>;
  isMetricSyncing?: (metricId: string) => boolean;
}

export const OptimisticMetricOwnerCell: React.FC<OptimisticMetricOwnerCellProps> = ({
  metric,
  getOwnerInitials,
  optimisticOwnershipHandler,
  isMetricSyncing,
}) => {
  const { canChangeMetricOwner } = useMetricsPermissions(metric.team_id);
  const { users: teamMembers, loading: membersLoading, error: membersError } = useTeamMemberSelector(metric.team_id);
  const { profiles } = useProfiles();
  const { toast } = useToast();

  const canChangeOwner = canChangeMetricOwner(metric);
  const isSyncing = isMetricSyncing ? isMetricSyncing(metric.id) : false;

  // Get owner profile info with avatar URL
  const getOwnerProfileInfo = () => {
    const profile = profiles.find(p => p.id === metric.owner_id);
    
    return {
      fullName: profile?.full_name || metric.owner || 'Unknown',
      avatarUrl: profile?.avatar_url || metric.owner_avatar_url,
      email: profile?.email
    };
  };

  // Get owner deactivation status from metric data
  const isOwnerDeactivated = metric.owner_is_deactivated || false;

  logger.debug('OptimisticMetricOwnerCell state', {
    metricId: metric.id,
    hasOwner: !!metric.owner_id,
    canEdit: canChangeOwner
  });

  React.useEffect(() => {
    if (metric.team_id && !membersLoading && !membersError && teamMembers.length === 0) {
      SessionLogger.logOncePerMetric(
        metric.id,
        '⚠️ OptimisticMetricOwnerCell: No team members found for metric:',
        {
          metricId: metric.id,
          metricName: metric.metric_name,
          teamId: metric.team_id,
          teamName: metric.team_name || 'undefined'
        }
      );
    }
  }, [metric.id, metric.team_id, teamMembers.length, membersLoading, membersError]);

  const handleOwnerChange = async (newOwnerId: string | null): Promise<boolean> => {
    logger.debug('Owner change initiated', {
      metricId: metric.id,
      newOwnerId,
      canChangeOwner
    });

    if (!canChangeOwner || !optimisticOwnershipHandler) {
      logger.error('Cannot change owner or no handler available');
      return false;
    }

    // Find the new owner's name
    const newOwner = newOwnerId ? teamMembers.find(member => member.id === newOwnerId) : null;
    const newOwnerName = newOwner ? newOwner.full_name || newOwner.email || 'Unknown' : 'Unassigned';
    const currentOwnerName = metric.owner || 'Unknown';

    // Use the page-level optimistic handler
    const success = await optimisticOwnershipHandler(
      metric.id,
      metric.owner_id,
      currentOwnerName,
      newOwnerId,
      newOwnerName
    );

    // Show enhanced feedback based on success
    if (success) {
      toast({
        title: "Owner Updated",
        description: `${metric.metric_name} owner changed to ${newOwnerName}`,
        duration: 2000,
      });
    } else {
      toast({
        title: "Update Failed",
        description: `Failed to change owner of ${metric.metric_name}. Please try again.`,
        variant: "destructive",
        duration: 3000,
      });
    }

    return success;
  };

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Helper function to get tooltip messages based on state
  const getTooltipInfo = () => {
    if (isSyncing) {
      return {
        content: `${metric.owner || 'Unknown'} (updating...)`,
        description: 'Ownership change in progress...'
      };
    }
    
    if (!metric.owner || metric.owner_id === null) {
      return {
        content: 'No Owner Assigned',
        description: getTooltipDescription()
      };
    }
    return {
      content: metric.owner,
      description: getTooltipDescription()
    };
  };

  const getTooltipDescription = () => {
    if (isSyncing) {
      return 'Syncing ownership change...';
    }
    if (membersError) {
      return 'Error loading team members - cannot change owner';
    }
    if (!metric.team_id) {
      return 'No team assigned - cannot change owner';
    }
    if (teamMembers.length === 0 && !membersLoading) {
      return 'No team members available - cannot change owner';
    }
    if (!canChangeOwner) {
      return 'No permission to change owner (need Manager role or manage_metrics capability)';
    }
    return `Click to change owner (${teamMembers.length} members available)`;
  };

  // Show loading state
  if (membersLoading) {
    return (
      <div className="flex justify-center cursor-default" onClick={handleCellClick}>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex items-center justify-center">
          <span className="text-xs text-muted-foreground">...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (membersError) {
    const tooltipInfo = getTooltipInfo();
    return (
      <div className="flex justify-center cursor-help" onClick={handleCellClick}>
        <div
          className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center cursor-help"
          title={`${tooltipInfo.content} - ${tooltipInfo.description}`}
        >
          <span className="text-xs text-destructive">!</span>
        </div>
      </div>
    );
  }

  // Show simplified non-interactive avatar when no team members available or no team
  if (!metric.team_id || (teamMembers.length === 0 && !membersLoading)) {
    const tooltipInfo = getTooltipInfo();
    const initials = metric.owner ? getOwnerInitials(metric.owner) : '?';
    
    return (
      <div className="flex justify-center cursor-help" onClick={handleCellClick}>
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium cursor-help transition-all duration-200 ${
            !metric.owner || metric.owner_id === null 
              ? 'bg-muted text-muted-foreground' 
              : 'bg-primary/10 text-primary'
          } ${isSyncing ? 'opacity-70 scale-95' : ''}`}
          title={`${tooltipInfo.content} - ${tooltipInfo.description}`}
        >
          {isSyncing ? (
            <div className="h-3 w-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            initials
          )}
        </div>
      </div>
    );
  }

  // Show interactive avatar when team members are available
  const tooltipInfo = getTooltipInfo();
  const ownerInfo = getOwnerProfileInfo();
  
  // Convert TeamMemberSelectorUser to the format expected by ClickableUserAvatar
  const customUsers = teamMembers.map(member => ({
    id: member.id,
    full_name: member.full_name,
    email: member.email,
    avatar_url: member.avatar_url
  }));
  
  return (
    <div className="flex justify-center cursor-pointer" onClick={handleCellClick}>
      <div className="relative">
        <div className={`transition-all duration-200 ${isSyncing ? 'scale-95' : 'hover:scale-105'}`}>
          <ClickableUserAvatar
            key={metric.owner_id}
            userId={metric.owner_id}
            fullName={ownerInfo.fullName}
            avatarUrl={ownerInfo.avatarUrl}
            size="md"
            onUserChange={handleOwnerChange}
            disabled={!canChangeOwner || isSyncing}
            customUsers={customUsers}
            className={`${
              !metric.owner || metric.owner_id === null 
                ? 'bg-muted text-muted-foreground' 
                : 'bg-primary/10 text-primary'
            } ${isSyncing ? 'opacity-70' : ''} transition-all duration-200`}
            tooltipContent={tooltipInfo.content}
            tooltipDescription={tooltipInfo.description}
            isDeactivated={isOwnerDeactivated}
          />
        </div>
        {isSyncing && (
          <div className="absolute -top-1 -right-1 h-3 w-3 border border-primary border-t-transparent rounded-full animate-spin bg-white shadow-sm" />
        )}
      </div>
    </div>
  );
};
