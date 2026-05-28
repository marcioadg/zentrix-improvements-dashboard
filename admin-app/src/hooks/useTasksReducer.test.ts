import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasksReducer } from './useTasksReducer';
import { UnifiedKanbanTask } from '@/types/tasks';

const makeTask = (overrides: Partial<UnifiedKanbanTask> = {}): UnifiedKanbanTask => ({
  id: 'task-1',
  title: 'Test task',
  status: 'open',
  source: 'manual',
  assigned_to: [],
  is_archived: false,
  task_type: 'personal',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...overrides,
});

describe('useTasksReducer', () => {
  it('has correct initial state', () => {
    const { result } = renderHook(() => useTasksReducer());
    const { state } = result.current;

    expect(state.tasks).toEqual([]);
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.pendingArchives).toEqual([]);
    expect(state.pendingOperations.size).toBe(0);
    expect(state.optimisticTasks.size).toBe(0);
  });

  it('SET_LOADING toggles loading', () => {
    const { result } = renderHook(() => useTasksReducer());

    act(() => { result.current.actions.setLoading(false); });
    expect(result.current.state.loading).toBe(false);

    act(() => { result.current.actions.setLoading(true); });
    expect(result.current.state.loading).toBe(true);
  });

  it('SET_TASKS stores tasks and converts them', () => {
    const { result } = renderHook(() => useTasksReducer());
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];

    act(() => { result.current.actions.setTasks(tasks); });

    expect(result.current.state.tasks).toHaveLength(2);
    expect(result.current.state.convertedTasks).toHaveLength(2);
    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.convertedTasks[0]).toHaveProperty('id', 'a');
  });

  it('SET_TASKS merges optimistic tasks over real ones', () => {
    const { result } = renderHook(() => useTasksReducer());
    const optimistic = makeTask({ id: 'a', title: 'Optimistic title' });

    act(() => { result.current.actions.addOptimisticTask(optimistic); });
    act(() => { result.current.actions.setTasks([makeTask({ id: 'a', title: 'Server title' })]); });

    expect(result.current.state.tasks[0].title).toBe('Optimistic title');
  });

  it('SET_ERROR sets error and clears loading', () => {
    const { result } = renderHook(() => useTasksReducer());

    act(() => { result.current.actions.setError('Something went wrong'); });

    expect(result.current.state.error).toBe('Something went wrong');
    expect(result.current.state.loading).toBe(false);
  });

  it('ADD/REMOVE_PENDING_ARCHIVE manages pending archives', () => {
    const { result } = renderHook(() => useTasksReducer());
    const task = { id: 'x', title: 'Archived' };

    act(() => { result.current.actions.addPendingArchive(task); });
    expect(result.current.state.pendingArchives).toHaveLength(1);
    expect(result.current.state.pendingArchives[0]).toHaveProperty('archivedAt');

    act(() => { result.current.actions.removePendingArchive('x'); });
    expect(result.current.state.pendingArchives).toHaveLength(0);
  });

  it('ADD/REMOVE_PENDING_OPERATION manages pending operations set', () => {
    const { result } = renderHook(() => useTasksReducer());

    act(() => { result.current.actions.addPendingOperation('op-1'); });
    act(() => { result.current.actions.addPendingOperation('op-2'); });
    expect(result.current.state.pendingOperations.size).toBe(2);

    act(() => { result.current.actions.removePendingOperation('op-1'); });
    expect(result.current.state.pendingOperations.size).toBe(1);
    expect(result.current.state.pendingOperations.has('op-2')).toBe(true);
  });

  it('ADD/REMOVE/UPDATE_OPTIMISTIC_TASK manages optimistic map', () => {
    const { result } = renderHook(() => useTasksReducer());
    const task = makeTask({ id: 'opt-1', title: 'Original' });

    act(() => { result.current.actions.addOptimisticTask(task); });
    expect(result.current.state.optimisticTasks.size).toBe(1);

    act(() => { result.current.actions.updateOptimisticTask('opt-1', { title: 'Updated' }); });
    expect(result.current.state.optimisticTasks.get('opt-1')?.title).toBe('Updated');

    act(() => { result.current.actions.removeOptimisticTask('opt-1'); });
    expect(result.current.state.optimisticTasks.size).toBe(0);
  });

  it('UPDATE_OPTIMISTIC_TASK is a no-op for unknown task', () => {
    const { result } = renderHook(() => useTasksReducer());

    act(() => { result.current.actions.updateOptimisticTask('unknown', { title: 'X' }); });
    expect(result.current.state.optimisticTasks.size).toBe(0);
  });

  it('REFRESH_TIMESTAMP updates lastRefresh', () => {
    const { result } = renderHook(() => useTasksReducer());
    const before = result.current.state.lastRefresh;

    act(() => { result.current.actions.refreshTimestamp(); });
    expect(result.current.state.lastRefresh).toBeGreaterThanOrEqual(before);
  });
});
