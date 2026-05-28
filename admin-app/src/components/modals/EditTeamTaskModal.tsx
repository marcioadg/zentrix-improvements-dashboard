
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserTeams } from '@/hooks/useUserTeams';
import { UnifiedKanbanTask } from '@/types/tasks';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { formatDateForDisplay } from '@/lib/dateUtils';
import { logger } from '@/utils/logger';

type TeamTask = UnifiedKanbanTask;

interface EditTeamTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TeamTask;
  onUpdate: (taskId: string, updates: Partial<TeamTask>) => void;
}

export const EditTeamTaskModal: React.FC<EditTeamTaskModalProps> = ({
  open,
  onOpenChange,
  task,
  onUpdate,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(formatDateForDisplay(task.due_date));
  const [assignedTo, setAssignedTo] = useState<string>(
    Array.isArray(task.assigned_to) && task.assigned_to.length > 0 
      ? task.assigned_to[0] 
      : 'unassigned'
  );
  const [taskType, setTaskType] = useState<'personal' | 'team'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState(task.team_id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { members } = useTeamMembers(selectedTeamId);
  const { profiles } = useProfiles();
  const { teams } = useUserTeams();

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(formatDateForDisplay(task.due_date));
      setAssignedTo(
        Array.isArray(task.assigned_to) && task.assigned_to.length > 0
          ? task.assigned_to[0]
          : 'unassigned'
      );
      setTaskType('team');
      setSelectedTeamId(task.team_id);
    }
  }, [open, task]);

  const handleTaskTypeChange = (value: string) => {
    if (value === 'personal') {
      setTaskType('personal');
      setSelectedTeamId('');
      setAssignedTo('unassigned');
    } else {
      setTaskType('team');
      const teamId = value;
      setSelectedTeamId(teamId);
      setAssignedTo('unassigned');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updates: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
      };

      if (taskType === 'personal') {
        // Convert to personal task
        updates.team_id = null;
        updates.assigned_to = undefined;
        updates.task_type = 'personal';
      } else {
        // Keep as team task
        updates.team_id = selectedTeamId;
        updates.assigned_to = assignedTo === 'unassigned' ? [] : [assignedTo];
        updates.task_type = 'team';
      }

      await onUpdate(task.id, updates);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error updating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || 'Unknown User';
  };

  // Since useTeamMembers already filters by team, we can use all members directly
  const currentTeamMembers = taskType === 'team' && selectedTeamId ? members : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-type">Task Assignment</Label>
            <Select value={taskType === 'personal' ? 'personal' : selectedTeamId} onValueChange={handleTaskTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Task</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} (Team)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {taskType === 'team' && selectedTeamId && (
            <div className="space-y-2">
              <Label htmlFor="assigned-to">Assigned To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {currentTeamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {getProfileName(member.user_id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {taskType === 'personal' && (
            <div className="text-sm text-muted-foreground">
              This task will be converted to a personal task assigned to you.
            </div>
          )}

          <div className="space-y-2">
            <Label>Due Date</Label>
            <DatePicker
              date={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
              onSelect={(d) => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
              placeholder="Pick a due date"
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
