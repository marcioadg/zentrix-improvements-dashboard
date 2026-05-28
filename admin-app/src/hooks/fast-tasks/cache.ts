
import { useRef } from 'react';
import { FastTask, TeamInfo } from './types';

export const useFastTasksCache = () => {
  const tasksCache = useRef<FastTask[]>([]);
  const teamsCache = useRef<TeamInfo[]>([]);
  const lastLoadTime = useRef<number>(0);
  const recentlyCreatedIds = useRef<Set<string>>(new Set());

  const clearCache = () => {
    tasksCache.current = [];
    teamsCache.current = [];
    lastLoadTime.current = 0;
  };

  const isCacheValid = (maxAgeMs: number = 30000): boolean => {
    const now = Date.now();
    return tasksCache.current.length > 0 && 
           teamsCache.current.length > 0 && 
           (now - lastLoadTime.current) < maxAgeMs;
  };

  const updateCache = (tasks: FastTask[], teams: TeamInfo[]) => {
    tasksCache.current = tasks;
    teamsCache.current = teams;
    lastLoadTime.current = Date.now();
  };

  const addRecentlyCreatedId = (id: string) => {
    recentlyCreatedIds.current.add(id);
  };

  const isRecentlyCreated = (id: string): boolean => {
    return recentlyCreatedIds.current.has(id);
  };

  const clearRecentlyCreated = () => {
    recentlyCreatedIds.current.clear();
  };

  return {
    // Getter functions to always read the latest values
    getTasks: () => tasksCache.current,
    getTeams: () => teamsCache.current,
    // Legacy properties (kept for backward compatibility)
    tasksCache: tasksCache.current,
    teamsCache: teamsCache.current,
    clearCache,
    isCacheValid,
    updateCache,
    addRecentlyCreatedId,
    isRecentlyCreated,
    clearRecentlyCreated,
  };
};
