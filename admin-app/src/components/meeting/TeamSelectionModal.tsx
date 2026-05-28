
import React from 'react';
import { BaseModal } from '@/components/modals/BaseModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, AlertCircle } from 'lucide-react';
import { useActiveMeetingCheck } from '@/hooks/useActiveMeetingCheck';
import { useOptimizedActiveMeetings } from '@/hooks/meeting/useOptimizedActiveMeetings';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { trackCustomMeetingStarted } from '@/lib/statsigAnalytics';

interface TeamSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingType?: 'weekly' | 'quarterly' | 'custom' | 'annual';
  title?: string;
  description?: string;
  onMeetingCreated?: (teamId: string, teamName: string, meetingType: string) => string;
  teams: Array<{
    id: string;
    name: string;
    description?: string;
    company_id: string;
    role?: string;
    is_leadership?: boolean;
  }>;
  loading?: boolean;
}

interface TeamWithMeetingStatus {
  id: string;
  name: string;
  description?: string;
  hasActiveMeeting: boolean;
  activeMeetingId?: string;
  hasConflictingMeeting?: boolean;
  conflictingMeetingType?: string;
}

// Filter out auto-generated team descriptions
const shouldShowDescription = (description?: string): boolean => {
  if (!description) return false;
  // Hide auto-generated descriptions for custom member meetings
  if (description.toLowerCase().includes('team created for custom member meeting')) return false;
  return true;
};

const TeamButton: React.FC<{
  team: TeamWithMeetingStatus;
  meetingType: string;
  onSelect: (teamId: string) => void;
  onJoinExisting: (teamId: string, meetingType: string) => void;
}> = ({ team, meetingType, onSelect, onJoinExisting }) => {
  const navigate = useNavigate();
  const displayDescription = shouldShowDescription(team.description) ? team.description : undefined;

  if (team.hasActiveMeeting) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start h-auto p-4"
        onClick={() => onJoinExisting(team.id, meetingType)}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Users className="h-5 w-5 text-primary" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
          </div>
          <div className="text-left">
            <div className="font-medium">{team.name}</div>
            {displayDescription && (
              <div className="text-sm text-muted-foreground">{displayDescription}</div>
            )}
          </div>
        </div>
      </Button>
    );
  }

  // If there's a conflicting meeting type, show disabled button with tooltip
  if (team.hasConflictingMeeting) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 opacity-50 cursor-not-allowed"
                disabled
              >
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <div className="font-medium">{team.name}</div>
                    {displayDescription && (
                      <div className="text-sm text-muted-foreground">{displayDescription}</div>
                    )}
                  </div>
                </div>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>This team has an active {team.conflictingMeetingType} meeting. Please end it before starting a new {meetingType} meeting.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="outline"
      className="w-full justify-start h-auto p-4"
      onClick={() => onSelect(team.id)}
    >
      <div className="flex items-center space-x-3">
        <Users className="h-5 w-5 text-primary" />
        <div className="text-left">
          <div className="font-medium">{team.name}</div>
          {displayDescription && (
            <div className="text-sm text-muted-foreground">{displayDescription}</div>
          )}
        </div>
      </div>
    </Button>
  );
};

export const TeamSelectionModal: React.FC<TeamSelectionModalProps> = ({
  open,
  onOpenChange,
  meetingType = 'quarterly',
  title = 'Select Team for Meeting',
  description = 'Choose which team this meeting is for',
  onMeetingCreated,
  teams,
  loading = false
}) => {
  const { meetings, forceRefetch } = useOptimizedActiveMeetings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();

  // Only fetch and process when modal is actually open to avoid unnecessary work
  React.useEffect(() => {
    if (open) {
      forceRefetch();
    }
  }, [open, forceRefetch]);

  // Early return when closed - avoid all processing
  if (!open) {
    return (
      <BaseModal 
        open={open} 
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        hideActions={true}
      >
        <div />
      </BaseModal>
    );
  }

  // Create a map of teams with their active meeting status and rank them
  const teamsWithMeetingStatus: TeamWithMeetingStatus[] = teams.map(team => {
    const activeMeeting = meetings.find(
      meeting => meeting.team_id === team.id && 
                 meeting.meeting_type === meetingType && 
                 meeting.status === 'active'
    );

    // Check for conflicting meeting type (active meeting of different type)
    const conflictingMeeting = meetings.find(
      meeting => meeting.team_id === team.id && 
                 meeting.meeting_type !== meetingType && 
                 meeting.status === 'active'
    );

    // No logging needed for status checks - only log actual actions

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      hasActiveMeeting: !!activeMeeting,
      activeMeetingId: activeMeeting?.id,
      hasConflictingMeeting: !!conflictingMeeting,
      conflictingMeetingType: conflictingMeeting?.meeting_type,
      // Additional properties for ranking
      isLeadership: team.is_leadership || false
      // role removed as team roles are deprecated
    };
  }).sort((a, b) => {
    // Ranking logic: most likely teams first
    
    // 1. Teams with active meetings come first (user likely wants to join them)
    if (a.hasActiveMeeting && !b.hasActiveMeeting) return -1;
    if (!a.hasActiveMeeting && b.hasActiveMeeting) return 1;
    
    // 2. Leadership teams ranked higher (more important meetings)
    if (a.isLeadership && !b.isLeadership) return -1;
    if (!a.isLeadership && b.isLeadership) return 1;
    
    // 3. Since team roles are deprecated, skip role-based sorting
    // Teams are sorted by leadership status and name only
    
    // 4. Alphabetical order for consistency
    return a.name.localeCompare(b.name);
  });

  const handleTeamSelect = async (teamId: string) => {
    const selectedTeam = teams.find(team => team.id === teamId);
    
    // Track custom_meeting_started event immediately when user clicks the team button
    if (meetingType === 'custom' && selectedTeam && user) {
      logger.log('📊 TeamSelectionModal: Tracking custom_meeting_started on team click:', {
        team_id: teamId,
        team_name: selectedTeam.name,
        user_id: user.id,
        company_id: currentCompany?.id
      });
      
      trackCustomMeetingStarted({
        user_id: user.id,
        company_id: currentCompany?.id,
        team_id: teamId,
        team_name: selectedTeam.name,
      });
    }
    
    // Call the optimistic creation callback if provided
    if (onMeetingCreated && selectedTeam) {
      onMeetingCreated(teamId, selectedTeam.name, meetingType);
      
      // Force immediate cache invalidation to prepare for the real meeting data
      if (user && currentCompany) {
        queryClient.invalidateQueries({
          queryKey: ['optimized-meetings-data', user.id, currentCompany?.id],
          refetchType: 'active'
        });
      }
    }
    
    // Small delay to ensure optimistic state is set before navigation
    setTimeout(() => {
      navigate(`/meeting/${teamId}/${meetingType}`);
      onOpenChange(false);
    }, 100);
  };

  const handleJoinExisting = (teamId: string, meetingType: string) => {
    navigate(`/meeting/${teamId}/${meetingType}`);
    onOpenChange(false);
  };

  const activeCount = teamsWithMeetingStatus.filter(team => team.hasActiveMeeting).length;
  const availableCount = teamsWithMeetingStatus.filter(team => !team.hasActiveMeeting).length;

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      hideActions={true}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No teams available</h3>
            <p className="text-muted-foreground mb-4">
              You need to be assigned to a team to conduct meetings
            </p>
            <p className="text-sm text-muted-foreground">
              Contact your administrator to be added to a team
            </p>
          </div>
        ) : (
          <>
            {/* Status summary */}
            {(activeCount > 0 || availableCount > 0) && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {teamsWithMeetingStatus.length} team{teamsWithMeetingStatus.length !== 1 ? 's' : ''}
                  </span>
                  {activeCount > 0 && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      {activeCount} active
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Team list */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {teamsWithMeetingStatus.map((team) => (
                <TeamButton
                  key={team.id}
                  team={team}
                  meetingType={meetingType}
                  onSelect={handleTeamSelect}
                  onJoinExisting={handleJoinExisting}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
};
