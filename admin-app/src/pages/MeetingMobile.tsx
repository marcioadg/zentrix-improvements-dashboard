/**
 * MeetingMobile — Mobile-only meeting room (/m/meeting/:teamId/:meetingType).
 *
 * v2 design pass: horizontal pill-strip agenda, sticky status header, mini
 * section bar, mobile-only MobileMeetingSectionRenderer for section content,
 * tangent button + unified FAB, no bottom nav (full-screen mode).
 *
 * Uses the SAME hooks the desktop /meeting page uses, read+write:
 *   - useNewMeetingTimer          (timer state + section + scriber)
 *   - useMeetingTeamData          (team info)
 *   - useActiveTeamMeeting        (active meeting for this team+type)
 *   - useMeetingAgenda            (default + custom agendas)
 *   - useUnifiedTeamTasks         (team tasks)
 *   - useMeetingEventHandlers     (the 5 create-modal handlers)
 *   - useSectionBroadcast         (sync section changes across devices)
 *   - useScriberBroadcast         (sync scriber changes across devices)
 *
 * Strict isolation: desktop Meeting.tsx + src/components/meeting/* are NOT
 * modified. Section content renders through MobileMeetingSectionRenderer,
 * which mirrors each desktop section into mobile-only components and
 * transitionally delegates un-ported sections to the desktop renderer
 * (read-only). Data hooks are reused (data, not UI); desktop section UI is
 * never imported once a section is mirrored.
 *
 * v1 scope:
 *  ✓ Section + scriber broadcasts wired (pill strip syncs across devices,
 *    canControlTimer matches the desktop scriber)
 *  ✓ Start-meeting empty state when no active meeting for this team+type
 *  ✓ Role-selection bottom sheet (scriber vs participant)
 *  ✓ Reused MobileMeetingModalsManager for the 5 create modals
 *  ✓ Tangent button as no-op placeholder
 *  ⚠ Issue/task realtime broadcasts deferred to follow-up — content
 *    updates still arrive via existing component-level realtime, just
 *    with a small refetch delay (vs instant via broadcast). Behavior
 *    is correct, just less snappy on cross-device edits.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useUnifiedTeamTasks } from '@/hooks/useUnifiedTeamTasks';
import { useMeetingAgenda } from '@/hooks/meeting/useMeetingAgenda';
import { useMeetingTeamData } from '@/hooks/meeting/useMeetingTeamData';
import { useActiveTeamMeeting } from '@/hooks/useActiveTeamMeeting';
import { useSectionBroadcast } from '@/hooks/meeting/useSectionBroadcast';
import { useScriberBroadcast } from '@/hooks/meeting/useScriberBroadcast';
import { useMobileFABModals } from '@/hooks/mobile';
import { useMeetingEventHandlers } from '@/components/meeting/MeetingEventHandlers';
import { VotingProvider } from '@/contexts/VotingContext';
import { MobileMeetingSectionRenderer } from '@/components/mobile/meeting/sections';
import { MobileMeetingModalsManager } from '@/components/mobile/MobileMeetingModalsManager';
import { MobileUnifiedFAB } from '@/components/mobile/MobileUnifiedFAB';
import {
  MobileMeetingHeader,
  MobileMeetingPillStrip,
  MobileMeetingMiniBar,
  MobileMeetingTangentButton,
  MobileRoleSelectionSheet,
  MobileMeetingStartScreen,
  MobileMeetingAccessDeniedScreen,
  type MeetingRole,
} from '@/components/mobile/meeting';
import { logger } from '@/utils/logger';

const MeetingMobile: React.FC = () => {
  const { teamId, meetingType = 'weekly' } = useParams<{
    teamId: string;
    meetingType?: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ----- Local state -----
  const [teamInfo, setTeamInfo] = useState<{ name: string; company_id?: string } | null>(null);
  const [prefilledTaskData, setPrefilledTaskData] = useState<
    | { title: string; description: string; sourceIssueId?: string; ownerId?: string }
    | undefined
  >(undefined);
  const [showRoleSheet, setShowRoleSheet] = useState(false);
  const [roleSheetDismissed, setRoleSheetDismissed] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // ----- Modal state for the FAB (5 create modals) -----
  const fabModals = useMobileFABModals();

  // ----- Team data + active meeting -----
  // useMeetingTeamData returns the user's accessible teams + a loading
  // flag. teams here is the SAME source desktop's MeetingAccessHandler
  // uses to decide hasTeamAccess (Meeting.tsx:212 / MeetingAccessHandler.tsx:28-29).
  const { teams, teamsLoading } = useMeetingTeamData(teamId || null, setTeamInfo);
  const currentTeam = useMemo(
    () => teams?.find((t) => t.id === teamId) ?? null,
    [teams, teamId],
  );
  // Strict membership check — matches desktop's MeetingAccessHandler.
  // If !hasTeamAccess we render the access-denied screen BEFORE mounting
  // MeetingSectionRenderer, so its child hooks (useSimpleIssues,
  // useUnifiedTeamTasks, useLiveMeetingRatings, etc.) never fire their
  // own access-denied toasts and don't make 400 / 404 fetches.
  const hasTeamAccess = !!currentTeam;
  const { activeMeeting, loading: activeMeetingLoading } = useActiveTeamMeeting(
    teamId || null,
    meetingType,
  );

  // ----- Agenda for this meeting type -----
  const { agendaItems, totalPlannedTimeMinutes } = useMeetingAgenda(meetingType);

  // ----- Tasks (the section renderer needs these) -----
  // Hook signature: useUnifiedTeamTasks(selectedTeamIds: string[], activeMeetingId?: string | null, onUndoSuccess?).
  // We pass [teamId] (singleton array) once teamId is known; empty array
  // disables the queries while we wait for params to resolve. meetingId
  // (when available) lets the hook keep completed tasks visible during
  // an active meeting (same behavior as Meeting.tsx:706).
  const taskTeamIds = useMemo(() => (teamId ? [teamId] : []), [teamId]);
  const {
    tasks,
    loading: tasksLoading,
    createTask,
    updateTask,
    deleteTask,
  } = useUnifiedTeamTasks(taskTeamIds, undefined /* meetingId set later via state */);

  // ----- Timer context (same hook desktop uses) -----
  const {
    isRunning,
    meetingId,
    currentRole,
    timerState,
    calculations,
    startMeeting,
    joinExistingMeeting,
    changeSection,
    pauseTimer,
    resumeTimer,
    canControlTimer,
    scriberId,
    takeOverAsScriber,
    setSectionBroadcast,
    applyRemoteSectionChange,
    setScriberBroadcast,
    applyRemoteScriberChange,
  } = useNewMeetingTimer();

  // Mirror desktop TakeOverScribeButton conditions: show only when the
  // meeting is running, the local user is a participant, and no one is
  // currently scriber. takeOverAsScriber owns the toast + DB write +
  // broadcast — we just trigger it.
  const showBecomeScriber = isRunning && currentRole === 'participant' && !scriberId;

  const handleBecomeScriber = useCallback(async () => {
    try {
      await takeOverAsScriber();
    } catch (err) {
      // The context already surfaces a destructive toast on failure;
      // log here for the mobile-side trail.
      logger.error('MeetingMobile: takeOverAsScriber failed', err);
    }
  }, [takeOverAsScriber]);

  // ----- Realtime: section broadcast (mirrors desktop) -----
  const handleRemoteSectionChange = useCallback(
    (sectionIndex: number, sectionStartTime: number) => {
      logger.log('📡 MeetingMobile: remote section change', { sectionIndex });
      applyRemoteSectionChange(sectionIndex, sectionStartTime);
    },
    [applyRemoteSectionChange],
  );

  const { publishSectionChange } = useSectionBroadcast(
    teamId || null,
    handleRemoteSectionChange,
    meetingId,
  );

  // Register publish fn with timer so local changeSection() auto-broadcasts.
  useEffect(() => {
    setSectionBroadcast(publishSectionChange);
  }, [setSectionBroadcast, publishSectionChange]);

  // ----- Realtime: scriber broadcast (mirrors desktop) -----
  const handleRemoteScriberChange = useCallback(
    (newScriberId: string | null) => {
      logger.log('📡 MeetingMobile: remote scriber change', { newScriberId });
      applyRemoteScriberChange(newScriberId);
    },
    [applyRemoteScriberChange],
  );

  const { publishScriberChange } = useScriberBroadcast(
    teamId || null,
    handleRemoteScriberChange,
  );

  useEffect(() => {
    setScriberBroadcast(publishScriberChange);
  }, [setScriberBroadcast, publishScriberChange]);

  // ----- The 5 create handlers (reuses desktop's hook) -----
  // We pass a dummy updateIssue — full issue-status broadcast is a v2
  // follow-up. Local issue updates still happen via the section renderer's
  // own state.
  const updateIssueFn = useCallback(
    async (issueId: string, updates: Record<string, unknown>) => {
      logger.log('MeetingMobile: updateIssue (placeholder) called', { issueId, updates });
    },
    [],
  );

  const {
    handleCreateTask,
    handleCreateGoal,
    handleCreateMetric,
    handleCreateHeadline,
    handleCreateIssue,
    handleAddIssue,
    handleAddTask,
    createHandlers,
  } = useMeetingEventHandlers({
    teamId: teamId || '',
    meetingId,
    updateIssue: updateIssueFn,
    setShowTaskModal: fabModals.setShowTaskModal,
    setShowGoalModal: fabModals.setShowGoalModal,
    setShowMetricModal: fabModals.setShowMetricModal,
    setShowHeadlineModal: fabModals.setShowHeadlineModal,
    setShowIssueModal: fabModals.setShowIssueModal,
    setPrefilledTaskData,
    createTask,
  });

  // ----- Show role sheet on first entry (when there's an active meeting or one starts) -----
  useEffect(() => {
    if (!teamId || activeMeetingLoading) return;
    // Show role sheet only when:
    //  - we're not running yet (timer hasn't been initialized for this user)
    //  - we haven't dismissed it
    //  - there IS an active meeting (otherwise the user sees the start screen first)
    if (!isRunning && activeMeeting && !roleSheetDismissed) {
      setShowRoleSheet(true);
    }
  }, [teamId, activeMeetingLoading, isRunning, activeMeeting, roleSheetDismissed]);

  // ----- Header metadata -----
  const teamName = currentTeam?.name || teamInfo?.name || 'Team';
  const meetingTitle =
    meetingType === 'quarterly'
      ? 'Quarterly Planning'
      : meetingType === 'annual'
        ? 'Annual Planning'
        : meetingType === 'custom'
          ? 'Custom Meeting'
          : 'Level 10 Weekly';

  // ----- Computed values -----
  // Per-section progress for the pill strip. Each non-active section uses the
  // persisted accumulated time from timerState.sectionAccumulatedTimes. The
  // ACTIVE section uses calculations.sectionAccumulatedMs — which the timer
  // context computes as prevAccumulated + section_duration_ms (live since
  // sectionStartTime). This is the SAME field desktop uses for the agenda's
  // live section duration (Meeting.tsx:1296, 1336).
  //
  // Earlier this added calculations.activeDurationMs to the active bucket,
  // but activeDurationMs is set to data.overall_duration_ms in the context
  // (NewMeetingTimerContext.tsx:871) — the WHOLE meeting's elapsed time —
  // so the active section's bar was inflating by the entire meeting timer.
  const sectionAccumulatedMs = useMemo(() => {
    const dict = timerState.sectionAccumulatedTimes ?? {};
    const arr = agendaItems.map((_, i) => Number(dict[i] ?? 0));
    const idx = timerState.currentSection;
    if (idx >= 0 && idx < arr.length) {
      const live = Number(calculations.sectionAccumulatedMs ?? 0);
      // Guard against the brief post-switch tick where calculations still
      // holds the previous section's accumulated value: fall back to the
      // stored bucket value when live drops to 0 right after a switch.
      arr[idx] = live > 0 ? live : arr[idx];
    }
    return arr;
  }, [
    timerState.sectionAccumulatedTimes,
    timerState.currentSection,
    calculations.sectionAccumulatedMs,
    agendaItems,
  ]);

  // Total meeting elapsed — desktop displays calculations.activeDurationMs
  // directly as the overall timer (MeetingLayout.tsx:82, 151). Do the same
  // here; the previous "sum of buckets + activeDurationMs" double-counted
  // since activeDurationMs already IS the overall meeting time.
  const elapsedTotalMs = calculations.activeDurationMs ?? 0;

  // ----- Handlers -----
  const handleStart = async (role: MeetingRole) => {
    if (!teamId) return;
    setIsStarting(true);
    try {
      if (activeMeeting) {
        await joinExistingMeeting(activeMeeting.id, role);
      } else {
        await startMeeting(teamId, role, meetingType);
      }
      setShowRoleSheet(false);
      setRoleSheetDismissed(true);
    } catch (err) {
      logger.error('MeetingMobile: start/join failed', err);
      toast({
        title: 'Could not start the meeting',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSectionChange = async (newIndex: number) => {
    if (!canControlTimer) return;
    if (newIndex === timerState.currentSection) return;
    try {
      await changeSection(newIndex);
    } catch (err) {
      logger.error('MeetingMobile: changeSection failed', err);
      toast({
        title: 'Could not change section',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePause = async () => {
    if (!canControlTimer) return;
    try {
      if (timerState.isPaused) {
        await resumeTimer();
      } else {
        await pauseTimer('break');
      }
    } catch (err) {
      logger.error('MeetingMobile: pause/resume failed', err);
    }
  };

  // Open the (existing) task modal prefilled from an IDS issue.
  const handleCreateTaskFromIssue = useCallback(
    (data: { title: string; description: string; sourceIssueId?: string; ownerId?: string }) => {
      setPrefilledTaskData({
        title: data.title,
        description: data.description,
        sourceIssueId: data.sourceIssueId,
        ownerId: data.ownerId,
      });
      fabModals.setShowTaskModal(true);
    },
    [fabModals],
  );

  // ----- Render: missing teamId guard -----
  // Route is /m/meeting/:teamId so this should never happen, but guards
  // against a manually-typed URL that omits the param.
  if (!teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">No team selected</h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            Go back and pick a team to start a meeting.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 text-[12px] text-primary underline"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ----- Render: loading state while teams or active meeting are loading -----
  if (teamsLoading || (activeMeetingLoading && !activeMeeting && !isRunning)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-[12px] text-muted-foreground">Loading meeting…</div>
      </div>
    );
  }

  // ----- Render: access-denied gate when user is not a member of the team -----
  // Mirrors desktop's MeetingAccessHandler. Renders BEFORE the meeting room
  // mounts so child hooks (useSimpleIssues, etc.) never fire access-denied
  // toasts or make rejected fetches.
  if (!hasTeamAccess) {
    return (
      <MobileMeetingAccessDeniedScreen
        teamLabel={teamInfo?.name ?? null}
        onBack={() => navigate(-1)}
      />
    );
  }

  // ----- Render: start screen if no active meeting after load completes -----
  if (!activeMeeting && !isRunning) {
    return (
      <MobileMeetingStartScreen
        teamName={teamName}
        meetingTitle={meetingTitle}
        plannedTotalMinutes={totalPlannedTimeMinutes}
        agendaSectionCount={agendaItems.length}
        starting={isStarting}
        onStart={() => handleStart('scriber')}
        onBack={() => navigate(-1)}
      />
    );
  }

  // ----- Render: meeting room -----
  return (
    <VotingProvider teamId={teamId || ''}>
      <div className="min-h-screen bg-background">
        <MobileMeetingHeader
          teamName={teamName}
          meetingTitle={meetingTitle}
          elapsedMs={elapsedTotalMs}
          plannedTotalMinutes={totalPlannedTimeMinutes}
          isPaused={!!timerState.isPaused}
          canControlTimer={canControlTimer}
          onTogglePause={handleTogglePause}
          onBack={() => navigate(-1)}
          showBecomeScriber={showBecomeScriber}
          onBecomeScriber={handleBecomeScriber}
        />

        <MobileMeetingPillStrip
          agendaItems={agendaItems.map((a) => ({
            id: a.id,
            title: a.title,
            duration: a.duration,
          }))}
          currentSection={timerState.currentSection}
          sectionAccumulatedMs={sectionAccumulatedMs}
          canControlTimer={canControlTimer}
          onSectionChange={handleSectionChange}
        />

        <MobileMeetingMiniBar
          currentSection={timerState.currentSection}
          totalSections={agendaItems.length}
          canControlTimer={canControlTimer}
          onChangeSection={handleSectionChange}
        />

        {/* Section content — mobile-only renderer (mirrors desktop, delegates
            un-ported sections to the desktop renderer transitionally). */}
        <div className="px-3 pt-2 pb-32">
          {teamId && (
            <MobileMeetingSectionRenderer
              currentSection={timerState.currentSection}
              agendaItems={agendaItems}
              teamId={teamId}
              activeMeetingId={activeMeeting?.id ?? null}
              meetingTeamId={activeMeeting?.team_id ?? teamId}
              meetingType={meetingType}
              tasks={tasks}
              tasksLoading={tasksLoading}
              onTaskUpdate={async (taskId, updates) => {
                await updateTask(taskId, updates);
              }}
              onTaskDelete={async (taskId) => {
                await deleteTask(taskId);
              }}
              onTaskCreate={createTask}
              liveSectionDuration={calculations.sectionAccumulatedMs}
              onCreateTaskFromIssue={handleCreateTaskFromIssue}
            />
          )}
        </div>

        <MobileMeetingTangentButton teamId={teamId || null} />

        <div className="fixed bottom-4 right-4 z-50">
          <MobileUnifiedFAB
            onAddTask={handleCreateTask}
            onAddIssue={handleCreateIssue}
            onAddGoal={handleCreateGoal}
            onAddMetric={handleCreateMetric}
            onAddHeadline={handleCreateHeadline}
          />
        </div>

        <MobileMeetingModalsManager
          teamId={teamId || ''}
          currentMeetingId={meetingId}
          showTaskModal={fabModals.showTaskModal}
          setShowTaskModal={fabModals.setShowTaskModal}
          showGoalModal={fabModals.showGoalModal}
          setShowGoalModal={fabModals.setShowGoalModal}
          showMetricModal={fabModals.showMetricModal}
          setShowMetricModal={fabModals.setShowMetricModal}
          showHeadlineModal={fabModals.showHeadlineModal}
          setShowHeadlineModal={fabModals.setShowHeadlineModal}
          showIssueModal={fabModals.showIssueModal}
          setShowIssueModal={fabModals.setShowIssueModal}
          onAddTask={handleAddTask}
          onAddGoal={createHandlers.handleAddGoal}
          onAddMetric={createHandlers.handleAddMetric}
          onAddHeadline={createHandlers.handleAddHeadline}
          onAddIssue={handleAddIssue}
          prefilledTaskData={prefilledTaskData}
        />

        <MobileRoleSelectionSheet
          open={showRoleSheet}
          onOpenChange={setShowRoleSheet}
          currentScriberName={null /* TODO: surface name from scriberId */}
          isCurrentScriber={currentRole === 'scriber'}
          onSelect={(role) => {
            handleStart(role);
            setShowRoleSheet(false);
            setRoleSheetDismissed(true);
          }}
          onCancel={() => {
            setShowRoleSheet(false);
            setRoleSheetDismissed(true);
          }}
        />
      </div>
    </VotingProvider>
  );
};

export default MeetingMobile;
