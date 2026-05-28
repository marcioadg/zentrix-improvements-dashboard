import { describe, it, expect, vi } from "vitest";

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/types/tasks', () => ({}));

import { sortTasks } from './taskSorting';

const makeTask = (overrides: Record<string, any>) => ({
  id: overrides.id ?? '1',
  title: overrides.title ?? 'Test',
  due_date: overrides.due_date ?? null,
  created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
  priority: overrides.priority ?? 'medium',
  ...overrides,
});

describe('sortTasks', () => {
  describe('sort by due_date ascending', () => {
    it('puts earliest due date first and nulls at end', () => {
      const tasks = [
        makeTask({ id: 'a', due_date: '2026-03-20' }),
        makeTask({ id: 'b', due_date: null }),
        makeTask({ id: 'c', due_date: '2026-03-10' }),
      ] as any[];

      const sorted = sortTasks(tasks, { sortBy: 'due_date', sortOrder: 'asc' });
      expect(sorted[0].id).toBe('c');
      expect(sorted[1].id).toBe('a');
      expect(sorted[2].id).toBe('b');
    });
  });

  describe('sort by due_date descending', () => {
    it('puts latest due date first, nulls move to start due to negation', () => {
      const tasks = [
        makeTask({ id: 'a', due_date: '2026-03-10' }),
        makeTask({ id: 'b', due_date: null }),
        makeTask({ id: 'c', due_date: '2026-03-20' }),
      ] as any[];

      const sorted = sortTasks(tasks, { sortBy: 'due_date', sortOrder: 'desc' });
      expect(sorted[0].id).toBe('b');
      expect(sorted[1].id).toBe('c');
      expect(sorted[2].id).toBe('a');
    });
  });

  describe('sort by created_at ascending', () => {
    it('puts oldest first', () => {
      const tasks = [
        makeTask({ id: 'a', created_at: '2026-03-15T00:00:00Z' }),
        makeTask({ id: 'b', created_at: '2026-01-01T00:00:00Z' }),
        makeTask({ id: 'c', created_at: '2026-02-10T00:00:00Z' }),
      ] as any[];

      const sorted = sortTasks(tasks, { sortBy: 'created_at', sortOrder: 'asc' });
      expect(sorted[0].id).toBe('b');
      expect(sorted[1].id).toBe('c');
      expect(sorted[2].id).toBe('a');
    });
  });

  describe('sort by priority ascending', () => {
    it('sorts urgent < high < medium < low', () => {
      const tasks = [
        makeTask({ id: 'a', priority: 'low' }),
        makeTask({ id: 'b', priority: 'urgent' }),
        makeTask({ id: 'c', priority: 'medium' }),
        makeTask({ id: 'd', priority: 'high' }),
      ] as any[];

      const sorted = sortTasks(tasks, { sortBy: 'priority', sortOrder: 'asc' });
      expect(sorted[0].id).toBe('b');
      expect(sorted[1].id).toBe('d');
      expect(sorted[2].id).toBe('c');
      expect(sorted[3].id).toBe('a');
    });
  });

  describe('sort by priority descending', () => {
    it('sorts low first', () => {
      const tasks = [
        makeTask({ id: 'a', priority: 'low' }),
        makeTask({ id: 'b', priority: 'urgent' }),
        makeTask({ id: 'c', priority: 'medium' }),
        makeTask({ id: 'd', priority: 'high' }),
      ] as any[];

      const sorted = sortTasks(tasks, { sortBy: 'priority', sortOrder: 'desc' });
      expect(sorted[0].id).toBe('a');
      expect(sorted[1].id).toBe('c');
      expect(sorted[2].id).toBe('d');
      expect(sorted[3].id).toBe('b');
    });
  });

  describe('default/unknown sortBy', () => {
    it('returns tasks without reordering for unknown sort field', () => {
      const tasks = [
        makeTask({ id: 'a' }),
        makeTask({ id: 'b' }),
        makeTask({ id: 'c' }),
      ] as any[];

      const sorted = sortTasks(tasks, { sortBy: 'unknown_field' as any, sortOrder: 'asc' });
      expect(sorted[0].id).toBe('a');
      expect(sorted[1].id).toBe('b');
      expect(sorted[2].id).toBe('c');
    });
  });
});
