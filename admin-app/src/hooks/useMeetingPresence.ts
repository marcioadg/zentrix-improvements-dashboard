
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { logger } from '@/utils/logger';
import { logRefreshTrigger } from '@/utils/refreshTelemetry';

export interface MeetingPresence {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  online_at: string;
}

interface PresenceData {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  online_at: string;
}

interface UseMeetingPresenceOptions {
  joinMeeting?: boolean;
}

export const useMeetingPresence = (
  teamId: string | null,
  options: UseMeetingPresenceOptions = {}
) => {
  const { joinMeeting = true } = options;
  const [presences, setPresences] = useState<MeetingPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useProfile();
  const channelRef = useRef<any>(null);
  const profileRef = useRef(profile);
  const hasTrackedRef = useRef(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cache of known presences to prevent data loss during sync race conditions
  const knownPresencesRef = useRef<Map<string, MeetingPresence>>(new Map());
  
  // Keep profile ref current
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Helper to update presences from cache
  const updatePresencesFromCache = useCallback(() => {
    setPresences(Array.from(knownPresencesRef.current.values()));
  }, []);

  // Helper to add optimistic self-presence to cache
  const addOptimisticSelf = useCallback((userProfile: typeof profile) => {
    if (!userProfile) return;
    
    const selfPresence: MeetingPresence = {
      user_id: userProfile.id,
      full_name: userProfile.full_name || 'Unknown User',
      avatar_url: userProfile.avatar_url,
      email: userProfile.email,
      online_at: new Date().toISOString(),
    };
    
    knownPresencesRef.current.set(userProfile.id, selfPresence);
    updatePresencesFromCache();
    logger.log('MeetingPresence: Added optimistic self to cache', userProfile.id);
  }, [updatePresencesFromCache]);

  // Main channel setup effect
  useEffect(() => {
    if (!teamId) {
      logger.log('MeetingPresence: Missing teamId, skipping setup');
      setLoading(false);
      return;
    }

    if (joinMeeting && !profile) {
      logger.log('MeetingPresence: Waiting for profile to load...');
      return;
    }

    logger.log('MeetingPresence: Setting up channel', { teamId, joinMeeting, userId: profile?.id });
    hasTrackedRef.current = false;
    knownPresencesRef.current.clear();

    // Clear existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Clear existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    const channelName = `meeting-presence-${teamId}`;
    const presenceKey = joinMeeting && profile 
      ? profile.id 
      : `observer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: presenceKey },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const currentUserIds = new Set<string>();
        
        // Process all users in current state (excluding observers)
        Object.keys(state)
          .filter(key => !key.startsWith('observer-'))
          .forEach(userId => {
            currentUserIds.add(userId);
            const presenceArray = state[userId];
            if (presenceArray && presenceArray.length > 0) {
              const presence = presenceArray[0] as unknown as PresenceData;
              knownPresencesRef.current.set(userId, {
                user_id: userId,
                full_name: presence.full_name || 'Unknown User',
                avatar_url: presence.avatar_url,
                email: presence.email,
                online_at: presence.online_at,
              });
            }
          });
        
        // Remove users who are no longer in state (they left)
        for (const userId of Array.from(knownPresencesRef.current.keys())) {
          if (!currentUserIds.has(userId)) {
            logger.log('MeetingPresence: Removing user from cache (left via sync)', userId);
            knownPresencesRef.current.delete(userId);
          }
        }
        
        logger.log('MeetingPresence: Sync complete, presences:', knownPresencesRef.current.size);
        updatePresencesFromCache();
        setLoading(false);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key.startsWith('observer-')) return;
        
        logger.log('MeetingPresence: User joined', key);
        
        // 🔍 TELEMETRY: Log presence join events (suspected refresh trigger)
        logRefreshTrigger('meeting-presence-join', {
          joinedUserId: key,
          teamId,
          presenceCount: knownPresencesRef.current.size + 1,
        });
        
        // Immediately add to cache for instant UI update
        if (newPresences && newPresences.length > 0) {
          const presence = newPresences[0] as unknown as PresenceData;
          knownPresencesRef.current.set(key, {
            user_id: key,
            full_name: presence.full_name || 'Unknown User',
            avatar_url: presence.avatar_url,
            email: presence.email,
            online_at: presence.online_at,
          });
          updatePresencesFromCache();
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key.startsWith('observer-')) return;
        
        logger.log('MeetingPresence: User left', key);
        
        // Immediately remove from cache for instant UI update
        if (knownPresencesRef.current.has(key)) {
          knownPresencesRef.current.delete(key);
          updatePresencesFromCache();
        }
      })
      .subscribe(async (status) => {
        logger.log('MeetingPresence: Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          const currentProfile = profileRef.current;
          
          if (joinMeeting && currentProfile && !hasTrackedRef.current) {
            // Add optimistic self immediately
            addOptimisticSelf(currentProfile);
            
            // Small delay to ensure channel is fully ready
            await new Promise(r => setTimeout(r, 50));
            
            const presenceData: PresenceData = {
              user_id: currentProfile.id,
              full_name: currentProfile.full_name || 'Unknown User',
              avatar_url: currentProfile.avatar_url,
              email: currentProfile.email,
              online_at: new Date().toISOString(),
            };
            
            try {
              await channel.track(presenceData);
              hasTrackedRef.current = true;
              logger.log('MeetingPresence: Successfully tracked presence');
              
              // Start heartbeat to maintain presence every 30 seconds
              heartbeatIntervalRef.current = setInterval(async () => {
                if (channelRef.current && profileRef.current) {
                  try {
                    await channelRef.current.track({
                      ...presenceData,
                      online_at: new Date().toISOString(),
                    });
                    logger.debug('MeetingPresence: Heartbeat sent');
                  } catch (err) {
                    // CRITICAL FIX: Handle heartbeat failures gracefully
                    // Without this, unhandled promise rejection fires every 30s
                    logger.warn('MeetingPresence: Heartbeat failed (will retry)', err);
                    // Continue heartbeat interval - transient failures are expected
                  }
                }
              }, 30000);
            } catch (err) {
              logger.error('MeetingPresence: Failed to track', err);
            }
          } else if (!joinMeeting) {
            logger.log('MeetingPresence: Subscribed in observe-only mode');
            setLoading(false);
          }
        }
      });

    // Cleanup on tab close
    const handleBeforeUnload = () => {
      if (joinMeeting && channelRef.current) {
        channelRef.current.untrack();
      }
    };
    
    if (joinMeeting) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      logger.debug('MeetingPresence: Cleaning up');
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (joinMeeting) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      
      if (channelRef.current) {
        const ch = channelRef.current;
        channelRef.current = null;
        hasTrackedRef.current = false;
        knownPresencesRef.current.clear();
        
        if (joinMeeting) {
          ch.untrack().then(() => {
            logger.debug('MeetingPresence: Untracked successfully');
            supabase.removeChannel(ch);
          }).catch((err: any) => {
            logger.debug('MeetingPresence: Untrack error:', err);
            supabase.removeChannel(ch);
          });
        } else {
          supabase.removeChannel(ch);
        }
      }
    };
  }, [teamId, joinMeeting, profile?.id, addOptimisticSelf, updatePresencesFromCache]);

  // Handle late profile loading - re-track if profile becomes available
  useEffect(() => {
    if (!joinMeeting || !profile || !channelRef.current || hasTrackedRef.current) return;
    
    logger.log('MeetingPresence: Profile loaded late, attempting to track');
    
    const trackLateProfile = async () => {
      addOptimisticSelf(profile);
      
      const presenceData: PresenceData = {
        user_id: profile.id,
        full_name: profile.full_name || 'Unknown User',
        avatar_url: profile.avatar_url,
        email: profile.email,
        online_at: new Date().toISOString(),
      };
      
      try {
        await channelRef.current.track(presenceData);
        hasTrackedRef.current = true;
      } catch (err) {
        logger.error('MeetingPresence: Late track failed', err);
      }
    };
    
    trackLateProfile();
  }, [profile?.id, joinMeeting, addOptimisticSelf]);

  return { presences, loading };
};
