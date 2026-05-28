
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { IssuesSection } from '@/components/meeting/IssuesSection';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AnnualProblemSolvingSectionProps {
  teamId: string;
  meetingId: string;
  meetingTeamId?: string | null;
  onCreateTaskFromIssue?: (issueData: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
    dueDate?: string;
    assignedTo?: string[];
  }) => void;
  onIssueSolved?: (issueTitle?: string, issueDescription?: string, issueId?: string, ownerId?: string, issueTeamId?: string) => void;
  liveSectionDuration?: number;
  onUpdateIssueReady?: (updateIssue: (issueId: string, updates: any) => Promise<void>) => void;
  // Broadcast props (same as weekly meeting)
  onTaskCreated?: () => void;
  onRegisterTaskCallback?: (callback: () => void) => void;
  onIssueCreated?: (issue: any) => void;
  onAddIssueToLocalStateReady?: (addFn: (issue: any) => void) => void;
  onIssueStatusChanged?: (issueId: string, status: string) => void;
  onUpdateIssueLocalStateReady?: (updateFn: (issueId: string, status: string) => void) => void;
}

export const AnnualProblemSolvingSection: React.FC<AnnualProblemSolvingSectionProps> = ({
  teamId,
  meetingId,
  meetingTeamId,
  onCreateTaskFromIssue,
  onIssueSolved,
  liveSectionDuration,
  onUpdateIssueReady,
  onTaskCreated,
  onRegisterTaskCallback,
  onIssueCreated,
  onAddIssueToLocalStateReady,
  onIssueStatusChanged,
  onUpdateIssueLocalStateReady,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  // Problem Solving Process - just the trigger icon (content renders in full width below)
  const problemSolvingTrigger = (
    <Collapsible open={showGuide} onOpenChange={setShowGuide}>
      <CollapsibleTrigger asChild>
        <button className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground" title="Problem Solving Process">
          {showGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </CollapsibleTrigger>
    </Collapsible>
  );

  // The expanded content (3 blocks) - rendered separately in full width
  const problemSolvingContent = showGuide ? (
    <Card className="border-primary/50">
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-primary/5 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">1</span>
              <span className="font-medium text-sm">Clarify</span>
            </div>
            <p className="text-xs text-muted-foreground">Find the root cause, not just symptoms.</p>
          </div>
          <div className="p-3 bg-secondary/50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 text-white text-xs font-bold">2</span>
              <span className="font-medium text-sm">Debate</span>
            </div>
            <p className="text-xs text-muted-foreground">Explore solutions openly without judgment.</p>
          </div>
          <div className="p-3 bg-success/5 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold">3</span>
              <span className="font-medium text-sm">Resolve</span>
            </div>
            <p className="text-xs text-muted-foreground">Decide and assign tasks with deadlines.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ) : null;

  return (
    <div className="h-full flex flex-col">
      <IssuesSection
        meetingId={meetingId}
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
        renderAfterStats={problemSolvingTrigger}
        renderExpandedContent={problemSolvingContent}
      />
    </div>
  );
};

export default AnnualProblemSolvingSection;
