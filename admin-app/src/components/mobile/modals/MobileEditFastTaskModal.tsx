import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { FastTask } from '@/hooks/useFastTasks';
import { SimpleTeamMemberSelector } from '@/components/modals/task/SimpleTeamMemberSelector';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface TeamInfo {
  id: string;
  name: string;
  company_id: string;
}

interface MobileEditFastTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: FastTask;
  onUpdate: (taskId: string, updates: Partial<FastTask>) => Promise<void>;
  teams: TeamInfo[];
  dialogClassName?: string;
}

export const MobileEditFastTaskModal: React.FC<MobileEditFastTaskModalProps> = ({
  open,
  onOpenChange,
  task,
  onUpdate,
  teams,
  dialogClassName
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [taskType, setTaskType] = useState<'personal' | 'team'>(
    task.taskType || (task.teamId ? 'team' : 'personal')
  );
  const [selectedTeamId, setSelectedTeamId] = useState(task.teamId || (teams.length > 0 ? teams[0].id : ''));
  const [assignedTo, setAssignedTo] = useState<string[]>(
    task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : []
  );
  const [loading, setLoading] = useState(false);

  const scrollableRef = useRef<HTMLDivElement>(null);

  // Reset form when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setTaskType(task.taskType);
    setSelectedTeamId(task.teamId || '');
    setAssignedTo(task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : []);
  }, [task]);

  const handleTaskTypeChange = (value: string) => {
    if (value === 'personal') {
      setTaskType('personal');
      setSelectedTeamId('');
      setAssignedTo([]);
    } else {
      setTaskType('team');
      const teamId = value;
      setSelectedTeamId(teamId);
      setAssignedTo([]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    setLoading(true);
    try {
      // Resolve team name from the teams array when updating team assignment
      const selectedTeam = teams.find(team => team.id === selectedTeamId);
      const resolvedTeamName = selectedTeam?.name;
      
      const updates: Partial<FastTask> = {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        taskType,
        teamId: taskType === 'team' ? selectedTeamId : undefined,
        teamName: taskType === 'team' ? resolvedTeamName : undefined,
        assignedTo: taskType === 'team' && assignedTo.length > 0 ? assignedTo : []
      };
      
      await onUpdate(task.id, updates);
      onOpenChange(false);
    } catch (error) {
      logger.error('❌ MobileEditFastTaskModal: Failed to update task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setTaskType(task.taskType);
    setSelectedTeamId(task.teamId || '');
    setAssignedTo(task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : []);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "flex flex-col rounded-2xl",
          // Stable fixed layout - no keyboard-driven repositioning
          "!fixed !inset-4 !translate-x-0 !translate-y-0 !max-w-none !max-h-none !w-auto !h-auto !overflow-hidden",
          dialogClassName
        )}
      >
        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-border">
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the task details including title, description, due date, and assignment.
          </DialogDescription>
        </DialogHeader>
        
        {/* Scrollable Content - overscroll-contain prevents scroll chaining to parent */}
        <div 
          ref={scrollableRef}
          className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-1 space-y-4 min-h-0 w-full max-w-full overscroll-contain"
        >
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
              placeholder="Enter task description"
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
            <Label htmlFor="task-assignment">Task Assignment</Label>
            <Select 
              value={taskType === 'personal' ? 'personal' : selectedTeamId} 
              onValueChange={handleTaskTypeChange}
            >
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
            <SimpleTeamMemberSelector
              teamId={selectedTeamId}
              assignedTo={assignedTo}
              setAssignedTo={setAssignedTo}
            />
          )}

          {taskType === 'personal' && (
            <div className="text-sm text-muted-foreground">
              This task will be assigned to you as a personal task.
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 pt-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || loading || (taskType === 'team' && !selectedTeamId)}
          >
            {loading ? 'Saving...' : 'Update Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
