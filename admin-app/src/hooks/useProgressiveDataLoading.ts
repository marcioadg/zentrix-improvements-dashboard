import { useState, useEffect, useCallback } from 'react';

export type LoadPriority = 'critical' | 'high' | 'medium' | 'low';

interface LoadItem<T> {
  priority: LoadPriority;
  loader: () => Promise<T>;
  key: string;
}

interface ProgressiveLoadState<T> {
  data: Record<string, T>;
  loading: Record<string, boolean>;
  errors: Record<string, Error | null>;
}

const PRIORITY_DELAYS: Record<LoadPriority, number> = {
  critical: 0,      // Load immediately
  high: 100,        // Load after 100ms
  medium: 500,      // Load after 500ms
  low: 2000,        // Load after 2s
};

/**
 * Progressive data loading hook - loads data in priority order
 * Ensures above-the-fold content loads first, defers non-critical data
 */
export const useProgressiveDataLoading = <T = any>(
  items: LoadItem<T>[],
  enabled: boolean = true
) => {
  const [state, setState] = useState<ProgressiveLoadState<T>>({
    data: {},
    loading: {},
    errors: {},
  });

  const loadItem = useCallback(async (item: LoadItem<T>) => {
    const { key, loader, priority } = item;
    const delay = PRIORITY_DELAYS[priority];

    // Set loading state
    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, [key]: true },
    }));

    // Wait for priority delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const data = await loader();
      setState((prev) => ({
        ...prev,
        data: { ...prev.data, [key]: data },
        loading: { ...prev.loading, [key]: false },
        errors: { ...prev.errors, [key]: null },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, [key]: false },
        errors: { ...prev.errors, [key]: error as Error },
      }));
    }
  }, []);

  useEffect(() => {
    if (!enabled || items.length === 0) return;

    // Sort items by priority
    const sortedItems = [...items].sort((a, b) => {
      const priorities: LoadPriority[] = ['critical', 'high', 'medium', 'low'];
      return priorities.indexOf(a.priority) - priorities.indexOf(b.priority);
    });

    // Load all items with their respective delays
    sortedItems.forEach((item) => {
      loadItem(item);
    });
  }, [items, enabled, loadItem]);

  const isLoading = Object.values(state.loading).some((loading) => loading);
  const hasErrors = Object.values(state.errors).some((error) => error !== null);

  return {
    ...state,
    isLoading,
    hasErrors,
    getDataByKey: (key: string) => state.data[key],
    isLoadingKey: (key: string) => state.loading[key] || false,
    getErrorByKey: (key: string) => state.errors[key],
  };
};
