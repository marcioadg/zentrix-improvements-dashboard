import { celebrate } from '@/lib/celebration';
import { logger } from '@/utils/logger';

/**
 * Centralized bidirectional goal progress <-> status synchronization logic
 * 
 * Rules:
 * - Progress 100% → Status 'complete' (with celebration)
 * - Progress < 100% AND Status 'complete' → Status 'on_track' (revert completion)
 * - Status 'complete' → Progress 100%
 */

export interface GoalStatusSyncResult {
  status?: 'on_track' | 'off_track' | 'complete' | 'canceled';
  progress?: number;
  shouldCelebrate: boolean;
}

/**
 * Calculate status and progress updates based on progress change
 */
export function syncStatusFromProgress(
  currentProgress: number,
  newProgress: number,
  currentStatus: string
): GoalStatusSyncResult {
  const result: GoalStatusSyncResult = {
    shouldCelebrate: false
  };

  logger.debug('🔄 syncStatusFromProgress:', { currentProgress, newProgress, currentStatus });

  // Progress reached 100% → Set status to 'complete' and celebrate
  if (newProgress === 100 && currentProgress !== 100) {
    result.status = 'complete';
    result.shouldCelebrate = true;
    logger.debug('✨ Progress reached 100% - setting status to complete with celebration');
  }
  // Progress dropped below 100% from complete → Revert to 'on_track'
  else if (newProgress < 100 && currentStatus === 'complete') {
    result.status = 'on_track';
    logger.debug('↩️ Progress dropped below 100% from complete - reverting to on_track');
  }

  return result;
}

/**
 * Calculate progress update based on status change
 */
export function syncProgressFromStatus(
  newStatus: string,
  currentProgress: number
): GoalStatusSyncResult {
  const result: GoalStatusSyncResult = {
    shouldCelebrate: false
  };

  logger.debug('🔄 syncProgressFromStatus:', { newStatus, currentProgress });

  // Status changed to 'complete' → Always celebrate, set progress to 100% if needed
  if (newStatus === 'complete') {
    result.shouldCelebrate = true;
    
    // Only update progress if it's not already 100%
    if (currentProgress !== 100) {
      result.progress = 100;
    }
    
    logger.debug('✨ Status set to complete - celebrating', { 
      progressUpdated: currentProgress !== 100 
    });
  }

  return result;
}

/**
 * Helper to trigger celebration safely
 */
export function triggerCelebrationSafely() {
  try {
    celebrate();
  } catch (error) {
    logger.error('Failed to trigger celebration:', error);
  }
}
