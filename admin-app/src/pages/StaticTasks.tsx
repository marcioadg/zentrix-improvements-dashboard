
import React from 'react';
import { useStaticTasks } from '@/hooks/useStaticTasks';
import { EnhancedStaticTaskList } from '@/components/tasks/EnhancedStaticTaskList';
import { EnhancedStaticAddTaskForm } from '@/components/tasks/EnhancedStaticAddTaskForm';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { LoadingState } from '@/components/ui/loading-state';

export const StaticTasks = () => {
  const {
    tasks,
    filter,
    setFilter,
    taskCounts,
    loading,
    error,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    clearCompleted
  } = useStaticTasks();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tasks</h1>
          <LoadingState size="sm" message="Loading tasks..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tasks</h1>
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Personal Task Manager</h1>
        <p className="text-muted-foreground">
          Manage your personal tasks with priorities, due dates, and progress tracking
        </p>
      </div>

      {/* Task Filters */}
      <div className="mb-6">
        <TaskFilters 
          filter={filter}
          onFilterChange={setFilter}
          taskCounts={taskCounts}
          onClearCompleted={clearCompleted}
        />
      </div>

      {/* Add Task Form */}
      <div className="mb-6">
        <EnhancedStaticAddTaskForm onAddTask={addTask} />
      </div>

      {/* Tasks List */}
      <div>
        <EnhancedStaticTaskList 
          tasks={tasks}
          onStatusChange={updateTaskStatus}
          onUpdateTask={updateTask}
          onDelete={deleteTask}
        />
      </div>
    </div>
  );
};

export default StaticTasks;
