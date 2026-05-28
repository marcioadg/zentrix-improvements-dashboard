import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { useOptimizedMeetingTimer } from '@/hooks/useOptimizedMeetingTimer';
import { logger } from '@/utils/logger';
import { trackFBSQLOnce } from '@/utils/facebookTracking';

interface MeetingContextType {
  meetingId: string | null;
  teamId: string;
  meetingType: string;
  status: 'loading' | 'active' | 'ended' | 'error';
  error: string | null;
  startMeeting: (teamId?: string) => Promise<void>;
  endMeeting: () => Promise<void>;
  
  // Timer and time-related properties
  currentTime: number;
  formatDuration: (duration: number) => string;
  
  // Section management properties
  currentSection: number;
  sectionDurations: Record<number, number>;
  sectionStartTime: number | null;
  updateSectionState: (sectionIndex: number, sectionStartTime: number, durations: Record<number, number>) => Promise<void>;
  getEffectiveSectionStartTime: () => number;
  overallStartTime: number;
  
  // Active meeting properties
  activeMeetingId: string | null;
  activeMeetingTeamId: string | null;
  hasActiveMeeting: boolean;
  
  // Scriber role detection
  scriberId: string | null;
  isCurrentUserScriber: boolean;
  userMeetingRole: 'scriber' | 'participant' | null;
  
  // Custom meeting support
  customAgenda: any | null;
  
  // Connection and diagnostic properties
  isDatabaseConnected: boolean;
  diagnosticInfo: {
    localTimerRunning: boolean;
    databaseMeetingExists: boolean;
  };
  syncRetryCount: number;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
};

export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { teamId, meetingType } = useParams<{ teamId: string; meetingType: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentTime, formatDuration } = useOptimizedMeetingTimer();
  
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'active' | 'ended' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionDurations, setSectionDurations] = useState<Record<number, number>>({});
  const [sectionStartTime, setSectionStartTime] = useState<number | null>(null);
  const [overallStartTime, setOverallStartTime] = useState<number>(currentTime);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(true);
  const [syncRetryCount, setSyncRetryCount] = useState(0);
  
  // New scriber role state
  const [scriberId, setScriberId] = useState<string | null>(null);
  const [userMeetingRole, setUserMeetingRole] = useState<'scriber' | 'participant' | null>(null);
  
  // Custom meeting agenda state
  const [customAgenda, setCustomAgenda] = useState<any | null>(null);

  if (!teamId || !meetingType) {
    throw new Error('MeetingProvider requires teamId and meetingType params');
  }

  // Helper to get current user ID
  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  };

  // Enhanced meeting check that includes scriber information
  const checkExistingMeetingWithScriber = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings_state')
        .select('id, status, scriber_id, current_section, section_durations, section_start_time, custom_agenda')
        .eq('team_id', teamId)
        .eq('meeting_type', meetingType)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Get current user to check if they're the scriber
        const currentUserId = await getCurrentUserId();
        const isCurrentUserScriber = data.scriber_id === currentUserId;
        
        logger.log('🔍 Found existing meeting with scriber info:', {
          meetingId: data.id,
          scriberId: data.scriber_id,
          currentUserId,
          isCurrentUserScriber
        });

        // Set scriber state
        setScriberId(data.scriber_id);
        setUserMeetingRole(isCurrentUserScriber ? 'scriber' : 'participant');
        
        // Set meeting state including custom agenda
        setCurrentSection(data.current_section || 0);
        setSectionDurations(data.section_durations || {});
        setCustomAgenda(data.custom_agenda || null);
        if (data.section_start_time) {
          setSectionStartTime(new Date(data.section_start_time).getTime());
        }
      }

      return data;
    } catch (error) {
      logger.error('Error checking existing meeting:', error);
      return null;
    }
  };

  const checkExistingMeeting = async () => {
    return await checkExistingMeetingWithScriber();
  };

  const cleanupExistingMeetings = async () => {
    try {
      logger.log('🧹 Cleaning up existing meetings for team:', teamId, 'type:', meetingType);
      
      // End any existing active meetings for this team and meeting type
      const { error } = await supabase
        .from('meetings_state')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('team_id', teamId)
        .eq('meeting_type', meetingType)
        .eq('status', 'active');

      if (error) {
        logger.error('Error cleaning up existing meetings:', error);
        throw error;
      }

      logger.log('✅ Cleanup completed for team-type combination');
    } catch (error) {
      logger.error('Failed to cleanup existing meetings:', error);
      throw error;
    }
  };

  const startMeeting = async (targetTeamId?: string) => {
    const effectiveTeamId = targetTeamId || teamId;
    
    try {
      setStatus('loading');
      setError(null);

      // First, check if there's already an active meeting
      const existingMeeting = await checkExistingMeeting();
      
      if (existingMeeting) {
        logger.log('📋 Found existing active meeting, joining:', existingMeeting.id);
        setMeetingId(existingMeeting.id);
        setStatus('active');
        setOverallStartTime(currentTime);
        
        // Show appropriate message based on role
        const currentUserId = await getCurrentUserId();
        const isRejoiningAsScriber = existingMeeting.scriber_id === currentUserId;
        
        toast({
          title: isRejoiningAsScriber ? "Rejoined as Scriber" : "Joined Meeting",
          description: isRejoiningAsScriber 
            ? "You've rejoined the meeting with scriber privileges."
            : "You've joined the active meeting as a participant.",
        });
        
        return;
      }

      // Try to create a new meeting, with automatic cleanup if needed
      try {
        const currentUserId = await getCurrentUserId();
        
        // Fetch company_id from the team to ensure proper real-time sync
        const { data: teamData } = await supabase
          .from('teams')
          .select('company_id')
          .eq('id', effectiveTeamId)
          .single();
        
        const { data, error } = await supabase
          .from('meetings_state')
          .insert({
            team_id: effectiveTeamId,
            company_id: teamData?.company_id || null,
            meeting_type: meetingType,
            status: 'active',
            started_by: currentUserId,
            scriber_id: currentUserId, // Set the creator as initial scriber
            started_at: new Date().toISOString(),
            current_section: 0,
            section_durations: {},
            section_accumulated_times: {}
          })
          .select()
          .single();

        if (error) {
          // Check if it's a unique constraint violation
          if (error.code === '23505' && error.message.includes('idx_unique_active_meeting_per_team_type')) {
            logger.log('🔄 Unique constraint violation detected, cleaning up and retrying...');
            
            // Clean up existing meetings and retry
            await cleanupExistingMeetings();
            
            // Retry the insert
            const { data: retryData, error: retryError } = await supabase
              .from('meetings_state')
              .insert({
                team_id: effectiveTeamId,
                company_id: teamData?.company_id || null,
                meeting_type: meetingType,
                status: 'active',
                started_by: currentUserId,
                scriber_id: currentUserId, // Set the creator as initial scriber
                started_at: new Date().toISOString(),
                current_section: 0,
                section_durations: {},
                section_accumulated_times: {}
              })
              .select()
              .single();

            if (retryError) throw retryError;
            
            setMeetingId(retryData.id);
            setScriberId(currentUserId);
            setUserMeetingRole('scriber');
            setStatus('active');
            setOverallStartTime(currentTime);
            setSectionStartTime(currentTime);
            trackFBSQLOnce({
              userId: currentUserId,
              meetingId: retryData.id,
              companyId: teamData?.company_id || null,
              teamId: effectiveTeamId,
              meetingType,
            });
            
            toast({
              title: "Meeting Started",
              description: "Previous meeting was ended and a new one started as scriber.",
            });
            
            return;
          }
          
          throw error;
        }

        setMeetingId(data.id);
        setScriberId(currentUserId);
        setUserMeetingRole('scriber');
        setStatus('active');
        setOverallStartTime(currentTime);
        setSectionStartTime(currentTime);
        trackFBSQLOnce({
          userId: currentUserId,
          meetingId: data.id,
          companyId: teamData?.company_id || null,
          teamId: effectiveTeamId,
          meetingType,
        });
        
        toast({
          title: "Meeting Started",
          description: `${meetingType} meeting has been started as scriber.`,
        });

      } catch (insertError) {
        throw insertError;
      }

    } catch (error) {
      logger.error('Failed to start meeting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to start meeting: ${errorMessage}`);
      setStatus('error');
      setIsDatabaseConnected(false);
      
      // Enhanced error handling will be handled by the component using this context
      toast({
        title: "Error",
        description: `Failed to start meeting: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const endMeeting = async () => {
    if (!meetingId) return;

    try {
      // Cleanup temporary observers first
      await import('@/services/meetingErrorHandler').then(({ MeetingErrorHandler }) => {
        MeetingErrorHandler.cleanupTemporaryObservers(meetingId);
      });

      const { error } = await supabase
        .from('meetings_state')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (error) throw error;

      setStatus('ended');
      setScriberId(null);
      setUserMeetingRole(null);
      toast({
        title: "Meeting Ended",
        description: "The meeting has been successfully ended.",
      });

      // Navigate back to meetings page
      navigate('/meetings');
    } catch (error) {
      logger.error('Failed to end meeting:', error);
      toast({
        title: "Error",
        description: "Failed to end meeting",
        variant: "destructive",
      });
    }
  };

  const updateSectionState = async (sectionIndex: number, newSectionStartTime: number, durations: Record<number, number>) => {
    if (!meetingId) {
      logger.warn('No meetingId available for section state update');
      return;
    }

    try {
      const { error } = await supabase
        .from('meetings_state')
        .update({
          current_section: sectionIndex,
          section_start_time: new Date(newSectionStartTime).toISOString(),
          section_durations: durations,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (error) throw error;

      setCurrentSection(sectionIndex);
      setSectionStartTime(newSectionStartTime);
      setSectionDurations(durations);
    } catch (error) {
      logger.error('Failed to update section state:', error);
      setSyncRetryCount(prev => prev + 1);
    }
  };

  const getEffectiveSectionStartTime = () => {
    return sectionStartTime || overallStartTime || currentTime;
  };

  // Initialize meeting on mount
  useEffect(() => {
    const initializeMeeting = async () => {
      const existingMeeting = await checkExistingMeeting();
      
      if (existingMeeting) {
        setMeetingId(existingMeeting.id);
        setStatus('active');
        setOverallStartTime(currentTime);
        
        // Role is already set in checkExistingMeetingWithScriber
        logger.log('🎯 Initialized with existing meeting, role:', userMeetingRole);
      } else {
        // No existing meeting, ready to start
        setStatus('ended');
      }
    };

    initializeMeeting();
  }, [teamId, meetingType]);

  // Track current user ID for scriber role detection
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId).catch(() => logger.error('Failed to get current user ID'));
  }, []);

  const isCurrentUserScriber = scriberId !== null && currentUserId !== null && scriberId === currentUserId;

  const contextValue: MeetingContextType = {
    meetingId,
    teamId,
    meetingType,
    status,
    error,
    startMeeting,
    endMeeting,
    
    // Timer properties
    currentTime,
    formatDuration,
    
    // Section management
    currentSection,
    sectionDurations,
    sectionStartTime,
    updateSectionState,
    getEffectiveSectionStartTime,
    overallStartTime,
    
    // Active meeting properties
    activeMeetingId: meetingId,
    activeMeetingTeamId: teamId,
    hasActiveMeeting: status === 'active',
    
    // Scriber role properties
    scriberId,
    isCurrentUserScriber,
    userMeetingRole,
    
    // Custom meeting support
    customAgenda,
    
    // Connection properties
    isDatabaseConnected,
    diagnosticInfo: {
      localTimerRunning: status === 'active',
      databaseMeetingExists: !!meetingId
    },
    syncRetryCount
  };

  return (
    <MeetingContext.Provider value={contextValue}>
      {children}
    </MeetingContext.Provider>
  );
};
