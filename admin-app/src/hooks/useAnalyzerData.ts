
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { usePeopleManagement } from '@/hooks/usePeopleManagement';
import { useAnalyzerPermissions } from '@/hooks/useAnalyzerPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyzerService } from '@/services/analyzerService';
import { AnalyzerScore, AnalyzerBar, AnalyzerPerson, AnalyzerColumn, ScoreValue } from '@/types/analyzer';
import { useToast } from '@/hooks/use-toast';

export type SortField = 'name' | 'totalScore' | 'meetsBar' | string;
export type SortDirection = 'asc' | 'desc';

export const useAnalyzerData = () => {
  const { currentCompany } = useMultiCompany();
  const { data: strategyData, isLoading: strategyLoading } = useSimpleStrategy();
  const { users, loading: usersLoading } = usePeopleManagement();
  const { 
    visiblePeople, 
    peopleVisibility,
    canEditScores, 
    canEditBars, 
    loading: permissionsLoading 
  } = useAnalyzerPermissions(users);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [scores, setScores] = useState<AnalyzerScore[]>([]);
  const [bars, setBars] = useState<AnalyzerBar[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [showTheBar, setShowTheBar] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Combined loading state - memoized to prevent unnecessary re-renders
  const loading = useMemo(() => 
    permissionsLoading || dataLoading || usersLoading || strategyLoading,
    [permissionsLoading, dataLoading, usersLoading, strategyLoading]
  );

  // Stable company ID reference
  const companyId = useMemo(() => currentCompany?.id, [currentCompany?.id]);
  const userId = useMemo(() => currentUser?.id, [currentUser?.id]);

  // Enhanced debug information - only calculated when needed
  const debugInfo = useMemo(() => ({
    userAuthenticated: !!currentUser,
    currentCompanyId: companyId,
    usersCount: users.length,
    visiblePeopleCount: visiblePeople.length,
    coreValuesCount: strategyData?.coreValues?.length || 0,
    scoresCount: scores.length,
    barsCount: bars.length,
    columnsCount: 0, // Will be calculated below
    loading,
    error: dataError,
    strategyDataLoaded: !!strategyData && !strategyLoading,
    permissionsLoaded: !permissionsLoading,
  }), [currentUser, companyId, users.length, visiblePeople.length, 
       strategyData?.coreValues?.length, strategyLoading, scores.length, bars.length, 
       loading, dataError, permissionsLoading]);

  // Extract core values from strategy data - memoized with stable dependencies
  const coreValues = useMemo(() => {
    if (!strategyData?.coreValues) {
      return [];
    }
    
    return strategyData.coreValues
      .map(cv => typeof cv === 'string' ? cv : cv.value)
      .filter(value => value && value.trim().length > 0);
  }, [strategyData?.coreValues]);

  // Generate columns - memoized to prevent recreation
  const columns = useMemo((): AnalyzerColumn[] => {
    return [
      ...coreValues.map(value => ({
        key: `core_value_${value}`,
        label: value,
        type: 'core_value' as const,
        core_value_name: value,
      })),
      { key: 'gets_it', label: 'Gets It', type: 'gets_it' as const, core_value_name: null },
      { key: 'wants_it', label: 'Wants It', type: 'wants_it' as const, core_value_name: null },
      { key: 'capacity', label: 'Capacity', type: 'capacity' as const, core_value_name: null },
    ];
  }, [coreValues]);

  // Update debug info with columns count - memoized
  const finalDebugInfo = useMemo(() => ({
    ...debugInfo,
    columnsCount: columns.length
  }), [debugInfo, columns.length]);

  // Memoized refresh function to prevent recreation
  const refreshData = useCallback(async () => {
    if (!companyId) {
      setDataError('No company selected');
      return;
    }

    setIsRefreshing(true);
    setDataError(null);
    
    try {
      const [scoresData, barsData] = await Promise.all([
        AnalyzerService.getScores(companyId),
        AnalyzerService.getBars(companyId),
      ]);
      
      setScores(scoresData);
      setBars(barsData);
      setDataError(null);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      setDataError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [companyId, toast]);

  // Initial data loading effect
  useEffect(() => {
    if (!companyId) {
      setDataLoading(false);
      setDataError('No company selected');
      return;
    }

    const loadData = async () => {
      setDataLoading(true);
      setDataError(null);
      
      try {
        const [scoresData, barsData] = await Promise.all([
          AnalyzerService.getScores(companyId),
          AnalyzerService.getBars(companyId),
        ]);
        
        setScores(scoresData);
        setBars(barsData);
        setDataError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        setDataError(errorMessage);
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [companyId, toast]);

  // Optimized analyzed people calculation with better memoization
  const analyzedPeople = useMemo((): AnalyzerPerson[] => {
    if (visiblePeople.length === 0 || columns.length === 0) {
      return [];
    }

    let peopleWithScores = visiblePeople.map(person => {
      const personScores: Record<string, ScoreValue> = {};
      let totalScore = 0;
      let scoreCount = 0;

      columns.forEach(column => {
        const matchingScores = scores.filter(s => 
          s.user_id === person.id && 
          s.score_type === column.type &&
          s.core_value_name === column.core_value_name
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        
        const mostRecentScore = matchingScores[0];
        
        if (mostRecentScore) {
          personScores[column.key] = mostRecentScore.score_value;
          totalScore += AnalyzerService.getScorePoints(mostRecentScore.score_value);
          scoreCount++;
        }
      });

      const meetsBar = columns.every(column => {
        const personScore = personScores[column.key];
        if (!personScore) return false;

        const matchingBars = bars.filter(b => 
          b.score_type === column.type &&
          b.core_value_name === column.core_value_name
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        const mostRecentBar = matchingBars[0];
        
        if (!mostRecentBar) return true;
        return AnalyzerService.meetsRequirement(personScore, mostRecentBar.required_score);
      });

      const visibility = peopleVisibility.find(v => v.userId === person.id);
      const totalScorePercentage = scoreCount > 0 ? Math.round((totalScore / (scoreCount * 3)) * 100) : 0;

      return {
        id: person.id,
        full_name: person.full_name,
        email: person.email,
        role: person.role || 'member',
        scores: personScores,
        totalScore: totalScorePercentage,
        meetsBar,
        visibilityLabel: visibility ? 'visible' : 'hidden',
        visibleToCount: visibility ? 1 : 0,
      };
    });

    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      peopleWithScores = peopleWithScores.filter(person =>
        person.full_name.toLowerCase().includes(lowerSearchTerm) ||
        person.email.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Apply sorting
    peopleWithScores.sort((a, b) => {
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
          // Sort by specific column score
          aValue = a.scores[sortField] || '';
          bValue = b.scores[sortField] || '';
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return peopleWithScores;
  }, [visiblePeople, columns, scores, bars, peopleVisibility, searchTerm, sortField, sortDirection]);

  // Memoized sort handler
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Memoized update score function
  const updateScore = useCallback(async (userId: string, columnKey: string, scoreValue: ScoreValue) => {
    if (!companyId || !currentUser?.id) return;

    try {
      const column = columns.find(c => c.key === columnKey);
      if (!column) return;

      await AnalyzerService.updateScore(
        companyId,
        userId,
        column.type,
        column.core_value_name,
        scoreValue,
        currentUser.id
      );

      // Refresh scores to get updated data
      const newScores = await AnalyzerService.getScores(companyId);
      setScores(newScores);

      toast({
        title: 'Score Updated',
        description: 'The score has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update score. Please try again.',
        variant: 'destructive',
      });
    }
  }, [companyId, currentUser?.id, columns, toast]);

  // Memoized update bar function
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

      // Refresh bars to get updated data
      const newBars = await AnalyzerService.getBars(companyId);
      setBars(newBars);

      toast({
        title: 'Bar Updated',
        description: 'The bar requirement has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update bar. Please try again.',
        variant: 'destructive',
      });
    }
  }, [companyId, columns, toast]);

  return {
    // Data
    columns,
    analyzedPeople,
    bars,
    
    // Loading states
    loading,
    isRefreshing,
    error: dataError,
    
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
    debugInfo: finalDebugInfo,
  };
};
