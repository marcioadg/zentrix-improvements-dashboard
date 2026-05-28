import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { logger } from '@/utils/logger';

export interface MeetingParticipant {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  role: string;
}

/**
 * Optimized Hook to get meeting participants with efficient real-time sync:
 * 1. Broadcast (instant peer-to-peer) - for immediate updates
 * 2. Postgres Changes - meetings_state (for join/leave) - primary mechanism
 * 3. Postgres Changes - profiles (for avatar updates) - for avatar changes
 * 4. Polling Fallback (only if postgres_changes fails after 3s) - true fallback
 * 5. Retry Logic (with exponential backoff) - for error recovery
 * 
 * Optimizations:
 * - Debounce reduced to 50ms for faster updates
 * - Polling only starts if postgres_changes fails (not automatic)
 * - No rate limiting to allow immediate updates
 * - Broadcast retry logic for reliability
 * - Logs only in development environment
 */
export const useMeetingParticipants = (meetingId: string | null) => {
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useProfile();
  const channelRef = useRef<any>(null);
  const dbChannelRef = useRef<any>(null);
  const profilesChannelRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const usePollingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchParticipantsRef = useRef<((showLoading?: boolean, retry?: boolean) => Promise<void>) | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch participants from database with retry logic
  const fetchParticipants = useCallback(async (showLoading = false, retry = false) => {
    if (!meetingId) return;
    
    if (showLoading) setLoading(true);
    
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.log('MeetingParticipants: Fetching participants for meeting', meetingId);
      }
      
      // Get meeting with role_assignments
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings_state')
        .select('role_assignments, scriber_id')
        .eq('id', meetingId)
        .single();

      if (meetingError || !meeting) {
        if (process.env.NODE_ENV === 'development') {
          logger.log('MeetingParticipants: Meeting not found or error', meetingError);
        }
        if (isMountedRef.current) {
          setParticipants([]);
          setLoading(false);
        }
        return;
      }

      const roleAssignments = (meeting.role_assignments || {}) as Record<string, string>;
      const userIds = Object.keys(roleAssignments);

      if (userIds.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          logger.log('MeetingParticipants: No participants in meeting');
        }
        if (isMountedRef.current) {
          setParticipants([]);
          setLoading(false);
        }
        return;
      }

      // Fetch profiles for all participants
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);

      if (profilesError) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('MeetingParticipants: Error fetching profiles', profilesError);
        }
        // Retry with exponential backoff
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          const delay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s
          setTimeout(() => {
            fetchParticipants(showLoading, true);
          }, delay);
        }
        if (isMountedRef.current) setLoading(false);
        return;
      }

      // Reset retry count on success
      retryCountRef.current = 0;

      // Validate and map participants
      const participantList: MeetingParticipant[] = (profiles || [])
        .filter(p => p.id && userIds.includes(p.id)) // Validate
        .map(p => ({
          user_id: p.id,
          full_name: p.full_name || 'Unknown User',
          avatar_url: p.avatar_url,
          email: p.email,
          role: roleAssignments[p.id] || 'participant',
        }));

      if (process.env.NODE_ENV === 'development') {
        logger.log('MeetingParticipants: Fetched', participantList.length, 'participants');
      }
      
      if (isMountedRef.current) {
        setParticipants(participantList);
        setLoading(false);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('MeetingParticipants: Unexpected error', error);
      }
      // Retry on error
      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        setTimeout(() => {
          fetchParticipants(showLoading, true);
        }, delay);
      }
      if (isMountedRef.current) setLoading(false);
    }
  }, [meetingId]);

  // Keep ref updated
  useEffect(() => {
    fetchParticipantsRef.current = fetchParticipants;
  }, [fetchParticipants]);

  // Debounced fetch to prevent multiple rapid calls (reduced to 50ms for faster updates)
  const debouncedFetch = useCallback((showLoading = false) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (fetchParticipantsRef.current) {
        fetchParticipantsRef.current(showLoading);
      }
    }, 50); // 50ms debounce for faster updates
  }, []);

  // Add optimistic self immediately when joining
  const addOptimisticSelf = useCallback((role: string = 'participant') => {
    if (!profile) return;
    
    setParticipants(prev => {
      // Check if already in list
      if (prev.some(p => p.user_id === profile.id)) return prev;
      
      return [...prev, {
        user_id: profile.id,
        full_name: profile.full_name || 'Unknown User',
        avatar_url: profile.avatar_url,
        email: profile.email,
        role,
      }];
    });
  }, [profile]);

  // Setup polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling
    
    if (process.env.NODE_ENV === 'development') {
      logger.log('MeetingParticipants: Starting polling fallback');
    }
    usePollingRef.current = true;
    
    pollingIntervalRef.current = setInterval(() => {
      if (isMountedRef.current && meetingId && fetchParticipantsRef.current) {
        fetchParticipantsRef.current(false);
      }
    }, 5000); // Poll every 5 seconds
  }, [meetingId]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      usePollingRef.current = false;
      if (process.env.NODE_ENV === 'development') {
        logger.log('MeetingParticipants: Stopped polling fallback');
      }
    }
  }, []);

  // Main subscription setup with all fallbacks
  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    isMountedRef.current = true;
    retryCountRef.current = 0;
    
    // Initial fetch
    fetchParticipants(true);

    // 1. BROADCAST CHANNEL (instant peer-to-peer)
    const channelName = `meeting:${meetingId}:participants`;
    if (process.env.NODE_ENV === 'development') {
      logger.log('MeetingParticipants: Subscribing to broadcast', channelName);
    }
    
    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'participants_changed' }, (payload) => {
        if (process.env.NODE_ENV === 'development') {
          logger.log('MeetingParticipants: Received broadcast', payload);
        }
        debouncedFetch(false);
      })
      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development') {
          logger.log('MeetingParticipants: Broadcast subscription status', status);
        }
        if (status === 'CHANNEL_ERROR' && !usePollingRef.current) {
          if (process.env.NODE_ENV === 'development') {
            logger.warn('MeetingParticipants: Broadcast failed, will rely on postgres_changes');
          }
        }
      });

    channelRef.current = channel;

    // 2. POSTGRES CHANGES - meetings_state (for join/leave)
    const dbChannel = supabase.channel(`meeting-db:${meetingId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'meetings_state',
        filter: `id=eq.${meetingId}`,
      }, (payload) => {
        if (process.env.NODE_ENV === 'development') {
          logger.log('MeetingParticipants: DB update detected (meetings_state)', payload);
        }
        // Check if role_assignments actually changed
        const oldRoleAssignments = (payload.old as any)?.role_assignments;
        const newRoleAssignments = (payload.new as any)?.role_assignments;
        if (JSON.stringify(oldRoleAssignments) !== JSON.stringify(newRoleAssignments)) {
          debouncedFetch(false);
        }
      })
      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development') {
          logger.log('MeetingParticipants: Postgres changes (meetings_state) status', status);
        }
        if (status === 'SUBSCRIBED') {
          stopPolling(); // Stop polling if postgres_changes works
          // Clear any pending polling timeout
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Only start polling if not already polling and after 3s delay
          if (!usePollingRef.current && !pollingTimeoutRef.current) {
            if (process.env.NODE_ENV === 'development') {
              logger.warn('MeetingParticipants: Postgres changes failed, will start polling fallback in 3s');
            }
            pollingTimeoutRef.current = setTimeout(() => {
              if (!usePollingRef.current && isMountedRef.current) {
                startPolling();
              }
              pollingTimeoutRef.current = null;
            }, 3000); // Wait 3s before starting polling
          }
        }
      });

    dbChannelRef.current = dbChannel;

    // 3. POSTGRES CHANGES - profiles (for avatar updates)
    const profilesChannel = supabase.channel(`meeting-profiles:${meetingId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      }, (payload) => {
        // Only refetch if avatar_url changed
        const oldAvatar = (payload.old as any)?.avatar_url;
        const newAvatar = (payload.new as any)?.avatar_url;
        if (oldAvatar !== newAvatar) {
          if (process.env.NODE_ENV === 'development') {
            logger.log('MeetingParticipants: Avatar updated detected', payload.new);
          }
          debouncedFetch(false);
        }
      })
      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development') {
          logger.log('MeetingParticipants: Postgres changes (profiles) status', status);
        }
      });

    profilesChannelRef.current = profilesChannel;

    return () => {
      isMountedRef.current = false;
      
      stopPolling();
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (dbChannelRef.current) {
        supabase.removeChannel(dbChannelRef.current);
        dbChannelRef.current = null;
      }
      
      if (profilesChannelRef.current) {
        supabase.removeChannel(profilesChannelRef.current);
        profilesChannelRef.current = null;
      }
    };
  }, [meetingId, fetchParticipants, debouncedFetch, startPolling, stopPolling]);

  return { 
    participants, 
    loading, 
    refetch: () => fetchParticipants(false),
    addOptimisticSelf,
  };
};

/**
 * Broadcast that participants have changed - call this when joining/leaving
 * Includes retry logic for reliability
 */
export const broadcastParticipantsChanged = async (meetingId: string, action: 'join' | 'leave' | 'end', retryCount = 0): Promise<void> => {
  const maxRetries = 3;
  const retryDelay = 200; // 200ms between retries
  
  try {
    if (process.env.NODE_ENV === 'development') {
      logger.log('MeetingParticipants: Broadcasting participants_changed', { meetingId, action, attempt: retryCount + 1 });
    }
    
    const channel = supabase.channel(`meeting:${meetingId}:participants`);
    
    // Subscribe with timeout
    const subscribePromise = channel.subscribe();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Subscribe timeout')), 5000)
    );
    
    await Promise.race([subscribePromise, timeoutPromise]);
    
    // Wait a small delay to ensure channel is ready
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const sendPromise = channel.send({
      type: 'broadcast',
      event: 'participants_changed',
      payload: { action, timestamp: Date.now() },
    });
    
    const sendTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Send timeout')), 3000)
    );
    
    await Promise.race([sendPromise, sendTimeoutPromise]);
    
    // Clean up the broadcast channel after sending
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 100);
    
    if (process.env.NODE_ENV === 'development') {
      logger.log('MeetingParticipants: Broadcast sent successfully');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      logger.error('MeetingParticipants: Failed to broadcast', error, 'retry:', retryCount + 1, '/', maxRetries);
    }
    
    // Retry with exponential backoff
    if (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
      return broadcastParticipantsChanged(meetingId, action, retryCount + 1);
    } else {
      // After max retries, log error but don't throw (non-critical)
      if (process.env.NODE_ENV === 'development') {
        logger.warn('MeetingParticipants: Broadcast failed after', maxRetries, 'retries, relying on postgres_changes');
      }
    }
  }
};
