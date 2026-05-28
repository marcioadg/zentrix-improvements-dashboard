
import { useReducer, useCallback } from 'react';
import { UnifiedKanbanTask } from '@/types/tasks';

interface TasksState {
  tasks: UnifiedKanbanTask[];
  convertedTasks: any[];
  loading: boolean;
  error: string | null;
  pendingArchives: any[];
  pendingOperations: Set<string>;
  optimisticTasks: Map<string, UnifiedKanbanTask>;
  lastRefresh: number;
}

type TasksAction = 
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_TASKS'; tasks: UnifiedKanbanTask[] }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'ADD_PENDING_ARCHIVE'; task: any }
  | { type: 'REMOVE_PENDING_ARCHIVE'; taskId: string }
  | { type: 'ADD_PENDING_OPERATION'; taskId: string }
  | { type: 'REMOVE_PENDING_OPERATION'; taskId: string }
  | { type: 'ADD_OPTIMISTIC_TASK'; task: UnifiedKanbanTask }
  | { type: 'REMOVE_OPTIMISTIC_TASK'; taskId: string }
  | { type: 'UPDATE_OPTIMISTIC_TASK'; taskId: string; updates: Partial<UnifiedKanbanTask> }
  | { type: 'REFRESH_TIMESTAMP' };

const initialState: TasksState = {
  tasks: [],
  convertedTasks: [],
  loading: true,
  error: null,
  pendingArchives: [],
  pendingOperations: new Set(),
  optimisticTasks: new Map(),
  lastRefresh: Date.now()
};

function tasksReducer(state: TasksState, action: TasksAction): TasksState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    
    case 'SET_TASKS':
      // Merge optimistic tasks with real tasks
      const mergedTasks = action.tasks.map(task => 
        state.optimisticTasks.get(task.id) || task
      );
      
      return {
        ...state,
        tasks: mergedTasks,
        convertedTasks: mergedTasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          assigned_to: task.assigned_to,
          due_date: task.due_date,
          team_id: task.team_id,
          user_id: task.user_id,
          created_at: task.created_at,
          updated_at: task.updated_at,
          task_type: task.task_type
        })),
        loading: false,
        error: null
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    
    case 'ADD_PENDING_ARCHIVE':
      return {
        ...state,
        pendingArchives: [...state.pendingArchives, { ...action.task, archivedAt: Date.now() }]
      };
    
    case 'REMOVE_PENDING_ARCHIVE':
      return {
        ...state,
        pendingArchives: state.pendingArchives.filter(t => t.id !== action.taskId)
      };
    
    case 'ADD_PENDING_OPERATION':
      return {
        ...state,
        pendingOperations: new Set([...state.pendingOperations, action.taskId])
      };
    
    case 'REMOVE_PENDING_OPERATION':
      const newPendingOps = new Set(state.pendingOperations);
      newPendingOps.delete(action.taskId);
      return { ...state, pendingOperations: newPendingOps };
    
    case 'ADD_OPTIMISTIC_TASK':
      const newOptimisticTasks = new Map(state.optimisticTasks);
      newOptimisticTasks.set(action.task.id, action.task);
      return { ...state, optimisticTasks: newOptimisticTasks };
    
    case 'REMOVE_OPTIMISTIC_TASK':
      const updatedOptimisticTasks = new Map(state.optimisticTasks);
      updatedOptimisticTasks.delete(action.taskId);
      return { ...state, optimisticTasks: updatedOptimisticTasks };
    
    case 'UPDATE_OPTIMISTIC_TASK':
      const optimisticTasksMap = new Map(state.optimisticTasks);
      const existingTask = optimisticTasksMap.get(action.taskId);
      if (existingTask) {
        optimisticTasksMap.set(action.taskId, { ...existingTask, ...action.updates });
      }
      return { ...state, optimisticTasks: optimisticTasksMap };
    
    case 'REFRESH_TIMESTAMP':
      return { ...state, lastRefresh: Date.now() };
    
    default:
      return state;
  }
}

export const useTasksReducer = () => {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  const actions = {
    setLoading: useCallback((loading: boolean) => dispatch({ type: 'SET_LOADING', loading }), []),
    setTasks: useCallback((tasks: UnifiedKanbanTask[]) => dispatch({ type: 'SET_TASKS', tasks }), []),
    setError: useCallback((error: string | null) => dispatch({ type: 'SET_ERROR', error }), []),
    addPendingArchive: useCallback((task: any) => dispatch({ type: 'ADD_PENDING_ARCHIVE', task }), []),
    removePendingArchive: useCallback((taskId: string) => dispatch({ type: 'REMOVE_PENDING_ARCHIVE', taskId }), []),
    addPendingOperation: useCallback((taskId: string) => dispatch({ type: 'ADD_PENDING_OPERATION', taskId }), []),
    removePendingOperation: useCallback((taskId: string) => dispatch({ type: 'REMOVE_PENDING_OPERATION', taskId }), []),
    addOptimisticTask: useCallback((task: UnifiedKanbanTask) => dispatch({ type: 'ADD_OPTIMISTIC_TASK', task }), []),
    removeOptimisticTask: useCallback((taskId: string) => dispatch({ type: 'REMOVE_OPTIMISTIC_TASK', taskId }), []),
    updateOptimisticTask: useCallback((taskId: string, updates: Partial<UnifiedKanbanTask>) => 
      dispatch({ type: 'UPDATE_OPTIMISTIC_TASK', taskId, updates }), []),
    refreshTimestamp: useCallback(() => dispatch({ type: 'REFRESH_TIMESTAMP' }), [])
  };

  return { state, actions };
};
