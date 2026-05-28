import React from 'react';
import { useAnalyzerPermissions } from '@/hooks/useAnalyzerPermissions';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useQuickPermissionCheck } from '@/hooks/useQuickPermissionCheck';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { AnalyzerService } from '@/services/analyzerService';
import { AnalyzerScore, AnalyzerBar, AnalyzerColumn, AnalyzerPerson, ScoreValue } from '@/types/analyzer';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { AnalyzerFilters } from '../analyzer/AnalyzerFilters';
import { AnalyzerTable } from '../analyzer/AnalyzerTable';
import { AnalyzerDebugPanel } from '../analyzer/AnalyzerDebugPanel';
import { AnalyzerEmptyState } from '../analyzer/AnalyzerEmptyState';
import { AnalyzerReminderDialog } from '../analyzer/AnalyzerReminderDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Target, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasDirectorAccess } from '@/utils/permissionMapping';
import { trackPeopleAnalyzerStarted, trackPeopleAnalyzerCompleted } from '@/lib/statsigAnalytics';
import { logger } from '@/utils/logger';
export const AnalyzerTab: React.FC = React.memo(() => {
  logger.log('📊 AnalyzerTab: Component rendering');
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const {
    profile
  } = useProfile();
  const {
    currentCompany
  } = useMultiCompany();
  const {
    data: strategyData,
    isLoading: strategyLoading
  } = useSimpleStrategy();
  const {
    hasBasicAccess,
    loading: permissionsLoading
  } = useQuickPermissionCheck();
  const {
    users
  } = useUserManagement();
  const {
    visiblePeople,
    peopleVisibility,
    canEditScores: permissionsCanEditScores,
    canEditBars: permissionsCanEditBars,
    loading: analyzerPermissionsLoading,
    userOrgRole
  } = useAnalyzerPermissions(users);

  // State for reminder dialog
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  // Local state for analyzer data
  const [scores, setScores] = useState<AnalyzerScore[]>([]);
  const [bars, setBars] = useState<AnalyzerBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTheBar, setShowTheBar] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'totalScore' | 'meetsBar' | 'lastUpdated' | string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // NEW: State for selected evaluation date per user
  const [selectedEvaluationDates, setSelectedEvaluationDates] = useState<Record<string, string>>({});
  
  // NEW: State for available dates per user
  const [availableDatesPerUser, setAvailableDatesPerUser] = useState<Record<string, string[]>>({});
  const companyId = currentCompany?.id;
  const userId = user?.id;
  const hasVisiblePeople = visiblePeople.length > 0;

  // Analytics tracking refs
  const hasStartedAnalyzerRef = useRef(false);
  const hasCompletedAnalyzerRef = useRef(false);
  const evaluatedUsersRef = useRef<Set<string>>(new Set());

  // Load company-wide strategy for core values
  const [companyWideStrategyData, setCompanyWideStrategyData] = useState<any>(null);
  const [loadingCompanyStrategy, setLoadingCompanyStrategy] = useState(false);
  useEffect(() => {
    if (!companyId) return;
    const loadCompanyWideStrategy = async () => {
      setLoadingCompanyStrategy(true);
      try {
        const {
          data,
          error
        } = await AnalyzerService.getCompanyStrategicPlans(companyId);
        if (error) {
          logger.error('❌ Error loading company strategy:', error);
          return;
        }
        const planWithCoreValues = data?.find(plan => plan.plan_data?.coreValues && Array.isArray(plan.plan_data.coreValues) && plan.plan_data.coreValues.length > 0);
        if (planWithCoreValues) {
          setCompanyWideStrategyData(planWithCoreValues.plan_data);
        } else {
          setCompanyWideStrategyData(null);
        }
      } catch (err) {
        logger.error('❌ Error in company strategy loading:', err);
      } finally {
        setLoadingCompanyStrategy(false);
      }
    };
    loadCompanyWideStrategy();
  }, [companyId]);

  // Core values from strategy
  const coreValuesWithExplanations = useMemo(() => {
    const sourceData = companyWideStrategyData || strategyData;
    if (!sourceData || !sourceData.coreValues || !Array.isArray(sourceData.coreValues)) {
      return [];
    }
    return sourceData.coreValues.filter(cv => {
      const value = typeof cv === 'string' ? cv : cv.value;
      return value && value.trim().length > 0;
    }).map(cv => ({
      value: typeof cv === 'string' ? cv : cv.value,
      explanation: typeof cv === 'string' ? '' : cv.explanation || ''
    }));
  }, [strategyData, companyWideStrategyData]);

  // Generate columns
  const columns = useMemo((): AnalyzerColumn[] => {
    const coreValueColumns = coreValuesWithExplanations.map(coreValue => ({
      key: `core_value_${coreValue.value}`,
      label: coreValue.value,
      type: 'core_value' as const,
      core_value_name: coreValue.value,
      explanation: coreValue.explanation
    }));
    return [...coreValueColumns, {
      key: 'gets_it',
      label: 'Gets It',
      type: 'gets_it' as const,
      core_value_name: null
    }, {
      key: 'wants_it',
      label: 'Wants It',
      type: 'wants_it' as const,
      core_value_name: null
    }, {
      key: 'capacity',
      label: 'Capacity',
      type: 'capacity' as const,
      core_value_name: null
    }];
  }, [coreValuesWithExplanations]);

  // Load scores and bars when we have visible people
  useEffect(() => {
    if (!companyId || !hasVisiblePeople) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userIds = visiblePeople.map(p => p.id);
        
        // OPTIMIZED: Fetch all data in parallel including batch evaluation dates
        const [scoresData, barsData, datesMap] = await Promise.all([
          AnalyzerService.getScores(companyId), 
          AnalyzerService.getBars(companyId),
          AnalyzerService.getEvaluationDatesForUsers(userIds, companyId)
        ]);
        
        setScores(scoresData);
        setBars(barsData);
        setAvailableDatesPerUser(datesMap);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        logger.error('Error loading analyzer data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId, hasVisiblePeople, visiblePeople]);

  // Build fast lookup maps for scores and bars
  const latestScoreByKey = useMemo(() => {
    const map = new Map<string, AnalyzerScore>();
    
    logger.log('🔍 latestScoreByKey: Processing scores', {
      totalScores: scores.length,
      selectedDates: selectedEvaluationDates
    });
    
    for (const s of scores) {
      const key = `${s.user_id}|${s.score_type}|${s.core_value_name ?? ''}`;
      
      // NEW: Filter by selected evaluation date if one is selected for this user
      const selectedDate = selectedEvaluationDates[s.user_id];
      if (selectedDate) {
        logger.log('🔍 Filtering score:', {
          key,
          scoreEvaluationDate: s.evaluation_date,
          selectedDate,
          matches: s.evaluation_date === selectedDate
        });
        
        if (s.evaluation_date !== selectedDate) {
          continue; // Skip scores not matching selected date
        }
      }
      
      // If no date selected, use most recent (existing behavior)
      // If date selected, use most recent FROM THAT DATE
      const prev = map.get(key);
      if (!prev || new Date(s.updated_at) > new Date(prev.updated_at)) {
        map.set(key, s);
      }
    }
    
    logger.log('🔍 latestScoreByKey: Result map size', map.size);
    return map;
  }, [scores, selectedEvaluationDates]);
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

  // Get analyzed people data - transform visible people to analyzer format
  const analyzedPeople = useMemo(() => {
    if (!visiblePeople.length || !columns.length) return [];
    logger.log('🔍 AnalyzerTab: Processing visible people data:', visiblePeople.map(p => ({
      id: p.id,
      name: p.full_name,
      role: p.role,
      active: p.status !== 'inactive'
    })));
    return visiblePeople.map(person => {
      const personScores: Record<string, ScoreValue> = {};
      let totalPoints = 0;
      let lastUpdatedDate: Date | null = null;
      
      // NEW: Get selected date for this person
      const selectedDate = selectedEvaluationDates[person.id];
      
      columns.forEach(column => {
        const scoreKey = `${person.id}|${column.type}|${column.core_value_name ?? ''}`;
        const mostRecent = latestScoreByKey.get(scoreKey);
        if (mostRecent) {
          personScores[column.key] = mostRecent.score_value;

          // Track most recent updated_at OR use selected evaluation_date
          if (selectedDate) {
            // If a date is selected, use that date as lastUpdated
            // Parse YYYY-MM-DD directly to avoid timezone issues
            const [year, month, day] = selectedDate.split('-').map(Number);
            const selectedDateObj = new Date(year, month - 1, day);
            if (!lastUpdatedDate || selectedDateObj > lastUpdatedDate) {
              lastUpdatedDate = selectedDateObj;
            }
          } else {
            // If no date selected, use updated_at (existing behavior)
            const scoreUpdatedAt = new Date(mostRecent.updated_at);
            if (!lastUpdatedDate || scoreUpdatedAt > lastUpdatedDate) {
              lastUpdatedDate = scoreUpdatedAt;
            }
          }

          // Calculate weighted points
          const score = mostRecent.score_value;
          if (score === '+') {
            totalPoints += 1 / 6; // 16.67% contribution
          } else if (score === '+/-') {
            totalPoints += 1 / 12; // 8.33% contribution
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
      const totalScorePercentage = Math.round(totalPoints * 100);

      // Check if person is active
      const isActive = (person as any).status !== 'inactive';
      // Find the visibility data for this person
      const personVisibility = peopleVisibility.find(pv => pv.userId === person.id);

      return {
        id: person.id,
        full_name: person.full_name,
        email: person.email,
        role: person.role || 'member',
        is_active: isActive,
        scores: personScores,
        totalScore: totalScorePercentage,
        meetsBar,
        visibilityLabel: personVisibility?.visibilityLabel || 'Unknown',
        visibleToCount: personVisibility?.visibleToCount || 0,
        visiblePeople: personVisibility?.visiblePeople || [],
        lastUpdated: lastUpdatedDate?.toISOString() || undefined
      };
    });
  }, [visiblePeople, columns, scores, bars, coreValuesWithExplanations, peopleVisibility, selectedEvaluationDates, latestScoreByKey]);
  logger.log('🔍 AnalyzerTab: Analyzed people count:', analyzedPeople.length, 'from visible people:', visiblePeople.length);

  // Apply search and sorting
  const processedPeople = useMemo(() => {
    logger.log('🔍 Processing people - search term:', searchTerm, 'people count:', analyzedPeople.length);
    let processed = [...analyzedPeople];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      processed = processed.filter(person => {
        const name = person.full_name?.toLowerCase() || '';
        const email = person.email?.toLowerCase() || '';
        const matches = name.includes(searchLower) || email.includes(searchLower);
        return matches;
      });
      logger.log('🔍 After search filter:', processed.length, 'people match');
    }

    // Apply sorting
    processed.sort((a, b) => {
      // Always put inactive members at the bottom
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
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
        case 'lastUpdated':
          aValue = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          bValue = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
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
  }, [analyzedPeople, searchTerm, sortField, sortDirection]);

  // Navigation handlers
  const handleNavigateToStrategy = useCallback(() => {
    navigate('/strategy');
  }, [navigate]);
  const handleNavigateToOrgChart = useCallback(() => {
    navigate('/org-chart');
  }, [navigate]);
  const handleRefresh = useCallback(async () => {
    if (!companyId || !hasVisiblePeople) return;
    try {
      const userIds = visiblePeople.map(p => p.id);
      
      // OPTIMIZED: Fetch all data in parallel including batch evaluation dates
      const [scoresData, barsData, datesMap] = await Promise.all([
        AnalyzerService.getScores(companyId), 
        AnalyzerService.getBars(companyId),
        AnalyzerService.getEvaluationDatesForUsers(userIds, companyId)
      ]);
      
      setScores(scoresData);
      setBars(barsData);
      setAvailableDatesPerUser(datesMap);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  }, [companyId, hasVisiblePeople, visiblePeople, toast]);

  // Sort handler
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // NEW: Handler for date selection
  const handleEvaluationDateChange = useCallback((userId: string, date: string | null) => {
    setSelectedEvaluationDates(prev => {
      if (date === null) {
        const { [userId]: _, ...rest } = prev;
        return rest; // Remove selection for this user
      }
      return { ...prev, [userId]: date };
    });
  }, []);

  // Update score function
  const updateScore = useCallback(async (targetUserId: string, columnKey: string, scoreValue: ScoreValue) => {
    if (!companyId || !user?.id) return;
    try {
      const column = columns.find(c => c.key === columnKey);
      if (!column) return;

      // Track people_analyzer_started on FIRST score update (evaluation started)
      if (!hasStartedAnalyzerRef.current) {
        hasStartedAnalyzerRef.current = true;
        try {
          trackPeopleAnalyzerStarted({
            user_id: user.id,
            company_id: companyId,
            team_size: visiblePeople.length,
          });
          logger.log('📊 Analytics: people_analyzer_started tracked');
        } catch (e) {
          // Non-blocking
        }
      }

      await AnalyzerService.updateScore(targetUserId, companyId, column.type, column.core_value_name, scoreValue, user.id);

      // Refresh data after update to get latest scores
      await handleRefresh();

      // After refresh, check if this user is now FULLY evaluated (all columns have a score)
      // We need to wait for scores state to be updated, so we fetch fresh data
      const freshScores = await AnalyzerService.getScores(companyId);
      const userScores = freshScores.filter(s => s.user_id === targetUserId);
      
      // Check if ALL columns have a score for this user
      const isFullyEvaluated = columns.every(col => {
        return userScores.some(s => 
          s.score_type === col.type && 
          (s.core_value_name ?? '') === (col.core_value_name ?? '') &&
          s.score_value // Has an actual value
        );
      });

      if (isFullyEvaluated && !evaluatedUsersRef.current.has(targetUserId)) {
        evaluatedUsersRef.current.add(targetUserId);
        logger.log('📊 Analytics: User fully evaluated:', targetUserId, 'Total:', evaluatedUsersRef.current.size, '/', visiblePeople.length);
        
        // Check for 80% completion (80% of visible people have ALL fields filled)
        const completionPercentage = (evaluatedUsersRef.current.size / visiblePeople.length) * 100;
        
        if (completionPercentage >= 80 && !hasCompletedAnalyzerRef.current) {
          hasCompletedAnalyzerRef.current = true;
          try {
            trackPeopleAnalyzerCompleted({
              user_id: user.id,
              company_id: companyId,
              people_assessed: evaluatedUsersRef.current.size,
            });
            logger.log('📊 Analytics: people_analyzer_completed tracked (80% threshold reached)');
          } catch (e) {
            // Non-blocking
          }
        }
      }

      toast({
        title: 'Score Updated',
        description: 'The score has been updated successfully.'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update score. Please try again.',
        variant: 'destructive'
      });
    }
  }, [companyId, user?.id, columns, handleRefresh, toast, visiblePeople.length]);

  // Update bar function
  const updateBar = useCallback(async (columnKey: string, requiredScore: ScoreValue) => {
    if (!companyId) return;
    try {
      const column = columns.find(c => c.key === columnKey);
      if (!column) return;
      await AnalyzerService.updateBar(companyId, column.type, column.core_value_name, requiredScore);

      // Refresh data after update
      await handleRefresh();
      toast({
        title: 'Bar Updated',
        description: 'The bar requirement has been updated successfully.'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update bar. Please try again.',
        variant: 'destructive'
      });
    }
  }, [companyId, columns, handleRefresh, toast]);

  // Statistics
  const stats = useMemo(() => {
    const activePeople = processedPeople.filter(person => person.is_active);
    const evaluatedPeople = activePeople.filter(person => Object.keys(person.scores).length > 0);
    const totalEvaluated = evaluatedPeople.length;
    const meetingBar = evaluatedPeople.filter(p => p.meetsBar).length;
    return {
      totalEvaluated,
      meetingBar,
      totalPeople: activePeople.length
    };
  }, [processedPeople]);

  // Permission checks
  const canEditScores = hasBasicAccess === true && permissionsCanEditScores;
  const canEditBars = hasBasicAccess === true && permissionsCanEditBars;

  // Check if user has director access for reminder button
  const currentUserData = users.find(u => u.id === user?.id);
  const userPermissionLevel = currentUserData?.permission_level || 'member';
  const canSendReminders = hasDirectorAccess(userPermissionLevel as any);

  // Debug info
  const debugInfo = useMemo(() => ({
    userAuthenticated: !!user,
    currentCompanyId: companyId,
    usersCount: visiblePeople.length,
    visiblePeopleCount: visiblePeople.length,
    coreValuesCount: coreValuesWithExplanations.length,
    scoresCount: scores.length,
    barsCount: bars.length,
    columnsCount: columns.length,
    loading: loading || loadingCompanyStrategy || analyzerPermissionsLoading,
    error,
    strategyDataLoaded: !!strategyData && !strategyLoading,
    companyStrategyLoaded: !!companyWideStrategyData && !loadingCompanyStrategy,
    usingCompanyWideStrategy: !!companyWideStrategyData,
    permissionsLoaded: !permissionsLoading && !analyzerPermissionsLoading
  }), [user, companyId, visiblePeople.length, coreValuesWithExplanations.length, scores.length, bars.length, columns.length, loading, loadingCompanyStrategy, analyzerPermissionsLoading, error, strategyData, strategyLoading, companyWideStrategyData, permissionsLoading]);

  // Check permissions loading
  if (permissionsLoading || analyzerPermissionsLoading) {
    return <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
      </div>;
  }

  // Show permission denied if no access
  if (hasBasicAccess === false) {
    return <AnalyzerEmptyState type="no-permissions" onNavigateToStrategy={handleNavigateToStrategy} onRefresh={handleRefresh} onNavigateToOrgChart={handleNavigateToOrgChart} />;
  }

  // Show empty state if no people are visible
  if (!analyzerPermissionsLoading && visiblePeople.length === 0) {
    return <AnalyzerEmptyState type="no-people" onNavigateToStrategy={handleNavigateToStrategy} onRefresh={handleRefresh} onNavigateToOrgChart={handleNavigateToOrgChart} userOrgRole={typeof userOrgRole === 'string' ? userOrgRole : userOrgRole?.title || null} />;
  }

  // Show error state if there's an error
  if (error) {
    return <AnalyzerEmptyState type="loading-error" onNavigateToStrategy={handleNavigateToStrategy} onRefresh={handleRefresh} onNavigateToOrgChart={handleNavigateToOrgChart} />;
  }

  // Check for core values
  if (coreValuesWithExplanations.length === 0) {
    return <AnalyzerEmptyState type="no-core-values" onNavigateToStrategy={handleNavigateToStrategy} onRefresh={handleRefresh} onNavigateToOrgChart={handleNavigateToOrgChart} />;
  }

  // Show data loading
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
      </div>;
  }
  // Reminder button component for directors+
  const reminderButton = canSendReminders && companyId ? (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setReminderDialogOpen(true)}
      className="flex items-center gap-2"
    >
      <Mail className="h-4 w-4" />
      <span className="text-sm">Send Reminder</span>
    </Button>
  ) : undefined;

  return <div className="space-y-6">
      {/* Debug Panel - Show if there are any issues */}
      {error && <AnalyzerDebugPanel debugInfo={debugInfo} />}

      {/* Filters with optional reminder button */}
      <AnalyzerFilters 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        showTheBar={showTheBar} 
        setShowTheBar={setShowTheBar}
        actionButton={reminderButton}
      />

      {/* Main Table */}
      <AnalyzerTable 
        people={processedPeople} 
        columns={columns} 
        bars={bars} 
        showTheBar={showTheBar} 
        canEditScores={canEditScores} 
        canEditBars={canEditBars} 
        onUpdateScore={updateScore} 
        onUpdateBar={updateBar} 
        sortField={sortField} 
        sortDirection={sortDirection} 
        onSort={handleSort}
        selectedEvaluationDates={selectedEvaluationDates}
        availableDatesPerUser={availableDatesPerUser}
        onEvaluationDateChange={handleEvaluationDateChange}
      />

      {/* Reminder Dialog */}
      {companyId && (
        <AnalyzerReminderDialog
          open={reminderDialogOpen}
          onOpenChange={setReminderDialogOpen}
          senderName={profile?.full_name || 'Your manager'}
          companyId={companyId}
        />
      )}
    </div>;
});
AnalyzerTab.displayName = 'AnalyzerTab';