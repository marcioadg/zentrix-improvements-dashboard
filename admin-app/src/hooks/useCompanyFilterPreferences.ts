import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';

export type SortField = 'name' | 'users' | 'teams' | 'metrics' | 'last_login' | 'status' | 'created_at' | 'health_score' | 'usage';
export type SortDirection = 'asc' | 'desc';

export interface CompanyFilterState {
  searchQuery: string;
  showAtRisk: boolean;
  showOrphaned: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
}

export interface SavedCompanyFilter {
  id: string;
  name: string;
  filters: CompanyFilterState;
  createdAt: string;
}

const STORAGE_KEY = 'company-saved-filters';

export const useCompanyFilterPreferences = () => {
  const [savedFilters, setSavedFilters] = useState<SavedCompanyFilter[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedFilters(parsed);
      }
    } catch (error) {
      logger.error('Error loading saved company filters:', error);
    }
  }, []);

  const saveFilter = (name: string, filters: CompanyFilterState) => {
    const newFilter: SavedCompanyFilter = {
      id: `filter-${Date.now()}`,
      name,
      filters,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      logger.error('Error saving company filter:', error);
    }

    return newFilter;
  };

  const deleteFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      logger.error('Error deleting company filter:', error);
    }
  };

  const updateFilter = (id: string, name: string, filters: CompanyFilterState) => {
    const updated = savedFilters.map(f => 
      f.id === id 
        ? { ...f, name, filters }
        : f
    );
    setSavedFilters(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      logger.error('Error updating company filter:', error);
    }
  };

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    updateFilter,
  };
};
