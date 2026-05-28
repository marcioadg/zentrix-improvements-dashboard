import React from 'react';
import { 
  BarChart3, 
  Users, 
  Target, 
  Calendar, 
  CheckSquare,
  TrendingUp,
  FileText,
  Inbox
} from 'lucide-react';
import { EmptyState } from './empty-state';

interface SpecializedEmptyStateProps {
  onAction?: () => void;
  actionLabel?: string;
}

export const NoDataEmptyState: React.FC<SpecializedEmptyStateProps> = ({ onAction, actionLabel }) => (
  <EmptyState
    icon={BarChart3}
    title="No Data Yet"
    description="There's no data to display yet. Start tracking metrics to see insights and analytics here."
    action={onAction ? {
      label: actionLabel || 'Add Data',
      onClick: onAction,
      variant: 'default'
    } : undefined}
  />
);

export const NoTeamsEmptyState: React.FC<SpecializedEmptyStateProps> = ({ onAction, actionLabel }) => (
  <EmptyState
    icon={Users}
    title="No Teams Yet"
    description="You're not currently assigned to any teams. Contact your company admin to be added to a team."
    action={onAction ? {
      label: actionLabel || 'Contact Admin',
      onClick: onAction,
      variant: 'outline'
    } : undefined}
  />
);

export const NoMetricsEmptyState: React.FC<SpecializedEmptyStateProps> = ({ onAction, actionLabel }) => (
  <EmptyState
    icon={TrendingUp}
    title="No Metrics Yet"
    description="Start tracking your team's performance by adding your first metric above. Metrics help you measure progress and stay aligned with goals."
    action={onAction ? {
      label: actionLabel || 'Add Metric',
      onClick: onAction,
      variant: 'default'
    } : undefined}
  />
);

export const NoGoalsEmptyState: React.FC<SpecializedEmptyStateProps> = ({ onAction, actionLabel }) => (
  <EmptyState
    icon={Target}
    title="No Goals Yet"
    description="Define your team's objectives and key results to drive focus and alignment. Set your first goal to get started."
    action={onAction ? {
      label: actionLabel || 'Create Goal',
      onClick: onAction,
      variant: 'default'
    } : undefined}
  />
);

export const NoMeetingsEmptyState: React.FC<SpecializedEmptyStateProps> = ({ onAction, actionLabel }) => (
  <EmptyState
    icon={Calendar}
    title="No Meetings Yet"
    description="Keep your team aligned with regular check-ins. Schedule your first meeting to start tracking progress and solving issues together."
    action={onAction ? {
      label: actionLabel || 'Schedule Meeting',
      onClick: onAction,
      variant: 'default'
    } : undefined}
  />
);

export const NoTasksEmptyState: React.FC<SpecializedEmptyStateProps> = ({ onAction, actionLabel }) => (
  <EmptyState
    icon={CheckSquare}
    title="No Tasks Yet"
    description="Break down your goals into actionable tasks. Add your first task to start making progress on your objectives."
    action={onAction ? {
      label: actionLabel || 'Add Task',
      onClick: onAction,
      variant: 'default'
    } : undefined}
  />
);

export const NoResultsEmptyState: React.FC<{ searchQuery?: string }> = ({ searchQuery }) => (
  <EmptyState
    icon={Inbox}
    title="No Results Found"
    description={searchQuery 
      ? `We couldn't find anything matching "${searchQuery}". Try adjusting your search terms or filters.`
      : "No results match your current filters. Try adjusting your search criteria."
    }
  />
);

export const NoDocumentsEmptyState: React.FC<SpecializedEmptyStateProps> = ({ onAction, actionLabel }) => (
  <EmptyState
    icon={FileText}
    title="No Documents Yet"
    description="Store and organize important files, playbooks, and resources. Upload your first document to get started."
    action={onAction ? {
      label: actionLabel || 'Upload Document',
      onClick: onAction,
      variant: 'default'
    } : undefined}
  />
);
