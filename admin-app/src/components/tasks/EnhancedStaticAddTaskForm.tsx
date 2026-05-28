
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Plus, Calendar, Loader2 } from 'lucide-react';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { logger } from '@/utils/logger';

interface EnhancedStaticAddTaskFormProps {
  onAddTask: (
    title: string, 
    description?: string, 
    dueDate?: string,
    taskType?: 'personal' | 'team',
    teamId?: string,
    teamName?: string,
    assignedTo?: string,
    assignedToName?: string
  ) => Promise<void>;
  loading?: boolean;
  currentUserId?: string;
  defaultOwnerId?: string; // For meeting-created tasks from issues
  prefilledData?: {
    title?: string;
    description?: string;
    ownerId?: string;
  };
}

export const EnhancedStaticAddTaskForm: React.FC<EnhancedStaticAddTaskFormProps> = ({ 
  onAddTask, 
  loading = false,
  currentUserId,
  defaultOwnerId,
  prefilledData
}) => {
  const [title, setTitle] = useState(prefilledData?.title || '');
  const [description, setDescription] = useState(prefilledData?.description || '');
  const [dueDate, setDueDate] = useState(getDefaultDueDate()); // Always default to 7 days
  const [showDetails, setShowDetails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;
    
    setIsCreating(true);
    try {
      // Priority: prefilledData.ownerId (from issue) > defaultOwnerId > currentUserId
      const assignedTo = prefilledData?.ownerId || defaultOwnerId || currentUserId;
      
      await onAddTask(
        title.trim(), 
        description.trim(), 
        dueDate,
        'personal',
        undefined, // teamId
        undefined, // teamName
        assignedTo, // Use calculated owner
        undefined // assignedToName
      );
      
      // Reset form with new defaults
      setTitle('');
      setDescription('');
      setDueDate(getDefaultDueDate()); // Reset to new 7-day default
      setShowDetails(false);
    } catch (error) {
      logger.error('Error adding task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const isFormDisabled = loading || isCreating;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1"
          disabled={isFormDisabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          disabled={isFormDisabled}
        >
          <Calendar className="h-4 w-4" />
        </Button>
        <Button 
          type="submit" 
          disabled={!title.trim() || isFormDisabled}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
              Adding...
            </>
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {showDetails && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this task..."
              rows={2}
              disabled={isFormDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <DatePicker
              date={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
              onSelect={(d) => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
              placeholder="Pick a due date"
            />
          </div>
        </div>
      )}
    </form>
  );
};
