import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SimpleTeamMemberSelector } from './task/SimpleTeamMemberSelector';
import { useUserTeams } from '@/hooks/useUserTeams';
import { formatDateForInput } from '@/lib/dateUtils';
import { logger } from '@/utils/logger';

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  user_id: string;
  team_id?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  task_type?: 'personal' | 'team' | 'product' | 'fast';
  assigned_to?: string | string[]; // Handle both single and array assignments
}

interface EditTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onUpdate: (taskId: string, updates: Partial<Task & { assigned_to?: string }>) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  open,
  onOpenChange,
  task,
  onUpdate,
}) => {
  const { teams } = useUserTeams();
  
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const parseDueDate = (dateStr?: string): Date | undefined => {
    if (!dateStr) return undefined;
    const formatted = formatDateForInput(dateStr);
    if (!formatted) return undefined;
    const [y, m, d] = formatted.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? undefined : date;
  };
  const [dueDate, setDueDate] = useState<Date | undefined>(parseDueDate(task.due_date));
  
  // Determine task type from the task object or context
  const getTaskType = (task: Task): 'personal' | 'team' | 'fast' => {
    if (task.task_type) {
      // Map 'product' to 'personal' for legacy compatibility
      if (task.task_type === 'product') return 'personal';
      return task.task_type;
    }
    if (task.team_id) return 'team';
    return 'personal';
  };

  const taskType = getTaskType(task);
  const isCurrentlyPersonal = taskType === 'personal';
  const [newTaskType, setNewTaskType] = useState<'personal' | 'team'>(isCurrentlyPersonal ? 'personal' : 'team');
  const [selectedTeamId, setSelectedTeamId] = useState(task.team_id || (teams.length > 0 ? teams[0].id : ''));
  
  // Handle different assignment formats - convert to array for UI consistency
  const getInitialAssignedTo = (task: Task): string[] => {
    if (taskType === 'personal') {
      return task.user_id ? [task.user_id] : [];
    } else if (typeof task.assigned_to === 'string') {
      return task.assigned_to ? [task.assigned_to] : [];
    } else if (Array.isArray(task.assigned_to)) {
      return task.assigned_to;
    }
    return [];
  };

  const [assignedTo, setAssignedTo] = useState<string[]>(getInitialAssignedTo(task));
  const [loading, setLoading] = useState(false);

  logger.log('🔍 EditTaskModal: Task type detected:', taskType, {
    task_type: task.task_type,
    team_id: task.team_id,
    assigned_to: task.assigned_to,
    user_id: task.user_id
  });

  const handleTaskTypeChange = (value: string) => {
    if (value === 'personal') {
      setNewTaskType('personal');
      setSelectedTeamId('');
      setAssignedTo([task.user_id]); // Assign to current user for personal tasks
    } else {
      setNewTaskType('team');
      const teamId = value;
      setSelectedTeamId(teamId);
      setAssignedTo([]); // Clear assignment when switching to team
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    setLoading(true);
    try {
      // Convert Date object back to YYYY-MM-DD string for database
      const formattedDueDate = dueDate
        ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`
        : null;
      
      logger.log('🔧 EditTaskModal: Date formatting debug:', {
        dueDateObj: dueDate,
        formattedDueDate
      });
      
      logger.log('🔧 EditTaskModal: Updating task', {
        taskId: task.id,
        taskType,
        newTaskType,
        assignedTo,
        formattedDueDate
      });
      
      const updates: any = {
        title: title.trim(),
        description: description.trim(),
        due_date: formattedDueDate,
      };

      // Handle task type and assignment updates based on newTaskType
      if (newTaskType === 'personal') {
        updates.task_type = 'personal';
        updates.team_id = null;
        updates.assigned_to = null; // Clear assigned_to for personal tasks
        updates.user_id = task.user_id; // Keep original user
      } else {
        // Team assignment
        updates.task_type = 'team';
        updates.team_id = selectedTeamId;
        
        // For team tasks, pass the full array of assigned users
        updates.assigned_to = assignedTo.length > 0 ? assignedTo : [task.user_id];
        updates.user_id = task.user_id; // Keep original creator
      }
      
      logger.log('🔧 EditTaskModal: Final updates:', updates);
      
      await onUpdate(task.id, updates);
      onOpenChange(false);
    } catch (error) {
      logger.error('❌ EditTaskModal: Failed to update task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(parseDueDate(task.due_date));
    setNewTaskType(isCurrentlyPersonal ? 'personal' : 'team');
    setSelectedTeamId(task.team_id || (teams.length > 0 ? teams[0].id : ''));
    setAssignedTo(getInitialAssignedTo(task));
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Task"
      description="Update task details and assignment"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Update Task"
      loading={loading}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            placeholder="Enter task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            placeholder="Enter task description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dueDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={(date) => setDueDate(date)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-type">Task Assignment</Label>
          <Select value={newTaskType === 'personal' ? 'personal' : selectedTeamId} onValueChange={handleTaskTypeChange}>
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

        {newTaskType === 'team' && selectedTeamId && (
          <SimpleTeamMemberSelector
            teamId={selectedTeamId}
            assignedTo={assignedTo}
            setAssignedTo={setAssignedTo}
          />
        )}

        {newTaskType === 'personal' && (
          <div className="text-sm text-muted-foreground">
            This task will be assigned to you as a personal task.
          </div>
        )}
      </div>
    </BaseModal>
  );
};
