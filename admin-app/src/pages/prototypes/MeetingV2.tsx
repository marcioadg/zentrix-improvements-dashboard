import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getPreviousRoute } from '@/components/navigation/RouteHistoryTracker';
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
import { Button } from '@/components/ui/button';
import { Play, Users, Crown, ArrowLeft, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMeetingResults } from '@/hooks/useMeetingResults';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useSimpleTeams } from '@/hooks/useSimpleTeams';
import { useAllActiveMeetings } from '@/hooks/useAllActiveMeetings';
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

// Zustand store + sync hook
import { useMeetingStore } from '@/stores/meetingStore';
import { useMeetingStoreSync } from '@/hooks/meeting/useMeetingStoreSync';

/**
 * Prototype Meeting V2 — uses a unified Zustand store for meeting state.
 * Mirrors the existing Meeting.tsx page but hydrates + syncs via useMeetingStoreSync.
 * All existing UI components are reused unchanged.
 */
const MeetingV2 = () => {
  const {
    teamId,
    meetingType = 'weekly',
  } = useParams<{ teamId: string; meetingType?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // ─── Prototype banner ────────────────────────────────────────
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // ─── Zustand store sync ──────────────────────────────────────
  const storeMeetingId = useMeetingStore((s) => s.meetingId);
  const storeStatus = useMeetingStore((s) => s.status);
  const storeSection = useMeetingStore((s) => s.currentSection);
  const storeScriberId = useMeetingStore((s) => s.scriberId);

  // Sync hook – hydrates store from Supabase + subscribes to realtime
  const { isLoading: storeSyncLoading, error: storeSyncError } = useMeetingStoreSync(
    storeMeetingId,
    teamId ?? null
  );

  // ─── Role selection state ────────────────────────────────────
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [roleSelectionDismissed, setRoleSelectionDismissed] = useState(false);
  const [meetingResults, setMeetingResults] = useState<any>(null);
  const [selectedMetricsTeam, setSelectedMetricsTeam] = useState<string | null>(null);
  const { getMeetingResults, saveMeetingResults } = useMeetingResults();

  const [updateIssue, setUpdateIssue] = useState<((issueId: string, updates: any) => Promise<void>) | null>(null);
  const handleUpdateIssueReady = (fn: (issueId: string, updates: any) => Promise<void>) => {
    setUpdateIssue(() => fn);
  };

  const taskCreatedCallbackRef = useRef<(() => void) | null>(null);
  const addIssueToLocalStateRef = useRef<((issue: any) => void) | null>(null);

  const handleTaskCreatedNotification = useCallback(() => {
    taskCreatedCallbackRef.current?.();
  }, []);
  const handleTaskCreatedCallback = useCallback((cb: () => void) => {
    taskCreatedCallbackRef.current = cb;
  }, []);

  const handleAddIssueToLocalStateReady = useCallback((fn: (issue: any) => void) => {
    addIssueToLocalStateRef.current = fn;
  }, []);

  const updateIssueLocalStateRef = useRef<((issueId: string, status: string) => void) | null>(null);
  const handleUpdateIssueLocalStateReady = useCallback((fn: (issueId: string, status: string) => void) => {
    updateIssueLocalStateRef.current = fn;
  }, []);

  const handleRemoteIssueCreate = useCallback((issue: any) => {
    addIssueToLocalStateRef.current?.(issue);
  }, []);
  const { publishIssueCreated } = useIssueCreateBroadcast(teamId || null, handleRemoteIssueCreate);
  const handleIssueCreated = useCallback((issue: any) => {
    publishIssueCreated(issue);
  }, [publishIssueCreated]);

  const handleRemoteIssueStatusChange = useCallback((issueId: string, status: string) => {
    updateIssueLocalStateRef.current?.(issueId, status);
  }, []);
  const { publishStatusChange: publishIssueStatusChange } = useIssueStatusBroadcast(teamId || null, handleRemoteIssueStatusChange);
  const handleIssueStatusChanged = useCallback((issueId: string, status: string) => {
    publishIssueStatusChange(issueId, status);
  }, [publishIssueStatusChange]);

  const updateIssueArchiveLocalStateRef = useRef<((issueId: string, archived: boolean) => void) | null>(null);
  const handleUpdateIssueArchiveLocalStateReady = useCallback((fn: (issueId: string, archived: boolean) => void) => {
    updateIssueArchiveLocalStateRef.current = fn;
  }, []);
  const handleRemoteIssueArchive = useCallback((issueId: string) => {
    updateIssueArchiveLocalStateRef.current?.(issueId, true);
  }, []);
  const handleRemoteIssueRestore = useCallback((issueId: string) => {
    updateIssueArchiveLocalStateRef.current?.(issueId, false);
  }, []);
  const { publishArchive: publishIssueArchive, publishRestore: publishIssueRestore } = useIssueArchiveBroadcast(teamId || null, handleRemoteIssueArchive, handleRemoteIssueRestore);
  const handleIssueArchivedChanged = useCallback((issueId: string, archived: boolean) => {
    if (archived) publishIssueArchive(issueId);
    else publishIssueRestore(issueId);
  }, [publishIssueArchive, publishIssueRestore]);

  // ─── State hooks (same as Meeting.tsx) ───────────────────────
  const {
    teamInfo, setTeamInfo,
    liveSectionDuration, setLiveSectionDuration,
    showTaskModal, setShowTaskModal,
    showGoalModal, setShowGoalModal,
    showMetricModal, setShowMetricModal,
    showHeadlineModal, setShowHeadlineModal,
    showIssueModal, setShowIssueModal,
    prefilledTaskData, setPrefilledTaskData,
  } = useMeetingState();

  const { teams, teamsLoading, companyLoading } = useMeetingTeamData(teamId, setTeamInfo);
  const { teams: userTeams = [] } = useSimpleTeams();
  const {
    activeMeeting, loading: activeMeetingLoading,
    hasActiveScriber, isCurrentUserScriber, userMeetingRole,
  } = useActiveTeamMeeting(teamId || null, meetingType);
  const { currentCompany, switchCompany } = useMultiCompany();

  const customAgenda = (activeMeeting as any)?.custom_agenda || location.state?.customAgenda || null;
  const { agendaItems, totalPlannedTimeMinutes } = useMeetingAgenda(meetingType, customAgenda);

  const isMemberMeeting = meetingType === 'custom' && activeMeeting?.team_id === null;
  const effectiveTeamId = isMemberMeeting ? null : (activeMeeting?.team_id || teamId);
  const currentTeam = teams.find((t) => t.id === effectiveTeamId);
  const hasTeamAccess = isMemberMeeting
    ? activeMeeting?.company_id === currentCompany?.id
    : !!(currentTeam || teamInfo?.company_id);

  useEffect(() => {
    if (isMemberMeeting && userTeams.length > 0 && !selectedMetricsTeam) {
      setSelectedMetricsTeam(userTeams[0].id);
    }
  }, [isMemberMeeting, userTeams, selectedMetricsTeam]);

  useEffect(() => {
    if (teamInfo?.company_id && currentCompany?.id && teamInfo.company_id !== currentCompany?.id) {
      switchCompany(teamInfo.company_id).catch((err) => {
        logger.warn('Failed to switch company context:', err);
      });
    }
  }, [teamInfo?.company_id, currentCompany?.id, switchCompany]);

  // ─── Timer context (kept — sub-components still read it) ─────
  const {
    isRunning, meetingId, currentRole, timerState, calculations,
    startMeeting, joinExistingMeeting, changeSection, formatDuration,
    recentlyEndedMeeting, takeOverAsScriber, canControlTimer, scriberId,
    setSectionBroadcast, applyRemoteSectionChange,
    setScriberBroadcast, applyRemoteScriberChange,
    setMeetingStartedBroadcast,
  } = useNewMeetingTimer();

  const { broadcastMeetingStarted } = useAllActiveMeetings();

  // ─── Broadcast wiring (identical to Meeting.tsx) ─────────────
  const handleRemoteSectionChange = useCallback((sectionIndex: number, sectionStartTime: number) => {
    applyRemoteSectionChange(sectionIndex, sectionStartTime);
    // Also update store
    useMeetingStore.getState().setSection(String(sectionIndex), sectionStartTime);
  }, [applyRemoteSectionChange]);
  const { publishSectionChange } = useSectionBroadcast(teamId || null, handleRemoteSectionChange);
  useEffect(() => { setSectionBroadcast(publishSectionChange); }, [setSectionBroadcast, publishSectionChange]);

  const handleRemoteScriberChange = useCallback((scriberId: string | null) => {
    applyRemoteScriberChange(scriberId);
    useMeetingStore.getState().setScriber(scriberId);
  }, [applyRemoteScriberChange]);
  const { publishScriberChange } = useScriberBroadcast(teamId || null, handleRemoteScriberChange);
  useEffect(() => { setScriberBroadcast(publishScriberChange); }, [setScriberBroadcast, publishScriberChange]);
  useEffect(() => {
    if (broadcastMeetingStarted) setMeetingStartedBroadcast(broadcastMeetingStarted);
  }, [setMeetingStartedBroadcast, broadcastMeetingStarted]);

  // ─── Meeting results ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        if (recentlyEndedMeeting && typeof recentlyEndedMeeting === 'object') {
          const id = (recentlyEndedMeeting as any)?.id;
          if (id) setMeetingResults(await getMeetingResults(id));
        } else {
          setMeetingResults(null);
        }
      } catch { setMeetingResults(null); }
    };
    load();
  }, [recentlyEndedMeeting, getMeetingResults]);

  const meetingExists = !!activeMeeting && !activeMeetingLoading;
  const shouldShowRoleSelection = showRoleSelection && hasTeamAccess;

  // Auto-show role selection
  useEffect(() => {
    if (meetingType === 'custom' && location.state?.preSelectedRole) return;
    if (hasTeamAccess && !activeMeetingLoading && !isRunning && !showRoleSelection && !roleSelectionDismissed && !recentlyEndedMeeting) {
      if (!activeMeeting) { setShowRoleSelection(true); return; }
      if (!userMeetingRole) { setShowRoleSelection(true); return; }
    }
  }, [hasTeamAccess, activeMeetingLoading, isRunning, showRoleSelection, roleSelectionDismissed, userMeetingRole, activeMeeting, meetingType, location.state, recentlyEndedMeeting]);

  // Auto-join
  useEffect(() => {
    if (hasTeamAccess && !activeMeetingLoading && !isRunning && userMeetingRole && activeMeeting && activeMeeting.status === 'active' && !showRoleSelection && !recentlyEndedMeeting) {
      const t = setTimeout(() => {
        joinExistingMeeting(activeMeeting.id, userMeetingRole).catch(() => setShowRoleSelection(true));
      }, 100);
      return () => clearTimeout(t);
    }
  }, [hasTeamAccess, activeMeetingLoading, isRunning, userMeetingRole, activeMeeting, showRoleSelection, recentlyEndedMeeting, joinExistingMeeting]);

  // Navigate on meeting end
  useEffect(() => {
    if (recentlyEndedMeeting && !isRunning) {
      const t = setTimeout(() => {
        const p = location.pathname;
        if (p.includes('/meeting') && !p.startsWith('/tasks')) navigate('/tasks', { replace: true });
      }, 500);
      return () => clearTimeout(t);
    }
  }, [recentlyEndedMeeting, isRunning, navigate, location.pathname]);

  // ─── Section change handler ──────────────────────────────────
  const handleSectionChange = async (newSectionIndex: number) => {
    if (timerState.currentSection === newSectionIndex || !isRunning) return;
    try { await changeSection(newSectionIndex); } catch {}
  };

  // ─── Tasks ───────────────────────────────────────────────────
  const shouldLoadTasks = hasTeamAccess && !activeMeetingLoading;
  const [selectedTasksTeam, setSelectedTasksTeam] = useState<string | null>(null);
  useEffect(() => {
    if (isMemberMeeting && !selectedTasksTeam && userTeams.length > 0) setSelectedTasksTeam(userTeams[0].id);
  }, [isMemberMeeting, userTeams, selectedTasksTeam]);

  const taskTeamIds = isMemberMeeting
    ? (selectedTasksTeam ? [selectedTasksTeam] : [])
    : (teamId ? [teamId] : []);

  const publishRestoreRef = useRef<((taskId: string, task: any) => void) | null>(null);
  const handleUndoSuccess = useCallback((taskId: string, task: any) => {
    publishRestoreRef.current?.(taskId, task);
  }, []);

  const {
    tasks, loading: tasksLoading,
    updateTask, deleteTask, createTask,
    applyRemoteStatusUpdate, applyRemoteArchive, applyRemoteRestore,
    applyRemoteTaskCreate, applyRemoteTaskUpdate,
    undoArchive, clearRemoteStatusUpdate,
  } = useUnifiedTeamTasks(shouldLoadTasks ? taskTeamIds : [], meetingId, handleUndoSuccess);

  const handleRemoteTaskStatusChange = useCallback((taskId: string, completed: boolean) => {
    applyRemoteStatusUpdate(taskId, completed);
  }, [applyRemoteStatusUpdate]);
  const { publishStatusChange } = useTaskStatusBroadcast(teamId || null, handleRemoteTaskStatusChange);

  const handleRemoteTaskArchive = useCallback((taskId: string) => applyRemoteArchive(taskId), [applyRemoteArchive]);
  const handleRemoteTaskRestore = useCallback((taskId: string) => applyRemoteRestore(taskId), [applyRemoteRestore]);
  const { publishArchive, publishRestore } = useTaskArchiveBroadcast(teamId || null, handleRemoteTaskArchive, handleRemoteTaskRestore);

  const handleRemoteTaskCreate = useCallback((task: any) => applyRemoteTaskCreate(task), [applyRemoteTaskCreate]);
  const { publishTaskCreated } = useTaskCreateBroadcast(teamId || null, handleRemoteTaskCreate);

  const handleRemoteTaskUpdate = useCallback((taskId: string, updates: Record<string, any>) => applyRemoteTaskUpdate(taskId, updates), [applyRemoteTaskUpdate]);
  const { publishTaskUpdated } = useTaskUpdateBroadcast(teamId || null, handleRemoteTaskUpdate);

  useEffect(() => { publishRestoreRef.current = publishRestore; }, [publishRestore]);

  const updateTaskWithBroadcast = useCallback(async (taskId: string, updates: any) => {
    if (updates.completed !== undefined) clearRemoteStatusUpdate(taskId);
    const props: Record<string, any> = {};
    if (updates.title !== undefined) props.title = updates.title;
    if (updates.description !== undefined) props.description = updates.description;
    if (updates.due_date !== undefined) props.due_date = updates.due_date;
    if (updates.assigned_to !== undefined) props.assigned_to = updates.assigned_to;
    if (Object.keys(props).length > 0) applyRemoteTaskUpdate(taskId, props);
    await updateTask(taskId, updates);
    if (updates.completed !== undefined) publishStatusChange(taskId, updates.completed);
    if (Object.keys(props).length > 0) publishTaskUpdated(taskId, props);
  }, [updateTask, publishStatusChange, clearRemoteStatusUpdate, publishTaskUpdated, applyRemoteTaskUpdate]);

  const deleteTaskWithBroadcast = useCallback(async (taskId: string) => {
    await deleteTask(taskId);
    publishArchive(taskId);
  }, [deleteTask, publishArchive]);

  const createTaskWrapper = async (taskData: any) => {
    const cleaned = {
      title: taskData.title || '',
      description: taskData.description || '',
      team_id: taskData.team_id || teamId,
      assigned_to: taskData.assigned_to || null,
      due_date: taskData.due_date || null,
      completed: false,
      archived: false,
    };
    const result = await createTask(cleaned);
    if (result) {
      publishTaskCreated({
        id: result.id, title: result.title,
        description: result.description || '',
        team_id: result.teamId || teamId || '',
        assigned_to: result.assignedTo || [],
        due_date: result.dueDate || '',
        completed: false, archived: false,
        created_at: result.createdAt || new Date().toISOString(),
        updated_at: result.updatedAt || new Date().toISOString(),
      });
    }
    if (meetingId) {
      try {
        const cur = await getMeetingResults(meetingId);
        const existing = (cur?.tasks_created as any[]) || [];
        await saveMeetingResults({
          meeting_id: meetingId, team_id: teamId,
          tasks_created: [...existing, { title: taskData.title, description: taskData.description, due_date: taskData.due_date, assigned_to: cleaned.assigned_to, created_at: new Date().toISOString(), team_id: teamId }],
          headlines_created: cur?.headlines_created || [], issues_resolved: cur?.issues_resolved || [],
          goals_created: cur?.goals_created || [], metrics_created: cur?.metrics_created || [],
          section_durations: cur?.section_durations || {}, total_duration_seconds: cur?.total_duration_seconds || 0,
          attendees: cur?.attendees || [], meeting_ratings: cur?.meeting_ratings || {},
        }, 'task_creation');
      } catch {}
    }
    handleTaskCreatedNotification();
  };

  const updateIssueFn = updateIssue || (async () => {});

  const {
    handleCreateTask, handleCreateGoal, handleCreateMetric, handleCreateHeadline,
    handleCreateIssue, handleIssueSolved, handleAddIssue, handleAddTask, createHandlers,
  } = useMeetingEventHandlers({
    teamId: teamId || '', meetingId, updateIssue: updateIssueFn,
    setShowTaskModal, setShowGoalModal, setShowMetricModal, setShowHeadlineModal, setShowIssueModal,
    setPrefilledTaskData, createTask: createTaskWrapper,
    onIssueCreated: handleIssueCreated,
    addIssueToLocalState: addIssueToLocalStateRef.current || undefined,
  });

  const [creatingIssueForTasks, setCreatingIssueForTasks] = useState<Set<string>>(new Set());

  const handleCreateIssueFromTask = async (title: string, description: string, ownerId?: string, taskId?: string) => {
    if (taskId && creatingIssueForTasks.has(taskId)) return;
    if (taskId) setCreatingIssueForTasks((p) => new Set(p).add(taskId));
    try {
      await handleAddIssue({ title, description, issueType: 'short_term', teamId: teamId || '', ownerId });
    } finally {
      if (taskId) setCreatingIssueForTasks((p) => { const u = new Set(p); u.delete(taskId); return u; });
    }
  };

  const handleCreateTaskFromIssue = async (issueData: {
    title: string; description: string; sourceIssueId?: string;
    ownerId?: string; dueDate?: string; assignedTo?: string[];
  }) => {
    const cleaned = {
      title: issueData.title, description: issueData.description,
      team_id: teamId,
      assigned_to: issueData.assignedTo?.length ? issueData.assignedTo : (issueData.ownerId ? [issueData.ownerId] : []),
      due_date: issueData.dueDate || null, completed: false, archived: false,
    };
    await createTaskWrapper(cleaned);
  };

  // ─── Meeting start / role handlers ───────────────────────────
  const handleStartMeeting = async (role: 'scriber' | 'participant') => {
    if (!teamId) return;
    try {
      if (activeMeeting) {
        const eff = isCurrentUserScriber ? 'scriber' : role;
        await joinExistingMeeting(activeMeeting.id, eff);
      } else {
        await startMeeting(teamId, role, meetingType);
      }
      setShowRoleSelection(false);
    } catch (error) {
      alert(`Failed to start/join meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTakeOverScriber = async () => {
    try { await takeOverAsScriber(); } catch (error) {
      alert(`Failed to take over as scriber: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleManualStartMeeting = () => {
    setRoleSelectionDismissed(false);
    setShowRoleSelection(true);
  };

  const handleRoleSelectionCancel = () => {
    setShowRoleSelection(false);
    setRoleSelectionDismissed(true);
    try {
      const prev = getPreviousRoute();
      if (prev && prev !== location.pathname && !prev.includes('/meeting/')) {
        navigate(prev, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      navigate('/dashboard', { replace: true });
    }
  };

  // ─── Early returns ───────────────────────────────────────────
  if (!teamId || teamsLoading || companyLoading || activeMeetingLoading || (!hasTeamAccess && !teamInfo)) {
    return <MeetingAccessHandler teamId={teamId} teams={teams} teamsLoading={teamsLoading || companyLoading || activeMeetingLoading} />;
  }

  const cleanTeamName = (name: string) => name.replace(/\s*-\s*[^-]+$/, '').trim();
  const getTeamDisplayName = () => {
    const raw = currentTeam?.name || teamInfo?.name || 'Unknown Team';
    const label = meetingType === 'quarterly' ? 'Quarterly Planning' : meetingType === 'annual' ? 'Annual Planning' : 'Meeting';
    return `${cleanTeamName(raw)} ${label}`;
  };
  const teamName = getTeamDisplayName();

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background relative">
      {/* Prototype banner */}
      {!bannerDismissed && (
        <div className="fixed top-0 left-0 right-0 z-[99999] bg-yellow-400 text-yellow-900 text-xs font-medium text-center py-1 flex items-center justify-center gap-2">
          <span>⚡ Prototype: Unified Store (Zustand){storeStatus !== 'idle' ? ` — store: ${storeStatus}` : ''}</span>
          <button onClick={() => setBannerDismissed(true)} className="hover:bg-yellow-500 rounded p-0.5" aria-label="Dismiss banner">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Back button */}
      {shouldShowRoleSelection && (
        <div className="fixed top-4 left-4 z-[99999] pointer-events-auto">
          <Button
            variant="ghost" size="sm" onClick={handleRoleSelectionCancel}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground shadow-lg bg-background border border-border pointer-events-auto"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      )}

      <TimerRestoration>
        {hasTeamAccess ? (
          <VotingProvider teamId={teamId}>
            <MeetingLayout
              teamId={teamId} teamName={teamName}
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
              {activeMeetingLoading && !isRunning ? (
                <MeetingSkeleton />
              ) : (
                <>
                  {/* No active meeting prompt */}
                  {!isRunning && !activeMeetingLoading && !activeMeeting && !showRoleSelection && (
                    <div className="mb-4 p-4 bg-warning/5 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium text-yellow-800 dark:text-yellow-200">No Active Meeting</h3>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">Start a meeting to begin timing and tracking progress.</p>
                        </div>
                        <Button onClick={handleManualStartMeeting} className="flex items-center gap-2">
                          <Play className="h-4 w-4" />Start Meeting
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Agenda preview while role selection open */}
                  {showRoleSelection && !isRunning && (
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 opacity-60">
                      <div className="lg:col-span-1">
                        <TeslaMeetingAgenda agendaItems={agendaItems} currentSection={0} onSectionChange={() => {}} totalPlannedTimeMinutes={totalPlannedTimeMinutes} sectionAccumulatedTimes={[]} sectionDurations={agendaItems.map(() => 0)} currentSectionDuration={0} teamId={teamId || ''} meetingType={meetingType} />
                      </div>
                      <div className="lg:col-span-5">
                        <div className="bg-background border border-border p-6">
                          <MeetingSectionRenderer currentSection={0} agendaItems={agendaItems} teamId={teamId || ''} activeMeetingId={null} meetingTeamId={activeMeeting?.team_id} onCreateTaskFromIssue={handleCreateTaskFromIssue} onIssueSolved={handleIssueSolved} meetingType={meetingType} tasks={tasks} tasksLoading={tasksLoading} onTaskUpdate={updateTaskWithBroadcast} onTaskDelete={deleteTask} onTaskCreate={createTaskWrapper} onCreateIssue={handleCreateIssueFromTask} creatingIssueForTasks={creatingIssueForTasks} onUpdateIssueReady={handleUpdateIssueReady} onTaskCreated={handleTaskCreatedNotification} onRegisterTaskCallback={handleTaskCreatedCallback} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Join meeting prompt */}
                  {!isRunning && !activeMeetingLoading && meetingExists && !recentlyEndedMeeting && (
                    <div className="mb-4 p-4 bg-primary/5 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium text-blue-800 dark:text-blue-200">Meeting in Progress</h3>
                          <p className="text-sm text-primary dark:text-blue-300">There's an active meeting for this team. Join as scriber or participant.</p>
                        </div>
                        <Button onClick={async () => {
                          if (userMeetingRole && activeMeeting) {
                            try { await joinExistingMeeting(activeMeeting.id, userMeetingRole); } catch {
                              toast({ title: 'Failed to Join Meeting', description: 'Please try again.', variant: 'destructive' });
                            }
                          } else { setShowRoleSelection(true); }
                        }} className="flex items-center gap-2">
                          <Users className="h-4 w-4" />Join Meeting
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Takeover prompt */}
                  {isRunning && currentRole === 'participant' && !scriberId && (
                    <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium text-orange-800 dark:text-orange-200">No Active Scriber</h3>
                          <p className="text-sm text-orange-700 dark:text-orange-300">The meeting needs someone to control the timer. Take over as scriber?</p>
                        </div>
                        <Button onClick={handleTakeOverScriber} className="flex items-center gap-2">
                          <Crown className="h-4 w-4" />Become Scriber
                        </Button>
                      </div>
                    </div>
                  )}

                  {isRunning && (currentRole === 'scriber' || isCurrentUserScriber)}

                  {/* Timer */}
                  {isRunning && (
                    <div className="mb-4">
                      <NewTimerDisplay variant="overall" targetDurationMs={totalPlannedTimeMinutes * 60 * 1000} />
                    </div>
                  )}

                  {/* Main content */}
                  {isRunning && (
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2">
                      <div className="lg:col-span-1 max-h-[calc(100vh-7rem)] overflow-y-auto">
                        <TeslaMeetingAgenda agendaItems={agendaItems} currentSection={timerState.currentSection} onSectionChange={handleSectionChange} totalPlannedTimeMinutes={totalPlannedTimeMinutes} sectionAccumulatedTimes={timerState.sectionAccumulatedTimes} sectionDurations={meetingResults?.section_durations || timerState.sectionDurations} currentSectionDuration={calculations.sectionAccumulatedMs} teamId={teamId || ''} meetingType={meetingType} />
                      </div>
                      <div className="lg:col-span-5">
                        <div className="h-[calc(100vh-7rem)] flex flex-col bg-background border border-border overflow-hidden overflow-x-hidden">
                          {teamInfo?.company_id && currentCompany?.id !== teamInfo.company_id ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                              Switching company context to load this team's tasks...
                            </div>
                          ) : (
                            <MeetingSectionRenderer
                              currentSection={timerState.currentSection}
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
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modals */}
                  <MeetingModalsManager teamId={teamId || ''} currentMeetingId={meetingId} showTaskModal={showTaskModal} setShowTaskModal={setShowTaskModal} showGoalModal={showGoalModal} setShowGoalModal={setShowGoalModal} showMetricModal={showMetricModal} setShowMetricModal={setShowMetricModal} showHeadlineModal={showHeadlineModal} setShowHeadlineModal={setShowHeadlineModal} showIssueModal={showIssueModal} setShowIssueModal={setShowIssueModal} onAddTask={handleAddTask} onAddGoal={createHandlers.handleAddGoal} onAddMetric={createHandlers.handleAddMetric} onAddHeadline={createHandlers.handleAddHeadline} onAddIssue={handleAddIssue} prefilledTaskData={prefilledTaskData} />

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

export default MeetingV2;
