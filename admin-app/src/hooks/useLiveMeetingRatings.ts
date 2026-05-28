
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface LiveRating {
  id: string;
  meeting_state_id: string;
  user_id: string;
  rated_member_id: string;
  rating: number;
  submitted_by?: string;
  created_at: string;
  updated_at: string;
}

interface MemberWithProfile {
  id: string;
  user_id: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

// Utility function to validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};


/**
 * Optimized Hook for live meeting ratings with efficient real-time sync:
 * 1. Postgres Changes (reliable database events) - primary mechanism
 * 2. Polling Fallback (only if postgres_changes fails after 3s) - true fallback
 * 3. Retry Logic (with exponential backoff) - for error recovery
 * 4. Debouncing (100ms) - prevents rapid refetches without delaying updates
 * 
 * Optimizations:
 * - Debounce reduced to 100ms for faster updates
 * - Polling only starts if postgres_changes fails (not automatic)
 * - No hash comparison to prevent blocking legitimate updates
 * - No rate limiting to allow immediate updates
 */
export const useLiveMeetingRatings = (activeMeetingId: string | null, members: MemberWithProfile[]) => {
  const [liveRatings, setLiveRatings] = useState<LiveRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Refs for failproof mechanisms
  const channelRef = useRef<any>(null);
  const dbChannelRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const usePollingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchLiveRatingsRef = useRef<((showLoading?: boolean, retry?: boolean) => Promise<void>) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user ID on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Fetch existing live ratings with retry logic
  const fetchLiveRatings = useCallback(async (showLoading = false, retry = false) => {
    if (!activeMeetingId) return;

    if (showLoading) setLoading(true);

    try {
      logger.log('LiveRatings: Fetching ratings for meeting', activeMeetingId);
      
      const { data, error } = await supabase
        .from('live_meeting_ratings')
        .select('*')
        .eq('meeting_state_id', activeMeetingId);

      if (error) {
        logger.error('LiveRatings: Error fetching ratings', error);
        // Retry with exponential backoff
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          const delay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s
          // Clear any existing retry timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              fetchLiveRatings(showLoading, true);
            }
            retryTimeoutRef.current = null;
          }, delay);
        }
        if (isMountedRef.current) setLoading(false);
        return;
      }

      // Reset retry count on success
      retryCountRef.current = 0;

      logger.log('LiveRatings: Fetched', (data || []).length, 'ratings');
      
      if (isMountedRef.current) {
        setLiveRatings(data || []);
        setLoading(false);
      }
    } catch (error) {
      logger.error('LiveRatings: Unexpected error', error);
      // Retry on error
      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            fetchLiveRatings(showLoading, true);
          }
          retryTimeoutRef.current = null;
        }, delay);
      }
      if (isMountedRef.current) setLoading(false);
    }
  }, [activeMeetingId]);

  // Keep ref updated
  useEffect(() => {
    fetchLiveRatingsRef.current = fetchLiveRatings;
  }, [fetchLiveRatings]);

  // Debounced fetch to prevent multiple rapid calls (reduced from 300ms to 100ms for faster updates)
  const debouncedFetch = useCallback((showLoading = false) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (fetchLiveRatingsRef.current) {
        fetchLiveRatingsRef.current(showLoading);
      }
    }, 100); // 100ms debounce for faster updates
  }, []);

  // Save or update a self-rating with improved error handling
  const saveRating = useCallback(async (userId: string, rating: number) => {
    if (!activeMeetingId || !userId) {
      logger.error('Missing required parameters for saving self-rating');
      return;
    }

    // Validate UUIDs to prevent "invalid input syntax for type uuid" errors
    if (!isValidUUID(userId)) {
      logger.error('Invalid user ID format:', userId);
      toast({
        title: "Invalid User",
        description: "Invalid user ID format",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUUID(activeMeetingId)) {
      logger.error('Invalid meeting ID format:', activeMeetingId);
      toast({
        title: "Invalid Meeting",
        description: "Invalid meeting ID format",
        variant: "destructive",
      });
      return;
    }

    // Validate rating value (1 to 10, any decimal)
    if (rating < 1 || rating > 10) {
      logger.error('Invalid rating value:', rating);
      toast({
        title: "Invalid Rating",
        description: "Rating must be between 1 and 10",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      logger.log(`Attempting to save self-rating: ${rating} for user ${userId}`);
      
      // Self-rating: user_id === rated_member_id
      const { data, error } = await supabase
        .from('live_meeting_ratings')
        .upsert({
          meeting_state_id: activeMeetingId,
          user_id: userId,
          rated_member_id: userId, // Self-rating
          rating: rating,
          submitted_by: currentUserId || userId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'meeting_state_id,user_id,rated_member_id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        logger.error('Database error saving self-rating:', error);
        
        // Provide specific error messages based on error type
        if (error.message.includes('duplicate key value violates unique constraint')) {
          toast({
            title: "Rating Already Exists",
            description: "This rating has already been saved. The page will refresh to show current ratings.",
            variant: "destructive",
          });
          // Refresh ratings to show current state
          await fetchLiveRatings();
        } else if (error.message.includes('invalid input syntax for type uuid')) {
          toast({
            title: "Invalid Data Format",
            description: "There was an issue with the data format. Please try again.",
            variant: "destructive",
          });
        } else if (error.message.includes('row-level security')) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to rate in this meeting.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Failed to Save Rating",
            description: error.message || "Please try again or contact support.",
            variant: "destructive",
          });
        }
        return;
      }

      logger.log(`Self-rating saved successfully:`, data);
      
      // Optimistically update local state only if the database operation succeeded
      setLiveRatings(prev => {
        const filtered = prev.filter(r => !(r.user_id === userId && r.rated_member_id === userId));
        const newRating = data && data.length > 0 ? data[0] : {
          id: 'temp-' + Date.now(),
          meeting_state_id: activeMeetingId,
          user_id: userId,
          rated_member_id: userId,
          rating: rating,
          submitted_by: currentUserId || userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        return [...filtered, newRating];
      });

      // Return the rating for broadcast callback
      return { userId, rating };

    } catch (error: any) {
      logger.error('Unexpected error saving self-rating:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeMeetingId, currentUserId, toast, fetchLiveRatings]);

  // Update a rating in local state (for receiving broadcasts)
  const updateRatingLocalState = useCallback((userId: string, rating: number) => {
    setLiveRatings(prev => {
      const filtered = prev.filter(r => !(r.user_id === userId && r.rated_member_id === userId));
      const newRating: LiveRating = {
        id: 'broadcast-' + Date.now(),
        meeting_state_id: activeMeetingId || '',
        user_id: userId,
        rated_member_id: userId,
        rating: rating,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return [...filtered, newRating];
    });
  }, [activeMeetingId]);

  // Get self-rating for a specific user
  const getRating = useCallback((userId: string): number | null => {
    const rating = liveRatings.find(r => 
      r.user_id === userId && r.rated_member_id === userId
    );
    return rating ? rating.rating : null;
  }, [liveRatings]);

  // Get completion status - check if all members have submitted their self-ratings
  const getCompletionStatus = useCallback(() => {
    const selfRatedMembers = new Set(
      liveRatings
        .filter(r => r.user_id === r.rated_member_id) // Only self-ratings
        .map(r => r.user_id)
    );
    const totalMembers = members.length;
    const ratedCount = selfRatedMembers.size;
    
    return {
      completed: ratedCount,
      total: totalMembers,
      isComplete: ratedCount === totalMembers && totalMembers > 0
    };
  }, [liveRatings, members.length]);

  // Get live ratings summary - show self-ratings for each member
  const getRatingsSummary = useCallback(() => {
    return members.map(member => {
      // Find self-rating for this member
      const selfRating = liveRatings.find(rating => 
        rating.user_id === member.user_id && rating.rated_member_id === member.user_id
      );
      
      return {
        memberId: member.user_id,
        memberName: member.profiles?.full_name || member.profiles?.email || 'Unknown',
        selfRating: selfRating ? selfRating.rating : null,
        hasSubmitted: !!selfRating,
        isComplete: !!selfRating
      };
    });
  }, [liveRatings, members]);

  // Setup polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling
    
    logger.log('LiveRatings: Starting polling fallback');
    usePollingRef.current = true;
    
    pollingIntervalRef.current = setInterval(() => {
      if (isMountedRef.current && activeMeetingId && fetchLiveRatingsRef.current) {
        fetchLiveRatingsRef.current(false);
      }
    }, 5000); // Poll every 5 seconds
  }, [activeMeetingId]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      usePollingRef.current = false;
      logger.log('LiveRatings: Stopped polling fallback');
    }
  }, []);

  // Main subscription setup with all fallbacks
  useEffect(() => {
    if (!activeMeetingId) {
      setLoading(false);
      return;
    }

    isMountedRef.current = true;
    retryCountRef.current = 0;
    
    // Initial fetch
    fetchLiveRatings(true);

    // 1. POSTGRES CHANGES - live_meeting_ratings (primary sync mechanism)
    const dbChannel = supabase
      .channel(`live_meeting_ratings:${activeMeetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_meeting_ratings',
          filter: `meeting_state_id=eq.${activeMeetingId}`
        },
        (payload) => {
          logger.log('LiveRatings: DB change detected', payload);
          // Check if rating actually changed
          const oldRating = (payload.old as any)?.rating;
          const newRating = (payload.new as any)?.rating;
          if (oldRating !== newRating || payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            debouncedFetch(false);
          }
        }
      )
      .subscribe((status) => {
        logger.log('LiveRatings: Postgres changes status', status);
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
            logger.warn('LiveRatings: Postgres changes failed, will start polling fallback in 3s');
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

    return () => {
      isMountedRef.current = false;
      
      stopPolling();
      
      // Cleanup all timeouts to prevent memory leaks
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      
      if (dbChannelRef.current) {
        supabase.removeChannel(dbChannelRef.current);
        dbChannelRef.current = null;
      }
    };
  }, [activeMeetingId, fetchLiveRatings, debouncedFetch, startPolling, stopPolling]);

  return {
    liveRatings,
    saveRating,
    getRating,
    getCompletionStatus,
    getRatingsSummary,
    loading,
    updateRatingLocalState
  };
};
