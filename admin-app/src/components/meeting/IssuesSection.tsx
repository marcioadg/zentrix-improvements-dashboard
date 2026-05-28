import React, { useState, useEffect, useRef } from 'react';
import { IssuesSection as SharedIssuesSection } from '@/components/dashboard/IssuesSection';
import { VotingSettingsModal } from '@/components/modals/VotingSettingsModal';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';

interface IssuesSectionProps {
  meetingId: string;
  teamId: string;
  meetingTeamId?: string | null;
  onCreateTaskFromIssue?: (issueData: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
    dueDate?: string;
    assignedTo?: string[];
  }) => void;
  onIssueSolved?: (
    issueTitle?: string,
    issueDescription?: string,
    issueId?: string,
    ownerId?: string,
    issueTeamId?: string
  ) => void;
  liveSectionDuration?: number;
  onUpdateIssueReady?: (updateIssue: (issueId: string, updates: any) => Promise<void>) => void;
  onTaskCreated?: () => void;
  onRegisterTaskCallback?: (callback: () => void) => void;
  // Issue creation broadcast props
  onIssueCreated?: (issue: any) => void;
  onAddIssueToLocalStateReady?: (addFn: (issue: any) => void) => void;
  // Issue status broadcast props
  onIssueStatusChanged?: (issueId: string, status: string) => void;
  onUpdateIssueLocalStateReady?: (updateFn: (issueId: string, status: string) => void) => void;
  // Issue archive broadcast props
  onIssueArchivedChanged?: (issueId: string, archived: boolean) => void;
  onUpdateIssueArchiveLocalStateReady?: (updateFn: (issueId: string, archived: boolean) => void) => void;
  // Annual meeting: show "All" option in the type toggle (same row as Weekly)
  showAllIssuesTab?: boolean;
  // Render slot for trigger under title (e.g., Problem Solving Process toggle)
  renderAfterStats?: React.ReactNode;
  // Render slot for expanded content below header row
  renderExpandedContent?: React.ReactNode;
}

export const IssuesSection: React.FC<IssuesSectionProps> = ({
  meetingId,
  teamId,
  meetingTeamId,
  onCreateTaskFromIssue,
  onIssueSolved,
  liveSectionDuration = 0,
  onUpdateIssueReady,
  onTaskCreated,
  onRegisterTaskCallback,
  onIssueCreated,
  onAddIssueToLocalStateReady,
  onIssueStatusChanged,
  onUpdateIssueLocalStateReady,
  onIssueArchivedChanged,
  onUpdateIssueArchiveLocalStateReady,
  showAllIssuesTab = false,
  renderAfterStats,
  renderExpandedContent,
}) => {
  const effectiveTeamId = meetingTeamId !== undefined ? meetingTeamId : teamId;

  // For Annual meeting with showAllIssuesTab, default to 'all'; for Weekly, default to 'short_term'
  const [selectedIssueType, setSelectedIssueType] = useState<'short_term' | 'long_term' | 'all'>(
    showAllIssuesTab ? 'all' : 'short_term'
  );
  const [showVotingSettings, setShowVotingSettings] = useState(false);

  const { currentRole, triggerAutoCreateIssues } = useNewMeetingTimer();

  // Trigger auto-create issues when this section mounts (scriber only)
  // Context-level tracking in NewMeetingTimerContext prevents duplicate triggers per meeting
  useEffect(() => {
    if (currentRole === 'scriber' && effectiveTeamId) {
      triggerAutoCreateIssues(effectiveTeamId);
    }
  }, [currentRole, effectiveTeamId, triggerAutoCreateIssues]);

  // Map 'all' to undefined for the shared component (show all types)
  const issueTypeForShared = selectedIssueType === 'all' ? undefined : selectedIssueType;

  return (
    <div className="h-full flex flex-col space-y-3">
      <div className="flex-1 overflow-hidden">
        <SharedIssuesSection
          meetingId={meetingId}
          teamId={effectiveTeamId || ''}
          issueType={issueTypeForShared}
          showTeamSelector={false}
          isMeetingContext={true}
          onCreateTaskFromIssue={onCreateTaskFromIssue}
          onIssueSolved={onIssueSolved}
          liveSectionDuration={liveSectionDuration}
          onUpdateIssueReady={onUpdateIssueReady}
          selectedIssueType={selectedIssueType}
          onIssueTypeChange={setSelectedIssueType}
          showAllIssueTypeOption={showAllIssuesTab}
          onTaskCreated={onTaskCreated}
          onRegisterTaskCallback={onRegisterTaskCallback}
          onIssueCreated={onIssueCreated}
          onAddIssueToLocalStateReady={onAddIssueToLocalStateReady}
          onIssueStatusChanged={onIssueStatusChanged}
          onUpdateIssueLocalStateReady={onUpdateIssueLocalStateReady}
          onIssueArchivedChanged={onIssueArchivedChanged}
          onUpdateIssueArchiveLocalStateReady={onUpdateIssueArchiveLocalStateReady}
          renderAfterStats={renderAfterStats}
          renderExpandedContent={renderExpandedContent}
        />
      </div>

      <VotingSettingsModal open={showVotingSettings} onOpenChange={setShowVotingSettings} />
    </div>
  );
};
