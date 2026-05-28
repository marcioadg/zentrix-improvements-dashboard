
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useOptimizedUnifiedTasks } from '@/hooks/useOptimizedUnifiedTasks';
import { TaskItem } from './tasks/TaskItem';
import { AddTaskItem } from './tasks/AddTaskItem';
import { AutoArchiveTimer } from './AutoArchiveTimer';
import { useProfiles } from '@/hooks/useProfiles';
import { BusinessLoading } from '@/components/ui/business-loading';
import { EditTaskModal } from '@/components/modals/EditTaskModal';
import { logger } from '@/utils/logger';

export const OptimizedTasksSection = () => {
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

  const [editingTask, setEditingTask] = useState<any>(null);

  const handleEditTask = (task: any) => {
    setEditingTask(task);
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      // Convert updates to the format expected by updateTask
      const taskUpdates = {
        title: updates.title,
        description: updates.description,
        due_date: updates.due_date,
        status: updates.completed ? ('done' as const) : ('todo' as const),
      };
      
      await updateTask(taskId, taskUpdates);
      setEditingTask(null);
    } catch (error) {
      logger.error('❌ OptimizedTasksSection: Failed to update task:', error);
      throw error;
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Personal Tasks ({tasks.length})
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {tasks.map((task) => (
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
                }}
                onToggleTask={handleToggleTask}
                onArchiveTask={handleArchiveTask}
                onEditTask={handleEditTask}
                getProfileName={getProfileName}
                getInitials={getInitials}
                getProfileAvatar={getProfileAvatar}
              />
            ))}
          </div>

          <AddTaskItem onAddTask={handleAddTask} />
        </CardContent>
      </Card>

      <AutoArchiveTimer
        pendingTasks={pendingArchives}
        onUndo={handleUndo}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          task={{
            id: editingTask.id,
            title: editingTask.title,
            description: editingTask.description,
            due_date: editingTask.due_date,
            user_id: editingTask.assigned_to,
            team_id: null,
            completed: editingTask.completed,
            priority: 'medium',
            created_at: editingTask.created_at,
            updated_at: editingTask.created_at,
            task_type: 'personal',
          }}
          onUpdate={handleTaskUpdate}
        />
      )}
    </>
  );
};
