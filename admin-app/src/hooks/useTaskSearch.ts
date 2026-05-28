

import { useState, useMemo } from 'react';
import { FastTask } from '@/hooks/useFastTasks';
import { logger } from '@/utils/logger';

export const useTaskSearch = (tasks: FastTask[]) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) {
      return tasks;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    const filtered = tasks.filter(task => {
      // Search in title
      if (task.title?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in description
      if (task.description?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in team name
      if (task.teamName?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in status
      if (task.status?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      return false;
    });

    logger.log('🔍 useTaskSearch: Search results:', {
      searchTerm,
      totalTasks: tasks.length,
      filteredTasks: filtered.length,
      teamMatches: filtered.filter(t => t.teamName?.toLowerCase().includes(searchLower)).length,
      sampleTeamNames: tasks.slice(0, 5).map(t => t.teamName).filter(Boolean)
    });
    
    return filtered;
  }, [tasks, searchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    filteredTasks,
    hasActiveSearch: searchTerm.trim().length > 0
  };
};

