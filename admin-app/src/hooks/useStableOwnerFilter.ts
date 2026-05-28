import React from 'react';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { useOwnerData } from './useOwnerData';
import { logger } from '@/utils/logger';

export interface UseStableOwnerFilterReturn {
  selectedOwnerId: string;
  setSelectedOwnerId: (ownerId: string) => void;
  filteredMetrics: WeeklyMetricWithOwner[];
  uniqueOwners: Array<{
    id: string;
    name: string;
    avatar_url?: string;
  }>;
  isValidSelection: boolean;
  getOwnerName: (ownerId: string) => string;
}

/**
 * Hook to manage owner filtering with automatic validation and reset
 * Prevents invalid owner selections and provides stable filtering
 */
export const useStableOwnerFilter = (
  metrics: WeeklyMetricWithOwner[], 
  initialOwnerId: string = 'all'
): UseStableOwnerFilterReturn => {
  const [selectedOwnerId, setSelectedOwnerIdInternal] = React.useState<string>(initialOwnerId);
  
  const { uniqueOwners, isValidOwnerSelection, resetToValidOwner, getOwnerName } = useOwnerData(metrics);

  // Auto-reset invalid selections when data changes
  React.useEffect(() => {
    const validOwnerId = resetToValidOwner(selectedOwnerId);
    if (validOwnerId !== selectedOwnerId) {
      logger.log('🔄 useStableOwnerFilter: Auto-resetting invalid owner selection', {
        from: selectedOwnerId,
        to: validOwnerId,
        availableOwners: uniqueOwners.length
      });
      setSelectedOwnerIdInternal(validOwnerId);
    }
  }, [selectedOwnerId, resetToValidOwner, uniqueOwners.length]);

  // Filtered metrics based on owner selection
  const filteredMetrics = React.useMemo(() => {
    if (selectedOwnerId === 'all') {
      return metrics;
    }
    return metrics.filter(metric => metric.owner_id === selectedOwnerId);
  }, [metrics, selectedOwnerId]);

  // Safe setter that validates before setting
  const setSelectedOwnerId = React.useCallback((ownerId: string) => {
    const validOwnerId = resetToValidOwner(ownerId);
    setSelectedOwnerIdInternal(validOwnerId);
    
    if (validOwnerId !== ownerId) {
      logger.warn('🔄 useStableOwnerFilter: Invalid owner selection corrected', {
        requested: ownerId,
        corrected: validOwnerId
      });
    }
  }, [resetToValidOwner]);

  const isValidSelection = isValidOwnerSelection(selectedOwnerId);

  return {
    selectedOwnerId,
    setSelectedOwnerId,
    filteredMetrics,
    uniqueOwners,
    isValidSelection,
    getOwnerName
  };
};