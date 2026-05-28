
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getInitials } from '@/utils/nameUtils';
import { useOptimizedUnifiedTasks } from '@/hooks/useOptimizedUnifiedTasks';
import { TaskItem } from './tasks/TaskItem';
import { AddTaskItem } from './tasks/AddTaskItem';
import { AutoArchiveTimer } from './AutoArchiveTimer';
import { useProfiles } from '@/hooks/useProfiles';
import { BusinessLoading } from '@/components/ui/business-loading';
import { TaskFilterPreferences } from '@/hooks/useTaskFilterPreferences';
import { useAuth } from '@/contexts/AuthContext';

interface TasksSectionProps {
  onEditTask?: (task: any) => void;
  filterPreferences: TaskFilterPreferences;
}

export const TasksSection: React.FC<TasksSectionProps> = ({ onEditTask, filterPreferences }) => {
  const { user } = useAuth();
  const { tasks, loading, addTask, updateTask, updateTaskStatus, deleteTask, archivingTasks, undoArchive } = useOptimizedUnifiedTasks(['personal']);
  const { profiles } = useProfiles();

  const handleAddTask = async (title: string, description?: string, priority?: 'low' | 'medium' | 'high', due_date?: string) => {
    await addTask(title, description || '', { type: 'personal' });
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const newStatus = completed ? 'done' : 'todo';
    await updateTaskStatus(taskId, newStatus);
  };

  const handleArchiveTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const handleEditTask = (task: any) => {
    if (onEditTask) {
      // Convert the task format for editing
      const editableTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        user_id: task.assigned_to,
        team_id: null,
        completed: task.completed,
        priority: 'medium',
        created_at: task.created_at,
        updated_at: task.created_at,
      };
      onEditTask(editableTask);
    }
  };

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || 'You';
  };

  const getProfileAvatar = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.avatar_url;
  };

  // Convert archiving tasks to pending archives format
  const pendingArchives = Array.from(archivingTasks).map(taskId => {
    const task = tasks.find(t => t.id === taskId);
    return {
      taskId,
      title: task?.title || 'Unknown Task',
      timeLeft: 5 // Default timeout
    };
  });

  const handleUndo = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      undoArchive(taskId, task);
    }
  };

  if (loading) {
    return <BusinessLoading isLoading={loading} />;
  }

  // Filter tasks based on unified preferences
  let filteredTasks = tasks;
  
  // Apply archived filter (combines completed and archived)
  if (!filterPreferences.showArchived) {
    filteredTasks = filteredTasks.filter(task => task.status !== 'done' && !task.is_archived);
  }

  // Helper function to check if user is assigned to task
  const isAssignedToTask = (task: any, userId: string): boolean => {
    // Check camelCase field first (frontend objects use this)
    if (Array.isArray(task.assignedTo) && task.assignedTo.includes(userId)) {
      return true;
    }
    // Fallback to snake_case field (for future compatibility)
    return Array.isArray(task.assigned_to) && task.assigned_to.includes(userId);
  };

  // Filter for "My Tasks Only" if enabled - only check assigned_to array
  if (filterPreferences.myTasksOnly && user) {
    filteredTasks = filteredTasks.filter(task => {
      return isAssignedToTask(task, user.id);
    });
  }

  // Sort tasks by preference
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (filterPreferences.sortBy) {
      case 'due_date':
        // Sort by due date, putting items without due dates at the end
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      case 'created_at':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Personal Tasks ({sortedTasks.length})
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {sortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={{
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  completed: task.status === 'done',
                  due_date: task.due_date,
                  assigned_to: task.user_id,
                  created_at: task.created_at,
                  archived: task.is_archived,
                  task_type: 'personal',
                }}
                onToggleTask={handleToggleTask}
                onArchiveTask={handleArchiveTask}
                onEditTask={handleEditTask}
                getProfileName={getProfileName}
                getInitials={getInitials}
                getProfileAvatar={getProfileAvatar}
              />
            ))}

            {sortedTasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {tasks.length > 0
                  ? 'No tasks match your current filters. Try adjusting filters to see more tasks.'
                  : 'No tasks yet. Add your first task to get started.'}
              </div>
            )}
          </div>

          <AddTaskItem onAddTask={handleAddTask} />
        </CardContent>
      </Card>

      <AutoArchiveTimer
        pendingTasks={pendingArchives}
        onUndo={handleUndo}
      />
    </>
  );
};
