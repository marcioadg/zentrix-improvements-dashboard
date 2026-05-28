import React from "react";
import { IssuesSection } from "@/components/meeting/IssuesSection";

interface QuarterlyIssuesSectionProps {
  meetingId?: string;
  teamId: string;
  meetingTeamId?: string | null;
  onCreateTaskFromIssue?: (issueData: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
  }) => void;
  onIssueSolved?: (issueTitle?: string, issueDescription?: string, issueId?: string, ownerId?: string) => void;
  liveSectionDuration?: number;
  onUpdateIssueReady?: (updateIssue: (issueId: string, updates: any) => Promise<void>) => void;
  onTaskCreated?: () => void;
  onRegisterTaskCallback?: (callback: () => void) => void;
  onIssueCreated?: (issue: any) => void;
  onAddIssueToLocalStateReady?: (addFn: (issue: any) => void) => void;
  onIssueStatusChanged?: (issueId: string, status: string) => void;
  onUpdateIssueLocalStateReady?: (updateFn: (issueId: string, status: string) => void) => void;
}

export const QuarterlyIssuesSection: React.FC<QuarterlyIssuesSectionProps> = ({
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
  onUpdateIssueLocalStateReady
}) => {
  return (
    <div className="h-full flex flex-col py-4">
      <IssuesSection
        meetingId={meetingId || ''}
        teamId={teamId}
        meetingTeamId={meetingTeamId}
        onCreateTaskFromIssue={onCreateTaskFromIssue}
        onIssueSolved={onIssueSolved}
        liveSectionDuration={liveSectionDuration}
        onUpdateIssueReady={onUpdateIssueReady}
        onTaskCreated={onTaskCreated}
        onRegisterTaskCallback={onRegisterTaskCallback}
        onIssueCreated={onIssueCreated}
        onAddIssueToLocalStateReady={onAddIssueToLocalStateReady}
        onIssueStatusChanged={onIssueStatusChanged}
        onUpdateIssueLocalStateReady={onUpdateIssueLocalStateReady}
        showAllIssuesTab={true}
      />
    </div>
  );
};

export default QuarterlyIssuesSection;
