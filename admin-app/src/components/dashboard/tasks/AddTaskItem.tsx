
import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { useAuth } from '@/contexts/AuthContext';

interface AddTaskItemProps {
  onAddTask: (title: string, description?: string, priority?: 'low' | 'medium' | 'high', due_date?: string, ownerId?: string) => void;
  showPriority?: boolean;
  defaultOwnerId?: string;
  teamId?: string;
}

export const AddTaskItem: React.FC<AddTaskItemProps> = ({
  onAddTask,
  showPriority = false,
  defaultOwnerId,
  teamId
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      const dueDate = getDefaultDueDate();
      // Use provided defaultOwnerId, fallback to current user
      const ownerId = defaultOwnerId || user?.id;
      onAddTask(title.trim(), undefined, undefined, dueDate, ownerId);
      setTitle(''); // Clear the input after adding
    }
  };

  return (
    <div className="border rounded-[6px] p-3 transition-colors duration-150 bg-background hover:shadow-md hover:border-muted-foreground/30 border-dashed border-2">
      <div className="flex items-center gap-3 w-full">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="+ Add Task"
          className="border-0 p-0 h-auto bg-transparent text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
};
