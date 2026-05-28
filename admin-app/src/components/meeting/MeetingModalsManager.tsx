import React from 'react';
import { EnhancedAddTaskModal } from '@/components/modals/EnhancedAddTaskModal';
import { AddGoalModal } from '@/components/modals/AddGoalModal';
import { AddMetricModal } from '@/components/modals/AddMetricModal';
import { AddHeadlineModal } from '@/components/modals/AddHeadlineModal';
import { AddIssueModal } from '@/components/modals/AddIssueModal';

interface MeetingModalsManagerProps {
  teamId: string;
  currentMeetingId?: string;
  showTaskModal: boolean;
  setShowTaskModal: (show: boolean) => void;
  showGoalModal: boolean;
  setShowGoalModal: (show: boolean) => void;
  showMetricModal: boolean;
  setShowMetricModal: (show: boolean) => void;
  showHeadlineModal: boolean;
  setShowHeadlineModal: (show: boolean) => void;
  showIssueModal: boolean;
  setShowIssueModal: (show: boolean) => void;
  onAddTask: (task: {
    title: string;
    description: string;
    due_date: string;
    assigned_to: string | string[];
    sourceIssueId?: string;
  }) => Promise<void>;
  onAddGoal: (goalData: {
    title: string;
    description: string;
    target_date: string;
    owner_id: string;
  }) => Promise<void>;
  onAddMetric: (metricData: {
    metric_name: string;
    unit: string;
    target_value: number;
    target_logic?: string;
    owner_id: string;
    team_id?: string;
  }) => Promise<void>;
  onAddHeadline: (title: string, content: string, teamId?: string, meetingId?: string, ownerId?: string, targetMeetingType?: 'weekly' | 'quarterly') => Promise<void>;
  onAddIssue: (issueData: {
    title: string;
    description?: string;
    issueType: 'short_term' | 'long_term';
    teamId: string;
    ownerId?: string;
  }) => Promise<boolean>;
  prefilledTaskData?: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
  };
  forceUpcomingHeadline?: boolean; // Force headline to "Upcoming Meeting" context
}

export const MeetingModalsManager: React.FC<MeetingModalsManagerProps> = ({
  teamId,
  currentMeetingId,
  showTaskModal,
  setShowTaskModal,
  showGoalModal,
  setShowGoalModal,
  showMetricModal,
  setShowMetricModal,
  showHeadlineModal,
  setShowHeadlineModal,
  showIssueModal,
  setShowIssueModal,
  onAddTask,
  onAddGoal,
  onAddMetric,
  onAddHeadline,
  onAddIssue,
  prefilledTaskData,
  forceUpcomingHeadline = false,
}) => {
  const handleTaskSubmit = async (
    title: string, 
    description: string, 
    teamSelection: { type: 'personal' | 'team'; teamId?: string }, 
    dueDate?: string, 
    assignedTo?: string[],
    status?: 'todo' | 'in-progress' | 'done',
    sourceIssueId?: string
  ) => {
    // Create single task with multiple assignees (array)
    const resolvedDue = dueDate || (() => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();

    const assignees = (assignedTo || []).filter(Boolean);

    await onAddTask({
      title,
      description,
      due_date: resolvedDue,
      assigned_to: assignees,
      sourceIssueId,
    });

    setShowTaskModal(false);
  };

  const handleGoalSubmit = async (goal: {
    title: string;
    description: string;
    target_date: string;
    owner_id: string;
  }) => {
    await onAddGoal(goal);
    setShowGoalModal(false);
  };

  const handleMetricSubmit = async (metric: {
    metric_name: string;
    unit: string;
    target_value: number;
    target_logic?: string;
    owner_id: string;
    team_id?: string;
  }) => {
    await onAddMetric(metric);
    setShowMetricModal(false);
  };

  const handleHeadlineSubmit = async (title: string, content: string, teamId?: string, meetingId?: string, ownerId?: string, targetMeetingType?: 'weekly' | 'quarterly') => {
    await onAddHeadline(title, content, teamId, meetingId, ownerId, targetMeetingType);
    setShowHeadlineModal(false);
  };

  const handleIssueSubmit = async (issueData: {
    title: string;
    description?: string;
    issueType: 'short_term' | 'long_term';
    teamId: string;
    ownerId?: string;
  }) => {
    const success = await onAddIssue(issueData);
    if (success) {
      setShowIssueModal(false);
    }
    return success;
  };

  return (
    <>
      <EnhancedAddTaskModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        onAddTask={handleTaskSubmit}
        defaultTeamId={teamId}
        prefilledData={prefilledTaskData}
      />

      <AddGoalModal
        open={showGoalModal}
        onOpenChange={setShowGoalModal}
        teamId={teamId}
        isTeamGoal={true}
        onSuccess={() => {
          // Goal added successfully
        }}
      />

      <AddMetricModal
        open={showMetricModal}
        onOpenChange={setShowMetricModal}
        onAdd={handleMetricSubmit}
        defaultTeamId={teamId}
      />

      <AddHeadlineModal
        open={showHeadlineModal}
        onOpenChange={setShowHeadlineModal}
        onAdd={handleHeadlineSubmit}
        defaultTeamId={teamId}
        currentMeetingId={currentMeetingId}
        forceUpcoming={forceUpcomingHeadline}
      />

      <AddIssueModal
        open={showIssueModal}
        onOpenChange={setShowIssueModal}
        onAdd={handleIssueSubmit}
        defaultTeamId={teamId}
      />
    </>
  );
};
