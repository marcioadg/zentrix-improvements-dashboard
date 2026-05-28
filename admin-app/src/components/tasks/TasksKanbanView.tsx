
import React, { useState, memo, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { UnifiedKanbanTask } from '@/types/tasks';
import { TasksKanbanColumn } from './TasksKanbanColumn';
import { TasksKanbanCard } from './TasksKanbanCard';
import { EditTaskModal } from '@/components/modals/EditTaskModal';
import { EditTeamTaskModal } from '@/components/modals/EditTeamTaskModal';
import { AddTaskModal } from '@/components/modals/AddTaskModal';
import { celebrate } from '@/lib/celebration';
import { sortTasks } from '@/utils/taskSorting';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

type PersonalTask = UnifiedKanbanTask;
type TeamTask = UnifiedKanbanTask;

// Extended PersonalTask interface to include priority for compatibility
interface ExtendedPersonalTask extends PersonalTask {
  priority?: 'low' | 'medium' | 'high';
}

// Extended TeamTask interface to include priority for compatibility
interface ExtendedTeamTask extends TeamTask {
  priority?: 'low' | 'medium' | 'high';
}

interface TasksKanbanViewProps {
  tasks: ExtendedPersonalTask[] | ExtendedTeamTask[];
  loading: boolean;
  isPersonal: boolean;
  onUpdateTaskStatus: (taskId: string, status: 'todo' | 'in-progress' | 'done') => Promise<boolean>;
  onUpdateTask?: (taskId: string, updates: any) => Promise<void>;
  onAddTask?: (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }, status?: 'todo' | 'in-progress' | 'done') => Promise<void>;
  onDeleteTask?: (taskId: string) => void;
  teamId?: string;
  filterPreferences?: {
    sortBy: 'due_date' | 'created_at';
    sortOrder: 'asc' | 'desc';
  };
}

// Memoized loading component
const LoadingKanban = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {['To Do', 'In Progress', 'Done'].map((title) => (
      <div key={title} className="bg-muted rounded-2xl p-6 border">
        <h3 className="font-semibold text-foreground mb-4">{title}</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-background rounded-xl p-4 shadow-sm animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
));

LoadingKanban.displayName = 'LoadingKanban';

export const TasksKanbanView: React.FC<TasksKanbanViewProps> = memo(({
  tasks,
  loading,
  isPersonal,
  onUpdateTaskStatus,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  teamId,
  filterPreferences,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<ExtendedPersonalTask | ExtendedTeamTask | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState<number>(0);
  const { toast } = useToast();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Memoize sorted tasks to prevent unnecessary recalculations
  const sortedTasks = useMemo(() => {
    if (!filterPreferences) return tasks;
    return sortTasks(tasks as (ExtendedPersonalTask | ExtendedTeamTask)[], filterPreferences);
  }, [tasks, filterPreferences]);

  // Memoize filtered tasks by status to prevent unnecessary recalculations
  const { todoTasks, inProgressTasks, doneTasks } = useMemo(() => {
    const todo = sortedTasks.filter(task => {
      if ('status' in task) {
        return task.status === 'todo';
      }
      return false;
    });

    const inProgress = sortedTasks.filter(task => {
      if ('status' in task) {
        return task.status === 'in-progress';
      }
      return false;
    });
    
    const done = sortedTasks.filter(task => {
      if ('status' in task) {
        return task.status === 'done';
      }
      return false;
    });

    return { todoTasks: todo, inProgressTasks: inProgress, doneTasks: done };
  }, [sortedTasks]);

  if (loading) {
    return <LoadingKanban />;
  }

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    setIsDragging(true);
    setDragStartTime(Date.now());
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setIsDragging(false);
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const droppedZone = over.id as string;
    
    if (droppedZone !== 'todo' && droppedZone !== 'in-progress' && droppedZone !== 'done') {
      toast({
        title: "Error",
        description: "Invalid drop zone",
        variant: "destructive",
      });
      setActiveId(null);
      return;
    }
    
    const newStatus = droppedZone as 'todo' | 'in-progress' | 'done';
    
    const currentTask = tasks.find(task => task.id === taskId);
    if (!currentTask) {
      toast({
        title: "Error",
        description: "Task not found",
        variant: "destructive",
      });
      setActiveId(null);
      return;
    }

    let currentStatus: 'todo' | 'in-progress' | 'done' = 'todo';
    if ('status' in currentTask && currentTask.status !== undefined) {
      const taskStatus = currentTask.status;
      if (taskStatus === 'todo' || taskStatus === 'in-progress' || taskStatus === 'done') {
        currentStatus = taskStatus;
      }
    }

    if (currentStatus !== newStatus) {
      try {
        if (newStatus === 'done') {
          celebrate();
        }
        
        const success = await onUpdateTaskStatus(taskId, newStatus);
        
        if (!success) {
          toast({
            title: "Error",
            description: "Failed to move task. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        logger.error('❌ ERROR: Exception during task status update:', error);
        toast({
          title: "Error",
          description: "Failed to move task. Please try again.",
          variant: "destructive",
        });
      }
    }
    
    setActiveId(null);
  };

  const handleEditTask = (task: ExtendedPersonalTask | ExtendedTeamTask) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleUpdateTask = async (taskId: string, updates: any) => {
    if (onUpdateTask) {
      await onUpdateTask(taskId, updates);
    }
  };

  const handleAddTask = async (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }, status: 'todo' | 'in-progress' | 'done' = 'todo') => {
    if (onAddTask) {
      await onAddTask(title, description, teamSelection, status);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (onDeleteTask) {
      onDeleteTask(taskId);
    }
  };

  const activeTask = activeId ? tasks.find(task => task.id === activeId) : null;

  return (
    <>
      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TasksKanbanColumn
            title="Not Started"
            tasks={todoTasks}
            status="todo"
            isPersonal={isPersonal}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
            teamId={teamId}
          />
          <TasksKanbanColumn
            title="In Progress"
            tasks={inProgressTasks}
            status="in-progress"
            isPersonal={isPersonal}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
            teamId={teamId}
          />
          <TasksKanbanColumn
            title="Completed"
            tasks={doneTasks}
            status="done"
            isPersonal={isPersonal}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
        
        <DragOverlay>
          {activeTask ? (
            <TasksKanbanCard
              task={activeTask}
              isPersonal={isPersonal}
              isDragging={true}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingTask && isPersonal && (
        <EditTaskModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          task={{
            ...editingTask,
            completed: editingTask.status === 'done',
            priority: 'medium' as 'low' | 'medium' | 'high',
            user_id: editingTask.user_id || '',
          }}
          onUpdate={handleUpdateTask}
        />
      )}

      {editingTask && !isPersonal && teamId && (
        <EditTeamTaskModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          task={editingTask as TeamTask}
          onUpdate={handleUpdateTask}
        />
      )}
    </>
  );
});

TasksKanbanView.displayName = 'TasksKanbanView';
