
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  task_type: 'personal';
  created_at: string;
  is_archived: boolean;
  due_date?: string;
}

const STORAGE_KEY = 'static_tasks';

const getInitialTasks = (): Task[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      logger.warn('Failed to parse stored tasks:', error);
    }
  }
  
  // Default tasks if nothing in storage
  return [
    {
      id: '1',
      title: 'Welcome to your task manager!',
      description: 'This is your first task. You can edit, complete, or delete it.',
      status: 'todo' as const,
      task_type: 'personal' as const,
      created_at: new Date().toISOString(),
      is_archived: false
    },
    {
      id: '2', 
      title: 'Try creating a new task',
      description: 'Click the "Add New Task" button to create your own task.',
      status: 'todo' as const,
      task_type: 'personal' as const,
      created_at: new Date().toISOString(),
      is_archived: false
    }
  ];
};

export const useStaticTasks = () => {
  const [tasks, setTasks] = useState<Task[]>(getInitialTasks);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Save to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback(async (title: string, description: string, dueDate?: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      status: 'todo',
      task_type: 'personal',
      created_at: new Date().toISOString(),
      is_archived: false,
      due_date: dueDate
    };

    setTasks(prev => [newTask, ...prev]);
    logger.log('Task added:', newTask.title);
  }, []);

  const updateTaskStatus = useCallback(async (taskId: string, status: 'todo' | 'in-progress' | 'done') => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status } : task
    ));
    logger.log('Task status updated:', taskId, status);
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'due_date'>>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
    logger.log('Task updated:', taskId, updates);
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    logger.log('Task deleted:', taskId);
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(task => task.status !== 'done'));
    logger.log('Completed tasks cleared');
  }, []);

  // Filter tasks based on current filter
  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return task.status !== 'done';
    if (filter === 'completed') return task.status === 'done';
    return true; // 'all'
  });

  // Task counts
  const taskCounts = {
    total: tasks.length,
    active: tasks.filter(t => t.status !== 'done').length,
    completed: tasks.filter(t => t.status === 'done').length
  };

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    filter,
    setFilter,
    taskCounts,
    loading: false,
    error: null,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    clearCompleted
  };
};
