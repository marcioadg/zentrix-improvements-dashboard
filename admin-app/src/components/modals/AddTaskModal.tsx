
import React, { useState } from 'react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { logger } from '@/utils/logger';

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (title: string, description: string) => Promise<void>;
  defaultTeamSelection?: 'personal' | 'team';
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  open,
  onOpenChange,
  onAddTask,
  defaultTeamSelection = 'personal',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddTask(title.trim(), description.trim());
      setTitle('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      logger.error('Error adding task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Task"
      description="Create a new task with a title and optional description to help organize your work."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description (optional)"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </Button>
        </div>
      </form>
    </AccessibleDialog>
  );
};
