
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Plus, Calendar } from 'lucide-react';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { logger } from '@/utils/logger';

interface QuickAddTaskProps {
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
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = ({ 
  onAddTask, 
  loading = false,
  currentUserId,
  defaultOwnerId
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(getDefaultDueDate()); // Always default to 7 days
  const [showDetails, setShowDetails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;
    
    setIsCreating(true);
    try {
      // Use defaultOwnerId (from issue owner) or fall back to currentUserId
      const assignedTo = defaultOwnerId || currentUserId;
      
      await onAddTask(
        title.trim(), 
        description.trim(), 
        dueDate,
        'personal', // Default task type
        undefined, // teamId
        undefined, // teamName
        assignedTo, // Use calculated owner
        undefined // assignedToName - will be populated by backend
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isFormDisabled = loading || isCreating;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="What needs to be done? (Press Enter to add)"
          className="flex-1"
          autoFocus
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
          <Plus className="h-4 w-4" />
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
