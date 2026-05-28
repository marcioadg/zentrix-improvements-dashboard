import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { usePeopleManagement } from '@/hooks/usePeopleManagement';
import { useAnalyzerPermissions } from '@/hooks/useAnalyzerPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyzerService } from '@/services/analyzerService';
import { AnalyzerScore, AnalyzerBar, AnalyzerPerson, AnalyzerColumn, ScoreValue } from '@/types/analyzer';
import { useToast } from '@/hooks/use-toast';
import { requestDeduplicator } from '@/utils/requestDeduplicator';
import { logger } from '@/utils/logger';

export type SortField = 'name' | 'totalScore' | 'meetsBar' | string;
export type SortDirection = 'asc' | 'desc';

// Stable cache keys
const CACHE_KEYS: { readonly SCORES: string; readonly BARS: string } = {
  SCORES: 'analyzer_scores',
  BARS: 'analyzer_bars',
} as const;

export const useSimplifiedAnalyzerData = () => {
  const { currentCompany } = useMultiCompany();
  const { data: strategyData, isLoading: strategyLoading } = useSimpleStrategy();
  const allUsers = usePeopleManagement();
  
  // Include all users for analyzer - show inactive users with visual indicators instead of hiding them
  const users = useMemo(() => {
    return allUsers.users; // Show all users, including inactive ones
  }, [allUsers.users]);
  const { 
    visiblePeople, 
    peopleVisibility,
    canEditScores, 
    canEditBars,
    loading: permissionsLoading 
  } = useAnalyzerPermissions(users);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Stable state
  const [scores, setScores] = useState<AnalyzerScore[]>([]);
  const [bars, setBars] = useState<AnalyzerBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // UI state
  const [showTheBar, setShowTheBar] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Stable references
  const companyId = currentCompany?.id;
  const userId = currentUser?.id;

  // Company-wide core values loading for People Analyzer
  const [companyWideStrategyData, setCompanyWideStrategyData] = useState<any>(null);
  const [loadingCompanyStrategy, setLoadingCompanyStrategy] = useState(false);

  // Load company-wide strategy data to get core values for the analyzer
  useEffect(() => {
    if (!companyId || strategyLoading) return;

    const loadCompanyWideStrategy = async () => {
      setLoadingCompanyStrategy(true);
      logger.log('🏢 AnalyzerData - Loading company-wide strategy for core values');
      
      try {
        const { data, error } = await AnalyzerService.getCompanyStrategicPlans(companyId);
        
        if (error) {
          logger.error('❌ AnalyzerData - Error loading company strategy:', error);
          return;
        }

        // Find the first strategic plan that has core values defined
        const planWithCoreValues = data?.find(plan => 
          plan.plan_data?.coreValues && 
          Array.isArray(plan.plan_data.coreValues) && 
          plan.plan_data.coreValues.length > 0
        );

        if (planWithCoreValues) {
          logger.log('✅ AnalyzerData - Found strategic plan with core values:', {
            teamId: planWithCoreValues.team_id,
            coreValuesCount: planWithCoreValues.plan_data.coreValues.length
          });
          setCompanyWideStrategyData(planWithCoreValues.plan_data);
        } else {
          logger.log('⚠️ AnalyzerData - No strategic plans with core values found');
          setCompanyWideStrategyData(null);
        }
      } catch (err) {
        logger.error('❌ AnalyzerData - Error in company strategy loading:', err);
      } finally {
        setLoadingCompanyStrategy(false);
      }
    };

    loadCompanyWideStrategy();
  }, [companyId, strategyLoading]);

  // Memoized core values with explanations - prioritize company-wide strategy
  const coreValuesWithExplanations = useMemo(() => {
    // Use company-wide strategy data if available, otherwise fall back to team-specific strategy
    const sourceData = companyWideStrategyData || strategyData;
    const isUsingCompanyWide = !!companyWideStrategyData;
    
    if (!sourceData || !sourceData.coreValues || !Array.isArray(sourceData.coreValues)) {
      return [];
    }
    
    const values = sourceData.coreValues
      .filter(cv => {
        const value = typeof cv === 'string' ? cv : cv.value;
        return value && value.trim().length > 0;
      })
      .map(cv => ({
        value: typeof cv === 'string' ? cv : cv.value,
        explanation: typeof cv === 'string' ? '' : (cv.explanation || '')
      }));
    
    logger.log(`✅ AnalyzerData - Loaded ${values.length} core values (${isUsingCompanyWide ? 'company-wide' : 'team-specific'})`);
    return values;
  }, [strategyData?.coreValues, companyWideStrategyData?.coreValues, strategyLoading, loadingCompanyStrategy]);

  // Memoized columns - only recalculate when core values change
  const columns = useMemo((): AnalyzerColumn[] => {
    const coreValueColumns = coreValuesWithExplanations.map(coreValue => ({
      key: `core_value_${coreValue.value}`,
      label: coreValue.value,
      type: 'core_value' as const,
      core_value_name: coreValue.value,
      explanation: coreValue.explanation,
    }));

    return [
      ...coreValueColumns,
      { key: 'gets_it', label: 'Gets It', type: 'gets_it' as const, core_value_name: null },
      { key: 'wants_it', label: 'Wants It', type: 'wants_it' as const, core_value_name: null },
      { key: 'capacity', label: 'Capacity', type: 'capacity' as const, core_value_name: null },
    ];
  }, [coreValuesWithExplanations]);

  // Stable data loading function with deduplication
  const loadData = useCallback(async (companyId: string) => {
    const cacheKey = `${CACHE_KEYS.SCORES}_${CACHE_KEYS.BARS}_${companyId}`;
    
    return requestDeduplicator.deduplicate(cacheKey, async () => {
      const [scoresData, barsData] = await Promise.all([
        AnalyzerService.getScores(companyId),
        AnalyzerService.getBars(companyId),
      ]);
      return { scoresData, barsData };
    });
  }, []);

  // Initial data load effect - only when company changes
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      setError('No company selected');
      return;
    }

    let isCancelled = false;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { scoresData, barsData } = await loadData(companyId);
        
        if (!isCancelled) {
          setScores(scoresData);
          setBars(barsData);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
          setError(errorMessage);
          logger.error('Error loading analyzer data:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [companyId, loadData]);

  // Stable refresh function
  const refreshData = useCallback(async () => {
    if (!companyId) return;

    setIsRefreshing(true);
    
    // Clear cache for this company
    requestDeduplicator.clearCache(companyId);
    
    try {
      const { scoresData, barsData } = await loadData(companyId);
      setScores(scoresData);
      setBars(barsData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [companyId, loadData, toast]);

  // Build fast lookup maps to speed up analyzer list generation
  const latestScoreByKey = useMemo(() => {
    const map = new Map<string, AnalyzerScore>();
    for (const s of scores) {
      const key = `${s.user_id}|${s.score_type}|${s.core_value_name ?? ''}`;
      const prev = map.get(key);
      if (!prev || new Date(s.updated_at) > new Date(prev.updated_at)) {
        map.set(key, s);
      }
    }
    return map;
  }, [scores]);

  const latestBarByKey = useMemo(() => {
    const map = new Map<string, AnalyzerBar>();
    for (const b of bars) {
      const key = `${b.score_type}|${b.core_value_name ?? ''}`;
      const prev = map.get(key);
      if (!prev || new Date(b.updated_at) > new Date(prev.updated_at)) {
        map.set(key, b);
      }
    }
    return map;
  }, [bars]);

  const visibilityByUserId = useMemo(() => {
    const map = new Map<string, (typeof peopleVisibility)[number]>();
    for (const v of peopleVisibility) {
      map.set(v.userId, v);
    }
    return map;
  }, [peopleVisibility]);

  // Memoized analyzed people - only recalculate when essential data changes
  const analyzedPeople = useMemo((): AnalyzerPerson[] => {
    if (!visiblePeople.length || !columns.length) return [];

    logger.log('🔍 Analyzer: Processing people data:', visiblePeople.map(p => ({ 
      id: p.id, 
      name: p.full_name, 
      email: p.email,
      permission_level: p.permission_level, 
      role: p.role 
    })));
    
    let processed = visiblePeople.map(person => {
      const personScores: Record<string, ScoreValue> = {};
      // Calculate scores for each column and build score details
      let totalPoints = 0;
      let scoreDetails = [];

      columns.forEach(column => {
        const scoreKey = `${person.id}|${column.type}|${column.core_value_name ?? ''}`;
        const mostRecent = latestScoreByKey.get(scoreKey);
        
        if (mostRecent) {
          personScores[column.key] = mostRecent.score_value;
          
          // Calculate weighted points:
          // "+" (Mais/Sim) = 1/6 = 16.67%
          // "+/-" (Mais ou Menos) = 1/12 = 8.33%
          // "-" (Menos/Não) = 0%
          const score = mostRecent.score_value;
          scoreDetails.push(`${column.key}:${score}`);
          if (score === '+') {
            totalPoints += 1/6; // 16.67% contribution
          } else if (score === '+/-') {
            totalPoints += 1/12; // 8.33% contribution
          }
          // "-" contributes 0 points
        }
      });

      // Check if meets bar
      const meetsBar = columns.every(column => {
        const personScore = personScores[column.key];
        if (!personScore) return false;

        const barKey = `${column.type}|${column.core_value_name ?? ''}`;
        const mostRecentBar = latestBarByKey.get(barKey);

        if (!mostRecentBar) return true;
        
        return AnalyzerService.meetsRequirement(personScore, mostRecentBar.required_score);
      });

      const visibility = visibilityByUserId.get(person.id);
      logger.log(`Person ${person.full_name}: scores [${scoreDetails.join(', ')}] = ${totalPoints} points = ${Math.round(totalPoints * 100)}%`);
      const totalScorePercentage = Math.round(totalPoints * 100);
      
      // Check if person is active - use status field from the RPC
      const isActive = (person as any).status !== 'inactive';
      logger.log(`Person ${person.full_name}: status="${(person as any).status}", permission_level="${person.permission_level}", role="${person.role}", is_active=${isActive}`);

      return {
        id: person.id,
        full_name: person.full_name,
        email: person.email,
        role: person.role || 'member',
        is_active: isActive,
        scores: personScores,
        totalScore: totalScorePercentage,
        meetsBar,
        visibilityLabel: visibility?.visibilityLabel || 'hidden',
        visibleToCount: visibility?.visibleToCount || 0,
        visiblePeople: visibility?.visiblePeople || [],
      };
    });

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      processed = processed.filter(person =>
        person.full_name.toLowerCase().includes(searchLower) ||
        person.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting with inactive members always at the bottom
    processed.sort((a, b) => {
      // Always put inactive members at the bottom
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1; // Active first (-1), inactive last (1)
      }
      
      // Within the same activity status, apply normal sorting
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
          break;
        case 'totalScore':
          aValue = a.totalScore;
          bValue = b.totalScore;
          break;
        case 'meetsBar':
          aValue = a.meetsBar ? 1 : 0;
          bValue = b.meetsBar ? 1 : 0;
          break;
        default:
          aValue = a.scores[sortField] || '';
          bValue = b.scores[sortField] || '';
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return processed;
  }, [visiblePeople, columns, scores, bars, peopleVisibility, searchTerm, sortField, sortDirection]);

  // Sort handler
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Update score function
  const updateScore = useCallback(async (userId: string, columnKey: string, scoreValue: ScoreValue) => {
    if (!companyId || !currentUser?.id) return;

    try {
      const column = columns.find(c => c.key === columnKey);
      if (!column) return;

      await AnalyzerService.updateScore(
        userId,
        companyId,
        column.type,
        column.core_value_name,
        scoreValue,
        currentUser.id
      );

      // Refresh data after update
      await refreshData();

      toast({
        title: 'Score Updated',
        description: 'The score has been updated successfully.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update score. Please try again.',
        variant: 'destructive',
      });
    }
  }, [companyId, currentUser?.id, columns, refreshData, toast]);

  // Update bar function
  const updateBar = useCallback(async (columnKey: string, requiredScore: ScoreValue) => {
    if (!companyId) return;

    try {
      const column = columns.find(c => c.key === columnKey);
      if (!column) return;

      await AnalyzerService.updateBar(
        companyId,
        column.type,
        column.core_value_name,
        requiredScore
      );

      // Refresh data after update
      await refreshData();

      toast({
        title: 'Bar Updated',
        description: 'The bar requirement has been updated successfully.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update bar. Please try again.',
        variant: 'destructive',
      });
    }
  }, [companyId, columns, refreshData, toast]);

  // Debug info - now includes the missing properties
  const debugInfo = useMemo(() => ({
    userAuthenticated: !!currentUser,
    currentCompanyId: companyId,
    usersCount: users.length, // All users count (including inactive)
    activeUsersCount: users.filter(u => (u as any).status !== 'inactive').length, // Active users count
    allUsersCount: allUsers.users.length, // Same as usersCount since we're showing all users
    visiblePeopleCount: visiblePeople.length,
    coreValuesCount: coreValuesWithExplanations.length,
    scoresCount: scores.length,
    barsCount: bars.length,
    columnsCount: columns.length,
    loading: loading || loadingCompanyStrategy,
    error,
    strategyDataLoaded: !!strategyData && !strategyLoading,
    companyStrategyLoaded: !!companyWideStrategyData && !loadingCompanyStrategy,
    usingCompanyWideStrategy: !!companyWideStrategyData,
    permissionsLoaded: !permissionsLoading,
  }), [currentUser, companyId, users.length, allUsers.users.length, visiblePeople.length, 
       coreValuesWithExplanations.length, scores.length, bars.length,
       columns.length, loading, loadingCompanyStrategy, error, strategyData, strategyLoading, 
       companyWideStrategyData, loadingCompanyStrategy, permissionsLoading]);

  return {
    // Data
    columns,
    analyzedPeople,
    bars,
    
    // Loading states
    loading,
    isRefreshing,
    error,
    
    // UI state
    showTheBar,
    setShowTheBar,
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    handleSort,
    
    // Permissions
    canEditScores,
    canEditBars,
    
    // Operations
    updateScore,
    updateBar,
    refreshData,
    
    // Debug info
    debugInfo,
  };
};
