
import React, { useState, useEffect, useRef } from 'react';
import { BaseModal } from './BaseModal';
import { TaskModalContent } from './task/TaskModalContent';
import { useUserTeams } from '@/hooks/useUserTeams';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { logger } from '@/utils/logger';

interface EnhancedAddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }, dueDate?: string, assignedTo?: string[], status?: 'todo' | 'in-progress' | 'done', sourceIssueId?: string, splitPerMember?: boolean) => Promise<void>;
  defaultTeamId?: string;
  prefilledData?: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
    isResolved?: boolean;
  };
}

export const EnhancedAddTaskModal: React.FC<EnhancedAddTaskModalProps> = ({
  open,
  onOpenChange,
  onAddTask,
  defaultTeamId,
  prefilledData,
}) => {
  const { teams } = useUserTeams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(getDefaultDueDate()); // Always start with 7-day default
  const [teamSelection, setTeamSelection] = useState<{ type: 'personal' | 'team'; teamId?: string }>({
    type: defaultTeamId ? 'team' : 'personal',
    teamId: defaultTeamId
  });
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [splitPerMember, setSplitPerMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  
  // Use a ref to track if we've already set the prefilled data to prevent overriding user edits
  const hasSetPrefilledData = useRef(false);

  // Handle prefilled data from resolved issues - only set once when modal opens
  useEffect(() => {
    if (prefilledData && open && !hasSetPrefilledData.current) {
      logger.log('🔧 EnhancedAddTaskModal: Setting prefilled data:', prefilledData);
      setTitle(prefilledData.title);
      setDescription(prefilledData.description);
      
      // Keep the 7-day default due date (already set in state initialization)
      // No need to override it here since getDefaultDueDate() already provides this
      
      // Default to team task if we have a team context
      if (defaultTeamId) {
        setTeamSelection({ type: 'team', teamId: defaultTeamId });
      }

      // Set the issue owner as the default assignee
      if (prefilledData.ownerId) {
        setAssignedTo([prefilledData.ownerId]);
      }
      
      hasSetPrefilledData.current = true;
    }
  }, [prefilledData, open, defaultTeamId]);

  // Reset the flag when modal closes
  useEffect(() => {
    if (!open) {
      hasSetPrefilledData.current = false;
    }
  }, [open]);

  const handleTeamSelectionChange = (value: string) => {
    if (value === 'personal') {
      setTeamSelection({ type: 'personal' });
      setAssignedTo([]);
    } else {
      setTeamSelection({ type: 'team', teamId: value });
      setAssignedTo([]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setAttemptedSubmit(true);
      return;
    }
    
    setLoading(true);
    try {
      logger.log('🔧 EnhancedAddTaskModal: Submitting task:', {
        title: title.trim(),
        description: description.trim(),
        teamSelection,
        dueDate,
        assignedTo
      });
      
      await onAddTask(
        title.trim(),
        description.trim(),
        teamSelection,
        dueDate || undefined,
        // Fix: Pass assignedTo array as-is since the handler will convert to single UUID
        assignedTo.length > 0 ? assignedTo : undefined,
        'todo', // Always create with 'todo' status
        prefilledData?.sourceIssueId, // Pass source issue ID for auto-solving
        splitPerMember, // Whether to create individual tasks per member
      );
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate(getDefaultDueDate()); // Reset to 7-day default
      setTeamSelection({ type: 'personal' });
      setAssignedTo([]);
      setSplitPerMember(false);
      setAttemptedSubmit(false);
      hasSetPrefilledData.current = false;
      onOpenChange(false);
    } catch (error) {
      logger.error('❌ EnhancedAddTaskModal: Error adding task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setDueDate(getDefaultDueDate()); // Reset to 7-day default
    setTeamSelection({ type: 'personal' });
    setAssignedTo([]);
    setSplitPerMember(false);
    setAttemptedSubmit(false);
    hasSetPrefilledData.current = false;
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Task"
      description="Create a new personal or team task"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Add Task"
      submitDisabled={!title.trim() || loading}
      loading={loading}
      size="xl"
      mobileKeyboardAware
    >
      <TaskModalContent
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        dueDate={dueDate}
        setDueDate={setDueDate}
        teamSelection={teamSelection}
        onTeamSelectionChange={handleTeamSelectionChange}
        teams={teams}
        assignedTo={assignedTo}
        setAssignedTo={setAssignedTo}
        splitPerMember={splitPerMember}
        setSplitPerMember={setSplitPerMember}
        prefilledData={prefilledData}
        showTitleError={attemptedSubmit && !title.trim()}
      />
    </BaseModal>
  );
};
