import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getPreviousRoute, getSafeFallbackRoute } from '@/components/navigation/RouteHistoryTracker';
import { MeetingLayout } from '@/components/meeting/MeetingLayout';
import { MeetingAccessHandler } from '@/components/meeting/MeetingAccessHandler';
import { MeetingModalsManager } from '@/components/meeting/MeetingModalsManager';
import { MeetingSectionRenderer } from '@/components/meeting/MeetingSectionRenderer';
import { TeslaMeetingAgenda } from '@/components/meeting/TeslaMeetingAgenda';
import { NewRoleSelectionModal } from '@/components/meeting/NewRoleSelectionModal';
import { NewTimerDisplay } from '@/components/meeting/NewTimerDisplay';
import { TimerRestoration } from '@/components/meeting/TimerRestoration';
import { VotingProvider } from '@/contexts/VotingContext';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useUnifiedTeamTasks } from '@/hooks/useUnifiedTeamTasks';
import { debugLogger } from '@/utils/debugLogger';
import { Button } from '@/components/ui/button';
import { Play, Users, Crown, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMeetingResults } from '@/hooks/useMeetingResults';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useSimpleTeams } from '@/hooks/useSimpleTeams';
import { useAllActiveMeetings } from '@/hooks/useAllActiveMeetings';

// Import our custom hooks
import { useMeetingState } from '@/hooks/meeting/useMeetingState';
import { useMeetingTeamData } from '@/hooks/meeting/useMeetingTeamData';
import { useMeetingAgenda } from '@/hooks/meeting/useMeetingAgenda';
import { useMeetingEventHandlers } from '@/components/meeting/MeetingEventHandlers';
import { useActiveTeamMeeting } from '@/hooks/useActiveTeamMeeting';
import { TakeOverScribeButton } from '@/components/meeting/TakeOverScribeButton';
import { MeetingSkeleton } from '@/components/meeting/MeetingSkeleton';
import { useTaskStatusBroadcast } from '@/hooks/meeting/useTaskStatusBroadcast';
import { useTaskArchiveBroadcast } from '@/hooks/meeting/useTaskArchiveBroadcast';
import { useTaskCreateBroadcast } from '@/hooks/meeting/useTaskCreateBroadcast';
import { useTaskUpdateBroadcast } from '@/hooks/meeting/useTaskUpdateBroadcast';
import { useSectionBroadcast } from '@/hooks/meeting/useSectionBroadcast';
import { useIssueCreateBroadcast } from '@/hooks/meeting/useIssueCreateBroadcast';
import { useIssueStatusBroadcast } from '@/hooks/meeting/useIssueStatusBroadcast';
import { useIssueArchiveBroadcast } from '@/hooks/meeting/useIssueArchiveBroadcast';
import { useScriberBroadcast } from '@/hooks/meeting/useScriberBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const Meeting = () => {
  const {
    teamId,
    meetingType = 'weekly'
  } = useParams<{
    teamId: string;
    meetingType?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();

  // Role selection state
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [roleSelectionDismissed, setRoleSelectionDismissed] = useState(false);

  // Meeting results for completed meetings
  const [meetingResults, setMeetingResults] = useState<any>(null);
  
  // Team selection for member custom meetings
  const [selectedMetricsTeam, setSelectedMetricsTeam] = useState<string | null>(null);
  const {
    getMeetingResults,
    saveMeetingResults
  } = useMeetingResults();

  // NEW: State to capture updateIssue function from IssuesList
  const [updateIssue, setUpdateIssue] = useState<((issueId: string, updates: any) => Promise<void>) | null>(null);

  // NEW: Callback to receive updateIssue function from IssuesList
  const handleUpdateIssueReady = (updateIssueFn: (issueId: string, updates: any) => Promise<void>) => {
    logger.log('📥 Meeting.tsx: Received updateIssue function from IssuesList');
    setUpdateIssue(() => updateIssueFn);
  };

  // NEW: Callback ref for optimistic task creation updates
  const taskCreatedCallbackRef = useRef<(() => void) | null>(null);

  // NEW: Ref to hold addIssueToLocalState function from IssuesSection
  const addIssueToLocalStateRef = useRef<((issue: any) => void) | null>(null);

  // NEW: Handler to notify IssuesSection when a task is created
  const handleTaskCreatedNotification = useCallback(() => {
    logger.log('🚀 Meeting.tsx: Notifying IssuesSection of task creation');
    if (taskCreatedCallbackRef.current) {
      taskCreatedCallbackRef.current();
    }
  }, []);

  // NEW: Handler to receive the callback from IssuesSection
  const handleTaskCreatedCallback = useCallback((callback: () => void) => {
    logger.log('📥 Meeting.tsx: Registered task creation callback from IssuesSection');
    taskCreatedCallbackRef.current = callback;
  }, []);

  // NEW: Handler to receive addIssueToLocalState from IssuesSection
  const handleAddIssueToLocalStateReady = useCallback((addFn: (issue: any) => void) => {
    logger.log('📥 Meeting.tsx: Registered addIssueToLocalState callback from IssuesSection');
    addIssueToLocalStateRef.current = addFn;
  }, []);

  // NEW: Ref to hold updateIssueLocalState function from IssuesSection (for status broadcast)
  const updateIssueLocalStateRef = useRef<((issueId: string, status: string) => void) | null>(null);

  // NEW: Handler to receive updateIssueLocalState from IssuesSection
  const handleUpdateIssueLocalStateReady = useCallback((updateFn: (issueId: string, status: string) => void) => {
    logger.log('📥 Meeting.tsx: Registered updateIssueLocalState callback from IssuesSection');
    updateIssueLocalStateRef.current = updateFn;
  }, []);

  // NEW: Handle remote issue creation from broadcast
  const handleRemoteIssueCreate = useCallback((issue: any) => {
    logger.log('📡 Meeting.tsx: Applying remote issue creation', { issueId: issue.id, title: issue.title });
    addIssueToLocalStateRef.current?.(issue);
  }, []);

  // NEW: Issue creation broadcast hook
  const { publishIssueCreated } = useIssueCreateBroadcast(
    teamId || null,
    handleRemoteIssueCreate
  );

  // NEW: Handler to broadcast issue creation
  const handleIssueCreated = useCallback((issue: any) => {
    logger.log('📤 Meeting.tsx: Broadcasting issue creation to other participants');
    publishIssueCreated(issue);
  }, [publishIssueCreated]);

  // NEW: Handle remote issue status change from broadcast
  const handleRemoteIssueStatusChange = useCallback((issueId: string, status: string) => {
    logger.log('📡 Meeting.tsx: Applying remote issue status change', { issueId, status });
    updateIssueLocalStateRef.current?.(issueId, status);
  }, []);

  // NEW: Issue status broadcast hook
  const { publishStatusChange: publishIssueStatusChange } = useIssueStatusBroadcast(
    teamId || null,
    handleRemoteIssueStatusChange
  );

  // NEW: Handler to broadcast issue status change
  const handleIssueStatusChanged = useCallback((issueId: string, status: string) => {
    logger.log('📤 Meeting.tsx: Broadcasting issue status change to other participants', { issueId, status });
    publishIssueStatusChange(issueId, status);
  }, [publishIssueStatusChange]);

  // NEW: Ref to hold updateIssueArchiveLocalState function from IssuesSection (for archive broadcast)
  const updateIssueArchiveLocalStateRef = useRef<((issueId: string, archived: boolean) => void) | null>(null);

  // NEW: Handler to receive updateIssueArchiveLocalState from IssuesSection
  const handleUpdateIssueArchiveLocalStateReady = useCallback((updateFn: (issueId: string, archived: boolean) => void) => {
    logger.log('📥 Meeting.tsx: Registered updateIssueArchiveLocalState callback from IssuesSection');
    updateIssueArchiveLocalStateRef.current = updateFn;
  }, []);

  // NEW: Handle remote issue archive from broadcast
  const handleRemoteIssueArchive = useCallback((issueId: string) => {
    logger.log('📡 Meeting.tsx: Applying remote issue archive', { issueId });
    updateIssueArchiveLocalStateRef.current?.(issueId, true);
  }, []);

  // NEW: Handle remote issue restore from broadcast
  const handleRemoteIssueRestore = useCallback((issueId: string) => {
    logger.log('📡 Meeting.tsx: Applying remote issue restore', { issueId });
    updateIssueArchiveLocalStateRef.current?.(issueId, false);
  }, []);

  // NEW: Issue archive broadcast hook
  const { publishArchive: publishIssueArchive, publishRestore: publishIssueRestore } = useIssueArchiveBroadcast(
    teamId || null,
    handleRemoteIssueArchive,
    handleRemoteIssueRestore
  );

  // NEW: Handler to broadcast issue archive change
  const handleIssueArchivedChanged = useCallback((issueId: string, archived: boolean) => {
    logger.log('📤 Meeting.tsx: Broadcasting issue archive change to other participants', { issueId, archived });
    if (archived) {
      publishIssueArchive(issueId);
    } else {
      publishIssueRestore(issueId);
    }
  }, [publishIssueArchive, publishIssueRestore]);

  // Extract state management
  const {
    teamInfo,
    setTeamInfo,
    liveSectionDuration,
    setLiveSectionDuration,
    showTaskModal,
    setShowTaskModal,
    showGoalModal,
    setShowGoalModal,
    showMetricModal,
    setShowMetricModal,
    showHeadlineModal,
    setShowHeadlineModal,
    showIssueModal,
    setShowIssueModal,
    prefilledTaskData,
    setPrefilledTaskData
  } = useMeetingState();

  // Extract team data management
  const {
    teams,
    teamsLoading,
    companyLoading
  } = useMeetingTeamData(teamId, setTeamInfo);
  
  // Fetch user's teams for member meeting team selection
  const { teams: userTeams = [] } = useSimpleTeams();

  // Get active meeting info including custom agenda
  const { 
    activeMeeting, 
    loading: activeMeetingLoading,
    hasActiveScriber,
    isCurrentUserScriber,
    userMeetingRole
  } = useActiveTeamMeeting(teamId || null, meetingType);

  // Get company context (needed for access checks)
  const {
    currentCompany,
    switchCompany
  } = useMultiCompany();

  // Extract custom agenda if available (cast to any for now since type doesn't include it yet)
  const customAgenda = (activeMeeting as any)?.custom_agenda || location.state?.customAgenda || null;

  // Extract agenda management - pass custom agenda if available
  const {
    agendaItems,
    totalPlannedTimeMinutes
  } = useMeetingAgenda(meetingType, customAgenda);

  // Check access conditions
  // Determine if this is a member-based custom meeting
  const isMemberMeeting = meetingType === 'custom' && activeMeeting?.team_id === null;
  
  // For member meetings, effectiveTeamId should be null
  // For team meetings, use the teamId from URL or activeMeeting
  const effectiveTeamId = isMemberMeeting 
    ? null 
    : (activeMeeting?.team_id || teamId);
  
  const currentTeam = teams.find(team => team.id === effectiveTeamId);
  
  // Access check: member meetings verify company, team meetings verify team membership
  const hasTeamAccess = isMemberMeeting
    ? activeMeeting?.company_id === currentCompany?.id
    : !!(currentTeam || teamInfo?.company_id);
  
  // Auto-select first team for member meetings
  useEffect(() => {
    if (isMemberMeeting && userTeams.length > 0 && !selectedMetricsTeam) {
      logger.log('🎯 Meeting.tsx: Auto-selecting first team for member meeting:', userTeams[0].name);
      setSelectedMetricsTeam(userTeams[0].id);
    }
  }, [isMemberMeeting, userTeams, selectedMetricsTeam]);

  // Ensure company context matches the meeting team's company so RLS returns tasks/goals
  useEffect(() => {
    if (teamInfo?.company_id && currentCompany?.id && teamInfo.company_id !== currentCompany?.id) {
      logger.log('🏢 Meeting.tsx: Auto-switching company to match team company for RLS:', {
        teamCompanyId: teamInfo.company_id,
        currentCompanyId: currentCompany?.id
      });
      // Fire and forget; internal logic verifies and retries if needed
      switchCompany(teamInfo.company_id).catch(err => {
        logger.error('❌ Meeting.tsx: Failed to auto-switch company for meeting context', err);
      });
    }
  }, [teamInfo?.company_id, currentCompany?.id, switchCompany]);

  // New timer system
  const {
    isRunning,
    meetingId,
    currentRole,
    timerState,
    calculations,
    startMeeting,
    joinExistingMeeting,
    changeSection,
    formatDuration,
    recentlyEndedMeeting,
    takeOverAsScriber,
    canControlTimer,
    scriberId,
    setSectionBroadcast,
    applyRemoteSectionChange,
    setScriberBroadcast,
    applyRemoteScriberChange,
    setMeetingStartedBroadcast
  } = useNewMeetingTimer();

  // Keep section navigation visually responsive even when the section switch has
  // database writes or expensive child data loads behind it.
  const [visibleSection, setVisibleSection] = useState(timerState.currentSection);
  const [isSectionContentPending, setIsSectionContentPending] = useState(false);
  const sectionTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishSectionTransition = useCallback((delayMs = 120) => {
    if (sectionTransitionTimeoutRef.current) {
      clearTimeout(sectionTransitionTimeoutRef.current);
    }

    sectionTransitionTimeoutRef.current = setTimeout(() => {
      setIsSectionContentPending(false);
      sectionTransitionTimeoutRef.current = null;
    }, delayMs);
  }, []);

  useEffect(() => {
    return () => {
      if (sectionTransitionTimeoutRef.current) {
        clearTimeout(sectionTransitionTimeoutRef.current);
      }
    };
  }, []);

  // Remote section changes arrive through timer state. Mirror them into the
  // visible section immediately and briefly show a transition placeholder so the
  // previous section never appears stale while the new section mounts.
  useEffect(() => {
    if (timerState.currentSection !== visibleSection) {
      setVisibleSection(timerState.currentSection);
      setIsSectionContentPending(true);
      finishSectionTransition();
    }
  }, [timerState.currentSection, visibleSection, finishSectionTransition]);

  // Get broadcast function from useAllActiveMeetings for meeting started sync
  const { broadcastMeetingStarted } = useAllActiveMeetings();

  // Real-time section sync for meeting participants
  const handleRemoteSectionChange = useCallback((sectionIndex: number, sectionStartTime: number) => {
    logger.log('📡 Meeting.tsx: Received remote section change, applying instantly', { sectionIndex, sectionStartTime });
    // Apply the remote section change directly to timer state for instant visual update
    applyRemoteSectionChange(sectionIndex, sectionStartTime);
  }, [applyRemoteSectionChange]);

  const { publishSectionChange } = useSectionBroadcast(
    teamId || null,
    handleRemoteSectionChange,
    meetingId
  );

  // Register the broadcast function with the timer context
  useEffect(() => {
    setSectionBroadcast(publishSectionChange);
  }, [setSectionBroadcast, publishSectionChange]);

  // Real-time scriber sync for meeting participants
  const handleRemoteScriberChange = useCallback((scriberId: string | null) => {
    logger.log('📡 Meeting.tsx: Received remote scriber change, applying instantly', { scriberId });
    // Apply the remote scriber change directly to timer state for instant visual update
    applyRemoteScriberChange(scriberId);
  }, [applyRemoteScriberChange]);

  const { publishScriberChange } = useScriberBroadcast(
    teamId || null,
    handleRemoteScriberChange
  );

  // Register the scriber broadcast function with the timer context
  useEffect(() => {
    setScriberBroadcast(publishScriberChange);
  }, [setScriberBroadcast, publishScriberChange]);

  // Register the meeting started broadcast function with the timer context
  // This enables instant sync to all users when a meeting is started (after DB insert)
  useEffect(() => {
    if (broadcastMeetingStarted) {
      logger.log('📤 Meeting.tsx: Registering meeting started broadcast function');
      setMeetingStartedBroadcast(broadcastMeetingStarted);
    }
  }, [setMeetingStartedBroadcast, broadcastMeetingStarted]);

  // Load meeting results for completed meetings
  useEffect(() => {
    const loadMeetingResults = async () => {
      // Only load results if there's a recently ended meeting with an ID
      try {
        if (recentlyEndedMeeting && typeof recentlyEndedMeeting === 'object') {
          const meetingEndedId = (recentlyEndedMeeting as any)?.id;
          if (meetingEndedId) {
            logger.log('📊 Meeting.tsx: Loading meeting results for completed meeting:', meetingEndedId);
            const results = await getMeetingResults(meetingEndedId);
            setMeetingResults(results);
            logger.log('📊 Meeting.tsx: Meeting results loaded:', results);
          }
        } else {
          // Clear results if no recently ended meeting
          setMeetingResults(null);
        }
      } catch (error) {
        logger.error('📊 Meeting.tsx: Error loading meeting results:', error);
        setMeetingResults(null);
      }
    };
    loadMeetingResults();
  }, [recentlyEndedMeeting, getMeetingResults]);

  // Check for active meeting with enhanced scriber detection
  // Simple meeting state check - no auto-start logic
  const meetingExists = !!activeMeeting && !activeMeetingLoading;
  const shouldShowRoleSelection = showRoleSelection && hasTeamAccess;

  // Optimized auto-show role selection - only when user truly has no active role
  // Skip for custom meetings with preSelectedRole (role already chosen in MeetingBuilder)
  useEffect(() => {
    // Skip role selection for custom meetings where role was pre-selected in MeetingBuilder
    if (meetingType === 'custom' && location.state?.preSelectedRole) {
      logger.log('🎯 Meeting.tsx: Custom meeting with pre-selected role, skipping role modal');
      return;
    }

    // Only proceed if we have complete data and user isn't already in a meeting
    if (hasTeamAccess && !activeMeetingLoading && !isRunning && !showRoleSelection && !roleSelectionDismissed && !recentlyEndedMeeting) {
      logger.log('🎯 Meeting.tsx: Checking role selection need', {
        userMeetingRole,
        hasActiveScriber,
        activeMeeting: !!activeMeeting
      });

      // If there's no active meeting at all, user needs to start one
      if (!activeMeeting) {
        logger.log('🎯 Meeting.tsx: No active meeting - showing role selection for new meeting');
        setShowRoleSelection(true);
        return;
      }

      // If there's an active meeting but user has no role, they need to join
      if (!userMeetingRole) {
        logger.log('🎯 Meeting.tsx: Active meeting exists but user has no role - showing role selection');
        setShowRoleSelection(true);
        return;
      }
    }
  }, [hasTeamAccess, activeMeetingLoading, isRunning, showRoleSelection, roleSelectionDismissed, userMeetingRole, activeMeeting, meetingType, location.state, recentlyEndedMeeting]);

  // Optimized auto-join - only for users with confirmed roles, but skip if meeting recently ended
  useEffect(() => {
    if (hasTeamAccess && !activeMeetingLoading && !isRunning && userMeetingRole && activeMeeting && activeMeeting.status === 'active' && !showRoleSelection && !recentlyEndedMeeting) {
      logger.log('🚀 Meeting.tsx: Auto-joining user with confirmed role:', userMeetingRole);

      // Add small delay to prevent race condition with role selection
      const autoJoinTimer = setTimeout(() => {
        joinExistingMeeting(activeMeeting.id, userMeetingRole).catch(error => {
          logger.error('❌ Auto-join failed:', error);
          setShowRoleSelection(true); // Fallback to role selection on error
        });
      }, 100);
      return () => clearTimeout(autoJoinTimer);
    }
  }, [hasTeamAccess, activeMeetingLoading, isRunning, userMeetingRole, activeMeeting, showRoleSelection, recentlyEndedMeeting, joinExistingMeeting]);

  // Navigate all participants to tasks when meeting ends
  // This handles both:
  // 1. Scriber ending meeting from within meeting room
  // 2. Admin finalizing meeting from /meetings page
  useEffect(() => {
    if (recentlyEndedMeeting && !isRunning) {
      logger.log('🏁 Meeting.tsx: Meeting ended detected via realtime, navigating to tasks');
      
      // Small delay to:
      // 1. Allow state cleanup to complete
      // 2. Ensure scriber's optimistic navigation takes priority (if applicable)
      const navigationTimer = setTimeout(() => {
        // ✅ FIX: Verificar se já estamos em /tasks ANTES de navegar
        // Usar location.pathname (React Router) como fonte primária, window.location como fallback
        const currentPath = location.pathname || window.location.pathname;
        const isOnTasksPage = currentPath === '/tasks' || currentPath.startsWith('/tasks');
        const isOnMeetingPage = currentPath.includes('/meeting');
        
        // Só navegar se ainda estivermos em uma página de reunião
        // E NÃO estivermos já em /tasks (evita navegação duplicada)
        if (isOnMeetingPage && !isOnTasksPage) {
          logger.log('🏁 Meeting.tsx: Navigating to tasks after meeting end');
          navigate('/tasks', { replace: true });
        } else {
          logger.log('🚫 Meeting.tsx: Skipping navigation - already on tasks or not on meeting page', { 
            currentPath,
            isOnTasksPage,
            isOnMeetingPage
          });
        }
      }, 500);
      
      return () => clearTimeout(navigationTimer);
    }
  }, [recentlyEndedMeeting, isRunning, navigate, location.pathname]);

  // ✅ FIX: Detect when activeMeeting becomes null after being active
  // This handles participants who don't have meetingId set in NewMeetingTimerContext
  // They rely on useActiveTeamMeeting subscription which clears activeMeeting when status becomes 'ended'
  const prevActiveMeetingRef = useRef(activeMeeting);
  const lastCheckedMeetingIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // ✅ CRITICAL: Update ref FIRST, before checking conditions
    // This ensures we capture the previous value before it changes
    const previousMeeting = prevActiveMeetingRef.current;
    prevActiveMeetingRef.current = activeMeeting;
    
    // ✅ IMPROVED: Detect ANY transition from meeting object to null (not just 'active' status)
    // This handles edge cases where meeting might have other statuses
    const hadMeeting = previousMeeting !== null && previousMeeting !== undefined;
    const isNowNull = !activeMeeting && !activeMeetingLoading;
    const isOnMeetingPage = location.pathname.includes('/meeting');
    const currentPath = location.pathname || window.location.pathname;
    const isOnTasksPage = currentPath === '/tasks' || currentPath.startsWith('/tasks');
    
    logger.log('🔍 [Meeting.tsx] Checking activeMeeting transition:', {
      hadMeeting,
      previousMeetingId: previousMeeting?.id,
      previousStatus: previousMeeting?.status,
      isNowNull,
      isOnMeetingPage,
      isOnTasksPage,
      recentlyEndedMeeting,
      activeMeetingLoading
    });
    
    // Only navigate if:
    // 1. There was a meeting object before (any status)
    // 2. Now it's null (cleared by useActiveTeamMeeting subscription)
    // 3. We're not loading (to avoid false positives during initial load)
    // 4. We're on a meeting page
    // 5. We haven't already navigated (recentlyEndedMeeting not set)
    // 6. We're not already on /tasks
    if (hadMeeting && isNowNull && isOnMeetingPage && !recentlyEndedMeeting && !isOnTasksPage) {
      logger.log('🏁 [Meeting.tsx] Active meeting became null, detecting as ended (participant without meetingId)', {
        previousMeetingId: previousMeeting?.id,
        previousStatus: previousMeeting?.status,
        previousTeamId: previousMeeting?.team_id
      });
      
      const navigationTimer = setTimeout(() => {
        // Double-check we're still on meeting page and not on tasks
        const finalPath = location.pathname || window.location.pathname;
        const stillOnMeeting = finalPath.includes('/meeting');
        const stillNotOnTasks = finalPath !== '/tasks' && !finalPath.startsWith('/tasks');
        
        if (stillOnMeeting && stillNotOnTasks) {
          logger.log('🏁 [Meeting.tsx] Navigating to tasks after activeMeeting became null');
          navigate('/tasks', { replace: true });
        } else {
          logger.log('🚫 [Meeting.tsx] Skipping navigation - already navigated or not on meeting page', {
            finalPath,
            stillOnMeeting,
            stillNotOnTasks
          });
        }
      }, 500);
      
      return () => clearTimeout(navigationTimer);
    }
    
    // ✅ FALLBACK: If we have an activeMeeting, periodically verify it's still active
    // This catches cases where subscription might have failed or missed the event
    if (activeMeeting && !activeMeetingLoading && isOnMeetingPage && !recentlyEndedMeeting && !isOnTasksPage) {
      const meetingIdToCheck = activeMeeting.id;
      
      // Only set up fallback check if this is a different meeting than last time
      if (lastCheckedMeetingIdRef.current !== meetingIdToCheck) {
        lastCheckedMeetingIdRef.current = meetingIdToCheck;
        
        logger.log('🔄 [Meeting.tsx] Setting up fallback check for meeting:', meetingIdToCheck);
        
        // Set up periodic check every 5 seconds as fallback
        const fallbackCheckInterval = setInterval(async () => {
          try {
            const { data, error } = await supabase
              .from('meetings_state')
              .select('status')
              .eq('id', meetingIdToCheck)
              .maybeSingle();
            
            if (error) {
              logger.warn('⚠️ [Meeting.tsx] Fallback check error:', error);
              return;
            }
            
            // If meeting is ended or doesn't exist, trigger navigation directly
            if (!data || data.status === 'ended' || data.status === 'completed') {
              logger.log('🏁 [Meeting.tsx] Fallback check detected meeting ended, navigating to tasks');
              clearInterval(fallbackCheckInterval);
              
              // Double-check we're still on meeting page
              const currentPath = location.pathname || window.location.pathname;
              const stillOnMeeting = currentPath.includes('/meeting');
              const stillNotOnTasks = currentPath !== '/tasks' && !currentPath.startsWith('/tasks');
              
              if (stillOnMeeting && stillNotOnTasks) {
                navigate('/tasks', { replace: true });
              }
            }
          } catch (err) {
            logger.error('❌ [Meeting.tsx] Fallback check failed:', err);
          }
        }, 5000);
        
        return () => {
          clearInterval(fallbackCheckInterval);
          // Reset ref when component unmounts or meeting changes
          if (activeMeeting?.id !== meetingIdToCheck) {
            lastCheckedMeetingIdRef.current = null;
          }
        };
      }
    } else if (!activeMeeting) {
      // Reset ref when there's no active meeting
      lastCheckedMeetingIdRef.current = null;
    }
  }, [activeMeeting, activeMeetingLoading, location.pathname, navigate, recentlyEndedMeeting]);

  // Enhanced section change handler with debugging
  const handleSectionChange = async (newSectionIndex: number) => {
    logger.log('🎯 Meeting.tsx: Section change requested', {
      from: timerState.currentSection,
      to: newSectionIndex,
      isRunning,
      meetingId,
      currentRole
    });
    if (visibleSection === newSectionIndex) {
      logger.log('🎯 Meeting.tsx: Already on this section, ignoring');
      return;
    }
    if (!isRunning) {
      logger.log('❌ Meeting.tsx: Meeting not running, cannot change sections');
      return;
    }
    if (!canControlTimer) {
      logger.log('❌ Meeting.tsx: Current user cannot control the timer, cannot change sections');
      return;
    }

    // Local visual update first: highlight the clicked section and replace the
    // old content with a lightweight placeholder before waiting on DB writes or
    // section-specific data/calculation work.
    setVisibleSection(newSectionIndex);
    setIsSectionContentPending(true);

    try {
      logger.log('🎯 Meeting.tsx: Calling changeSection...');
      await changeSection(newSectionIndex);
      logger.log('✅ Meeting.tsx: Successfully switched to section', newSectionIndex);
    } catch (error) {
      logger.error('❌ Meeting.tsx: Error switching sections:', error);
    } finally {
      finishSectionTransition();
    }
  };

  // Optimized team tasks management - only load after meeting is ready
  const shouldLoadTasks = hasTeamAccess && !activeMeetingLoading;
  
  // For custom member meetings, manage team selection state
  const [selectedTasksTeam, setSelectedTasksTeam] = useState<string | null>(null);
  
  // Update selected team when userTeams loads for member meetings
  useEffect(() => {
    if (isMemberMeeting && !selectedTasksTeam && userTeams.length > 0) {
      setSelectedTasksTeam(userTeams[0].id);
    }
  }, [isMemberMeeting, userTeams, selectedTasksTeam]);
  
  // Determine which team IDs to fetch tasks for
  const taskTeamIds = isMemberMeeting 
    ? (selectedTasksTeam ? [selectedTasksTeam] : [])  // Use selected team for member meetings
    : (teamId ? [teamId] : []);  // Use URL teamId for regular meetings
  
  // Ref to hold broadcast function (needed to break circular dependency)
  const publishRestoreRef = useRef<((taskId: string, task: any) => void) | null>(null);

  // Create callback for when undo succeeds (to broadcast to other participants)
  const handleUndoSuccess = useCallback((taskId: string, task: any) => {
    logger.log('📤 Meeting.tsx: Task undo succeeded, broadcasting restore to other participants');
    publishRestoreRef.current?.(taskId, task);
  }, []);

  const {
    tasks,
    loading: tasksLoading,
    updateTask,
    deleteTask,
    createTask,
    applyRemoteStatusUpdate,
    applyRemoteArchive,
    applyRemoteRestore,
    applyRemoteTaskCreate,
    applyRemoteTaskUpdate,
    undoArchive,
    clearRemoteStatusUpdate
  } = useUnifiedTeamTasks(
    shouldLoadTasks ? taskTeamIds : [],
    meetingId, // Pass meeting ID to prevent filtering completed tasks during meetings
    handleUndoSuccess // Pass the broadcast callback for undo operations
  );

  // Real-time task status sync for meeting participants
  const handleRemoteTaskStatusChange = useCallback((taskId: string, completed: boolean) => {
    logger.log('📡 Meeting.tsx: Applying remote task status change', { taskId, completed });
    applyRemoteStatusUpdate(taskId, completed);
  }, [applyRemoteStatusUpdate]);

  const { publishStatusChange } = useTaskStatusBroadcast(
    teamId || null,
    handleRemoteTaskStatusChange
  );

  // Real-time task archive sync for meeting participants
  const handleRemoteTaskArchive = useCallback((taskId: string) => {
    logger.log('📡 Meeting.tsx: Applying remote task archive', { taskId });
    applyRemoteArchive(taskId);
  }, [applyRemoteArchive]);

  // Real-time task restore sync for meeting participants
  const handleRemoteTaskRestore = useCallback((taskId: string) => {
    logger.log('📡 Meeting.tsx: Applying remote task restore', { taskId });
    applyRemoteRestore(taskId);
  }, [applyRemoteRestore]);

  const { publishArchive, publishRestore } = useTaskArchiveBroadcast(
    teamId || null,
    handleRemoteTaskArchive,
    handleRemoteTaskRestore
  );

  // Real-time task creation sync for meeting participants
  const handleRemoteTaskCreate = useCallback((task: any) => {
    logger.log('📡 Meeting.tsx: Applying remote task creation', { taskId: task.id, title: task.title });
    applyRemoteTaskCreate(task);
  }, [applyRemoteTaskCreate]);

  const { publishTaskCreated } = useTaskCreateBroadcast(
    teamId || null,
    handleRemoteTaskCreate
  );

  // Real-time task property update sync for meeting participants
  const handleRemoteTaskUpdate = useCallback((taskId: string, updates: Record<string, any>) => {
    logger.log('📡 Meeting.tsx: Applying remote task property update', { taskId, updates });
    applyRemoteTaskUpdate(taskId, updates);
  }, [applyRemoteTaskUpdate]);

  const { publishTaskUpdated } = useTaskUpdateBroadcast(
    teamId || null,
    handleRemoteTaskUpdate
  );

  // Update ref when publishRestore is available (to break circular dependency)
  useEffect(() => {
    publishRestoreRef.current = publishRestore;
  }, [publishRestore]);

  // Wrap updateTask to broadcast status changes to other meeting participants
  const updateTaskWithBroadcast = useCallback(async (taskId: string, updates: any): Promise<void> => {
    // Clear any stale remote status update BEFORE applying local update
    // This ensures local optimistic update takes precedence over remote broadcast state
    if (updates.completed !== undefined) {
      clearRemoteStatusUpdate(taskId);
    }
    
    // Build property updates for immediate local application and broadcast
    const propertyUpdates: Record<string, any> = {};
    if (updates.title !== undefined) propertyUpdates.title = updates.title;
    if (updates.description !== undefined) propertyUpdates.description = updates.description;
    if (updates.due_date !== undefined) propertyUpdates.due_date = updates.due_date;
    if (updates.assigned_to !== undefined) propertyUpdates.assigned_to = updates.assigned_to;
    
    // Apply property updates locally for instant feedback (before async DB call)
    // This ensures the editor sees their changes immediately
    if (Object.keys(propertyUpdates).length > 0) {
      applyRemoteTaskUpdate(taskId, propertyUpdates);
    }
    
    await updateTask(taskId, updates);
    
    // If completed status changed, broadcast to other participants
    if (updates.completed !== undefined) {
      publishStatusChange(taskId, updates.completed);
    }
    
    // Broadcast property updates to other participants
    if (Object.keys(propertyUpdates).length > 0) {
      publishTaskUpdated(taskId, propertyUpdates);
    }
  }, [updateTask, publishStatusChange, clearRemoteStatusUpdate, publishTaskUpdated, applyRemoteTaskUpdate]);

  // Wrap deleteTask to broadcast archive to other meeting participants
  const deleteTaskWithBroadcast = useCallback(async (taskId: string): Promise<void> => {
    await deleteTask(taskId);
    publishArchive(taskId);
  }, [deleteTask, publishArchive]);

  // Wrap undoArchive to broadcast restore to other meeting participants
  const undoArchiveWithBroadcast = useCallback(async (taskId: string): Promise<void> => {
    await undoArchive(taskId);
    publishRestore(taskId, null); // Task data not needed - other clients just clear the archived flag
  }, [undoArchive, publishRestore]);

  // Debug logging removed to prevent infinite loops
  const createTaskWrapper = async (taskData: any): Promise<void> => {
    logger.log('🔧 Meeting.tsx: Creating task via wrapper:', taskData);

    // Clean the task data to match UnifiedTeamTask interface
    const cleanedTaskData = {
      title: taskData.title || '',
      description: taskData.description || '',
      team_id: taskData.team_id || teamId,
      assigned_to: taskData.assigned_to || null,
      due_date: taskData.due_date || null,
      completed: false,
      archived: false
    };
    logger.log('🔧 Meeting.tsx: Cleaned task data:', cleanedTaskData);
    try {
      // Create the task first and capture the result
      const createdTaskResult = await createTask(cleanedTaskData);
      
      // Broadcast task creation to other meeting participants
      if (createdTaskResult) {
        logger.log('📤 Meeting.tsx: Broadcasting task creation to other participants');
        publishTaskCreated({
          id: createdTaskResult.id,
          title: createdTaskResult.title,
          description: createdTaskResult.description || '',
          team_id: createdTaskResult.teamId || teamId || '',
          assigned_to: createdTaskResult.assignedTo || [],
          due_date: createdTaskResult.dueDate || '',
          completed: false,
          archived: false,
          created_at: createdTaskResult.createdAt || new Date().toISOString(),
          updated_at: createdTaskResult.updatedAt || new Date().toISOString(),
        });
      }
      
      // Note: auto-solve for task-from-issue is already handled by
      // IssuesSection.handleCreateTaskFromIssue → handleIssueSolved chain,
      // which fires BEFORE this wrapper runs. No duplicate call needed here.

      // Update meeting results with the created task
      if (meetingId) {
        try {
          logger.log('📊 Meeting: Tracking task creation in meeting results from wrapper');
          const currentResults = await getMeetingResults(meetingId);
          const existingTasksCreated = (currentResults?.tasks_created as any[]) || [];
          
          // Add the newly created task to the list
          const createdTask = {
            title: taskData.title,
            description: taskData.description,
            due_date: taskData.due_date,
            assigned_to: cleanedTaskData.assigned_to,
            created_at: new Date().toISOString(),
            team_id: teamId
          };
          
          const updatedTasksCreated = [...existingTasksCreated, createdTask];
          
          // Save updated meeting results (non-blocking)
          await saveMeetingResults({
            meeting_id: meetingId,
            team_id: teamId,
            tasks_created: updatedTasksCreated,
            // Preserve other existing data
            headlines_created: currentResults?.headlines_created || [],
            issues_resolved: currentResults?.issues_resolved || [],
            goals_created: currentResults?.goals_created || [],
            metrics_created: currentResults?.metrics_created || [],
            section_durations: currentResults?.section_durations || {},
            total_duration_seconds: currentResults?.total_duration_seconds || 0,
            attendees: currentResults?.attendees || [],
            meeting_ratings: currentResults?.meeting_ratings || {}
          }, 'task_creation');
          
          logger.log('✅ Meeting: Updated meeting results with created task from wrapper');
        } catch (resultsError) {
          // Silent failure for non-critical meeting results update
          logger.error('❌ Meeting: Error updating meeting results with task from wrapper (non-critical):', resultsError);
        }
      }
      
      // Notify IssuesSection for optimistic UI update
      handleTaskCreatedNotification();
      
      logger.log('✅ Meeting.tsx: Task created successfully');
    } catch (error) {
      logger.error('❌ Meeting.tsx: Error creating task:', error);
      throw error;
    }
  };

  // Defer event handlers until tasks are ready to prevent heavy loading
  const shouldLoadEventHandlers = shouldLoadTasks && !tasksLoading;
  
  // Use a dummy updateIssue function until the real one is ready from IssuesList
  const updateIssueFn = updateIssue || (async (issueId: string, updates: any) => {
    logger.log('⚠️ Meeting.tsx: updateIssue called before IssuesList is ready');
  });

  const {
    handleCreateTask,
    handleCreateGoal,
    handleCreateMetric,
    handleCreateHeadline,
    handleCreateIssue,
    handleIssueSolved,
    handleAddIssue,
    handleAddTask,
    createHandlers
  } = useMeetingEventHandlers({
    teamId: teamId || '',
    meetingId,
    updateIssue: updateIssueFn, // NEW: Pass the updateIssue function from IssuesList
    setShowTaskModal,
    setShowGoalModal,
    setShowMetricModal,
    setShowHeadlineModal,
    setShowIssueModal,
    setPrefilledTaskData,
    createTask: createTaskWrapper,
    // ✅ FIX: Pass callbacks for real-time issue sync via FAB modal
    onIssueCreated: handleIssueCreated,
    addIssueToLocalState: addIssueToLocalStateRef.current || undefined,
  });

  // NEW: Track tasks that are currently having issues created for them (prevents rapid clicks)
  const [creatingIssueForTasks, setCreatingIssueForTasks] = useState<Set<string>>(new Set());

  // Create a wrapper for issue creation that matches the expected signature with duplicate protection
  const handleCreateIssueFromTask = async (title: string, description: string, ownerId?: string, taskId?: string) => {
    // Guard against rapid clicks on the same task
    if (taskId && creatingIssueForTasks.has(taskId)) {
      logger.log('⚠️ Meeting.tsx: Already creating issue for this task, ignoring duplicate request');
      return;
    }

    // Add taskId to tracking set
    if (taskId) {
      setCreatingIssueForTasks(prev => new Set(prev).add(taskId));
    }

    logger.log('🔧 Meeting.tsx: Creating issue from task:', {
      title,
      description,
      ownerId,
      taskId
    });

    try {
      await handleAddIssue({
        title,
        description,
        issueType: 'short_term', // Default to short_term for task-related issues
        teamId: teamId || '',
        ownerId
      });
      logger.log('✅ Meeting.tsx: Issue created from task successfully');
    } catch (error) {
      logger.error('❌ Meeting.tsx: Error creating issue from task:', error);
      throw error;
    } finally {
      // Remove taskId from tracking set
      if (taskId) {
        setCreatingIssueForTasks(prev => {
          const updated = new Set(prev);
          updated.delete(taskId);
          return updated;
        });
      }
    }
  };

  // NEW: Handle task creation from issues with proper due date support + auto solve issue
  const handleCreateTaskFromIssue = async (issueData: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
    dueDate?: string;
    assignedTo?: string[];
  }) => {
    logger.log('🔧 Meeting.tsx: Creating task from issue:', issueData);
    try {
      // Clean the data for the fast tasks system
      const cleanedTaskData = {
        title: issueData.title,
        description: issueData.description,
        team_id: teamId,
        assigned_to: issueData.assignedTo && issueData.assignedTo.length > 0
          ? issueData.assignedTo
          : (issueData.ownerId ? [issueData.ownerId] : []),
        due_date: issueData.dueDate || null,
        completed: false,
        archived: false
      };
      await createTaskWrapper(cleanedTaskData);
      
      // Issue is already marked as solved optimistically by IssuesSection BEFORE task creation
      // No need to solve it again here - that's handled by IssuesSection.handleCreateTaskFromIssue
      
      logger.log('✅ Meeting.tsx: Task created from issue successfully');
    } catch (error) {
      logger.error('❌ Meeting.tsx: Error creating task from issue:', error);
      throw error;
    }
  };

  // Enhanced meeting start handler that respects existing scriber assignment
  const handleStartMeeting = async (role: 'scriber' | 'participant') => {
    if (!teamId) return;
    try {
      logger.log('🎯 Meeting.tsx: Starting/joining meeting with role:', role);
      if (activeMeeting) {
        // Join existing meeting - use detected role if user is already scriber
        const effectiveRole = isCurrentUserScriber ? 'scriber' : role;
        await joinExistingMeeting(activeMeeting.id, effectiveRole);
      } else {
        // Start new meeting
        await startMeeting(teamId, role, meetingType);
      }
      setShowRoleSelection(false);
      logger.log('✅ Meeting.tsx: Successfully started/joined meeting');
    } catch (error) {
      logger.error('❌ Meeting.tsx: Error starting/joining meeting:', error);
      toast({
        title: "Failed to Start Meeting",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  // Handle scriber takeover
  const handleTakeOverScriber = async () => {
    try {
      logger.log('🎯 Meeting.tsx: Taking over as scriber');
      await takeOverAsScriber();
      logger.log('✅ Meeting.tsx: Successfully took over as scriber');
    } catch (error) {
      logger.error('❌ Meeting.tsx: Failed to take over as scriber:', error);
      toast({
        title: "Failed to Take Over as Scriber",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  // Manual trigger for testing
  const handleManualStartMeeting = () => {
    logger.log('🔧 Manual trigger: Opening role selection modal');
    setRoleSelectionDismissed(false); // Clear dismissal when manually triggered
    setShowRoleSelection(true);
  };

  // Handle role selection cancellation
  const handleRoleSelectionCancel = () => {
    setShowRoleSelection(false);
    setRoleSelectionDismissed(true); // Prevent auto-reopening
    logger.log('❌ Role selection cancelled by user');
    
    // Safe navigation using route history tracker
    try {
      const previousRoute = getPreviousRoute();
      logger.log('📍 Meeting: Previous route from history:', previousRoute);
      logger.log('📍 Meeting: Current location:', location.pathname);
      
      // Debug: Let's also check sessionStorage directly
      const historyStr = sessionStorage.getItem('route_history');
      logger.log('📍 Meeting: Raw route history:', historyStr);
      
      if (previousRoute && previousRoute !== location.pathname && !previousRoute.includes('/meeting/')) {
        logger.log('📍 Meeting: Navigating back to previous route:', previousRoute);
        navigate(previousRoute, { replace: true });
      } else {
        // Fallback to dashboard since no valid previous route or previous route is also a meeting
        logger.log('📍 Meeting: No valid previous route, using dashboard fallback');
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      logger.error('❌ Meeting: Error in safe navigation, using dashboard fallback:', error);
      navigate('/dashboard', { replace: true });
    }
  };

  // Early returns for access control and loading states
  // Wait for activeMeeting to load before checking access to prevent false "Access Denied" flash
  if (!teamId || teamsLoading || companyLoading || activeMeetingLoading || (!hasTeamAccess && !teamInfo)) {
    return <MeetingAccessHandler teamId={teamId} teams={teams} teamsLoading={teamsLoading || companyLoading || activeMeetingLoading} />;
  }

  // Helper function to clean team name by removing company name suffix
  const cleanTeamName = (teamName: string) => {
    // Remove patterns like "- CompanyName" or " - CompanyName" from the end
    return teamName.replace(/\s*-\s*[^-]+$/, '').trim();
  };
  const getTeamDisplayName = () => {
    const rawTeamName = currentTeam?.name || teamInfo?.name || 'Unknown Team';
    const cleanedTeamName = cleanTeamName(rawTeamName);
    const meetingTypeLabel = meetingType === 'quarterly' 
      ? 'Quarterly Planning' 
      : meetingType === 'annual' 
        ? 'Annual Planning' 
        : 'Meeting';
    return `${cleanedTeamName} ${meetingTypeLabel}`;
  };
  const teamName = getTeamDisplayName();

  // Debug logging removed to prevent infinite loops

  // Updated meeting status displays with optimized provider initialization
  return (
    <div className="min-h-screen bg-background relative">
      {/* Back button - only shows when role selection modal is open */}
      {shouldShowRoleSelection && (
        <div className="fixed top-4 left-4 z-[99999] pointer-events-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRoleSelectionCancel}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground shadow-lg bg-background border border-border pointer-events-auto"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      )}

      <TimerRestoration>
        {/* Only initialize VotingProvider when we have team access to prevent early loading */}
        {hasTeamAccess ? (
          <VotingProvider teamId={teamId}>
          <MeetingLayout 
            teamId={teamId} 
            teamName={teamName}
            meetingTitle={
              meetingType === 'custom' && (activeMeeting as any)?.meeting_title
                ? (activeMeeting?.team_id 
                    ? `${currentTeam?.name || teamInfo?.name || 'Team'} • ${(activeMeeting as any).meeting_title}`
                    : (activeMeeting as any).meeting_title)
                : (activeMeeting as any)?.meeting_title
            }
            totalPlannedTimeMinutes={totalPlannedTimeMinutes} 
            sectionDurations={timerState.sectionDurations} 
            currentSectionDuration={calculations.sectionDurationMs} 
            onCreateTask={handleCreateTask} 
            onCreateGoal={handleCreateGoal} 
            onCreateMetric={handleCreateMetric} 
            onCreateHeadline={handleCreateHeadline} 
            onCreateIssue={handleCreateIssue}
          >
            {/* Show meeting skeleton while checking for active meeting */}
            {activeMeetingLoading && !isRunning ? (
              <MeetingSkeleton />
            ) : (
              <>
                {/* Show start meeting prompt when no active meeting and role selection not shown */}
                {!isRunning && !activeMeetingLoading && !activeMeeting && !showRoleSelection && (
                  <div className="mb-4 p-4 bg-warning/5 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium text-yellow-800 dark:text-yellow-200">No Active Meeting</h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Start a meeting to begin timing and tracking progress.
                        </p>
                      </div>
                      <Button onClick={handleManualStartMeeting} className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Start Meeting
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show meeting agenda preview when role selection modal is open */}
                {showRoleSelection && !isRunning && (
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 opacity-60">
                    <div className="lg:col-span-1">
                      <TeslaMeetingAgenda agendaItems={agendaItems} currentSection={0} onSectionChange={() => {}} totalPlannedTimeMinutes={totalPlannedTimeMinutes} sectionAccumulatedTimes={[]} sectionDurations={agendaItems.map(() => 0)} currentSectionDuration={0} teamId={teamId || ''} meetingType={meetingType} />
                    </div>

                      <div className="lg:col-span-5">
                        <div className="bg-background border border-border p-6">
                        <MeetingSectionRenderer 
                          currentSection={0} 
                          agendaItems={agendaItems} 
                          teamId={teamId || ''} 
                          activeMeetingId={null}
                          meetingTeamId={activeMeeting?.team_id}
                          onCreateTaskFromIssue={handleCreateTaskFromIssue} 
                          onIssueSolved={handleIssueSolved} 
                          meetingType={meetingType} 
                          tasks={tasks} 
                          tasksLoading={tasksLoading} 
                          onTaskUpdate={updateTaskWithBroadcast} 
                          onTaskDelete={deleteTask} 
                          onTaskCreate={createTaskWrapper} 
                          onCreateIssue={handleCreateIssueFromTask}
                          creatingIssueForTasks={creatingIssueForTasks}
                          onUpdateIssueReady={handleUpdateIssueReady}
                          onTaskCreated={handleTaskCreatedNotification}
                          onRegisterTaskCallback={handleTaskCreatedCallback}
                        />
                        </div>
                      </div>
                  </div>
                )}

                {/* Show join meeting button when meeting exists */}
                {!isRunning && !activeMeetingLoading && meetingExists && !recentlyEndedMeeting && (
                  <div className="mb-4 p-4 bg-primary/5 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium text-blue-800 dark:text-blue-200">Meeting in Progress</h3>
                        <p className="text-sm text-primary dark:text-blue-300">
                          There's an active meeting for this team. Join as scriber or participant.
                        </p>
                      </div>
                      <Button onClick={async () => {
                        logger.log('🎯 Join Meeting clicked - userMeetingRole:', userMeetingRole);
                        if (userMeetingRole && activeMeeting) {
                          // User already has a role, join directly
                          logger.log('✅ User already has role:', userMeetingRole, '- joining directly');
                          try {
                            await joinExistingMeeting(activeMeeting.id, userMeetingRole);
                            logger.log('✅ Successfully joined existing meeting');
                          } catch (error) {
                            logger.error('❌ Failed to join existing meeting:', error);
                            toast({
                              title: "Failed to Join Meeting",
                              description: "There was an error joining the meeting. Please try again.",
                              variant: "destructive"
                            });
                          }
                        } else {
                          // User has no role, show role selection
                          logger.log('❓ User has no role - showing role selection');
                          setShowRoleSelection(true);
                        }
                      }} className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Join Meeting
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show takeover option for participants when no scriber */}
                {isRunning && currentRole === 'participant' && !scriberId && (
                  <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium text-orange-800 dark:text-orange-200">No Active Scriber</h3>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          The meeting needs someone to control the timer. Take over as scriber?
                        </p>
                      </div>
                      <Button onClick={handleTakeOverScriber} className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Become Scriber
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show scriber status when user is the scriber */}
                {isRunning && (currentRole === 'scriber' || isCurrentUserScriber)}

                {/* Timer Display - Show when meeting is running */}
                {isRunning && (
                  <div className="mb-4">
                    <NewTimerDisplay variant="overall" targetDurationMs={totalPlannedTimeMinutes * 60 * 1000} />
                  </div>
                )}

                {/* Main Meeting Content - Always show when meeting is running */}
                {isRunning && (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2">
                      <div className="lg:col-span-1 max-h-[calc(100vh-7rem)] overflow-y-auto">
                        <TeslaMeetingAgenda agendaItems={agendaItems} currentSection={visibleSection} onSectionChange={handleSectionChange} totalPlannedTimeMinutes={totalPlannedTimeMinutes} sectionAccumulatedTimes={timerState.sectionAccumulatedTimes} sectionDurations={meetingResults?.section_durations || timerState.sectionDurations} currentSectionDuration={calculations.sectionAccumulatedMs} teamId={teamId || ''} meetingType={meetingType} />
                      </div>

                      <div className="lg:col-span-5">
                        <div className="h-[calc(100vh-7rem)] flex flex-col bg-background border border-border overflow-hidden overflow-x-hidden">
                          {teamInfo?.company_id && currentCompany?.id !== teamInfo.company_id ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                              Switching company context to load this team's tasks...
                            </div>
                          ) : (
                          isSectionContentPending ? (
                            <div className="flex h-full items-center justify-center bg-background">
                              <div className="flex flex-col items-center gap-3 text-center">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    Loading {agendaItems[visibleSection]?.title || 'meeting section'}...
                                  </p>
                                  <p className="text-xs text-muted-foreground">Preparing the selected section</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <MeetingSectionRenderer 
                              currentSection={visibleSection} 
                              agendaItems={agendaItems} 
                              teamId={teamId || ''} 
                              activeMeetingId={meetingId}
                              meetingTeamId={activeMeeting?.team_id}
                              onCreateTaskFromIssue={handleCreateTaskFromIssue} 
                              onIssueSolved={handleIssueSolved} 
                              meetingType={meetingType} 
                              tasks={tasks} 
                              tasksLoading={tasksLoading} 
                              onTaskUpdate={updateTaskWithBroadcast} 
                              onTaskDelete={deleteTaskWithBroadcast}
                              onTaskCreate={createTaskWrapper} 
                              onCreateIssue={handleCreateIssueFromTask}
                              creatingIssueForTasks={creatingIssueForTasks}
                              liveSectionDuration={calculations.sectionAccumulatedMs} 
                              onUpdateIssueReady={handleUpdateIssueReady}
                              onTaskCreated={handleTaskCreatedNotification}
                              onRegisterTaskCallback={handleTaskCreatedCallback}
                              onIssueCreated={handleIssueCreated}
                              onAddIssueToLocalStateReady={handleAddIssueToLocalStateReady}
                              onIssueStatusChanged={handleIssueStatusChanged}
                              onUpdateIssueLocalStateReady={handleUpdateIssueLocalStateReady}
                              onIssueArchivedChanged={handleIssueArchivedChanged}
                              onUpdateIssueArchiveLocalStateReady={handleUpdateIssueArchiveLocalStateReady}
                            />
                          )
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Meeting Modals */}
                <MeetingModalsManager teamId={teamId || ''} currentMeetingId={meetingId} showTaskModal={showTaskModal} setShowTaskModal={setShowTaskModal} showGoalModal={showGoalModal} setShowGoalModal={setShowGoalModal} showMetricModal={showMetricModal} setShowMetricModal={setShowMetricModal} showHeadlineModal={showHeadlineModal} setShowHeadlineModal={setShowHeadlineModal} showIssueModal={showIssueModal} setShowIssueModal={setShowIssueModal} onAddTask={handleAddTask} onAddGoal={createHandlers.handleAddGoal} onAddMetric={createHandlers.handleAddMetric} onAddHeadline={createHandlers.handleAddHeadline} onAddIssue={handleAddIssue} prefilledTaskData={prefilledTaskData} />

                {/* Enhanced Role Selection Modal with scriber detection */}
                <NewRoleSelectionModal 
                  isOpen={showRoleSelection} 
                  onClose={() => setShowRoleSelection(false)} 
                  onStartMeeting={handleStartMeeting} 
                  teamName={teamName} 
                  hasExistingScriber={hasActiveScriber} 
                  activeMeetingId={activeMeeting?.id} 
                />
              </>
            )}
          </MeetingLayout>
        </VotingProvider>
      ) : (
        <MeetingSkeleton />
      )}
    </TimerRestoration>
    </div>
  );
};

export default Meeting;