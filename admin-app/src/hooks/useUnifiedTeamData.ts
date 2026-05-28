import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';
import { useTeamSelectionCache } from '@/hooks/useTeamSelectionCache';

// 🎯 PHASE 3: Optimized unified team data with reduced context dependency
export const useUnifiedTeamData = () => {
  const { teams, loading, error, refetch } = useOptimizedUserTeams();
  const { getOptimalSelection, setCachedSelection, clearCache } = useTeamSelectionCache();
  
  // 🎯 PHASE 3: Stabilized company reference to prevent cascade re-renders
  const multiCompanyContext = useMultiCompany();
  const stableCompanyRef = useRef<string | null>(null);
  
  // Only update company reference when ID actually changes
  const stableCompany = useMemo(() => {
    const currentId = multiCompanyContext?.currentCompany?.id || null;
    if (currentId !== stableCompanyRef.current) {
      stableCompanyRef.current = currentId;
      logger.debug('🏢 useUnifiedTeamData: Company reference updated:', currentId);
    }
    return currentId ? { id: currentId } : null;
  }, [multiCompanyContext?.currentCompany?.id]);

  // 🎯 PHASE 3: Throttled team selection state to prevent rapid updates
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🎯 FIX: Guard against infinite loops - track initialization state
  const hasInitializedRef = useRef(false);
  const previousTeamsLengthRef = useRef(0);
  const lastUpdateRef = useRef<number>(0);
  const DEBOUNCE_MS = 100;

  // 🎯 PHASE 3: Memoized team operations to prevent recalculation
  const teamOperations = useMemo(() => {
    const firstTeam = teams[0] || null;
    const currentSelection = teams.find(t => t.id === selectedTeamId) || null;
    const isCurrentSelectionValid = !!currentSelection;
    const hasTeams = teams.length > 0;

    return {
      firstTeam,
      currentSelection,
      isCurrentSelectionValid,
      hasTeams
    };
  }, [teams, selectedTeamId]);

  // 🎯 PHASE 3: Optimized team selection with caching layer
  const selectTeamWithCaching = useCallback((teamId: string | null) => {
    if (!stableCompany?.id) return;

    // Clear any pending selection updates
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }

    // Throttle rapid selections
    selectionTimeoutRef.current = setTimeout(() => {
      setSelectedTeamId(teamId);
      if (teamId) {
        setCachedSelection(stableCompany.id, teamId, teams);
        logger.debug('🔄 useUnifiedTeamData: Selected team:', teams.find(t => t.id === teamId)?.name);
      }
    }, 50); // Minimal delay to batch rapid selections
  }, [stableCompany?.id, setCachedSelection, teams]);

  // 🎯 PHASE 3: Consolidated initialization effect with optimal selection
  // 🎯 FIX: Removed selectedTeamId from deps to break circular dependency
  useEffect(() => {
    // Guard against rapid re-renders
    const now = Date.now();
    if (now - lastUpdateRef.current < DEBOUNCE_MS) {
      return;
    }
    
    if (!stableCompany?.id || !teams.length) {
      setSelectedTeamId(null);
      hasInitializedRef.current = false;
      previousTeamsLengthRef.current = 0;
      return;
    }

    // Only apply optimal selection on:
    // 1. First initialization
    // 2. When teams list actually changes (new teams added/removed)
    const teamsChanged = previousTeamsLengthRef.current !== teams.length;
    previousTeamsLengthRef.current = teams.length;
    
    if (!hasInitializedRef.current || teamsChanged) {
      const optimalTeamId = getOptimalSelection(stableCompany.id, teams);
      
      logger.debug('🎯 useUnifiedTeamData: Applying optimal selection:', {
        optimalTeamId,
        reason: hasInitializedRef.current ? 'teams changed' : 'initial load'
      });
      
      setSelectedTeamId(optimalTeamId);
      lastUpdateRef.current = now;
      
      // Cache the selection after determining it (separated from read)
      if (optimalTeamId) {
        setCachedSelection(stableCompany.id, optimalTeamId, teams);
      }
      
      hasInitializedRef.current = true;
    }
  }, [stableCompany?.id, teams, getOptimalSelection, setCachedSelection]); // Removed selectedTeamId

  // 🎯 PHASE 3: Company change cleanup
  useEffect(() => {
    const currentCompanyId = stableCompany?.id;
    const previousCompanyId = stableCompanyRef.current;
    
    // Clear selection when company changes
    if (previousCompanyId && currentCompanyId !== previousCompanyId) {
      logger.debug('🔄 useUnifiedTeamData: Company changed, clearing selection');
      setSelectedTeamId(null);
      // Optional: clear cache for previous company
      // clearCache(previousCompanyId);
    }
  }, [stableCompany?.id]);

  // 🎯 PHASE 3: Stable team selection function
  const selectTeam = useCallback((teamId: string | null) => {
    if (!teamId) {
      selectTeamWithCaching(null);
      return;
    }

    const targetTeam = teams.find(t => t.id === teamId);
    if (targetTeam) {
      selectTeamWithCaching(teamId);
    } else {
      logger.warn('🚨 useUnifiedTeamData: Invalid team ID provided:', teamId);
      // Fallback to first team
      const firstTeam = teams[0];
      if (firstTeam) {
        selectTeamWithCaching(firstTeam.id);
      }
    }
  }, [teams, selectTeamWithCaching]);

  // 🎯 PHASE 3: Reduced debug logging to prevent console spam
  useEffect(() => {
    const debugThrottle = setTimeout(() => {
      logger.debug('🔍 useUnifiedTeamData hook return:', {
        teamsCount: teams.length,
        selectedTeamId,
        selectedTeamName: teams.find(t => t.id === selectedTeamId)?.name,
        loading,
        companyId: stableCompany?.id
      });
    }, 300); // Throttled debug logging
    
    return () => clearTimeout(debugThrottle);
  }, [teams.length, selectedTeamId, loading, stableCompany?.id]);

  return {
    teams,
    selectedTeamId,
    selectedTeam: teamOperations.currentSelection,
    loading,
    error,
    selectTeam,
    refetch,
  };
};