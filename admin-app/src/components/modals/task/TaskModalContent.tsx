
import React from 'react';
import { LeftColumnFields } from './LeftColumnFields';
import { RightColumnFields } from './RightColumnFields';
import { SimpleTeamMemberSelector } from './SimpleTeamMemberSelector';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { logger } from '@/utils/logger';

interface TaskModalContentProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  dueDate: string;
  setDueDate: (date: string) => void;
  teamSelection: { type: 'personal' | 'team'; teamId?: string };
  onTeamSelectionChange: (value: string) => void;
  teams: Array<{ id: string; name: string }>;
  assignedTo: string[];
  setAssignedTo: (userIds: string[]) => void;
  splitPerMember?: boolean;
  setSplitPerMember?: (value: boolean) => void;
  prefilledData?: {
    title: string;
    description: string;
    sourceIssueId?: string;
  };
  showTitleError?: boolean;
  onInputFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const TaskModalContent: React.FC<TaskModalContentProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  dueDate,
  setDueDate,
  teamSelection,
  onTeamSelectionChange,
  teams,
  assignedTo,
  setAssignedTo,
  splitPerMember = false,
  setSplitPerMember,
  prefilledData,
  showTitleError = false,
  onInputFocus,
}) => {
  logger.log('🔍 TaskModalContent: Render with teamSelection:', teamSelection);

  // Validate props to prevent crashes
  const safeTeamSelection = teamSelection || { type: 'personal' };
  const safeTeams = teams || [];
  const safeAssignedTo = assignedTo || [];

  return (
    <div className="space-y-6 p-1">
      {/* Two-column grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-1">
        {/* Left Column - Content Fields */}
        <div>
          <ErrorBoundary
            fallback={
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Unable to load task form fields. Please try again.
                </p>
              </div>
            }
            onError={(error) => {
              logger.error('LeftColumnFields error:', error);
            }}
          >
            <LeftColumnFields
              title={title || ''}
              setTitle={setTitle}
              description={description || ''}
              setDescription={setDescription}
              showTitleError={showTitleError}
              onInputFocus={onInputFocus}
            />
          </ErrorBoundary>
        </div>

        {/* Right Column - Metadata Fields */}
        <div className="space-y-4">
          <ErrorBoundary
            fallback={
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Unable to load task metadata fields. Please try again.
                </p>
              </div>
            }
            onError={(error) => {
              logger.error('RightColumnFields error:', error);
            }}
          >
            <RightColumnFields
              dueDate={dueDate || ''}
              setDueDate={setDueDate}
              teamSelection={safeTeamSelection}
              onTeamSelectionChange={onTeamSelectionChange}
              teams={safeTeams}
            />
          </ErrorBoundary>

          {/* Team Member Selector - Only show for team tasks */}
          {safeTeamSelection.type === 'team' && safeTeamSelection.teamId && (
            <ErrorBoundary
              fallback={
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Unable to load team member selector. Please try again.
                  </p>
                </div>
              }
              onError={(error) => {
                logger.error('SimpleTeamMemberSelector error:', error);
              }}
            >
              <SimpleTeamMemberSelector
                teamId={safeTeamSelection.teamId}
                assignedTo={safeAssignedTo}
                setAssignedTo={setAssignedTo}
              />
              {/* Show split toggle when multiple members are selected */}
              {safeAssignedTo.length > 1 && setSplitPerMember && (
                <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={splitPerMember}
                    onChange={(e) => setSplitPerMember(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    Create individual task for each member
                  </span>
                </label>
              )}
            </ErrorBoundary>
          )}
        </div>
      </div>

      {/* Full-width prefilled data note — only show when the source issue is resolved */}
      {prefilledData?.isResolved && (
        <div className="text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg">
          <strong>Note:</strong> This task is being created from a resolved issue.
          It will appear in your task list after creation.
        </div>
      )}
    </div>
  );
};
