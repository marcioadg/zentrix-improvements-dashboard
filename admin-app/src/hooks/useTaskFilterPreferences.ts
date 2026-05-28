
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';

export interface TaskFilterPreferences {
  sortBy: 'due_date' | 'created_at';
  sortOrder: 'asc' | 'desc';
  showArchived: boolean;
  myTasksOnly: boolean;
}

const STORAGE_KEY = 'task-filter-preferences';

const defaultPreferences: TaskFilterPreferences = {
  sortBy: 'due_date',
  sortOrder: 'asc',
  showArchived: false,
  myTasksOnly: true, // Changed from false to true
};

export const useTaskFilterPreferences = () => {
  const [preferences, setPreferences] = useState<TaskFilterPreferences>(defaultPreferences);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
      }
    } catch (error) {
      logger.error('Error loading task filter preferences:', error);
    }
  }, []);

  const updatePreferences = (updates: Partial<TaskFilterPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      logger.error('Error saving task filter preferences:', error);
    }
  };

  return {
    preferences,
    updatePreferences,
  };
};
