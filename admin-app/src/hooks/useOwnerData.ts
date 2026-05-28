import React from 'react';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';

export interface OwnerInfo {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface UseOwnerDataReturn {
  uniqueOwners: OwnerInfo[];
  isValidOwnerSelection: (ownerId: string) => boolean;
  resetToValidOwner: (currentOwnerId: string) => string;
  getOwnerName: (ownerId: string) => string;
}

/**
 * Hook to manage owner data extraction and validation
 * Provides stable owner data and validation functions
 */
export const useOwnerData = (metrics: WeeklyMetricWithOwner[]): UseOwnerDataReturn => {
  // Extract and cache unique owners
  const uniqueOwners = React.useMemo(() => {
    logger.log('🔍 useOwnerData: Processing metrics for owners', {
      metricsCount: metrics.length,
      sampleMetrics: metrics.slice(0, 3).map(m => ({
        id: m.id,
        metric_name: m.metric_name,
        owner_id: m.owner_id,
        owner: m.owner,
        owner_avatar_url: m.owner_avatar_url
      }))
    });

    const ownersMap = new Map<string, OwnerInfo>();
    
    metrics.forEach((metric, index) => {
      logger.log(`🔍 Processing metric ${index + 1}:`, {
        metric_name: metric.metric_name,
        owner_id: metric.owner_id,
        owner: metric.owner,
        hasOwnerId: !!metric.owner_id,
        hasOwnerName: !!metric.owner,
        alreadyInMap: metric.owner_id ? ownersMap.has(metric.owner_id) : false
      });

      if (metric.owner_id && metric.owner && !ownersMap.has(metric.owner_id)) {
        const ownerInfo = {
          id: metric.owner_id,
          name: metric.owner,
          avatar_url: metric.owner_avatar_url
        };
        ownersMap.set(metric.owner_id, ownerInfo);
        logger.log('✅ Added owner to map:', ownerInfo);
      }
    });
    
    const result = Array.from(ownersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    logger.log('🔍 useOwnerData: Final owners result', {
      totalOwners: result.length,
      owners: result
    });
    
    return result;
  }, [metrics]);

  // Validation function
  const isValidOwnerSelection = React.useCallback((ownerId: string): boolean => {
    if (ownerId === 'all') return true;
    return uniqueOwners.some(owner => owner.id === ownerId);
  }, [uniqueOwners]);

  // Reset function for invalid selections
  const resetToValidOwner = React.useCallback((currentOwnerId: string): string => {
    if (isValidOwnerSelection(currentOwnerId)) {
      return currentOwnerId;
    }
    return 'all'; // Reset to "all" if current selection is invalid
  }, [isValidOwnerSelection]);

  // Get owner name by ID
  const getOwnerName = React.useCallback((ownerId: string): string => {
    if (ownerId === 'all') return 'All Owners';
    const owner = uniqueOwners.find(o => o.id === ownerId);
    return owner?.name || 'Unknown Owner';
  }, [uniqueOwners]);

  // Debug logging for owner data issues
  React.useEffect(() => {
    if (metrics.length > 0 && uniqueOwners.length === 0) {
      logger.warn('🔍 useOwnerData: Metrics exist but no owners found', {
        metricsCount: metrics.length,
        sampleMetric: metrics[0],
        metricsWithOwners: metrics.filter(m => m.owner_id && m.owner).length,
        metricsWithoutOwners: metrics.filter(m => !m.owner_id || !m.owner).length
      });
    }
  }, [metrics.length, uniqueOwners.length, metrics]);

  return {
    uniqueOwners,
    isValidOwnerSelection,
    resetToValidOwner,
    getOwnerName
  };
};