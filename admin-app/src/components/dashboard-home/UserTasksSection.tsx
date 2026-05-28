import React, { useState } from 'react';
import { useUserPersonalTasks } from '@/hooks/useUserPersonalTasks';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserTeams } from '@/hooks/useUserTeams';
import { celebrate } from '@/lib/celebration';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskCardSkeleton } from '@/components/skeletons/TaskCardSkeleton';
import { logger } from '@/utils/logger';
import { CheckSquare, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { EditTaskModal } from '@/components/modals/EditTaskModal';
import { UserTask } from '@/hooks/useUserPersonalTasks';
import { getDueDateInfo } from '@/utils/dueDateUtils';
interface UserTasksSectionProps {
  selectedTeamId?: string | null;
}

export const UserTasksSection: React.FC<UserTasksSectionProps> = ({ selectedTeamId }) => {
  const {
    tasks,
    loading,
    tasksByStatus,
    refetch
  } = useUserPersonalTasks();
  const { teams } = useUserTeams();
  const navigate = useNavigate();
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<UserTask | null>(null);

  // Filter tasks by selected team - MUST be before any early returns
  const filteredTasks = React.useMemo(() => {
    if (!selectedTeamId) return tasks;
    return tasks.filter(task => task.team_id === selectedTeamId);
  }, [tasks, selectedTeamId]);

  const filteredTasksByStatus = React.useMemo(() => ({
    todo: filteredTasks.filter(t => t.status === 'todo'),
    inprogress: filteredTasks.filter(t => t.status === 'in-progress' || t.status === 'inprogress'), 
    done: filteredTasks.filter(t => t.status === 'done' || t.status === 'completed')
  }), [filteredTasks]);

  // Filter to show only active tasks (limit 10)
  const displayTasks = React.useMemo(() => 
    [...filteredTasksByStatus.inprogress, ...filteredTasksByStatus.todo].slice(0, 10),
  [filteredTasksByStatus]);

  const handleTaskClick = (task: UserTask) => {
    setEditingTask(task);
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<UserTask>) => {
    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update({
          title: updates.title,
          description: updates.description,
          due_date: updates.due_date,
          task_type: updates.task_type,
          team_id: updates.team_id,
          assigned_to: updates.assigned_to,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast.success('Task updated successfully');
      if (refetch) await refetch();
      setEditingTask(null);
    } catch (error) {
      logger.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    setUpdatingTasks(prev => new Set(prev).add(taskId));
    const newStatus = currentStatus === 'done' || currentStatus === 'completed' ? 'todo' : 'done';

    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;

      if (newStatus === 'done') {
        logger.debug('🎉 CONFETTI TRIGGER: UserTasksSection task completion');
        celebrate();
      }
      toast.success(newStatus === 'done' ? 'Task completed!' : 'Task marked as todo');

      if (refetch) await refetch();
    } catch (error) {
      logger.error('Error updating task:', error);
      toast.error('Failed to update task');
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  if (loading) {
    return <TaskCardSkeleton />;
  }
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-[16px] font-medium text-foreground">
          Tasks
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/tasks')} 
          className="text-[13px] text-muted-foreground hover:text-foreground font-normal h-9 px-3 transition-colors duration-150"
        >
          View all
        </Button>
      </div>
      
      <div className="flex-1 min-h-0">
        {filteredTasksByStatus.todo.length === 0 && filteredTasksByStatus.inprogress.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <CheckSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">
              {selectedTeamId ? 'No tasks for this team' : 'No active tasks'}
            </p>
            <p className="text-[13px] text-muted-foreground">Create tasks to organize your work and track what needs to be done</p>
            <Button onClick={() => navigate('/tasks', { state: { openAddTask: true } })} size="sm">
              Add your first task
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="pr-3">
              {displayTasks.map(task => {
                const isCompleted = task.status === 'done' || task.status === 'completed';
                const isUpdating = updatingTasks.has(task.id);
                const dueDateInfo = !isCompleted ? getDueDateInfo(task.due_date) : null;
                return (
                     <div
                      key={task.id}
                      className="flex items-start gap-3 py-2 border-b border-border hover:bg-muted/50 transition-colors duration-150 cursor-pointer px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleTaskClick(task)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTaskClick(task); } }}
                      aria-label={`Task: ${task.title}${dueDateInfo?.isOverdue ? ' (overdue)' : ''}`}
                    >
                      <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} className="mt-0.5 min-h-[44px] flex items-center">
                        {isUpdating ? (
                          <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={() => handleToggleTask(task.id, task.status)}
                            className="h-5 w-5 md:h-4 md:w-4"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4
                            className={`font-normal text-[13px] truncate flex-1 min-w-0 pr-2 ${
                              isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                            title={task.title}
                          >
                            {task.title}
                          </h4>
                          <span className="text-[11px] bg-secondary rounded-[2px] px-1.5 text-muted-foreground shrink-0">
                            {task.team_name || 'Personal'}
                          </span>
                        </div>

                        {dueDateInfo && (
                          <span className={`text-[11px] inline-block rounded px-1.5 py-0.5 border ${dueDateInfo.urgencyClass}`}>
                            {dueDateInfo.text}
                          </span>
                        )}
                        {isCompleted && task.due_date && (
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {editingTask && (
          <EditTaskModal
            open={!!editingTask}
            onOpenChange={(open) => !open && setEditingTask(null)}
            task={editingTask}
            onUpdate={handleTaskUpdate}
          />
        )}
      </div>
    </div>
  );
};