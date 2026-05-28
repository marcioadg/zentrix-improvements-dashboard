
import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { EnhancedKanbanColumn } from './EnhancedKanbanColumn';
import { KanbanCard } from './KanbanCard';
import { UnifiedKanbanTask } from '@/types/tasks';
import { TaskStatus } from '@/types/kanban';
import { useCelebration } from '@/hooks/useCelebration';
import { useAuth } from '@/contexts/AuthContext';
import { TaskFilterPreferences } from '@/hooks/useTaskFilterPreferences';
import { logger } from '@/utils/logger';

interface EnhancedKanbanBoardProps {
  tasks: UnifiedKanbanTask[];
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<boolean>;
  onDeleteTask: (taskId: string) => void;
  onEditTask?: (taskId: string, updates: { title: string; description: string; due_date?: string }) => void;
  onAddTask: (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }) => void;
  onUpdateTaskOrder?: (taskId: string, newOrderPosition: number) => void;
  sortPreferences: TaskFilterPreferences;
  onUpdateSortPreferences: (prefs: Partial<TaskFilterPreferences>) => void;
  loading?: boolean;
  hidePriorityBadge?: boolean;
}

export const EnhancedKanbanBoard: React.FC<EnhancedKanbanBoardProps> = ({
  tasks,
  onUpdateTaskStatus,
  onDeleteTask,
  onEditTask,
  onAddTask,
  onUpdateTaskOrder,
  sortPreferences,
  onUpdateSortPreferences,
  loading = false,
  hidePriorityBadge = false,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { triggerCelebration } = useCelebration();
  const { user } = useAuth();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    
    logger.log('🎯 Drag and drop:', { taskId, newStatus });
    
    // Update task status
    await onUpdateTaskStatus(taskId, newStatus);
    
    // Trigger celebration if moved to done
    if (newStatus === 'done') {
      triggerCelebration();
    }
    
    // Update order position if needed
    if (onUpdateTaskOrder) {
      const newTasks = tasks.filter(t => t.status === newStatus);
      onUpdateTaskOrder(taskId, newTasks.length);
    }
    
    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find(task => task.id === activeId) : null;

  // Filter tasks based on unified preferences
  let filteredTasks = tasks;

  logger.log('🔍 EnhancedKanbanBoard - Input tasks:', tasks.length);
  logger.log('🔍 Sort preferences:', sortPreferences);

  // Helper function to check if user is assigned to task
  const isAssignedToTask = (task: UnifiedKanbanTask, userId: string): boolean => {
    // Cast to any to check both camelCase and snake_case fields
    const taskAny = task as any;
    // Check camelCase field first (frontend objects use this)
    if (Array.isArray(taskAny.assignedTo) && taskAny.assignedTo.includes(userId)) {
      return true;
    }
    // Fallback to snake_case field (type definition)
    return Array.isArray(task.assigned_to) && task.assigned_to.includes(userId);
  };

  // Filter for "My Tasks Only" if enabled - only check assigned_to array
  if (sortPreferences.myTasksOnly && user) {
    const beforeMyTasksFilter = filteredTasks.length;
    filteredTasks = filteredTasks.filter(task => {
      return isAssignedToTask(task, user.id);
    });
    logger.log('🔍 MyTasksOnly filter:', beforeMyTasksFilter, '->', filteredTasks.length);
  }

  // Sort tasks by the unified sort preference
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortPreferences.sortBy) {
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

  // Filter tasks by status - archived tasks go to Done column
  const todoTasks = sortedTasks.filter(task => task.status === 'todo' && !task.is_archived);
  const inProgressTasks = sortedTasks.filter(task => task.status === 'in-progress' && !task.is_archived);
  
  // Done column includes both completed tasks and archived tasks
  let doneTasks = sortedTasks.filter(task => task.status === 'done' || task.is_archived);
  
  // If showArchived is false, exclude archived tasks from Done column too
  if (!sortPreferences.showArchived) {
    doneTasks = doneTasks.filter(task => !task.is_archived);
  }

  logger.log('🔍 Final task distribution:', {
    todo: todoTasks.length,
    inprogress: inProgressTasks.length,
    done: doneTasks.length,
    total: sortedTasks.length,
    archived: sortedTasks.filter(t => t.is_archived).length
  });

  // Convert UnifiedKanbanTask to KanbanTask format for KanbanCard
  const convertToKanbanTask = (task: UnifiedKanbanTask) => ({
    ...task,
  });

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <EnhancedKanbanColumn
          title="Not Started"
          status="todo"
          tasks={todoTasks.map(convertToKanbanTask)}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
          onAddTask={onAddTask}
          loading={loading}
          hidePriorityBadge={hidePriorityBadge}
        />
        <EnhancedKanbanColumn
          title="In Progress"
          status="in-progress"
          tasks={inProgressTasks.map(convertToKanbanTask)}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
          hidePriorityBadge={hidePriorityBadge}
        />
        <EnhancedKanbanColumn
          title="Completed"
          status="done"
          tasks={doneTasks.map(convertToKanbanTask)}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
          hidePriorityBadge={hidePriorityBadge}
        />
      </div>
      
      <DragOverlay>
        {activeTask ? (
          <KanbanCard
            task={convertToKanbanTask(activeTask)}
            isDragging={true}
            onDelete={() => {}}
            hidePriorityBadge={hidePriorityBadge}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
