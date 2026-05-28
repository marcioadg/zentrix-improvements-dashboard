import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { IssueRow } from './IssueRow';
import { UserVoteData } from '@/hooks/voting/types';

interface DraggableIssueRowProps {
  issue: any;
  isArchived?: boolean;
  isMeetingContext?: boolean;
  onSolve: (issueId: string, status: string) => void;
  onArchive: (issueId: string) => void;
  onUnarchive: (issueId: string) => void;
  onEdit: (issue: any) => void;
  onUpdate?: (id: string, updates: any) => Promise<void>;
  teamId: string;
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
  onVoteCast?: (issueId: string, voteValue: number, newVoteCount: number) => void;
  remoteVoteCount?: number;
  onClearRemoteVoteCount?: (issueId: string) => void;
  initialVoteCount?: number;
  initialUserVotes?: UserVoteData;
  showDragHandle: boolean;
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

export const DraggableIssueRow: React.FC<DraggableIssueRowProps> = memo(({
  issue,
  isArchived = false,
  isMeetingContext = false,
  onSolve,
  onArchive,
  onUnarchive,
  onEdit,
  onUpdate,
  teamId,
  onCreateTaskFromIssue,
  members,
  onVoteCountChange,
  onVoteCast,
  remoteVoteCount,
  onClearRemoteVoteCount,
  initialVoteCount,
  initialUserVotes,
  showDragHandle,
  onMerge,
  allTeamIssues,
  hasTaskCreated,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, disabled: !showDragHandle || isArchived });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex items-center gap-2">
        {/* Drag Handle - Only show when custom-order is selected and not archived */}
        {showDragHandle && !isArchived && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors opacity-60 hover:opacity-100 flex items-center justify-center flex-shrink-0 select-none touch-none"
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        
        {/* Issue Row */}
        <div className="flex-1 min-w-0">
          <IssueRow
            issue={issue}
            isArchived={isArchived}
            isMeetingContext={isMeetingContext}
            onSolve={onSolve}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onEdit={onEdit}
            onUpdate={onUpdate}
            teamId={teamId}
            onCreateTaskFromIssue={onCreateTaskFromIssue}
            members={members}
            onVoteCountChange={onVoteCountChange}
            onVoteCast={onVoteCast}
            remoteVoteCount={remoteVoteCount}
            onClearRemoteVoteCount={onClearRemoteVoteCount}
            initialVoteCount={initialVoteCount}
            initialUserVotes={initialUserVotes}
            onMerge={onMerge}
            allTeamIssues={allTeamIssues}
            hasTaskCreated={hasTaskCreated}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if issue data actually changed
  return (
    prevProps.issue.id === nextProps.issue.id &&
    prevProps.issue.title === nextProps.issue.title &&
    prevProps.issue.status === nextProps.issue.status &&
    prevProps.issue.sort_order === nextProps.issue.sort_order &&
    prevProps.showDragHandle === nextProps.showDragHandle &&
    prevProps.isArchived === nextProps.isArchived &&
    prevProps.remoteVoteCount === nextProps.remoteVoteCount &&
    prevProps.initialVoteCount === nextProps.initialVoteCount &&
    prevProps.initialUserVotes === nextProps.initialUserVotes
  );
});

DraggableIssueRow.displayName = 'DraggableIssueRow';

