import React, { useState, useEffect, useRef } from 'react';
import { MobileBaseModal, useMobileModalInputFocus } from './MobileBaseModal';
import { TaskModalContent } from '@/components/modals/task/TaskModalContent';
import { useUserTeams } from '@/hooks/useUserTeams';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { logger } from '@/utils/logger';

interface MobileAddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }, dueDate?: string, assignedTo?: string[], status?: 'todo' | 'in-progress' | 'done', sourceIssueId?: string) => Promise<void>;
  defaultTeamId?: string;
  prefilledData?: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
    isResolved?: boolean;
  };
}

export const MobileAddTaskModal: React.FC<MobileAddTaskModalProps> = ({
  open,
  onOpenChange,
  onAddTask,
  defaultTeamId,
  prefilledData,
}) => {
  const { teams } = useUserTeams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [teamSelection, setTeamSelection] = useState<{ type: 'personal' | 'team'; teamId?: string }>({
    type: defaultTeamId ? 'team' : 'personal',
    teamId: defaultTeamId
  });
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  
  const hasSetPrefilledData = useRef(false);

  // Handle prefilled data from resolved issues
  useEffect(() => {
    if (prefilledData && open && !hasSetPrefilledData.current) {
      setTitle(prefilledData.title);
      setDescription(prefilledData.description);
      
      if (defaultTeamId) {
        setTeamSelection({ type: 'team', teamId: defaultTeamId });
      }

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
      await onAddTask(
        title.trim(),
        description.trim(),
        teamSelection,
        dueDate || undefined,
        assignedTo.length > 0 ? assignedTo : undefined,
        'todo',
        prefilledData?.sourceIssueId
      );
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate(getDefaultDueDate());
      setTeamSelection({ type: 'personal' });
      setAssignedTo([]);
      setAttemptedSubmit(false);
      hasSetPrefilledData.current = false;
      onOpenChange(false);
    } catch (error) {
      logger.error('Error adding task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setDueDate(getDefaultDueDate());
    setTeamSelection({ type: 'personal' });
    setAssignedTo([]);
    setAttemptedSubmit(false);
    hasSetPrefilledData.current = false;
    onOpenChange(false);
  };

  const handleInputFocus = useMobileModalInputFocus();

  return (
    <MobileBaseModal
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
        prefilledData={prefilledData}
        showTitleError={attemptedSubmit && !title.trim()}
        onInputFocus={handleInputFocus}
      />
    </MobileBaseModal>
  );
};
