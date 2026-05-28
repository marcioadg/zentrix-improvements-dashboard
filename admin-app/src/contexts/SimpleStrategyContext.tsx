import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useSimpleStrategyPersistence } from '@/hooks/useSimpleStrategyPersistence';
import { useVTOAnalytics } from '@/hooks/useVTOAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import { 
  StrategyData as BaseStrategyData, 
  CoreValue, 
  QuarterlyPriority, 
  Issue, 
  SwotData, 
  SwotItem 
} from './StrategyContext';

// Export the types that are being used in other components
export type { QuarterlyPriority, SwotData, SwotItem };

// New type for quarterly goals
export interface QuarterlyGoals {
  revenue: string;
  profit: string;
  metricTargets: MetricTarget[];
  targetDate?: Date;
}

// New type for metric targets
export interface MetricTarget {
  id: string;
  name: string;
  target: string;
}

// New type for yearly goals 
export interface YearlyGoal {
  id: string;
  text: string;
  completed: boolean;
  description?: string;
}

// Extended StrategyData type with niche property and quarterly goals
export interface StrategyData extends BaseStrategyData {
  niche: string;
  quarterlyGoals: QuarterlyGoals;
  yearlyGoals: YearlyGoal[];
  hiddenLeadershipQuarterlyMetricIds?: string[];
  hiddenLeadershipAnnualMetricIds?: string[];
  hiddenLeadershipYearlyGoalIds?: string[];
}

// New type for deliverable items
export interface DeliverableItem {
  id: string;
  text: string;
  completed?: boolean;
}

interface SimpleStrategyContextType {
  data: StrategyData;
  updateData: (updates: Partial<StrategyData>) => void;
  isPreviewing: boolean;
  isHydrated: boolean;
  addCoreValue: (value: string, explanation?: string) => void;
  removeCoreValue: (id: string) => void;
  updateCoreValue: (id: string, value: string, explanation?: string) => void;
  addQuarterlyPriority: (priority: Omit<QuarterlyPriority, 'id'>) => void;
  updateQuarterlyPriority: (id: string, updates: Partial<QuarterlyPriority>) => void;
  removeQuarterlyPriority: (id: string) => void;
  addIssue: (issue: Omit<Issue, 'id'>) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  removeIssue: (id: string) => void;
  addSwotItem: (category: keyof SwotData, text: string) => void;
  updateSwotItem: (category: keyof SwotData, id: string, text: string) => void;
  removeSwotItem: (category: keyof SwotData, id: string) => void;
  reorderSwotItems: (category: keyof SwotData, itemIds: string[]) => void;
  addDeliverable: (text: string) => void;
  updateDeliverable: (id: string, text: string) => void;
  removeDeliverable: (id: string) => void;
  updateQuarterlyGoals: (updates: Partial<QuarterlyGoals>) => void;
  updateThreeYearDate: (date: Date | undefined) => void;
  updateOneYearDate: (date: Date | undefined) => void;
  addMetricTarget: (name: string, target: string) => void;
  updateMetricTarget: (id: string, updates: Partial<MetricTarget>) => void;
  removeMetricTarget: (id: string) => void;
  addAnnualMetricTarget: (name: string, target: string) => void;
  updateAnnualMetricTarget: (id: string, updates: Partial<MetricTarget>) => void;
  removeAnnualMetricTarget: (id: string) => void;
  addThreeYearMetricTarget: (name: string, target: string) => void;
  updateThreeYearMetricTarget: (id: string, updates: Partial<MetricTarget>) => void;
  removeThreeYearMetricTarget: (id: string) => void;
  addYearlyGoal: (text: string) => void;
  updateYearlyGoal: (id: string, text: string) => void;
  updateYearlyGoalDescription: (id: string, description: string) => void;
  toggleYearlyGoalCompletion: (id: string) => void;
  removeYearlyGoal: (id: string) => void;
  toggleDeliverableCompletion: (id: string) => void;
  hideLeadershipQuarterlyMetric: (metricId: string) => void;
  hideLeadershipAnnualMetric: (metricId: string) => void;
  hideLeadershipYearlyGoal: (goalId: string) => void;
  saveStatus: 'saved' | 'saving' | 'error';
  manualSave: () => void;
  isLoading: boolean;
  isFetching: boolean;
  strategicPlan: any;
  versions: any[];
  restoreVersion: (versionId: string) => void;
  createManualVersion: (changeSummary?: string) => Promise<{ success: boolean; version_number?: number; error?: string }>;
}

const SimpleStrategyContext = createContext<SimpleStrategyContextType | undefined>(undefined);

const defaultData: StrategyData = {
  purpose: '',
  coreValues: [],
  longTermObjective: '',
  longTermTimeframe: 10,
  threeYearMilestones: {
    revenue: '',
    profit: '',
    teamSize: '',
    keyDescriptors: '',
    metricTargets: [],
    targetDate: undefined,
    whatItLooksLike: [],
  },
  niche: '',
  targetCustomer: {
    demographics: '',
    psychographics: '',
    behavior: '',
  },
  uniqueEdge: '',
  oneYearGoals: {
    revenue: '',
    profit: '',
    deliverables: [],
    metricTargets: [],
    targetDate: undefined,
  },
  quarterlyGoals: {
    revenue: '',
    profit: '',
    metricTargets: [],
    targetDate: undefined,
  },
  yearlyGoals: [],
  hiddenLeadershipQuarterlyMetricIds: [],
  hiddenLeadershipAnnualMetricIds: [],
  hiddenLeadershipYearlyGoalIds: [],
  quarterlyPriorities: [],
  issues: [],
  teamAlignment: [],
  swotData: {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
  },
  marketing: {
    targetMarket: '',
    competitiveAdvantages: [] as any, // Allow both string and array for migration
    process: '',
    guarantee: '',
  },
};

interface SimpleStrategyProviderProps {
  children: ReactNode;
  teamId?: string | null;
  previewActive?: boolean;
  previewData?: Partial<StrategyData>;
}

export const SimpleStrategyProvider: React.FC<SimpleStrategyProviderProps> = ({ 
  children, 
  teamId, 
  previewActive = false, 
  previewData 
}) => {
  const { currentCompany } = useMultiCompanyAccess();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Use a ref to track the current teamId to avoid provider remounting
  const currentTeamIdRef = useRef(teamId);
  const [internalTeamId, setInternalTeamId] = useState(teamId);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Ref for debouncing real-time updates
  const realtimeUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    strategicPlan, 
    isLoading, 
    isFetching,
    error, 
    saveStatus, 
    autoSave, 
    manualSave, 
    clearPendingAutoSave,
    versions, 
    restoreVersion,
    createManualVersion,
    leadershipReference 
  } = useSimpleStrategyPersistence(internalTeamId);
  
  // Update internal team ID when prop changes, but don't remount the provider
  useEffect(() => {
    if (currentTeamIdRef.current !== teamId) {
      logger.log('🔄 SimpleStrategyProvider: Team changed from', currentTeamIdRef.current, 'to', teamId);
      currentTeamIdRef.current = teamId;
      setInternalTeamId(teamId);
      
      // Clear any pending auto-save to prevent cross-team data corruption
      clearPendingAutoSave();
    }
  }, [teamId, clearPendingAutoSave]);
  const [data, setData] = useState<StrategyData>(defaultData);

  // V/TO Analytics tracking - tracks vto_started and vto_completed events
  useVTOAnalytics({
    userId: user?.id,
    companyId: currentCompany?.id,
    data,
    isHydrated,
    saveStatus,
  });

  // Define strategy-only fields that can be safely previewed
  const strategyPreviewFields = [
    // Core strategy fields
    'purpose', 
    'coreValues', 
    'longTermObjective', 
    'threeYearMilestones',
    
    // Marketing & positioning
    'marketing', 
    'niche', 
    'uniqueEdge', 
    'targetCustomer',
    
    // Execution & planning
    'quarterlyPriorities',
    'issues',
    'swotData',
    
    // Goals and deliverables
    'yearlyGoals',
    'quarterlyGoals',
    'oneYearGoals'
  ];

  // Helper function to convert old string deliverables to new array format
  const migrateDeliverables = useCallback((deliverables: any): DeliverableItem[] => {
    if (Array.isArray(deliverables)) {
      // Handle both old format (without completed) and new format (with completed)
      return deliverables.map(item => {
        if (typeof item === 'object' && item.id && item.text) {
          return {
            id: item.id,
            text: item.text,
            completed: item.completed || false
          };
        }
        // Legacy string format
        return {
          id: crypto.randomUUID(),
          text: typeof item === 'string' ? item : item.text || '',
          completed: false
        };
      });
    }
    if (typeof deliverables === 'string' && deliverables.trim()) {
      return deliverables.split('\n')
        .filter(d => d.trim())
        .map((text, index) => ({
          id: crypto.randomUUID(),
          text: text.trim(),
          completed: false
        }));
    }
    return [];
  }, []);

  // Helper function to migrate core values to include explanation
  const migrateCoreValues = useCallback((coreValues: any[]): CoreValue[] => {
    if (!Array.isArray(coreValues)) return [];
    
    return coreValues.map(value => {
      if (typeof value === 'object' && value.id && value.value) {
        return {
          id: value.id,
          value: value.value,
          explanation: value.explanation || ''
        };
      }
      // Handle legacy format where core values might be just strings
      return {
        id: crypto.randomUUID(),
        value: typeof value === 'string' ? value : value.value || '',
        explanation: ''
      };
    });
  }, []);

  // Helper function to migrate quarterly goals
  const migrateQuarterlyGoals = useCallback((quarterlyGoals: any): QuarterlyGoals => {
    if (quarterlyGoals && typeof quarterlyGoals === 'object') {
      return {
        revenue: quarterlyGoals.revenue || '',
        profit: quarterlyGoals.profit || '',
        metricTargets: Array.isArray(quarterlyGoals.metricTargets) ? quarterlyGoals.metricTargets : [],
        targetDate: quarterlyGoals.targetDate ? new Date(quarterlyGoals.targetDate) : undefined,
      };
    }
    return defaultData.quarterlyGoals;
  }, []);

  // Helper function to migrate yearly goals to include completed status and description
  const migrateYearlyGoals = useCallback((yearlyGoals: any[]): YearlyGoal[] => {
    if (!Array.isArray(yearlyGoals)) return [];
    
    return yearlyGoals.map(goal => {
      if (typeof goal === 'object' && goal.id && goal.text) {
        return {
          id: goal.id,
          text: goal.text,
          completed: goal.completed || false,
          description: goal.description || undefined
        };
      }
      return {
        id: crypto.randomUUID(),
        text: typeof goal === 'string' ? goal : goal.text || '',
        completed: false,
        description: undefined
      };
    });
  }, []);

  // Helper function to migrate 3-year keyDescriptors to metricTargets format
  const migrateThreeYearKeyDescriptors = useCallback((metricTargets: any[], keyDescriptors: string): MetricTarget[] => {
    // If metricTargets already has data, use it
    if (Array.isArray(metricTargets) && metricTargets.length > 0) {
      return metricTargets;
    }
    
    // If keyDescriptors has content, migrate it
    if (keyDescriptors && typeof keyDescriptors === 'string' && keyDescriptors.trim()) {
      const lines = keyDescriptors.split('\n').filter(line => line.trim());
      return lines.map((line, index) => ({
        id: crypto.randomUUID(),
        name: line.trim(),
        target: '' // User can fill in target values later
      }));
    }
    
    return [];
  }, []);

  // Helper function to merge plan_data into state (reusable for both useEffect and real-time updates)
  // This ensures consistent data transformation and migration logic
  // Uses setData callback to always access current state, avoiding stale closures
  const mergePlanDataIntoState = useCallback((planData: any, swotData: any) => {
    setData(prevData => {
      // Preserve optimistic hidden leadership arrays from current state
      const currentHiddenAnnual = prevData.hiddenLeadershipAnnualMetricIds || [];
      const currentHiddenQuarterly = prevData.hiddenLeadershipQuarterlyMetricIds || [];
      const currentHiddenYearlyGoals = prevData.hiddenLeadershipYearlyGoalIds || [];
      
      // Migrate niche data - ensure compatibility between old 'niche' and new 'marketing.niche'
      const marketingNiche = planData?.marketing?.niche ?? planData?.niche ?? '';
      
      // Migrate deliverables if needed
      const migratedDeliverables = migrateDeliverables(planData.oneYearGoals?.deliverables);
      
      // Migrate core values if needed
      const migratedCoreValues = migrateCoreValues(planData.coreValues || []);
      
      // Migrate quarterly goals if needed
      const migratedQuarterlyGoals = migrateQuarterlyGoals(planData.quarterlyGoals);
      
      // Migrate yearly goals if needed
      const migratedYearlyGoals = migrateYearlyGoals(planData.yearlyGoals || []);
      
      // ✅ CRITICAL FIX: Explicitly preserve metricTargets and yearlyGoals from payload
      // The spread operator works, but we need to ensure arrays are explicitly preserved
      // Priority: payload data > prevData fallback (only if payload is missing/invalid)
      const oneYearGoalsFromPayload = planData.oneYearGoals || {};
      
      // ✅ CRITICAL FIX: Always prioritize payload data over prevData
      // If payload has metricTargets (even if empty array), use it from payload
      // Only fallback to prevData if payload doesn't have the field at all (undefined)
      const metricTargetsFromPayload = 'metricTargets' in oneYearGoalsFromPayload 
        ? (Array.isArray(oneYearGoalsFromPayload.metricTargets) ? oneYearGoalsFromPayload.metricTargets : [])
        : (Array.isArray(prevData.oneYearGoals?.metricTargets) ? prevData.oneYearGoals.metricTargets : []);
      
      const oneYearGoalsMerged = {
        ...oneYearGoalsFromPayload, // Spread first to get all fields (revenue, profit, etc.)
        // ✅ EXPLICITLY preserve metricTargets from payload (Key Metrics)
        metricTargets: metricTargetsFromPayload,
        deliverables: migratedDeliverables,
        targetDate: oneYearGoalsFromPayload.targetDate ? new Date(oneYearGoalsFromPayload.targetDate) : (prevData.oneYearGoals?.targetDate || undefined),
      };
      
      // ✅ CRITICAL FIX: Always prioritize payload data for yearlyGoals (Annual Objectives)
      // If payload has yearlyGoals (even if empty array), use migratedYearlyGoals from payload
      // Only fallback to prevData if payload doesn't have yearlyGoals at all (undefined)
      const finalYearlyGoals = 'yearlyGoals' in planData
        ? migratedYearlyGoals  // Use migrated data from payload (handles empty arrays correctly)
        : (Array.isArray(prevData.yearlyGoals) ? prevData.yearlyGoals : []);
      
      return {
        ...planData,
        // Ensure both niche fields are populated for compatibility
        niche: marketingNiche,
        marketing: {
          ...planData.marketing,
          niche: marketingNiche,
        },
        // Preserve optimistic hidden leadership arrays, merging with plan data
        hiddenLeadershipQuarterlyMetricIds: [
          ...(planData.hiddenLeadershipQuarterlyMetricIds || []),
          ...currentHiddenQuarterly.filter(id => !planData.hiddenLeadershipQuarterlyMetricIds?.includes(id))
        ],
        hiddenLeadershipAnnualMetricIds: [
          ...(planData.hiddenLeadershipAnnualMetricIds || []),
          ...currentHiddenAnnual.filter(id => !planData.hiddenLeadershipAnnualMetricIds?.includes(id))
        ],
        hiddenLeadershipYearlyGoalIds: [
          ...(planData.hiddenLeadershipYearlyGoalIds || []),
          ...currentHiddenYearlyGoals.filter(id => !planData.hiddenLeadershipYearlyGoalIds?.includes(id))
        ],
        coreValues: migratedCoreValues,
        // ✅ Use the explicitly constructed oneYearGoals that preserves metricTargets
        oneYearGoals: oneYearGoalsMerged,
        // ✅ CRITICAL FIX: Always explicitly override quarterlyGoals with migrated value
        // This ensures quarterlyGoals is NEVER inherited from planData spread above,
        // preventing any incorrect values from being copied from oneYearGoals
        quarterlyGoals: migratedQuarterlyGoals,
        // ✅ EXPLICITLY preserve yearlyGoals array (Annual Objectives)
        yearlyGoals: finalYearlyGoals,
        threeYearMilestones: {
          ...planData.threeYearMilestones,
          metricTargets: migrateThreeYearKeyDescriptors(
            planData.threeYearMilestones?.metricTargets,
            planData.threeYearMilestones?.keyDescriptors
          ),
          targetDate: planData.threeYearMilestones?.targetDate ? new Date(planData.threeYearMilestones.targetDate) : undefined,
        },
        swotData: swotData || defaultData.swotData,
      };
    });
  }, [migrateDeliverables, migrateCoreValues, migrateQuarterlyGoals, migrateYearlyGoals, migrateThreeYearKeyDescriptors]);

  // Load data from strategic plan - stabilized effect
  useEffect(() => {
    if (strategicPlan?.plan_data) {
      logger.log('📊 Loading strategic plan data:', {
        planId: strategicPlan.id,
        teamId: strategicPlan.team_id,
        hasSwotData: !!strategicPlan.swot_data,
        purposeFromPlan: strategicPlan.plan_data.purpose,
        coreValuesFromPlan: strategicPlan.plan_data.coreValues,
        longTermObjectiveFromPlan: strategicPlan.plan_data.longTermObjective
      });
      
      const planData = strategicPlan.plan_data as any;
      const swotData = strategicPlan.swot_data as any;
      
      // Use the reusable merge function
      mergePlanDataIntoState(planData, swotData);
      
      // Mark as hydrated after successful data load
      setIsHydrated(true);
    } else if (!isLoading && !internalTeamId) {
      // Only reset to default if not loading AND no team is selected
      // This prevents flashing default data during team switches
      logger.log('📊 Using default strategy data (no team selected)');
      setData(defaultData);
      setIsHydrated(true);
    }
  }, [strategicPlan, mergePlanDataIntoState, isLoading, internalTeamId]);

  // Apply preview overlay if active
  const effectiveData = useMemo(() => {
    if (!previewActive || !previewData) return data;
    
    logger.log('📊 Applying preview overlay for strategy fields only');
    
    // Create a safe overlay with only strategy-specific fields
    const previewOverlay: Partial<StrategyData> = {};
    strategyPreviewFields.forEach(field => {
      if (previewData[field as keyof StrategyData] !== undefined) {
        (previewOverlay as any)[field] = previewData[field as keyof StrategyData];
      }
    });
    
    return { ...data, ...previewOverlay };
  }, [data, previewActive, previewData, strategyPreviewFields]);

  // Real-time subscription to strategic plans for immediate UI updates
  // Uses direct merge instead of refetch for faster, more reliable synchronization
  useEffect(() => {
    if (!internalTeamId || !currentCompany?.id) return;

    logger.log('🔔 Setting up real-time subscription for strategic plans - team:', internalTeamId);

    const channel = supabase
      .channel(`strategic-plans-changes-${internalTeamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'strategic_plans',
          filter: `team_id=eq.${internalTeamId}`
        },
        async (payload) => {
          logger.log('🔔 Real-time strategic plan update received for current team:', payload);
          
          // Get current user to avoid self-triggering
          const { data: { user } } = await supabase.auth.getUser();
          
          // Skip if update was made by current user to prevent self-triggering
          if (payload.new?.updated_by === user?.id) {
            logger.log('🔔 Ignoring update made by current user to prevent self-triggering');
            return;
          }
          
          // Clear any pending debounced update
          if (realtimeUpdateTimeoutRef.current) {
            clearTimeout(realtimeUpdateTimeoutRef.current);
          }
          
          // Debounce the update to prevent excessive state changes during rapid updates
          realtimeUpdateTimeoutRef.current = setTimeout(() => {
            try {
              const planData = payload.new?.plan_data as any;
              const swotData = payload.new?.swot_data as any;
              
              if (!planData) {
                logger.warn('⚠️ Real-time update received but plan_data is missing');
                return;
              }
              
              // Use the same merge function as useEffect for consistency
              // This ensures migrations, date conversions, and hidden array preservation work correctly
              // setData callback ensures we always use the latest state, avoiding stale closures
              mergePlanDataIntoState(planData, swotData);
              
              logger.log('✅ Real-time strategic plan update merged successfully');
            } catch (error) {
              logger.error('❌ Error merging real-time strategic plan update:', error);
              // Fallback to query invalidation if merge fails
              queryClient.invalidateQueries({ 
                queryKey: ['simple-strategic-plan', currentCompany?.id, internalTeamId],
                refetchType: 'active'
              });
            }
          }, 300); // 300ms debounce to handle rapid updates
        }
      )
      .subscribe();

    return () => {
      logger.log('🔔 Cleaning up real-time subscription');
      if (realtimeUpdateTimeoutRef.current) {
        clearTimeout(realtimeUpdateTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [internalTeamId, currentCompany?.id, queryClient, mergePlanDataIntoState]);

  // Team changes are now handled by explicit prefetching in Strategy.tsx
  // No need to invalidate queries here as it causes the refresh effect

  // STABILIZED: Auto-save with proper debouncing
  const debouncedAutoSaveRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedAutoSave = useCallback((newData: StrategyData) => {
    // Clear previous timeout
    if (debouncedAutoSaveRef.current) {
      clearTimeout(debouncedAutoSaveRef.current);
    }
    
    // Set new timeout
    debouncedAutoSaveRef.current = setTimeout(() => {
      autoSave(newData);
      debouncedAutoSaveRef.current = null;
    }, 2000);
  }, [autoSave]);

  // STABILIZED: Update data function with consistent reference
  const updateStrategy = useCallback((newData: StrategyData) => {
    if (previewActive) {
      logger.log('📝 Ignoring update during preview mode');
      return;
    }
    logger.log('📝 SimpleStrategyContext: Updating strategy data');
    setData(newData);
    debouncedAutoSave(newData);
  }, [debouncedAutoSave, previewActive]);

  // STABILIZED: All handler functions with consistent references
  const updateData = useCallback((updates: Partial<StrategyData>) => {
    if (previewActive) {
      logger.log('📝 Ignoring update during preview mode');
      return;
    }
    setData(prevData => {
      // ✅ CRITICAL FIX: When updating oneYearGoals, explicitly preserve quarterlyGoals to prevent cross-contamination
      const newData = { 
        ...prevData, 
        ...updates,
        // If updating oneYearGoals, ensure quarterlyGoals is explicitly preserved (not mutated)
        ...(updates.oneYearGoals ? {
          quarterlyGoals: {
            ...prevData.quarterlyGoals,
          }
        } : {}),
        // If updating quarterlyGoals, ensure oneYearGoals is explicitly preserved (not mutated)
        ...(updates.quarterlyGoals ? {
          oneYearGoals: {
            ...prevData.oneYearGoals,
          }
        } : {}),
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave, previewActive]);

  const handleManualSave = useCallback(() => {
    if (previewActive) {
      logger.log('💾 Ignoring manual save during preview mode');
      return;
    }
    logger.log('💾 Manual save requested from context');
    manualSave(data);
  }, [manualSave, data, previewActive]);

  const addCoreValue = useCallback((value: string, explanation: string = '') => {
    setData(prevData => {
      if (prevData.coreValues.length >= 7) return prevData;
      
      const newValue: CoreValue = {
        id: Date.now().toString(),
        value,
        explanation,
      };
      const newData = {
        ...prevData,
        coreValues: [...prevData.coreValues, newValue],
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const removeCoreValue = useCallback((id: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        coreValues: prevData.coreValues.filter(v => v.id !== id),
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateCoreValue = useCallback((id: string, value: string, explanation?: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        coreValues: prevData.coreValues.map(v =>
          v.id === id ? { 
            ...v, 
            value,
            ...(explanation !== undefined && { explanation })
          } : v
        ),
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  // Quarterly Priorities functions
  const addQuarterlyPriority = useCallback((priority: Omit<QuarterlyPriority, 'id'>) => {
    setData(prevData => {
      if (prevData.quarterlyPriorities.length >= 5) return prevData;
      const newPriority: QuarterlyPriority = {
        ...priority,
        id: Date.now().toString(),
      };
      const newData = {
        ...prevData,
        quarterlyPriorities: [...prevData.quarterlyPriorities, newPriority],
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateQuarterlyPriority = useCallback((id: string, updates: Partial<QuarterlyPriority>) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        quarterlyPriorities: prevData.quarterlyPriorities.map(p =>
          p.id === id ? { ...p, ...updates } : p
        ),
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const removeQuarterlyPriority = useCallback((id: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        quarterlyPriorities: prevData.quarterlyPriorities.filter(p => p.id !== id),
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  // Issues functions
  const addIssue = useCallback((issue: Omit<Issue, 'id'>) => {
    setData(prevData => {
      const newIssue: Issue = {
        ...issue,
        id: Date.now().toString(),
      };
      const newData = {
        ...prevData,
        issues: [...prevData.issues, newIssue],
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateIssue = useCallback((id: string, updates: Partial<Issue>) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        issues: prevData.issues.map(i =>
          i.id === id ? { ...i, ...updates } : i
        ),
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const removeIssue = useCallback((id: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        issues: prevData.issues.filter(i => i.id !== id),
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  // SWOT functions with optimistic updates but reduced auto-save frequency
  const addSwotItem = useCallback((category: keyof SwotData, text: string) => {
    setData(prevData => {
      if (prevData.swotData[category].length >= 10) return prevData;
      
      const maxOrder = Math.max(...prevData.swotData[category].map(item => item.order || 0), -1);
      const newItem: SwotItem = {
        id: Date.now().toString(),
        text,
        order: maxOrder + 1,
      };
      const newData = {
        ...prevData,
        swotData: {
          ...prevData.swotData,
          [category]: [...prevData.swotData[category], newItem],
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateSwotItem = useCallback((category: keyof SwotData, id: string, text: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        swotData: {
          ...prevData.swotData,
          [category]: prevData.swotData[category].map(item =>
            item.id === id ? { ...item, text } : item
          ),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const removeSwotItem = useCallback((category: keyof SwotData, id: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        swotData: {
          ...prevData.swotData,
          [category]: prevData.swotData[category].filter(item => item.id !== id),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const reorderSwotItems = useCallback((category: keyof SwotData, itemIds: string[]) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        swotData: {
          ...prevData.swotData,
          [category]: prevData.swotData[category]
            .map(item => ({
              ...item,
              order: itemIds.indexOf(item.id)
            }))
            .sort((a, b) => a.order - b.order),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  // Deliverables functions
  const addDeliverable = useCallback((text: string) => {
    setData(prevData => {
      const newDeliverable: DeliverableItem = {
        id: Date.now().toString(),
        text,
        completed: false,
      };
      const newData = {
        ...prevData,
        oneYearGoals: {
          ...prevData.oneYearGoals,
          deliverables: [...(prevData.oneYearGoals.deliverables as DeliverableItem[]), newDeliverable],
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateDeliverable = useCallback((id: string, text: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        oneYearGoals: {
          ...prevData.oneYearGoals,
          deliverables: (prevData.oneYearGoals.deliverables as DeliverableItem[]).map(item =>
            item.id === id ? { ...item, text } : item
          ),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const removeDeliverable = useCallback((id: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        oneYearGoals: {
          ...prevData.oneYearGoals,
          deliverables: (prevData.oneYearGoals.deliverables as DeliverableItem[]).filter(item => item.id !== id),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const toggleDeliverableCompletion = useCallback((id: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        oneYearGoals: {
          ...prevData.oneYearGoals,
          deliverables: (prevData.oneYearGoals.deliverables as DeliverableItem[]).map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
          ),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  // Quarterly Goals functions
  const updateQuarterlyGoals = useCallback((updates: Partial<QuarterlyGoals>) => {
    setData(prevData => {
      // ✅ CRITICAL FIX: Explicitly create new objects to prevent any reference sharing
      // Ensure oneYearGoals is NOT touched when updating quarterlyGoals
      const newData = {
        ...prevData,
        // ✅ Explicitly preserve oneYearGoals to prevent accidental mutations
        oneYearGoals: {
          ...prevData.oneYearGoals,
        },
        // ✅ Create NEW quarterlyGoals object
        quarterlyGoals: {
          ...prevData.quarterlyGoals,
          ...updates,
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const addMetricTarget = useCallback((name: string, target: string) => {
    setData(prevData => {
      const newMetricTarget: MetricTarget = {
        id: Date.now().toString(),
        name,
        target,
      };
      const newData = {
        ...prevData,
        quarterlyGoals: {
          ...prevData.quarterlyGoals,
          metricTargets: [...prevData.quarterlyGoals.metricTargets, newMetricTarget],
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateMetricTarget = useCallback((id: string, updates: Partial<MetricTarget>) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        quarterlyGoals: {
          ...prevData.quarterlyGoals,
          metricTargets: prevData.quarterlyGoals.metricTargets.map(target =>
            target.id === id ? { ...target, ...updates } : target
          ),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const removeMetricTarget = useCallback((id: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        quarterlyGoals: {
          ...prevData.quarterlyGoals,
          metricTargets: prevData.quarterlyGoals.metricTargets.filter(target => target.id !== id),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  // Yearly Goals functions
  const addYearlyGoal = useCallback((text: string) => {
    setData(prevData => {
      const newYearlyGoal: YearlyGoal = {
        id: Date.now().toString(),
        text,
        completed: false,
      };
      const newData = {
        ...prevData,
        yearlyGoals: [...prevData.yearlyGoals, newYearlyGoal],
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateYearlyGoal = useCallback((id: string, text: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        yearlyGoals: prevData.yearlyGoals.map(goal =>
          goal.id === id ? { ...goal, text } : goal
        ),
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateYearlyGoalDescription = useCallback((id: string, description: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        yearlyGoals: prevData.yearlyGoals.map(goal =>
          goal.id === id ? { ...goal, description: description.trim() || undefined } : goal
        ),
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const toggleYearlyGoalCompletion = useCallback((id: string) => {
    logger.log('🎯 Toggling yearly goal completion for ID:', id);
    setData(prevData => {
      const goalToToggle = prevData.yearlyGoals.find(goal => goal.id === id);
      logger.log('🎯 Current goal state:', goalToToggle);
      
      const newData = {
        ...prevData,
        yearlyGoals: prevData.yearlyGoals.map(goal =>
          goal.id === id ? { ...goal, completed: !goal.completed } : goal
        ),
      };
      
      const updatedGoal = newData.yearlyGoals.find(goal => goal.id === id);
      logger.log('🎯 Updated goal state:', updatedGoal);
      logger.log('🎯 Triggering auto-save for yearly goal completion');
      
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const removeYearlyGoal = useCallback((id: string) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        yearlyGoals: prevData.yearlyGoals.filter(goal => goal.id !== id),
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  // Annual Metric Target functions
  const addAnnualMetricTarget = useCallback((name: string, target: string) => {
    setData(prevData => {
      const newMetricTarget: MetricTarget = {
        id: Date.now().toString(),
        name,
        target,
      };
      const currentMetricTargets = prevData.oneYearGoals.metricTargets || [];
      const newData = {
        ...prevData,
        oneYearGoals: {
          ...prevData.oneYearGoals,
          metricTargets: [...currentMetricTargets, newMetricTarget],
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateAnnualMetricTarget = useCallback((id: string, updates: Partial<MetricTarget>) => {
    setData(prevData => {
      const currentMetricTargets = prevData.oneYearGoals.metricTargets || [];
      const newData = {
        ...prevData,
        oneYearGoals: {
          ...prevData.oneYearGoals,
          metricTargets: currentMetricTargets.map(target =>
            target.id === id ? { ...target, ...updates } : target
          ),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const removeAnnualMetricTarget = useCallback((id: string) => {
    setData(prevData => {
      const currentMetricTargets = prevData.oneYearGoals.metricTargets || [];
      const newData = {
        ...prevData,
        oneYearGoals: {
          ...prevData.oneYearGoals,
          metricTargets: currentMetricTargets.filter(target => target.id !== id),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  // Three Year Metric Target functions
  const addThreeYearMetricTarget = useCallback((name: string, target: string) => {
    setData(prevData => {
      const newMetricTarget: MetricTarget = {
        id: Date.now().toString(),
        name,
        target,
      };
      const currentMetricTargets = prevData.threeYearMilestones.metricTargets || [];
      const newData = {
        ...prevData,
        threeYearMilestones: {
          ...prevData.threeYearMilestones,
          metricTargets: [...currentMetricTargets, newMetricTarget],
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateThreeYearMetricTarget = useCallback((id: string, updates: Partial<MetricTarget>) => {
    setData(prevData => {
      const currentMetricTargets = prevData.threeYearMilestones.metricTargets || [];
      const newData = {
        ...prevData,
        threeYearMilestones: {
          ...prevData.threeYearMilestones,
          metricTargets: currentMetricTargets.map(target =>
            target.id === id ? { ...target, ...updates } : target
          ),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const removeThreeYearMetricTarget = useCallback((id: string) => {
    setData(prevData => {
      const currentMetricTargets = prevData.threeYearMilestones.metricTargets || [];
      const newData = {
        ...prevData,
        threeYearMilestones: {
          ...prevData.threeYearMilestones,
          metricTargets: currentMetricTargets.filter(target => target.id !== id),
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  // Date update functions
  const updateThreeYearDate = useCallback((date: Date | undefined) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        threeYearMilestones: {
          ...prevData.threeYearMilestones,
          targetDate: date,
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  const updateOneYearDate = useCallback((date: Date | undefined) => {
    setData(prevData => {
      const newData = {
        ...prevData,
        oneYearGoals: {
          ...prevData.oneYearGoals,
          targetDate: date,
        },
      };
      debouncedAutoSave(newData);
      return newData;
    });
  }, [debouncedAutoSave]);

  // Hide leadership metrics functions with faster save for better UX
  const hideLeadershipQuarterlyMetric = useCallback((metricId: string) => {
    setData(prevData => {
      const hiddenIds = prevData.hiddenLeadershipQuarterlyMetricIds || [];
      if (hiddenIds.includes(metricId)) return prevData; // Already hidden
      
      const newData = {
        ...prevData,
        hiddenLeadershipQuarterlyMetricIds: [...hiddenIds, metricId],
      };
      
      // Use faster save for hide actions (500ms instead of 2000ms)
      if (debouncedAutoSaveRef.current) {
        clearTimeout(debouncedAutoSaveRef.current);
      }
      debouncedAutoSaveRef.current = setTimeout(() => {
        autoSave(newData);
        debouncedAutoSaveRef.current = null;
      }, 500);
      
      return newData;
    });
  }, [autoSave]);

  const hideLeadershipAnnualMetric = useCallback((metricId: string) => {
    setData(prevData => {
      const hiddenIds = prevData.hiddenLeadershipAnnualMetricIds || [];
      if (hiddenIds.includes(metricId)) return prevData; // Already hidden
      
      const newData = {
        ...prevData,
        hiddenLeadershipAnnualMetricIds: [...hiddenIds, metricId],
      };
      
      // Use faster save for hide actions (500ms instead of 2000ms)
      if (debouncedAutoSaveRef.current) {
        clearTimeout(debouncedAutoSaveRef.current);
      }
      debouncedAutoSaveRef.current = setTimeout(() => {
        autoSave(newData);
        debouncedAutoSaveRef.current = null;
      }, 500);
      
      return newData;
    });
  }, [autoSave]);

  const hideLeadershipYearlyGoal = useCallback((goalId: string) => {
    setData(prevData => {
      const hiddenIds = prevData.hiddenLeadershipYearlyGoalIds || [];
      if (hiddenIds.includes(goalId)) return prevData; // Already hidden
      
      const newData = {
        ...prevData,
        hiddenLeadershipYearlyGoalIds: [...hiddenIds, goalId],
      };
      
      // Use faster save for hide actions (500ms instead of 2000ms)
      if (debouncedAutoSaveRef.current) {
        clearTimeout(debouncedAutoSaveRef.current);
      }
      debouncedAutoSaveRef.current = setTimeout(() => {
        autoSave(newData);
        debouncedAutoSaveRef.current = null;
      }, 500);
      
      return newData;
    });
  }, [autoSave]);

  // STABILIZED: Context value memoization
  const contextValue = useMemo(() => ({
    data: effectiveData,
    isPreviewing: previewActive,
    isHydrated,
    updateData,
    addCoreValue,
    removeCoreValue,
    updateCoreValue,
    addQuarterlyPriority,
    updateQuarterlyPriority,
    removeQuarterlyPriority,
    addIssue,
    updateIssue,
    removeIssue,
    addSwotItem,
    updateSwotItem,
    removeSwotItem,
    reorderSwotItems,
    addDeliverable,
    updateDeliverable,
    removeDeliverable,
    toggleDeliverableCompletion,
    updateQuarterlyGoals,
    addMetricTarget,
    updateMetricTarget,
    removeMetricTarget,
    addAnnualMetricTarget,
    updateAnnualMetricTarget,
    removeAnnualMetricTarget,
    addThreeYearMetricTarget,
    updateThreeYearMetricTarget,
    removeThreeYearMetricTarget,
    addYearlyGoal,
    updateYearlyGoal,
    updateYearlyGoalDescription,
    toggleYearlyGoalCompletion,
    removeYearlyGoal,
    updateThreeYearDate,
    updateOneYearDate,
    hideLeadershipQuarterlyMetric,
    hideLeadershipAnnualMetric,
    hideLeadershipYearlyGoal,
    saveStatus,
    manualSave: handleManualSave,
    isLoading,
    isFetching,
    strategicPlan,
    versions,
    restoreVersion,
    createManualVersion,
  }), [
    effectiveData,
    previewActive,
    isHydrated,
    updateData,
    addCoreValue,
    removeCoreValue,
    updateCoreValue,
    addQuarterlyPriority,
    updateQuarterlyPriority,
    removeQuarterlyPriority,
    addIssue,
    updateIssue,
    removeIssue,
    addSwotItem,
    updateSwotItem,
    removeSwotItem,
    reorderSwotItems,
    addDeliverable,
    updateDeliverable,
    removeDeliverable,
    toggleDeliverableCompletion,
    updateQuarterlyGoals,
    addMetricTarget,
    updateMetricTarget,
    removeMetricTarget,
    addAnnualMetricTarget,
    updateAnnualMetricTarget,
    removeAnnualMetricTarget,
    addThreeYearMetricTarget,
    updateThreeYearMetricTarget,
    removeThreeYearMetricTarget,
    addYearlyGoal,
    updateYearlyGoal,
    updateYearlyGoalDescription,
    toggleYearlyGoalCompletion,
    removeYearlyGoal,
    updateThreeYearDate,
    updateOneYearDate,
    hideLeadershipQuarterlyMetric,
    hideLeadershipAnnualMetric,
    hideLeadershipYearlyGoal,
    saveStatus,
    handleManualSave,
    isLoading,
    isFetching,
    strategicPlan,
    versions,
    restoreVersion,
    createManualVersion,
  ]);

  return (
    <SimpleStrategyContext.Provider value={contextValue}>
      {children}
    </SimpleStrategyContext.Provider>
  );
};

export const useSimpleStrategy = () => {
  const context = useContext(SimpleStrategyContext);
  if (context === undefined) {
    throw new Error('useSimpleStrategy must be used within a SimpleStrategyProvider');
  }
  return context;
};
