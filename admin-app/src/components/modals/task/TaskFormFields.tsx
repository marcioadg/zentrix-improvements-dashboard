
import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { logger } from '@/utils/logger';

interface TaskFormFieldsProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  dueDate: string;
  setDueDate: (date: string) => void;
  teamSelection: { type: 'personal' | 'team'; teamId?: string };
  onTeamSelectionChange: (value: string) => void;
  teams: Array<{ id: string; name: string }>;
}

export const TaskFormFields: React.FC<TaskFormFieldsProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  dueDate,
  setDueDate,
  teamSelection,
  onTeamSelectionChange,
  teams,
}) => {
  // Pre-populate with 7-day default due date
  useEffect(() => {
    if (!dueDate) {
      setDueDate(getDefaultDueDate());
    }
  }, [dueDate, setDueDate]);

  // Ensure we have a valid value for the Select component
  const getSelectValue = () => {
    if (!teamSelection) return 'personal';
    if (teamSelection.type === 'personal') return 'personal';
    if (teamSelection.type === 'team' && teamSelection.teamId) return teamSelection.teamId;
    return 'personal'; // Fallback to personal if teamId is missing
  };

  const selectValue = getSelectValue();

  logger.log('🔍 TaskFormFields: Render state:', {
    teamSelection,
    selectValue,
    teamsCount: teams?.length || 0
  });

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          placeholder="Enter task title"
          value={title || ''}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          placeholder="Enter task description"
          value={description || ''}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
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

      <div className="space-y-2">
        <Label htmlFor="team-selection">Task Type</Label>
        <Select value={selectValue} onValueChange={onTeamSelectionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select task type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Personal Task</SelectItem>
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name} (Team)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};
