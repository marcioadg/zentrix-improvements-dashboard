
import React, { useState } from "react";
import { Loader2, AlertTriangle, Archive } from 'lucide-react';
import { QuarterlyGoalsContent } from '@/components/shared/QuarterlyGoalsContent';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useBulkArchiveGoals } from '@/hooks/useBulkArchiveGoals';
import { useBulkCreateIssuesForGoals } from '@/hooks/useBulkCreateIssuesForGoals';
import { CreateIssuesConfirmDialog } from '@/components/modals/CreateIssuesConfirmDialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface QuarterlyReviewPriorQuarterSectionProps {
  teamId?: string;
}

export const QuarterlyReviewPriorQuarterSection: React.FC<QuarterlyReviewPriorQuarterSectionProps> = ({ 
  teamId 
}) => {
  const { toast } = useToast();
  const { teams } = useOptimizedUserTeams();
  
  // Dialog state for issue creation confirmation
  const [showCreateIssuesDialog, setShowCreateIssuesDialog] = useState(false);
  const [offTrackGoalsCount, setOffTrackGoalsCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Placeholder refetch functions - QuarterlyGoalsContent handles its own refetching
  const refetchTeamGoals = async () => {};
  const refetchCompanyGoals = async () => {};

  // Bulk archive hook
  const { archiveAllCompleted, isArchiving } = useBulkArchiveGoals({
    teamId: teamId || '',
    companyId: teams[0]?.company_id || '',
    refetchTeamGoals,
    refetchCompanyGoals
  });

  // Bulk issue creation hook
  const { createIssuesForOffTrackGoals, isCreating } = useBulkCreateIssuesForGoals(
    teamId || '',
    teams[0]?.company_id || '',
    undefined,
    () => {
      refetchTeamGoals();
      refetchCompanyGoals();
    }
  );

  const handleOpenCreateIssuesDialog = async () => {
    try {
      // Fetch team-specific off-track goals that aren't archived
      const { data: teamOffTrackGoals, error: teamError } = await supabase
        .from('team_goals')
        .select('id')
        .eq('team_id', teamId || '')
        .eq('status', 'off_track')
        .eq('is_company_goal', false)
        .or('archived.is.null,archived.eq.false');

      if (teamError) throw teamError;

      // Fetch company off-track goals that aren't archived
      const { data: companyOffTrackGoals, error: companyError } = await supabase
        .from('team_goals')
        .select('id, teams!inner(company_id)')
        .eq('teams.company_id', teams[0]?.company_id || '')
        .eq('status', 'off_track')
        .eq('is_company_goal', true)
        .or('archived.is.null,archived.eq.false');

      if (companyError) throw companyError;

      const count = (teamOffTrackGoals?.length || 0) + (companyOffTrackGoals?.length || 0);
      
      if (count === 0) {
        toast({
          title: "No off-track goals",
          description: "There are no off-track goals to create issues for.",
          variant: "default"
        });
        return;
      }

      setOffTrackGoalsCount(count);
      setShowCreateIssuesDialog(true);
    } catch (error) {
      logger.error('Error fetching off-track goals count:', error);
      toast({
        title: "Error",
        description: "Failed to check off-track goals",
        variant: "destructive"
      });
    }
  };

  const handleConfirmCreateIssues = async (archiveAfter: boolean) => {
    setIsProcessing(true);
    
    try {
      await createIssuesForOffTrackGoals(archiveAfter);
      setShowCreateIssuesDialog(false);
    } catch (error) {
      logger.error('Error creating issues:', error);
      toast({
        title: "Error",
        description: "Failed to create issues",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Fixed header with title and buttons */}
        <div className="sticky top-0 bg-background z-10 border-b border-border/30 pb-4 mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Review Prior Quarter</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCreateIssuesDialog}
                disabled={isCreating || isProcessing}
                className="gap-2"
              >
                {isCreating || isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Create Issues for Off-Track
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={archiveAllCompleted}
                disabled={isArchiving}
                className="gap-2"
              >
                {isArchiving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                Archive Completed
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable goals content */}
        <div className="flex-1 overflow-y-auto">
          <QuarterlyGoalsContent 
            showHeader={false} 
            teamId={teamId} 
            showBulkActions={false}
          />
        </div>
      </div>

      <CreateIssuesConfirmDialog
        open={showCreateIssuesDialog}
        onOpenChange={setShowCreateIssuesDialog}
        onConfirm={handleConfirmCreateIssues}
        offTrackGoalsCount={offTrackGoalsCount}
        isProcessing={isProcessing || isCreating}
      />
    </>
  );
};

export default QuarterlyReviewPriorQuarterSection;
