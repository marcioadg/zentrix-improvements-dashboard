import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { useCompanyFilterPreferences, CompanyFilterState } from './useCompanyFilterPreferences';

const STORAGE_KEY = 'company-saved-filters';

const makeFilter = (): CompanyFilterState => ({
  searchQuery: '',
  showAtRisk: false,
  showOrphaned: false,
  sortField: 'name',
  sortDirection: 'asc',
});

describe('useCompanyFilterPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty savedFilters', () => {
    const { result } = renderHook(() => useCompanyFilterPreferences());
    expect(result.current.savedFilters).toEqual([]);
  });

  it('loads existing filters from localStorage on mount', () => {
    const existing = [{ id: 'filter-1', name: 'My Filter', filters: makeFilter(), createdAt: '2026-01-01' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    const { result } = renderHook(() => useCompanyFilterPreferences());
    expect(result.current.savedFilters).toEqual(existing);
  });

  it('saveFilter adds a new filter and persists to localStorage', () => {
    const { result } = renderHook(() => useCompanyFilterPreferences());

    let newFilter: any;
    act(() => {
      newFilter = result.current.saveFilter('Test', makeFilter());
    });

    expect(result.current.savedFilters).toHaveLength(1);
    expect(result.current.savedFilters[0].name).toBe('Test');
    expect(newFilter.name).toBe('Test');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
  });

  it('deleteFilter removes a filter by id', () => {
    // Seed two filters via localStorage so the hook loads them on mount
    const f1 = { id: 'filter-1', name: 'One', filters: makeFilter(), createdAt: '2026-01-01' };
    const f2 = { id: 'filter-2', name: 'Two', filters: makeFilter(), createdAt: '2026-01-02' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([f1, f2]));

    const { result } = renderHook(() => useCompanyFilterPreferences());
    expect(result.current.savedFilters).toHaveLength(2);

    act(() => { result.current.deleteFilter('filter-1'); });

    expect(result.current.savedFilters).toHaveLength(1);
    expect(result.current.savedFilters[0].name).toBe('Two');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
  });

  it('updateFilter modifies an existing filter', () => {
    const f = { id: 'filter-1', name: 'Old Name', filters: makeFilter(), createdAt: '2026-01-01' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([f]));

    const { result } = renderHook(() => useCompanyFilterPreferences());

    const updatedFilters: CompanyFilterState = { ...makeFilter(), showAtRisk: true };
    act(() => {
      result.current.updateFilter('filter-1', 'New Name', updatedFilters);
    });

    expect(result.current.savedFilters[0].name).toBe('New Name');
    expect(result.current.savedFilters[0].filters.showAtRisk).toBe(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored[0].name).toBe('New Name');
  });

  it('handles localStorage errors gracefully on save', () => {
    const { result } = renderHook(() => useCompanyFilterPreferences());
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });

    act(() => { result.current.saveFilter('Fail', makeFilter()); });

    // State still updates even if storage fails
    expect(result.current.savedFilters).toHaveLength(1);
    spy.mockRestore();
  });

  it('multiple saves accumulate correctly', () => {
    const { result } = renderHook(() => useCompanyFilterPreferences());

    act(() => { result.current.saveFilter('One', makeFilter()); });
    act(() => { result.current.saveFilter('Two', makeFilter()); });
    act(() => { result.current.saveFilter('Three', makeFilter()); });

    expect(result.current.savedFilters).toHaveLength(3);
  });
});
