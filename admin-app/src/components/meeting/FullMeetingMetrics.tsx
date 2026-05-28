
import React, { useState, useCallback, useMemo } from 'react';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useUserSettings, createFallbackUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ConsolidatedMetricsPageContent } from '@/components/dashboard/ConsolidatedMetricsPageContent';
import { AddIssueModal } from '@/components/modals/AddIssueModal';
import { useSimpleIssues } from '@/hooks/useSimpleIssues';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface FullMeetingMetricsProps {
  teamId: string;
  meetingTeamId?: string | null; // The actual team_id from the meeting object
}

export const FullMeetingMetrics: React.FC<FullMeetingMetricsProps> = React.memo(({ teamId, meetingTeamId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { teams } = useOptimizedUserTeams();
  const { settings: userSettings, updateMetricsSettings } = useUserSettings();
  const [isAddIssueModalOpen, setIsAddIssueModalOpen] = useState(false);
  const [selectedTeamForMetrics, setSelectedTeamForMetrics] = useState(teamId);
  
  // Use the meeting's actual team_id (same pattern as HeadlinesSection)
  // For member custom meetings, meetingTeamId is null - use it to prevent validation errors
  const effectiveTeamId = meetingTeamId !== undefined ? meetingTeamId : teamId;
  
  const { addIssue } = useSimpleIssues(effectiveTeamId || undefined);

  // Create fallback settings if needed
  const effectiveSettings = userSettings || (user ? createFallbackUserSettings(user.id) : createFallbackUserSettings('anonymous'));

  // Convert UserTeam to Team format for compatibility — memoize to avoid new array every render
  const compatibleTeams = useMemo(() => teams.map(team => ({
    id: team.id,
    name: team.name,
    company_id: team.company_id,
    description: team.description || null,
    created_by: '',
    created_at: '',
    updated_at: ''
  })), [teams]);

  const handleTeamSelect = useCallback((newTeamId: string) => {
    setSelectedTeamForMetrics(newTeamId);
  }, []);

  // Wrapper for updateMetricsSettings to match expected interface
  const wrappedUpdateMetricsSettings = useCallback(async (settings: any): Promise<void> => {
    try {
      await updateMetricsSettings(settings);
    } catch (error) {
      logger.error('FullMeetingMetrics: Failed to update metrics settings:', error);
      toast({
        title: "Error",
        description: "Failed to save metrics settings. Please try again.",
        variant: "destructive"
      });
    }
  }, [updateMetricsSettings, toast]);

  // Enhanced issue creation handler with meeting context
  const handleIssueAdd = async (data: {
    title: string;
    description?: string;
    issueType: 'short_term' | 'long_term';
    teamId: string;
    ownerId?: string;
  }): Promise<boolean> => {
    logger.log('FullMeetingMetrics: Creating issue in meeting context', data);
    
    try {
      const success = await addIssue(data.title, data.description, data.issueType, data.ownerId);
      
      if (success) {
        logger.log(`Issue created for meeting: ${data.title}`);
      }
      
      return success;
    } catch (error) {
      logger.error('FullMeetingMetrics: Issue creation failed:', error);
      toast({
        title: "Error",
        description: "Failed to create issue during meeting.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Enhanced metric issue creation handler that respects the metric owner
  const handleCreateIssueFromMetric = useCallback(async (title: string, description: string, ownerId?: string): Promise<void> => {
    logger.log('🔧 FullMeetingMetrics: Creating issue from metric with correct owner', { 
      title, 
      description, 
      ownerId,
      meetingTeamId: teamId 
    });
    
    try {
      // Always use 'short_term' for metric-generated issues and respect the metric owner
      const success = await addIssue(title, description, 'short_term', ownerId);
      
      if (success) {
        logger.log(`Issue created from metric and assigned to owner: ${title}`);
      } else {
        // Do not throw or toast here; useSimpleIssues already handled duplicate or validation toasts
        logger.log('Issue creation was prevented (likely duplicate). Suppressing generic error toast.');
        return;
      }
    } catch (error) {
      logger.error('FullMeetingMetrics: Metric issue creation failed:', error);
      toast({
        title: "Error",
        description: "Failed to create issue from metric.",
        variant: "destructive"
      });
      throw error;
    }
  }, [addIssue, teamId, toast]);

  // Memoize props to prevent re-renders from timer updates (MUST be before any conditional returns)
  const stableConsolidatedProps = useMemo(() => ({
    teams: compatibleTeams,
    selectedTeam: selectedTeamForMetrics,
    setSelectedTeam: handleTeamSelect,
    userSettings: effectiveSettings,
    updateMetricsSettings: wrappedUpdateMetricsSettings,
    settingsLoading: false,
    onCreateIssue: handleCreateIssueFromMetric,
    isInMeeting: true,
  }), [
    compatibleTeams,
    selectedTeamForMetrics,
    handleTeamSelect,
    effectiveSettings,
    wrappedUpdateMetricsSettings,
    handleCreateIssueFromMetric
  ]);

  // Show loading state if no teams or settings
  if (!compatibleTeams.length || !effectiveSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading meeting metrics...</p>
        </div>
      </div>
    );
  }

  // Find the current team for the meeting
  const currentTeam = compatibleTeams.find(team => team.id === teamId);
  const selectedTeam = compatibleTeams.find(team => team.id === selectedTeamForMetrics);
  
  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Meeting team not found</p>
        </div>
      </div>
    );
  }

  const isViewingDifferentTeam = selectedTeamForMetrics !== teamId;

  return (
    <div className="space-y-6">
      {/* Meeting Metrics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Team Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Review and update metrics for {selectedTeam?.name || currentTeam.name}
          </p>
        </div>
      </div>
      
      {/* Full Metrics Content */}
      <ConsolidatedMetricsPageContent
        {...stableConsolidatedProps}
      />
      
      {/* Issue Creation Modal */}
      <AddIssueModal
        open={isAddIssueModalOpen}
        onOpenChange={setIsAddIssueModalOpen}
        onAdd={handleIssueAdd}
        defaultTeamId={teamId}
      />
    </div>
  );
});
