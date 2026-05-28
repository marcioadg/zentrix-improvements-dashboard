
import { useMemo, useCallback } from 'react';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';

export const useConsolidatedDataProcessing = (
  originalMetrics: WeeklyMetricWithOwner[],
  optimisticMetrics: WeeklyMetricWithOwner[],
  applyOwnershipChanges: (metrics: WeeklyMetricWithOwner[]) => WeeklyMetricWithOwner[],
  searchText: string = ''
) => {
  logger.log('🔧 useConsolidatedDataProcessing: Processing data', {
    originalCount: originalMetrics.length,
    optimisticCount: optimisticMetrics.length,
    searchText
  });

  // Step 1: Apply ownership changes to original metrics (READ-ONLY operation)
  const metricsWithOwnershipChanges = useMemo(() => {
    const processed = applyOwnershipChanges(originalMetrics);
    logger.log('✅ Step 1: Applied ownership changes', {
      originalCount: originalMetrics.length,
      processedCount: processed.length
    });

    // CRITICAL: Assert that ownership changes never create new metrics
    if (processed.length !== originalMetrics.length) {
      logger.error('🚨 CRITICAL ERROR: Ownership changes modified metric count!', {
        before: originalMetrics.length,
        after: processed.length,
        difference: processed.length - originalMetrics.length
      });
      // Return original metrics to prevent corruption
      return originalMetrics;
    }

    return processed;
  }, [originalMetrics, applyOwnershipChanges]);

  // Step 2: PRIORITY-BASED DEDUPLICATION - Existing metrics take precedence
  const consolidatedMetrics = useMemo(() => {
    const metricMap = new Map<string, WeeklyMetricWithOwner>();
    
    // PRIORITY 1: Add existing metrics with ownership changes (highest priority)
    metricsWithOwnershipChanges.forEach(metric => {
      metricMap.set(metric.id, metric);
    });

    // PRIORITY 2: Add optimistic new metrics ONLY if they don't conflict
    optimisticMetrics.forEach(metric => {
      if (metricMap.has(metric.id)) {
        logger.warn('⚠️ DEDUPLICATION: Optimistic metric conflicts with existing metric', {
          id: metric.id,
          name: metric.metric_name,
          action: 'SKIPPED'
        });
        return; // Skip conflicting optimistic metrics
      }
      metricMap.set(metric.id, metric);
    });

    const result = Array.from(metricMap.values());
    
    logger.log('🛡️ Step 2: Priority-based deduplication completed', {
      existingMetrics: metricsWithOwnershipChanges.length,
      optimisticMetrics: optimisticMetrics.length,
      finalCount: result.length,
      duplicatesSkipped: (metricsWithOwnershipChanges.length + optimisticMetrics.length) - result.length
    });

    // SAFETY: Ensure we never have fewer metrics than original (except when optimistic are cleared)
    if (result.length < originalMetrics.length) {
      logger.error('🚨 SAFETY ERROR: Final count less than original!', {
        original: originalMetrics.length,
        final: result.length,
        optimistic: optimisticMetrics.length
      });
    }

    return result;
  }, [metricsWithOwnershipChanges, optimisticMetrics, originalMetrics.length]);

  // Step 3: Apply search filter
  const filteredMetrics = useMemo(() => {
    if (!searchText) return consolidatedMetrics;
    
    const searchLower = searchText.toLowerCase();
    const filtered = consolidatedMetrics.filter(metric => 
      metric.metric_name.toLowerCase().includes(searchLower) ||
      (metric.owner && metric.owner.toLowerCase().includes(searchLower))
    );

    logger.log('🔍 Step 3: Applied search filter', {
      searchText,
      inputCount: consolidatedMetrics.length,
      filteredCount: filtered.length
    });

    return filtered;
  }, [consolidatedMetrics, searchText]);

  // Enhanced health check with strict validation
  const performHealthCheck = useCallback(() => {
    const duplicateIds = new Set<string>();
    const seenIds = new Set<string>();
    
    filteredMetrics.forEach(metric => {
      if (seenIds.has(metric.id)) {
        duplicateIds.add(metric.id);
      }
      seenIds.add(metric.id);
    });

    // Check for metric count integrity
    const expectedMinimumCount = originalMetrics.length;
    const actualCount = filteredMetrics.length;
    const hasCountIntegrityIssue = actualCount < expectedMinimumCount && optimisticMetrics.length === 0;

    const healthStatus = {
      totalMetrics: filteredMetrics.length,
      originalMetrics: originalMetrics.length,
      optimisticMetrics: optimisticMetrics.length,
      duplicateIds: Array.from(duplicateIds),
      hasDuplicates: duplicateIds.size > 0,
      hasCountIntegrityIssue,
      isHealthy: duplicateIds.size === 0 && !hasCountIntegrityIssue,
      searchActive: !!searchText
    };

    if (!healthStatus.isHealthy) {
      logger.error('🚨 HEALTH CHECK FAILED:', healthStatus);
    } else {
      logger.log('✅ Health check passed', healthStatus);
    }

    return healthStatus;
  }, [filteredMetrics, originalMetrics, optimisticMetrics, searchText]);

  // Enhanced data integrity validation
  const validateDataIntegrity = useCallback(() => {
    const issues: string[] = [];

    // Check for duplicate IDs
    const idCounts = new Map<string, number>();
    filteredMetrics.forEach(metric => {
      const count = idCounts.get(metric.id) || 0;
      idCounts.set(metric.id, count + 1);
    });

    idCounts.forEach((count, id) => {
      if (count > 1) {
        issues.push(`Duplicate metric ID: ${id} (appears ${count} times)`);
      }
    });

    // Check for metrics with missing required fields
    filteredMetrics.forEach(metric => {
      if (!metric.metric_name) {
        issues.push(`Metric ${metric.id} missing metric_name`);
      }
      if (!metric.id) {
        issues.push(`Metric missing ID`);
      }
    });

    // Check for count integrity (should never lose existing metrics)
    if (filteredMetrics.length < originalMetrics.length && optimisticMetrics.length === 0 && !searchText) {
      issues.push(`Metric count decreased unexpectedly: ${originalMetrics.length} -> ${filteredMetrics.length}`);
    }

    if (issues.length > 0) {
      logger.error('🚨 Data integrity issues:', issues);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }, [filteredMetrics, originalMetrics.length, optimisticMetrics.length, searchText]);

  // Emergency state reset function
  const performEmergencyReset = useCallback(() => {
    logger.log('🚨 EMERGENCY RESET: Returning to original metrics only');
    return originalMetrics;
  }, [originalMetrics]);

  return {
    filteredMetrics,
    performHealthCheck,
    validateDataIntegrity,
    performEmergencyReset,
    getProcessingStats: () => ({
      originalCount: originalMetrics.length,
      optimisticCount: optimisticMetrics.length,
      finalCount: filteredMetrics.length,
      searchActive: !!searchText,
      integrityValid: validateDataIntegrity().isValid
    })
  };
};
