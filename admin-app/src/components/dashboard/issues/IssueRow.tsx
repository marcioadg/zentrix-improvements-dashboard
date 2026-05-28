
import React, { useState } from 'react';
import { CheckCircle2, Circle, Archive, RotateCcw, ArrowRight, ArrowLeft, Plus, Clock, GitMerge } from 'lucide-react';
import { MergeIssueModal } from '@/components/modals/MergeIssueModal';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { VoteButtons } from '@/components/voting/VoteButtons';
import { UserAvatar } from '@/components/UserAvatar';
import { EditIssueModal } from '@/components/modals/EditIssueModal';
import { EnhancedAddTaskModal } from '@/components/modals/EnhancedAddTaskModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { UserVoteData } from '@/hooks/voting/types';
import { logger } from '@/utils/logger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface IssueRowProps {
  issue: {
    id: string;
    title: string;
    description?: string;
    status: string;
    created_at: string;
    vote_count?: number;
    owner_id: string;
    created_by: string;
    team_id: string;
    issue_type: 'short_term' | 'long_term';
    is_public?: boolean;
  };
  isArchived?: boolean;
  isMeetingContext?: boolean;
  countdown?: number;
  onSolve: (issueId: string, status: string) => void;
  onArchive: (issueId: string) => void;
  onUnarchive: (issueId: string) => void;
  onEdit: (issue: any) => void;
  onUpdate?: (id: string, updates: any) => Promise<void>;
  teamId: string;
  onOptimisticUpdate?: (issueId: string) => void;
  onCreateTaskFromIssue?: (issueData: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
    dueDate?: string;
    assignedTo?: string[];
  }) => void;
  members: Array<{
    user_id: string;
    profiles?: {
      full_name: string;
      email: string;
      avatar_url?: string;
    };
  }>;
  onVoteCountChange?: (issueId: string, voteCount: number) => void;
  // NEW: Broadcast vote to other participants
  onVoteCast?: (issueId: string, voteValue: number, newVoteCount: number) => void;
  // NEW: Override vote count from remote broadcast
  remoteVoteCount?: number;
  // NEW: Clear stale remote vote count when user votes locally
  onClearRemoteVoteCount?: (issueId: string) => void;
  initialVoteCount?: number;
  initialUserVotes?: UserVoteData;
  onMerge?: (sourceIssueId: string, targetIssueId: string) => Promise<void>;
  allTeamIssues?: Array<{
    id: string;
    title: string;
    description?: string;
    owner_id: string;
    issue_type: 'short_term' | 'long_term';
  }>;
  // Track if a task was created from this issue (for solve confirmation)
  hasTaskCreated?: boolean;
}

export const IssueRow: React.FC<IssueRowProps> = ({
  issue,
  isArchived = false,
  isMeetingContext = false,
  countdown,
  onSolve,
  onArchive,
  onUnarchive,
  onEdit,
  onUpdate,
  teamId,
  onOptimisticUpdate,
  onCreateTaskFromIssue,
  members,
  onVoteCountChange,
  onVoteCast,
  remoteVoteCount,
  onClearRemoteVoteCount,
  initialVoteCount,
  initialUserVotes,
  onMerge,
  allTeamIssues = [],
  hasTaskCreated = false,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSolveConfirm, setShowSolveConfirm] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useMultiCompany();
  
  // Get the settings from company
  const requireTaskBeforeSolve = currentCompany?.require_task_before_solve ?? true;
  const autoSolveOnTaskCreate = currentCompany?.auto_solve_on_task_create ?? false;

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const handleSolve = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Standard solve toggle behavior - no auto task creation
    const newStatus = issue.status === 'resolved' ? 'open' : 'resolved';
    
    // Only show warning when resolving (not reopening) in meeting context without a task
    // AND when the company setting is enabled
    if (newStatus === 'resolved' && isMeetingContext && !hasTaskCreated && requireTaskBeforeSolve) {
      setShowSolveConfirm(true);
      return;
    }
    
    onSolve(issue.id, newStatus);
  };
  
  const handleConfirmSolve = () => {
    onSolve(issue.id, 'resolved');
    setShowSolveConfirm(false);
  };

  const handleCreateTaskFromIssue = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Always show modal to let users review/edit before creating
    setShowTaskModal(true);
  };

  const handleTaskModalClose = (taskWasCreated: boolean) => {
    logger.log('IssueRow: Task modal closed', { taskWasCreated, issueId: issue.id });
    setShowTaskModal(false);
    // Auto-solve: if a task was just created in meeting context and the setting is on,
    // mark the issue as resolved without requiring a manual circle click
    if (taskWasCreated && isMeetingContext && autoSolveOnTaskCreate && issue.status !== 'resolved') {
      logger.log('IssueRow: Auto-solving issue after task creation', { issueId: issue.id });
      onSolve(issue.id, 'resolved');
    }
  };

  const handleAddTask = async (
    title: string,
    description: string,
    teamSelection: { type: 'personal' | 'team'; teamId?: string },
    dueDate?: string,
    assignedTo?: string[],
    status?: 'todo' | 'in-progress' | 'done'
  ) => {
    try {
      // Use the provided onCreateTaskFromIssue handler if available
      if (onCreateTaskFromIssue) {
        onCreateTaskFromIssue({
          title,
          description,
          sourceIssueId: issue.id,
          ownerId: issue.owner_id,
          dueDate: dueDate,
          assignedTo: assignedTo,
        });
      }
      
      // Close modal and archive issue
      handleTaskModalClose(true);
    } catch (error) {
      logger.error('Error creating task from issue:', error);
      throw error; // Let the modal handle the error display
    }
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.log('🗄️ IssueRow: Archive button clicked for issue:', issue.id, issue.title);
    onArchive(issue.id);
  };

  const handleUnarchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    logger.log('🔄 IssueRow: Unarchive button clicked for issue:', issue.id, issue.title);
    onUnarchive(issue.id);
  };

  const handleMoveIssueType = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newType = issue.issue_type === 'short_term' ? 'long_term' : 'short_term';
    
    if (onUpdate) {
      try {
        await onUpdate(issue.id, { issue_type: newType });
        toast({
          title: "Issue Moved",
          description: `Issue moved to ${newType.replace('_', '-')}.`,
        });
      } catch (error) {
        logger.error('Error moving issue:', error);
        toast({
          title: "Error",
          description: "Failed to move issue",
          variant: "destructive",
        });
      }
    }
  };

  const handleMergeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // ✅ FIX: Refetch will be done inside the modal when it opens
    // This ensures we always have the latest data
    setShowMergeModal(true);
  };

  const handleConfirmMerge = async (targetIssueId: string) => {
    if (onMerge) {
      await onMerge(issue.id, targetIssueId);
    }
  };

  const handleRowClick = () => {
    logger.log('🔧 IssueRow: Issue clicked for editing', { 
      issueId: issue.id, 
      isArchived: isArchived,
      issue: issue 
    });
    if (!isArchived) {
      setShowEditModal(true);
    } else {
      logger.warn('🚨 IssueRow: Cannot edit archived issue');
    }
  };

  const handleSaveIssue = async (updates: any) => {
    try {
      // Use the onUpdate prop to delegate to the parent component's proper update handler
      if (onUpdate) {
        await onUpdate(issue.id, updates);
        toast({
          title: "Success",
          description: "Issue updated successfully",
        });
        return true;
      } else {
        throw new Error('No update handler available');
      }
    } catch (error) {
      logger.error('Error updating issue:', error);
      toast({
        title: "Error",
        description: "Failed to update issue",
        variant: "destructive",
      });
      return false;
    }
  };

  // Remove auto-archiving from edit cancel - just close modal
  const handleEditCancel = () => {
    logger.log('IssueRow: Edit cancelled');
    // No archiving here - just close the modal
  };

  const canVote = issue.status === 'open' && !isArchived && isMeetingContext;

  // Check if short-term issue is getting old (>2 weeks)
  const isGettingOld = issue.issue_type === 'short_term' && 
    differenceInDays(new Date(), new Date(issue.created_at)) > 14;

  // Find owner - optimized without logging
  const owner = members.find(m => m.user_id === issue.owner_id);

  return (
    <TooltipProvider>
      <div
        className={`group flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors duration-150 cursor-pointer ${
          issue.status === 'resolved' ? 'opacity-60' : ''
        }`}
        onClick={handleRowClick}
      >
        {/* Status circle */}
        <div
          onClick={handleSolve}
          className="flex-shrink-0 w-5 h-5 cursor-pointer"
          title={issue.status === 'resolved' ? 'Mark as open' : 'Mark as resolved'}
        >
          <button
            disabled={isArchived}
            className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
              issue.status === 'resolved'
                ? 'bg-primary border-primary'
                : 'border-border hover:border-muted-foreground'
            } ${isArchived ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {issue.status === 'resolved' && (
              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
            )}
          </button>
        </div>

        {/* Issue content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[13px] text-foreground leading-tight">
                {issue.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-0">
                <span className={`text-[11px] ${isGettingOld ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {formatDate(issue.created_at)}
                </span>
                {isGettingOld && (
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <Clock className="h-2.5 w-2.5 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This short-term issue is getting old (over 2 weeks)</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {countdown && countdown > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-destructive font-medium">
                      Auto-archive in {countdown}s
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Owner Avatar */}
            <div className="flex-shrink-0 ml-1">
              <UserAvatar
                userId={issue.owner_id}
                fullName={owner?.profiles?.full_name || 'Unknown'}
                email={owner?.profiles?.email}
                avatarUrl={owner?.profiles?.avatar_url}
                size="sm"
              />
            </div>

            {/* Voting Section */}
            {canVote && (
              <div className="flex-shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                <VoteButtons
                  issueId={issue.id}
                  teamId={teamId}
                  onOptimisticUpdate={onOptimisticUpdate}
                  onVoteCountChange={onVoteCountChange}
                  publishVote={onVoteCast}
                  remoteVoteCount={remoteVoteCount}
                  onClearRemoteVoteCount={onClearRemoteVoteCount}
                  initialVoteCount={initialVoteCount}
                  initialUserVotes={initialUserVotes}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 ml-1">
          {!isArchived && isMeetingContext && issue.status === 'open' && (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCreateTaskFromIssue}
                  className="p-0.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Create task from issue"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create task from issue</p>
              </TooltipContent>
            </Tooltip>
          )}
          {!isArchived && onMerge && (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleMergeClick}
                  className="p-0.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <GitMerge className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Merge with another issue</p>
              </TooltipContent>
            </Tooltip>
          )}
          {!isArchived && (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleMoveIssueType}
                  className="p-0.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {issue.issue_type === 'short_term' ? (
                    <ArrowRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowLeft className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{issue.issue_type === 'short_term' ? 'Move to long-term' : 'Move to short-term'}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {isArchived ? (
            <button
              onClick={handleUnarchive}
              className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Unarchive issue"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleArchive}
              className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Archive issue"
            >
              <Archive className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Edit Issue Modal */}
      {showEditModal && (
        <EditIssueModal
          open={showEditModal}
          onOpenChange={(open) => {
            setShowEditModal(open);
            if (!open) {
              handleEditCancel();
            }
          }}
          issue={{
            id: issue.id,
            title: issue.title,
            description: issue.description,
            created_by: issue.created_by,
            owner_id: issue.owner_id,
            team_id: issue.team_id,
            issue_type: issue.issue_type,
            is_public: issue.is_public,
          }}
          onSave={handleSaveIssue}
        />
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <EnhancedAddTaskModal
          open={showTaskModal}
          onOpenChange={(open) => {
            if (!open) {
              handleTaskModalClose(false);
            }
          }}
          onAddTask={handleAddTask}
          defaultTeamId={teamId}
          prefilledData={{
            title: issue.title,
            description: issue.description || `Action item from issue: ${issue.title}`,
            sourceIssueId: issue.id,
            ownerId: issue.owner_id,
            isResolved: issue.status === 'resolved',
          }}
        />
      )}

      {/* Merge Issue Modal */}
      {showMergeModal && (
        <MergeIssueModal
          open={showMergeModal}
          onOpenChange={setShowMergeModal}
          sourceIssue={{
            id: issue.id,
            title: issue.title,
            description: issue.description,
            owner_id: issue.owner_id,
            issue_type: issue.issue_type,
          }}
          availableIssues={allTeamIssues}
          onConfirmMerge={handleConfirmMerge}
          teamId={teamId}
        />
      )}

      {/* Solve Without Task Confirmation Dialog */}
      <AlertDialog open={showSolveConfirm} onOpenChange={setShowSolveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Solve without a task?</AlertDialogTitle>
            <AlertDialogDescription>
              No task has been created for this issue. Are you sure you want to mark it as solved?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setShowSolveConfirm(false);
                setShowTaskModal(true);
              }}
              variant="outline"
            >
              Create Task
            </AlertDialogAction>
            <AlertDialogAction onClick={handleConfirmSolve}>
              Yes, solve it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};
