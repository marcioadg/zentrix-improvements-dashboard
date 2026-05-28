import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveMeeting {
  id: string;
  team_id: string;
  company_id: string | null;
  scriber_id: string | null;
  status: string;
  current_section: number;
  section_start_time: string;
  started_at: string;
  meeting_type: string;
  role_assignments: Record<string, string> | null;
}

export const useActiveTeamMeeting = (
  teamId: string | null,
  meetingType?: string  // Optional meeting type to determine query strategy
) => {
  const { currentCompany } = useMultiCompany();
  const { user } = useAuth();
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    logger.debug('🔍 useActiveTeamMeeting useEffect triggered:', {
      teamId,
      timestamp: Date.now(),
      stackTrace: new Error().stack?.split('\n').slice(1, 4)
    });
    
    if (!teamId) {
      setActiveMeeting(null);
      return;
    }

    const checkActiveMeeting = async () => {
      setLoading(true);
      setError(null);
      
      try {
        logger.debug('🔍 Checking for active meeting:', { teamId, meetingType });
        
        // STRATEGY 1: For custom meetings, try BOTH meeting ID and team ID
        if (meetingType === 'custom') {
          logger.debug('🔍 Querying custom meeting with dual strategy:', { teamId });
          
          // Try 1: Query by meeting ID (for member-based meetings from MeetingBuilder)
          const { data: meetingById, error: error1 } = await supabase
            .from('meetings_state')
            .select('*')
            .eq('id', teamId)
            .eq('status', 'active')
            .maybeSingle();

          if (error1 && error1.code !== 'PGRST116') {
            throw error1;
          }

          if (meetingById) {
            logger.debug('✅ Found active custom meeting by ID:', {
              meetingId: meetingById.id,
              teamId: meetingById.team_id,
              isMemberMeeting: meetingById.team_id === null
            });
            setActiveMeeting(meetingById);
            setLoading(false);
            return;
          }

          // Try 2: Query by team_id (for team-based custom meetings)
          const { data: meetingByTeamId, error: error2 } = await supabase
            .from('meetings_state')
            .select('*')
            .eq('team_id', teamId)
            .eq('meeting_type', 'custom')
            .eq('status', 'active')
            .maybeSingle();

          if (error2 && error2.code !== 'PGRST116') {
            throw error2;
          }

          if (meetingByTeamId) {
            logger.debug('✅ Found active custom meeting by team_id:', {
              meetingId: meetingByTeamId.id,
              teamId: meetingByTeamId.team_id
            });
            setActiveMeeting(meetingByTeamId);
          } else {
            logger.debug('📭 No active custom meeting found');
            setActiveMeeting(null);
          }
          
          setLoading(false);
          return;
        }
        
        // STRATEGY 2: For weekly/quarterly meetings, use existing team-based logic
        // Only clean up duplicates for team meetings of the SAME type.
        // Without the meeting_type filter, a weekly and a quarterly meeting active at the
        // same time would be treated as duplicates — the older one gets ended, causing a
        // random page refresh for anyone in it.
        const duplicateQuery = supabase
          .from('meetings_state')
          .select('id, started_at')
          .eq('team_id', teamId)
          .eq('status', 'active')
          .order('started_at', { ascending: false });

        // Only scope by meeting_type when it is provided; if not provided the guard still
        // works but is intentionally broad (same behaviour as before for callers that
        // don't pass meetingType).
        if (meetingType) {
          duplicateQuery.eq('meeting_type', meetingType);
        }

        const { data: duplicateMeetings, error: duplicateError } = await duplicateQuery;

        if (duplicateError) {
          logger.warn('Warning checking for duplicates:', duplicateError);
        } else if (duplicateMeetings && duplicateMeetings.length > 1) {
          logger.debug('🧹 Found multiple active meetings, cleaning up...');
          
          // Keep the most recent, mark others as completed
          const [latest, ...duplicates] = duplicateMeetings;
          
          if (duplicates.length > 0) {
            const duplicateIds = duplicates.map(m => m.id);
            await supabase
              .from('meetings_state')
              .update({ 
                status: 'ended',
                ended_at: new Date().toISOString()
              })
              .in('id', duplicateIds);
            
            logger.debug('🧹 Cleaned up duplicate meetings:', duplicateIds);
          }
        }

        // Build query for weekly/quarterly meetings
        const query = supabase
          .from('meetings_state')
          .select('*')
          .eq('status', 'active')
          .eq('team_id', teamId);
        
        const { data, error } = await query
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          throw error;
        }

        if (data) {
          logger.debug('✅ Found active meeting with scriber info:', {
            meetingId: data.id,
            scriberId: data.scriber_id,
            hasScriber: !!data.scriber_id
          });
          setActiveMeeting(data);
        } else {
          logger.debug('📭 No active meeting found for team');
          setActiveMeeting(null);
        }
      } catch (err) {
        logger.error('❌ Error checking active meeting:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setActiveMeeting(null);
      } finally {
        setLoading(false);
      }
    };

    checkActiveMeeting();

    // Set up real-time subscription for meeting state changes
    // ✅ CRITICAL: Subscribe to both team_id (from URL) and potential meeting ID
    // This ensures we catch updates even if teamId from URL doesn't match meeting's team_id
    logger.log('📡 [useActiveTeamMeeting] Setting up subscription:', {
      teamIdFromUrl: teamId,
      meetingType
    });
    
    // Create subscription with filter based on meeting type
    // For custom: subscribe to meeting ID (teamId in URL is the meeting ID)
    // For weekly/quarterly: subscribe to team_id
    const subscription = supabase
      .channel(`meeting_${teamId}_${meetingType || 'default'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings_state',
          filter: meetingType === 'custom'
            ? `id=eq.${teamId}`        // For custom: subscribe by meeting ID
            : `team_id=eq.${teamId}`   // For weekly/quarterly: subscribe by team ID
        },
        (payload) => {
          const newData = payload.new as ActiveMeeting | null;
          const oldData = payload.old as ActiveMeeting | null;
          
          logger.log('🔔 [useActiveTeamMeeting] Postgres Changes received:', {
            eventType: payload.eventType,
            meetingId: newData?.id || oldData?.id,
            status: newData?.status,
            teamId: newData?.team_id,
            urlTeamId: teamId,
            meetingType
          });
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const newMeeting = payload.new as ActiveMeeting;
            // Only set if it matches our criteria
            const isRelevant = meetingType === 'custom'
              ? newMeeting.id === teamId
              : newMeeting.team_id === teamId;
            
            if (isRelevant) {
              logger.log('✅ [useActiveTeamMeeting] New meeting inserted');
              setActiveMeeting(newMeeting);
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const newData = payload.new as ActiveMeeting;
            const oldData = payload.old as any;
            
            logger.log('🔄 [useActiveTeamMeeting] Meeting updated:', {
              meetingId: newData.id,
              oldStatus: oldData?.status,
              newStatus: newData.status,
              teamId: newData.team_id,
              urlTeamId: teamId
            });
            
            // Check if this update is relevant to us
            const isRelevant = meetingType === 'custom'
              ? newData.id === teamId
              : newData.team_id === teamId;
            
            if (!isRelevant) {
              logger.log('⏭️ [useActiveTeamMeeting] Update not relevant, ignoring');
              return;
            }
            
            if (newData.status === 'ended' || newData.status === 'completed') {
              // Only clear if this is the currently tracked meeting.
              // The team_id filter can match multiple meetings (e.g. different types);
              // clearing for the wrong meeting would kick the user out of their active session.
              setActiveMeeting(prev => {
                if (prev?.id === newData.id) {
                  logger.log('🏁 [useActiveTeamMeeting] Current meeting ended/completed, clearing activeMeeting');
                  return null;
                }
                logger.log('⏭️ [useActiveTeamMeeting] Different meeting ended, keeping current activeMeeting', {
                  endedId: newData.id,
                  currentId: prev?.id
                });
                return prev;
              });
            } else {
              setActiveMeeting(newData);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedMeeting = payload.old as ActiveMeeting | null;
            const deletedId = deletedMeeting?.id;
            const isRelevant = meetingType === 'custom'
              ? deletedId === teamId
              : deletedMeeting?.team_id === teamId;
            
            if (isRelevant) {
              logger.log('🗑️ [useActiveTeamMeeting] Meeting deleted');
              setActiveMeeting(null);
            }
          }
        }
      )
      .subscribe((status) => {
        logger.log('📡 [useActiveTeamMeeting] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          logger.log('✅ [useActiveTeamMeeting] Successfully subscribed to meeting changes');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('❌ [useActiveTeamMeeting] Channel error - subscription failed');
        } else if (status === 'TIMED_OUT') {
          logger.warn('⚠️ [useActiveTeamMeeting] Subscription timed out');
        }
      });

    return () => {
      logger.log('🧹 [useActiveTeamMeeting] Cleaning up subscription');
      supabase.removeChannel(subscription);
    };
  }, [teamId, meetingType, currentCompany?.id, user?.id]);

  // Enhanced scriber detection with current user check
  const hasActiveScriber = useMemo(() => {
    if (!activeMeeting) return false;
    
    // Check if there's a scriber_id set
    if (activeMeeting.scriber_id) return true;
    
    // Check if anyone in role_assignments is marked as scriber
    if (activeMeeting.role_assignments) {
      return Object.values(activeMeeting.role_assignments).includes('scriber');
    }
    
    return false;
  }, [activeMeeting]);

  // Check if current user is the scriber
  const isCurrentUserScriber = useMemo(() => {
    if (!activeMeeting || !currentUserId) return false;
    return activeMeeting.scriber_id === currentUserId;
  }, [activeMeeting, currentUserId]);

  // Determine user's role in the meeting - prioritize scriber_id for consistency
  const userMeetingRole = useMemo(() => {
    if (!activeMeeting || !currentUserId) return null;
    
    // ALWAYS prioritize scriber_id field over role_assignments for scriber role
    if (activeMeeting.scriber_id === currentUserId) {
      return 'scriber' as const;
    }
    
    // For non-scribers, check role_assignments but ensure scriber_id takes precedence
    if (activeMeeting.role_assignments && activeMeeting.role_assignments[currentUserId]) {
      const assignedRole = activeMeeting.role_assignments[currentUserId];
      // If role_assignments says 'scriber' but scriber_id doesn't match, they're participant
      if (assignedRole === 'scriber' && activeMeeting.scriber_id !== currentUserId) {
        return 'participant' as const;
      }
      return assignedRole as 'scriber' | 'participant';
    }
    
    // Return null if user has no assigned role - triggers role selection modal
    return null;
  }, [activeMeeting, currentUserId]);

  return { 
    activeMeeting, 
    loading, 
    error, 
    hasActiveScriber,
    isCurrentUserScriber,
    userMeetingRole,
    currentUserId
  };
};
