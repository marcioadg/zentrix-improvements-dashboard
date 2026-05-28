import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const useMeetingSubscriptions = (
  currentCompany: { id: string } | null,
  teamIds: string[],
  onMeetingChange: () => void
) => {
  // Use ref to always have latest callback without recreating subscriptions
  const callbackRef = useRef(onMeetingChange);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onMeetingChange;
  }, [onMeetingChange]);

  // Stable team IDs string for dependency - spread to avoid mutating original array
  const teamIdsKey = [...teamIds].sort().join(',');

  // Debounced change handler that always uses latest callback
  const debouncedChange = useCallback((delay: number = 800) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      logger.debug('useMeetingSubscriptions: Debounced callback firing');
      callbackRef.current();
    }, delay);
  }, []);

  // Immediate change handler for critical events (INSERT)
  const immediateChange = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    logger.debug('useMeetingSubscriptions: Immediate callback firing');
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (!currentCompany || teamIds.length === 0) {
      return;
    }

    logger.debug('useMeetingSubscriptions: Setting up subscriptions', { 
      companyId: currentCompany?.id, 
      teamCount: teamIds.length 
    });

    const hasTeamId = (obj: any): obj is { team_id: string } => {
      return obj && typeof obj === 'object' && typeof obj.team_id === 'string';
    };

    // Subscribe to meetings_state changes
    const meetingsSubscription = supabase
      .channel(`company_meetings_${currentCompany?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings_state'
        },
        (payload) => {
          const newRecord = payload.new;
          const oldRecord = payload.old;
          
          // Check if this change is for one of our teams
          const isRelevant = 
            (hasTeamId(newRecord) && teamIds.includes(newRecord.team_id)) ||
            (hasTeamId(oldRecord) && teamIds.includes(oldRecord.team_id));
          
          if (!isRelevant) return;

          const relevantTeamId = hasTeamId(newRecord) ? newRecord.team_id : (hasTeamId(oldRecord) ? oldRecord.team_id : null);
          
          logger.debug('useMeetingSubscriptions: meetings_state change', { 
            eventType: payload.eventType,
            teamId: relevantTeamId
          });

          // INSERT events trigger immediate refetch (new meeting started)
          // DELETE events also trigger immediate (meeting deleted)
          // UPDATE events with status change to 'active' or 'ended' are immediate
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            immediateChange();
          } else if (payload.eventType === 'UPDATE' && hasTeamId(newRecord)) {
            const statusChanged = (oldRecord as any)?.status !== (newRecord as any)?.status;
            const newStatus = (newRecord as any)?.status;
            
            if (statusChanged && (newStatus === 'active' || newStatus === 'ended')) {
              immediateChange();
            } else {
              debouncedChange(800);
            }
          } else {
            debouncedChange(800);
          }
        }
      )
      .subscribe();

    // Subscribe to meeting_results changes with debouncing
    const resultsSubscription = supabase
      .channel(`company_meeting_results_${currentCompany?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_results'
        },
        (payload) => {
          if (payload.new && hasTeamId(payload.new) && teamIds.includes(payload.new.team_id)) {
            debouncedChange(800);
          }
        }
      )
      .subscribe();

    return () => {
      logger.debug('useMeetingSubscriptions: Cleaning up subscriptions');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      supabase.removeChannel(meetingsSubscription);
      supabase.removeChannel(resultsSubscription);
    };
  }, [currentCompany?.id, teamIdsKey, debouncedChange, immediateChange]);
};