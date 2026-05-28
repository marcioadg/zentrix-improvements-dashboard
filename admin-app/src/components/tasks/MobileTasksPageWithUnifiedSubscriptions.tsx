import React, { useCallback } from 'react';
import { MobileTasksPage } from './MobileTasksPage';
import { useUnifiedSubscriptionManager } from '@/hooks/meeting/useUnifiedSubscriptionManager';
import { useBatchedCacheManager } from '@/hooks/meeting/useBatchedCacheManager';
import { useOptimisticMeetingEnd } from '@/contexts/OptimisticMeetingEndContext';

/**
 * Enhanced MobileTasksPage with unified subscription management
 * This wrapper prevents subscription competition during meeting transitions
 */
export const MobileTasksPageWithUnifiedSubscriptions: React.FC = () => {
  const { requestCacheInvalidation } = useBatchedCacheManager();
  const { isLeavingMeeting } = useOptimisticMeetingEnd();

  const handleTaskChange = useCallback((payload: any) => {
    // Use batched cache management to prevent cascades during meeting operations
    requestCacheInvalidation('task_change', () => {
      // Prefer custom event over direct cache clearing to maintain optimistic state
      window.dispatchEvent(new CustomEvent('taskCreated', { 
        detail: { source: 'unified_subscription', eventType: payload.eventType }
      }));
    });
  }, [requestCacheInvalidation]);

  const handleMeetingChange = useCallback((payload: any) => {
    // Don't dispatch events during leave operations to prevent cascading reloads
    if (isLeavingMeeting) {
      return;
    }
    
    // Meeting changes might affect task visibility or team membership
    requestCacheInvalidation('meeting_change', () => {
      // Prefer custom event to maintain optimistic state during meeting operations
      window.dispatchEvent(new CustomEvent('taskCreated', { 
        detail: { source: 'meeting_change', eventType: payload.eventType }
      }));
    });
  }, [requestCacheInvalidation, isLeavingMeeting]);

  // Set up unified subscription management
  const { isSubscriptionActive } = useUnifiedSubscriptionManager({
    onTaskChange: handleTaskChange,
    onMeetingChange: handleMeetingChange
  }, true);

  // Render the original MobileTasksPage component
  // The unified subscription manager handles all real-time updates
  return <MobileTasksPage />;
};