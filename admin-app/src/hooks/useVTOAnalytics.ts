import { useEffect, useRef } from 'react';
import { trackVTOStarted, trackVTOCompleted, trackVTOSectionCompleted } from '@/lib/statsigAnalytics';
import { StrategyData } from '@/contexts/SimpleStrategyContext';
import { logger } from '@/utils/logger';

const VTO_STARTED_STORAGE_KEY: string = 'vto_started_tracked';
const VTO_COMPLETED_STORAGE_KEY: string = 'vto_completed_tracked';
const VTO_SECTION_COMPLETED_PREFIX: string = 'vto_section_completed';
const VTO_COMPLETION_THRESHOLD: number = 80; // Fire vto_completed when >= 80% complete

/**
 * Define sections and their completion criteria
 */
const VTO_SECTIONS = {
  purpose: (data: StrategyData) => !!data.purpose?.trim(),
  core_values: (data: StrategyData) => (data.coreValues?.length || 0) >= 3,
  long_term_objective: (data: StrategyData) => !!data.longTermObjective?.trim(),
  three_year_milestones: (data: StrategyData) => 
    !!data.threeYearMilestones?.revenue?.trim() && !!data.threeYearMilestones?.profit?.trim(),
  one_year_goals: (data: StrategyData) => 
    !!data.oneYearGoals?.revenue?.trim() && !!data.oneYearGoals?.profit?.trim(),
  quarterly_goals: (data: StrategyData) => 
    !!data.quarterlyGoals?.revenue?.trim() && !!data.quarterlyGoals?.profit?.trim(),
  marketing_strategy: (data: StrategyData) => 
    !!data.niche?.trim() || !!(data.marketing as any)?.niche?.trim(),
  unique_edge: (data: StrategyData) => !!data.uniqueEdge?.trim(),
};

/**
 * Calculate the completion percentage of a V/TO strategic plan
 * Based on key fields that indicate a complete strategic plan
 */
const calculateVTOCompletion = (data: StrategyData): number => {
  const fields = [
    // Core Strategy (weight: high importance)
    { filled: !!data.purpose?.trim(), weight: 10 },
    { filled: (data.coreValues?.length || 0) > 0, weight: 10 },
    { filled: !!data.longTermObjective?.trim(), weight: 10 },
    
    // 3-Year Milestones
    { filled: !!data.threeYearMilestones?.revenue?.trim(), weight: 8 },
    { filled: !!data.threeYearMilestones?.profit?.trim(), weight: 8 },
    
    // 1-Year Goals
    { filled: !!data.oneYearGoals?.revenue?.trim(), weight: 8 },
    { filled: !!data.oneYearGoals?.profit?.trim(), weight: 8 },
    { filled: (data.oneYearGoals?.deliverables?.length || 0) > 0, weight: 6 },
    
    // Quarterly Goals
    { filled: !!data.quarterlyGoals?.revenue?.trim(), weight: 8 },
    { filled: !!data.quarterlyGoals?.profit?.trim(), weight: 8 },
    
    // Marketing Strategy
    { filled: !!data.marketing?.targetMarket?.trim(), weight: 6 },
    { filled: !!data.niche?.trim() || !!(data.marketing as any)?.niche?.trim(), weight: 6 },
    { filled: !!data.uniqueEdge?.trim(), weight: 4 },
  ];

  const totalWeight = fields.reduce((sum, field) => sum + field.weight, 0);
  const filledWeight = fields.reduce((sum, field) => sum + (field.filled ? field.weight : 0), 0);
  
  return Math.round((filledWeight / totalWeight) * 100);
};

/**
 * Check if any field in the V/TO has been filled (for vto_started tracking)
 */
const hasAnyFieldFilled = (data: StrategyData): boolean => {
  return !!(
    data.purpose?.trim() ||
    (data.coreValues?.length || 0) > 0 ||
    data.longTermObjective?.trim() ||
    data.threeYearMilestones?.revenue?.trim() ||
    data.threeYearMilestones?.profit?.trim() ||
    data.oneYearGoals?.revenue?.trim() ||
    data.oneYearGoals?.profit?.trim() ||
    (data.oneYearGoals?.deliverables?.length || 0) > 0 ||
    data.quarterlyGoals?.revenue?.trim() ||
    data.quarterlyGoals?.profit?.trim() ||
    data.marketing?.targetMarket?.trim() ||
    data.niche?.trim() ||
    (data.marketing as any)?.niche?.trim() ||
    data.uniqueEdge?.trim()
  );
};

interface UseVTOAnalyticsOptions {
  userId?: string;
  companyId?: string;
  data: StrategyData;
  isHydrated: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
}

/**
 * Hook to track V/TO analytics events:
 * - vto_started: First time user fills any field (once per user+company)
 * - vto_completed: When completion reaches threshold (once per user+company)
 */
export const useVTOAnalytics = ({
  userId,
  companyId,
  data,
  isHydrated,
  saveStatus,
}: UseVTOAnalyticsOptions) => {
  const hasTrackedStartRef = useRef(false);
  const hasTrackedCompleteRef = useRef(false);
  const previousDataRef = useRef<StrategyData | null>(null);

  // Build storage keys unique per user+company
  const startedKey = userId && companyId 
    ? `${VTO_STARTED_STORAGE_KEY}_${userId}_${companyId}` 
    : null;
  const completedKey = userId && companyId 
    ? `${VTO_COMPLETED_STORAGE_KEY}_${userId}_${companyId}` 
    : null;

  // Initialize ref states from localStorage
  useEffect(() => {
    if (startedKey) {
      hasTrackedStartRef.current = localStorage.getItem(startedKey) === 'true';
    }
    if (completedKey) {
      hasTrackedCompleteRef.current = localStorage.getItem(completedKey) === 'true';
    }
  }, [startedKey, completedKey]);

  // Track vto_started when user fills any field for the first time
  useEffect(() => {
    // Don't track if not hydrated, missing IDs, or already tracked
    if (!isHydrated || !userId || !companyId || !startedKey) return;
    if (hasTrackedStartRef.current) return;
    
    // Only track if save just completed (user made a change)
    if (saveStatus !== 'saved') return;
    
    // Check if any field is filled AND there was previous data to compare
    // This ensures we only track when user actively makes a change
    const hasAnyFilled = hasAnyFieldFilled(data);
    const hadPreviousData = previousDataRef.current !== null;
    
    if (hasAnyFilled && hadPreviousData) {
      // Check if data actually changed from previous
      const dataChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);
      
      if (dataChanged) {
        logger.log('📊 VTO Analytics: Tracking vto_started event');
        trackVTOStarted({ user_id: userId, company_id: companyId });
        hasTrackedStartRef.current = true;
        localStorage.setItem(startedKey, 'true');
      }
    }
    
    // Update previous data ref
    previousDataRef.current = { ...data };
  }, [data, isHydrated, userId, companyId, startedKey, saveStatus]);

  // Track vto_section_completed when individual sections are completed
  useEffect(() => {
    if (!isHydrated || !userId || !companyId || saveStatus !== 'saved') return;
    
    // Check each section for completion
    Object.entries(VTO_SECTIONS).forEach(([sectionName, isComplete]) => {
      const sectionKey = `${VTO_SECTION_COMPLETED_PREFIX}_${sectionName}_${userId}_${companyId}`;
      const alreadyTracked = localStorage.getItem(sectionKey) === 'true';
      
      if (!alreadyTracked && isComplete(data)) {
        logger.log(`📊 VTO Analytics: Tracking vto_section_completed for ${sectionName}`);
        trackVTOSectionCompleted({
          user_id: userId,
          company_id: companyId,
          section_name: sectionName,
        });
        localStorage.setItem(sectionKey, 'true');
      }
    });
  }, [data, isHydrated, userId, companyId, saveStatus]);

  // Track vto_completed when completion threshold is reached
  useEffect(() => {
    // Don't track if not hydrated, missing IDs, or already tracked
    if (!isHydrated || !userId || !companyId || !completedKey) return;
    if (hasTrackedCompleteRef.current) return;
    
    // Only track after a successful save
    if (saveStatus !== 'saved') return;
    
    const completionPercentage = calculateVTOCompletion(data);
    
    if (completionPercentage >= VTO_COMPLETION_THRESHOLD) {
      logger.log(`📊 VTO Analytics: Tracking vto_completed event (${completionPercentage}%)`);
      trackVTOCompleted({
        user_id: userId,
        company_id: companyId,
        completion_percentage: completionPercentage,
      });
      hasTrackedCompleteRef.current = true;
      localStorage.setItem(completedKey, 'true');
    }
  }, [data, isHydrated, userId, companyId, completedKey, saveStatus]);

  return {
    completionPercentage: calculateVTOCompletion(data),
  };
};
