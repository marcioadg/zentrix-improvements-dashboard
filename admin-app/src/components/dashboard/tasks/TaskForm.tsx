
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface TaskFormProps {
  onSubmit: (task: {
    title: string;
    description: string;
    due_date: string;
    assigned_to: string;
  }) => void;
  onCancel: () => void;
  teamId: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  onCancel,
  teamId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Default to 7 days from now using local timezone
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    
    // Format as YYYY-MM-DD using local timezone to avoid timezone conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };
  
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [assignedTo, setAssignedTo] = useState('');
  
  const { members } = useTeamMembers(teamId);

  // Filter out members with invalid user_id values
  const validMembers = members.filter(member => 
    member.user_id && member.user_id.trim() !== ''
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (title.trim() && dueDate && assignedTo) {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate,
        assigned_to: assignedTo,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate(getDefaultDueDate());
      setAssignedTo('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t pt-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Task title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          required
        />
        <Textarea
          placeholder="Task description (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyPress={handleKeyPress}
          className="min-h-[80px]"
        />
        <div className="grid grid-cols-2 gap-3">
          <DatePicker
            date={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
            onSelect={(d) => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
            placeholder="Pick a due date"
          />
          <Select value={assignedTo} onValueChange={setAssignedTo} required>
            <SelectTrigger>
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              {validMembers.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profiles?.full_name || 'Unknown User'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!title.trim() || !dueDate || !assignedTo}>
            Add Task
          </Button>
        </div>
      </form>
    </div>
  );
};
