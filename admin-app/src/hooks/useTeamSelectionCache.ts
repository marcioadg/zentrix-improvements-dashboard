/**
 * 🎯 PHASE 3: Team Selection Caching Layer
 * Reduces localStorage write frequency and provides stable team selection
 */

import { useRef, useCallback, useMemo } from 'react';
import { logger } from '@/utils/logger';

interface TeamSelectionCache {
  [companyId: string]: {
    selectedTeamId: string | null;
    lastUpdated: number;
    teams: Array<{ id: string; name: string }>;
  };
}

// Global cache to persist across component unmounts
const globalTeamCache: TeamSelectionCache = {};
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const WRITE_DEBOUNCE_MS = 500; // Reduce localStorage writes

export const useTeamSelectionCache = () => {
  const writeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get cached team selection for a company
  const getCachedSelection = useCallback((companyId: string): string | null => {
    const cached = globalTeamCache[companyId];
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.lastUpdated > CACHE_EXPIRY_MS) {
      delete globalTeamCache[companyId];
      return null;
    }

    return cached.selectedTeamId;
  }, []);

  // Set cached team selection with write debouncing
  const setCachedSelection = useCallback((
    companyId: string, 
    teamId: string | null, 
    teams: Array<{ id: string; name: string }>
  ) => {
    // Update in-memory cache immediately
    globalTeamCache[companyId] = {
      selectedTeamId: teamId,
      lastUpdated: Date.now(),
      teams: teams.slice(0, 10) // Limit cache size
    };

    // Debounce localStorage writes
    if (writeTimeoutRef.current) {
      clearTimeout(writeTimeoutRef.current);
    }

    writeTimeoutRef.current = setTimeout(() => {
      try {
        const storageKey = `unified-selected-team-id-${companyId}`;
        if (teamId) {
          localStorage.setItem(storageKey, teamId);
        } else {
          localStorage.removeItem(storageKey);
        }
        logger.debug('🔄 TeamCache: Persisted selection:', { companyId, teamId });
      } catch (error) {
        logger.warn('🚨 TeamCache: localStorage write failed:', error);
      }
    }, WRITE_DEBOUNCE_MS);
  }, []);

  // Get persisted selection from localStorage (fallback)
  const getPersistedSelection = useCallback((companyId: string): string | null => {
    try {
      const storageKey = `unified-selected-team-id-${companyId}`;
      return localStorage.getItem(storageKey);
    } catch (error) {
      logger.warn('🚨 TeamCache: localStorage read failed:', error);
      return null;
    }
  }, []);

  // Smart selection priority: cache → localStorage → first team
  // 🎯 PURE FUNCTION: No side effects - caller handles caching
  const getOptimalSelection = useCallback((
    companyId: string,
    availableTeams: Array<{ id: string; name: string }>
  ): string | null => {
    if (!companyId || availableTeams.length === 0) return null;

    // Priority 1: In-memory cache
    const cached = getCachedSelection(companyId);
    if (cached && availableTeams.some(t => t.id === cached)) {
      logger.debug('🎯 TeamCache: Using cached selection:', cached);
      return cached;
    }

    // Priority 2: localStorage fallback
    const persisted = getPersistedSelection(companyId);
    if (persisted && availableTeams.some(t => t.id === persisted)) {
      logger.debug('🔄 TeamCache: Found in localStorage:', persisted);
      return persisted;
    }

    // Priority 3: First available team
    const firstTeam = availableTeams[0];
    if (firstTeam) {
      logger.debug('🆕 TeamCache: Will use first team:', firstTeam.name);
      return firstTeam.id;
    }

    return null;
  }, [getCachedSelection, getPersistedSelection]); // Removed setCachedSelection - now pure

  // Clear cache for company switch
  const clearCache = useCallback((companyId?: string) => {
    if (companyId) {
      delete globalTeamCache[companyId];
      logger.debug('🧹 TeamCache: Cleared cache for company:', companyId);
    } else {
      Object.keys(globalTeamCache).forEach(key => delete globalTeamCache[key]);
      logger.debug('🧹 TeamCache: Cleared all cache');
    }
  }, []);

  // Get cache stats for debugging
  const getCacheStats = useCallback(() => {
    return {
      cachedCompanies: Object.keys(globalTeamCache).length,
      totalCacheSize: Object.values(globalTeamCache).reduce((sum, cache) => sum + cache.teams.length, 0)
    };
  }, []);

  return {
    getOptimalSelection,
    setCachedSelection,
    clearCache,
    getCacheStats
  };
};