import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigationTransition } from '@/contexts/NavigationTransitionContext';
import { useMeetingEndState } from '@/contexts/MeetingEndStateContext';
import { useOptimisticMeetingEnd } from '@/contexts/OptimisticMeetingEndContext';

interface SubscriptionCallbacks {
  onTaskChange?: (payload: any) => void;
  onMeetingChange?: (payload: any) => void;
}

/**
 * Unified subscription manager to prevent competing subscriptions during meeting transitions
 */
export const useUnifiedSubscriptionManager = (
  callbacks: SubscriptionCallbacks,
  enabled: boolean = true
) => {
  const { isTransitioning } = useNavigationTransition();
  const { isInProtectionPeriod, hasActiveOperations } = useMeetingEndState();
  const { isEndingMeeting, isLeavingMeeting } = useOptimisticMeetingEnd();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const lastEventTimeRef = useRef<number>(0);

  // Enhanced protection check that considers all transition states AND meeting operations
  const shouldSuppressEvents = useCallback(() => {
    const now = Date.now();
    const timeSinceLastEvent = now - lastEventTimeRef.current;
    
    // Check for active meeting operations that require full subscription suppression
    const hasActiveMeetingOperations = isInProtectionPeriod() || 
                                     hasActiveOperations() ||
                                     isEndingMeeting || 
                                     isLeavingMeeting;
    
    // Extra protection during leave operations
    if (isLeavingMeeting) {
      return true;
    }
    
    return (
      isTransitioning ||
      hasActiveMeetingOperations ||
      timeSinceLastEvent < 1000 // Prevent rapid-fire events
    );
  }, [isTransitioning, isInProtectionPeriod, hasActiveOperations, isEndingMeeting, isLeavingMeeting]);

  // Intelligent debouncing that adapts to meeting operation state
  const debouncedCallback = useCallback((callback: (payload: any) => void, payload: any) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Extended suppression during meeting operations to prevent reloads
    const hasActiveMeetingOperations = isInProtectionPeriod() || hasActiveOperations() || isEndingMeeting || isLeavingMeeting;
    const debounceDelay = isLeavingMeeting ? 10000 : // 10s during leave operations
                         hasActiveMeetingOperations ? 8000 : // 8s during meeting operations
                         isTransitioning ? 3000 : 1000; // 3s during transitions, 1s normal
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (!shouldSuppressEvents()) {
        lastEventTimeRef.current = Date.now();
        callback(payload);
      }
    }, debounceDelay);
  }, [shouldSuppressEvents, isInProtectionPeriod, hasActiveOperations, isEndingMeeting, isLeavingMeeting, isTransitioning]);

  useEffect(() => {
    if (!enabled) return;

    // Single channel for all table changes to reduce connection overhead
    const channel = supabase
      .channel('unified_app_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fast_tasks'
        },
        (payload) => {
          if (callbacks.onTaskChange) {
            debouncedCallback(callbacks.onTaskChange, payload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings_state'
        },
        (payload) => {
          if (callbacks.onMeetingChange) {
            debouncedCallback(callbacks.onMeetingChange, payload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_results'
        },
        (payload) => {
          if (callbacks.onMeetingChange) {
            debouncedCallback(callbacks.onMeetingChange, payload);
          }
        }
      )
      .subscribe();

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [enabled, callbacks.onTaskChange, callbacks.onMeetingChange, debouncedCallback]);

  return {
    shouldSuppressEvents,
    isSubscriptionActive: enabled
  };
};