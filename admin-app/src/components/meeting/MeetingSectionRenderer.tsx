
import React, { memo } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';
import { Pause } from 'lucide-react';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { GoodNewsSection } from './GoodNewsSection';
import { TeamTasksStandupSection } from './TeamTasksStandupSection';
import { HeadlinesSection } from './HeadlinesSection';
import { IssuesSection } from './IssuesSection';
import { WrapUpSection } from './WrapUpSection';
import { QuickUpdateSection } from './QuickUpdateSection';
import { TeamUpdatesSection } from './TeamUpdatesSection';

import { QuarterlyCheckInSection } from './quarterly/QuarterlyCheckInSection';
import { QuarterlyReviewSection } from './quarterly/QuarterlyReviewSection';
import { QuarterlyVisionSection } from './quarterly/QuarterlyVisionSection';
import { FullMeetingMetrics } from './FullMeetingMetrics';
import { TeamGoalReviewSection } from './TeamGoalReviewSection';
import { AgendaItem } from '@/types/meeting';
import { UnifiedTeamTask } from '@/types/tasks';

// Quarterly embedders
import QuarterlyStrategySection from './quarterly/QuarterlyStrategySection';
import QuarterlyToolsSection from './quarterly/QuarterlyToolsSection';
import QuarterlyIssuesSection from './quarterly/QuarterlyIssuesSection';
import QuarterlyReviewPriorQuarterSection from './quarterly/QuarterlyReviewPriorQuarterSection';
import QuarterlyGoalsSection from './quarterly/QuarterlyGoalsSection';

// Annual sections
import { AnnualOpeningSection } from './annual/AnnualOpeningSection';
import { AnnualReviewPriorYearSection } from './annual/AnnualReviewPriorYearSection';
import { TeamBuildingSection } from './annual/TeamBuildingSection';
import { CompanyAssessmentSection } from './annual/CompanyAssessmentSection';
import { StrategicAnalysisSection } from './annual/StrategicAnalysisSection';
import { AnnualVisionReviewSection } from './annual/AnnualVisionReviewSection';
import { AnnualThreeYearGoalsSection } from './annual/AnnualThreeYearGoalsSection';
import { Day2OpeningSection } from './annual/Day2OpeningSection';
import { AnnualReviewIssuesSection } from './annual/AnnualReviewIssuesSection';
import { AnnualPlanSection } from './annual/AnnualPlanSection';
import { Annual90DayPrioritiesSection } from './annual/Annual90DayPrioritiesSection';
import { AnnualProblemSolvingSection } from './annual/AnnualProblemSolvingSection';

interface MeetingSectionRendererProps {
  currentSection: number;
  agendaItems: AgendaItem[];
  teamId: string;
  activeMeetingId: string | null;
  meetingTeamId?: string | null; // The actual team_id from the meeting object
  onCreateTaskFromIssue?: (issueData: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
  }) => void;
  onIssueSolved?: (issueTitle?: string, issueDescription?: string, issueId?: string, ownerId?: string) => void;
  meetingType?: string;
  tasks?: UnifiedTeamTask[];
  tasksLoading?: boolean;
  onTaskUpdate?: (taskId: string, updates: Partial<UnifiedTeamTask>) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskCreate?: (taskData: Partial<UnifiedTeamTask>) => Promise<any>;
  onCreateIssue?: (title: string, description: string, ownerId?: string, taskId?: string) => void;
  creatingIssueForTasks?: Set<string>; // NEW: Track tasks with issue creation in progress
  liveSectionDuration?: number;
  onUpdateIssueReady?: (updateIssue: (issueId: string, updates: any) => Promise<void>) => void;
  // New props for optimistic task creation updates
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
}

const MeetingSectionRenderer: React.FC<MeetingSectionRendererProps> = memo(({
  currentSection,
  agendaItems,
  teamId,
  activeMeetingId,
  onCreateTaskFromIssue,
  onIssueSolved,
  meetingType = 'weekly',
  tasks = [],
  tasksLoading = false,
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
  onCreateIssue,
  creatingIssueForTasks = new Set<string>(),
  liveSectionDuration = 0,
  onUpdateIssueReady,
  meetingTeamId,
  onTaskCreated,
  onRegisterTaskCallback,
  onIssueCreated,
  onAddIssueToLocalStateReady,
  onIssueStatusChanged,
  onUpdateIssueLocalStateReady,
  onIssueArchivedChanged,
  onUpdateIssueArchiveLocalStateReady
}) => {
  const navigate = useNavigate();
  const { timerState } = useNewMeetingTimer();
  
  // Handle virtual pause section (-1)
  if (currentSection === -1) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
            <Pause className="w-8 h-8 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground mb-2">Meeting Paused</h3>
            <p className="text-muted-foreground">
              The meeting is currently paused. Click the Resume button to continue with the current section.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  const currentAgendaItem = agendaItems[currentSection];

  if (!currentAgendaItem) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Meeting section not found</p>
        <p className="text-sm text-muted-foreground">Section: {currentSection}, Total: {agendaItems.length}</p>
      </div>
    );
  }

  const renderSection = () => {
    // Use type field for reliable matching, fallback to normalized title
    const sectionType = currentAgendaItem.type || currentAgendaItem.title.toLowerCase().replace(/\s+/g, '_');

    // Unified section rendering based on type
    switch (sectionType) {
      // Quarterly sections
      case 'check_in':
        return <QuarterlyCheckInSection teamId={teamId} />;
      
      case 'review_prior_quarter':
        return (
          <QuarterlyReviewPriorQuarterSection 
            teamId={teamId}
          />
        );
      
      case 'review_strategy':
      case 'review_strategy/execution':
        return <QuarterlyStrategySection />;
      
      case 'tools_review':
        return <QuarterlyToolsSection teamId={teamId} />;
      
      case 'quarterly_goals':
        return <QuarterlyGoalsSection />;

      // Annual sections - Day 1
      case 'annual_opening':
        return <AnnualOpeningSection teamId={teamId} />;
      
      case 'annual_review_prior_year':
        return <AnnualReviewPriorYearSection teamId={teamId} />;
      
      case 'annual_team_building':
        return <TeamBuildingSection teamId={teamId} />;
      
      case 'annual_company_assessment':
        return <CompanyAssessmentSection teamId={teamId} meetingStateId={activeMeetingId || undefined} />;
      
      case 'annual_strategic_analysis':
        return <StrategicAnalysisSection teamId={teamId} />;
      
      case 'annual_vision_review':
        return <AnnualVisionReviewSection teamId={teamId} />;
      
      case 'annual_three_year_goals':
        return <AnnualThreeYearGoalsSection teamId={teamId} />;

      // Annual sections - Day 2
      case 'annual_day2_opening':
        return <Day2OpeningSection teamId={teamId} />;
      
      case 'annual_review_issues':
        return <AnnualReviewIssuesSection teamId={teamId} />;
      
      case 'annual_plan':
        return <AnnualPlanSection teamId={teamId} />;
      
      case 'annual_90_day_priorities':
        return <Annual90DayPrioritiesSection teamId={teamId} />;
      
      case 'annual_problem_solving':
        return <AnnualProblemSolvingSection 
          teamId={teamId} 
          meetingId={activeMeetingId || ''} 
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
        />;

      // Weekly sections
      case 'good_news':
      case 'good news':
        return <GoodNewsSection teamId={teamId} />;
      
      case 'metrics':
        return <FullMeetingMetrics teamId={teamId} meetingTeamId={meetingTeamId} />;

      case 'goals':
        return (
          <TeamGoalReviewSection 
            meetingId={activeMeetingId || ''} 
            teamId={teamId}
            meetingType={meetingType}
          />
        );
      
      case 'headlines':
        return <HeadlinesSection teamId={teamId} meetingTeamId={meetingTeamId} />;
      
      case 'tasks':
      case 'next_steps':
        return (
          <TeamTasksStandupSection 
            meetingId={activeMeetingId || ''} 
            teamId={teamId}
            sectionType={sectionType}
            tasks={tasks}
            loading={tasksLoading}
            onTaskUpdate={onTaskUpdate}
            onTaskDelete={onTaskDelete}
            onTaskCreate={onTaskCreate}
            onCreateIssue={onCreateIssue}
            creatingIssueForTasks={creatingIssueForTasks}
          />
        );
      
      case 'issues':
        // Conditionally render quarterly or weekly issues section
        if (meetingType === 'quarterly') {
          return (
            <QuarterlyIssuesSection 
              meetingId={activeMeetingId || ''}
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
            />
          );
        }
        return (
          <IssuesSection 
            meetingId={activeMeetingId || ''}
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
            onIssueArchivedChanged={onIssueArchivedChanged}
            onUpdateIssueArchiveLocalStateReady={onUpdateIssueArchiveLocalStateReady}
          />
        );
      
      case 'wrap_up':
      case 'wrap up':
        return <WrapUpSection teamId={teamId} meetingType={meetingType} />;
      
      case 'team_updates':
      case 'team updates':
        return <TeamUpdatesSection meetingId={activeMeetingId || ''} teamId={teamId} />;
      
      case 'custom_section':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {currentAgendaItem.title}
              </h2>
              {currentAgendaItem.customDescription && (
                <div 
                  className="text-muted-foreground max-w-2xl mx-auto custom-section-description"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentAgendaItem.customDescription) }}
                />
              )}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {currentAgendaItem.title}
            </h2>
            <p className="text-muted-foreground">This section is not yet implemented.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 h-full p-6 overflow-y-auto">
      {renderSection()}
    </div>
  );
});

MeetingSectionRenderer.displayName = 'MeetingSectionRenderer';

export { MeetingSectionRenderer };
export default MeetingSectionRenderer;
