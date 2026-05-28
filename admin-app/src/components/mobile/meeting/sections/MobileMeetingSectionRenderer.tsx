/**
 * MobileMeetingSectionRenderer — mobile-only section switch for /m/meeting.
 *
 * Renders the v2 mobile mirror for each section we've ported. For any section
 * not yet mirrored, it transitionally delegates to the desktop
 * MeetingSectionRenderer (read-only — never modified), so the meeting stays
 * fully functional throughout the migration. As each mobile section lands it
 * stops delegating; the end state imports no desktop section UI.
 *
 * Section-type detection mirrors the desktop renderer exactly (type field,
 * falling back to a normalised title) so behaviour matches one-to-one.
 */
import React from 'react';
import { MeetingSectionRenderer } from '@/components/meeting/MeetingSectionRenderer';
import { AgendaItem } from '@/types/meeting';
import { UnifiedTeamTask } from '@/types/tasks';
import { MobileGoodNewsSection } from './MobileGoodNewsSection';
import { MobileHeadlinesSection } from './MobileHeadlinesSection';
import { MobileTasksSection } from './MobileTasksSection';
import { MobileCustomSection } from './MobileCustomSection';
import { MobileRocksSection } from './MobileRocksSection';
import { MobileScorecardSection } from './MobileScorecardSection';
import { MobileIssuesSection } from './MobileIssuesSection';
import { MobileCheckInSection } from './MobileCheckInSection';
import { MobileWrapUpSection } from './MobileWrapUpSection';
import { MobileReviewPriorQuarterSection } from './MobileReviewPriorQuarterSection';
import { MobileStrategySection } from './MobileStrategySection';
import { MobileToolsSection } from './MobileToolsSection';
import { MobileTeamUpdatesSection } from './MobileTeamUpdatesSection';

interface MobileMeetingSectionRendererProps {
  currentSection: number;
  agendaItems: AgendaItem[];
  teamId: string;
  activeMeetingId: string | null;
  meetingTeamId?: string | null;
  meetingType?: string;
  tasks?: UnifiedTeamTask[];
  tasksLoading?: boolean;
  onTaskUpdate?: (taskId: string, updates: Partial<UnifiedTeamTask>) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskCreate?: (taskData: Partial<UnifiedTeamTask>) => Promise<unknown>;
  liveSectionDuration?: number;
  onCreateTaskFromIssue?: (data: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
  }) => void;
}

export const MobileMeetingSectionRenderer: React.FC<MobileMeetingSectionRendererProps> = (props) => {
  const {
    currentSection,
    agendaItems,
    teamId,
    meetingTeamId,
    meetingType,
    tasks = [],
    tasksLoading,
    onTaskUpdate,
    onCreateTaskFromIssue,
  } = props;

  const currentAgendaItem = agendaItems[currentSection];
  const sectionType =
    currentAgendaItem?.type ||
    currentAgendaItem?.title?.toLowerCase().replace(/\s+/g, '_') ||
    '';

  const plannedMinutes = currentAgendaItem?.duration;
  const eyebrow =
    typeof plannedMinutes === 'number' ? `NOW · ${plannedMinutes} MIN` : 'NOW';

  switch (sectionType) {
    case 'good_news':
    case 'good news':
      return <MobileGoodNewsSection eyebrow={eyebrow} />;

    case 'metrics':
      return <MobileScorecardSection teamId={teamId} eyebrow={eyebrow} />;

    case 'goals':
    case 'quarterly_goals':
      return <MobileRocksSection teamId={teamId} eyebrow={eyebrow} />;

    case 'check_in':
      return <MobileCheckInSection eyebrow={eyebrow} />;

    case 'review_prior_quarter':
      return <MobileReviewPriorQuarterSection teamId={teamId} eyebrow={eyebrow} />;

    case 'review_strategy':
    case 'review_strategy/execution':
      return <MobileStrategySection eyebrow={eyebrow} />;

    case 'tools_review':
      return <MobileToolsSection eyebrow={eyebrow} />;

    case 'team_updates':
    case 'team updates':
      return <MobileTeamUpdatesSection eyebrow={eyebrow} />;

    case 'wrap_up':
    case 'wrap up':
      return <MobileWrapUpSection teamId={teamId} meetingType={meetingType} eyebrow={eyebrow} />;

    case 'headlines':
      return (
        <MobileHeadlinesSection teamId={teamId} meetingTeamId={meetingTeamId} eyebrow={eyebrow} />
      );

    case 'tasks':
    case 'next_steps':
      return (
        <MobileTasksSection
          teamId={teamId}
          tasks={tasks}
          loading={tasksLoading}
          sectionType={sectionType}
          eyebrow={eyebrow}
          onTaskUpdate={onTaskUpdate}
        />
      );

    case 'issues':
      return (
        <MobileIssuesSection
          teamId={teamId}
          meetingTeamId={meetingTeamId}
          eyebrow={eyebrow}
          onCreateTaskFromIssue={onCreateTaskFromIssue}
        />
      );

    case 'custom_section':
      return (
        <MobileCustomSection
          title={currentAgendaItem?.title ?? 'Custom Section'}
          description={currentAgendaItem?.customDescription}
          eyebrow={eyebrow}
        />
      );

    // Not yet mirrored → delegate to the (unmodified) desktop renderer.
    default:
      return <MeetingSectionRenderer {...props} />;
  }
};

export default MobileMeetingSectionRenderer;
