import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Plus, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FastTask } from '@/hooks/useFastTasks';
import { EnhancedFastTaskList } from './EnhancedFastTaskList';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { logger } from '@/utils/logger';

interface Team {
  id: string;
  name: string;
}

interface TaskSectionProps {
  title: string;
  status: 'todo' | 'inprogress' | 'done';
  tasks: FastTask[];
  count: number;
  teams: Team[];
  onAddTask: (title: string, description: string, status: 'todo' | 'inprogress' | 'done', teamType: 'personal' | 'team', teamId?: string, dueDate?: string) => Promise<void>;
  onToggleTask: (taskId: string) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<FastTask>) => Promise<void>;
  onArchiveTask: (taskId: string) => Promise<boolean>;
  onEditTask: (task: FastTask) => void;
  pendingArchives: Array<{ taskId: string; title: string; timeLeft: number }>;
  onUndoArchive: (taskId: string) => Promise<void>;
  hideHeader?: boolean;
}

export const TaskSection: React.FC<TaskSectionProps> = ({
  title,
  status,
  tasks,
  count,
  teams,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onArchiveTask,
  onEditTask,
  pendingArchives,
  onUndoArchive,
  hideHeader = false,
}) => {
  logger.log(`🎯 TaskSection: Rendering ${title} section with ${count} tasks`);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    taskType: 'personal' as 'personal' | 'team',
    teamId: '',
    dueDate: getDefaultDueDate(),
  });

  const getIcon = () => {
    switch (status) {
      case 'inprogress':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'todo':
        return <Clock className="h-5 w-5 text-primary" />;
      case 'done':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
  };

  const getAccentColor = () => {
    switch (status) {
      case 'inprogress':
        return 'border-l-orange-500';
      case 'todo':
        return 'border-l-blue-500';
      case 'done':
        return 'border-l-green-500';
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await onAddTask(
        newTask.title,
        newTask.description,
        status,
        newTask.taskType,
        newTask.taskType === 'team' ? newTask.teamId : undefined,
        newTask.dueDate
      );

      // Reset form
      setNewTask({
        title: '',
        description: '',
        taskType: 'personal',
        teamId: '',
        dueDate: getDefaultDueDate(),
      });
      setIsExpanded(false);
    } catch (error) {
      logger.error('Failed to create task:', error);
    }
  }, [newTask, onAddTask, status]);

  const handleCancel = useCallback(() => {
    setNewTask({
      title: '',
      description: '',
      taskType: 'personal',
      teamId: '',
      dueDate: getDefaultDueDate(),
    });
    setIsExpanded(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header - only show if not hidden */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <h2 className="text-[13px] font-medium text-foreground">{title}</h2>
            <span className="text-[11px] font-normal bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
              {count}
            </span>
          </div>
        </div>
      )}

      {/* Add Task Section */}
      <div className="space-y-3">
        {!isExpanded ? (
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground border border-dashed h-12"
            onClick={() => setIsExpanded(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a task...
          </Button>
        ) : (
          <Card className="border-2 border-dashed border-primary/20 bg-muted/30">
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-3" onKeyDown={handleKeyDown}>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Task title..."
                  autoFocus
                  className="border-0 bg-transparent text-base focus-visible:ring-0"
                />
                
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add description (optional)..."
                  rows={2}
                  className="resize-none border-0 bg-transparent focus-visible:ring-0"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    value={newTask.taskType}
                    onValueChange={(value: 'personal' | 'team') => 
                      setNewTask(prev => ({ 
                        ...prev, 
                        taskType: value,
                        teamId: value === 'personal' ? '' : prev.teamId
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>

                  {newTask.taskType === 'team' && (
                    <Select
                      value={newTask.teamId}
                      onValueChange={(value) => setNewTask(prev => ({ ...prev, teamId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <DatePicker
                    date={newTask.dueDate ? new Date(newTask.dueDate + 'T00:00:00') : undefined}
                    onSelect={(d) => setNewTask(prev => ({ ...prev, dueDate: d ? format(d, 'yyyy-MM-dd') : '' }))}
                    placeholder="Pick a due date"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!newTask.title.trim() || (newTask.taskType === 'team' && !newTask.teamId)}
                    className="flex-1"
                  >
                    Add Task
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        <EnhancedFastTaskList
          tasks={tasks}
          onToggleTask={onToggleTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={async (taskId) => { await onArchiveTask(taskId); }}
          onArchiveTask={async (taskId) => { await onArchiveTask(taskId); }}
          onEditTask={onEditTask}
          pendingArchives={pendingArchives}
          onUndoArchive={async (taskId) => { await onUndoArchive(taskId); }}
        />
      </div>
    </div>
  );
};