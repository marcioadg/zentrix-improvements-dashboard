
import React, { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreateDropdown } from '@/components/CreateDropdown';
import { MeetingAttendees } from '@/components/meeting/MeetingAttendees';
import { EndMeetingButton } from '@/components/meeting/EndMeetingButton';
import { VotingSettingsModal } from '@/components/modals/VotingSettingsModal';
import { TangentAlertButton } from '@/components/meeting/TangentAlertButton';
import { TangentAlertOverlay } from '@/components/meeting/TangentAlertOverlay';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MeetingToolsDropdown } from '@/components/meeting/MeetingToolsDropdown';
import { Badge } from '@/components/ui/badge';
import FloatingActionMenu from '@/components/ui/floating-action-menu';
import { Clock, AlertTriangle, Crown, Pause, Play, Target, ListTodo, BarChart3, Newspaper, Radio } from 'lucide-react';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useTangentAlert } from '@/hooks/meeting/useTangentAlert';
import { playTangentAlertSound } from '@/utils/tangentAlertSound';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMeetingTranscription } from '@/hooks/meeting/useMeetingTranscription';
import { logger } from '@/utils/logger';

interface MeetingLayoutProps {
  children: React.ReactNode;
  teamId: string;
  teamName: string;
  meetingTitle?: string;
  totalPlannedTimeMinutes: number;
  sectionDurations: Record<number, number>;
  currentSectionDuration: number;
  onCreateTask: () => void;
  onCreateGoal: () => void;
  onCreateMetric: () => void;
  onCreateHeadline: () => void;
  onCreateIssue?: () => void;
}

export const MeetingLayout: React.FC<MeetingLayoutProps> = memo(({
  children,
  teamId,
  teamName,
  meetingTitle,
  totalPlannedTimeMinutes,
  sectionDurations,
  currentSectionDuration,
  onCreateTask,
  onCreateGoal,
  onCreateMetric,
  onCreateHeadline,
  onCreateIssue
}) => {
  const {
    isRunning,
    calculations,
    formatDuration,
    currentUserId,
    scriberId,
    timerState,
    pauseTimer,
    resumeTimer
  } = useNewMeetingTimer();
  const [showVotingSettings, setShowVotingSettings] = useState(false);
  const [showTangentAlert, setShowTangentAlert] = useState(false);
  const { currentCompany } = useMultiCompany();
  const isAiTranscriptionEnabled = currentCompany?.ai_meeting_transcription === true;
  const { isRecording: isTranscribing, error: transcriptionError } = useMeetingTranscription(teamId);

  // Tangent alert functionality
  const handleTangentAlert = () => {
    logger.log('🚨 TANGENT ALERT: Triggered in meeting');
    setShowTangentAlert(true);
    playTangentAlertSound();
    setTimeout(() => setShowTangentAlert(false), 2500);
  };

  const { triggerTangentAlert, isInCooldown, cooldownMs } = useTangentAlert(
    teamId,
    handleTangentAlert
  );
  const isCurrentUserScriber = currentUserId === scriberId;
  const totalPlannedTimeMs = totalPlannedTimeMinutes * 60 * 1000;
  const actualOverallDuration = isRunning ? calculations.activeDurationMs : 0;
  const isOverallOvertime = actualOverallDuration > totalPlannedTimeMs;

  const handleOpenVotingSettings = () => {
    setShowVotingSettings(true);
  };

  const handleTogglePause = () => {
    if (timerState.isPaused) {
      resumeTimer();
    } else {
      pauseTimer('break');
    }
  };

  // Floating action menu options for meetings
  const floatingMenuOptions = [
    {
      label: "Create Issue",
      Icon: <AlertTriangle className="w-4 h-4" />,
      onClick: onCreateIssue || (() => {}),
    },
    {
      label: "Create Task",
      Icon: <ListTodo className="w-4 h-4" />,
      onClick: onCreateTask,
    },
    {
      label: "Create Goal",
      Icon: <Target className="w-4 h-4" />,
      onClick: onCreateGoal,
    },
    {
      label: "Create Metric",
      Icon: <BarChart3 className="w-4 h-4" />,
      onClick: onCreateMetric,
    },
    {
      label: "Create Headline",
      Icon: <Newspaper className="w-4 h-4" />,
      onClick: onCreateHeadline,
    },
  ];

  return <>
      <div className="h-screen bg-background flex flex-col">
        {/* Modern Linear App-style header - STICKY */}
        <div className="shrink-0 sticky top-0 z-50 bg-background border-b border-border/20 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Team name and meeting status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-foreground tracking-tight">
                  {meetingTitle || teamName}
                </h1>
                {isRunning && <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-md border border-emerald-200/40 dark:border-emerald-800/40">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Live</span>
                  </div>}
              </div>
              
              {/* Meeting progress indicator */}
              {isRunning && <div className="h-6 w-px bg-border/40" />}
              
              {/* Timer and status */}
              {isRunning && calculations && <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    
                    <span className="font-mono text-sm text-foreground">
                      {formatDuration(calculations.activeDurationMs)}
                    </span>
                    <Button onClick={handleTogglePause} variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted/50">
                      {timerState.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    </Button>
                  </div>
                  
                  {totalPlannedTimeMinutes > 0 && <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${calculations.activeDurationMs / (totalPlannedTimeMinutes * 60 * 1000) > 1 ? 'bg-destructive' : 'bg-emerald-500'}`} style={{
                    width: `${Math.min(100, calculations.activeDurationMs / (totalPlannedTimeMinutes * 60 * 1000) * 100)}%`
                  }} />
                      </div>
                      
                    </div>}
                  
                  {/* Scriber badge to the right of progress bar */}
                  <div className="flex items-center gap-2">
                    
                  </div>
                </div>}
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
              {isAiTranscriptionEnabled && isRunning && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 border border-destructive/20">
                      <Radio className={`h-3 w-3 text-destructive ${isTranscribing ? 'animate-pulse' : 'opacity-50'}`} />
                      <span className="text-xs font-medium text-destructive">
                        {isTranscribing ? 'REC' : 'MIC...'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{transcriptionError || (isTranscribing ? 'AI transcription is active — this meeting is being recorded' : 'Requesting microphone access...')}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <MeetingToolsDropdown />
              <MeetingAttendees teamId={teamId} />
              <div className="h-5 w-px bg-border/30" />
              <ThemeToggle />
              <EndMeetingButton teamId={teamId} />
            </div>
          </div>
        </div>
        
        {/* Content area with space for fixed elements */}
        <div className="flex-1 overflow-y-auto px-6 pb-20 min-h-0">
          {children}
        </div>
      </div>

      {/* Voting Settings Modal */}
      <VotingSettingsModal open={showVotingSettings} onOpenChange={setShowVotingSettings} />
      
      {/* Tangent Alert Overlay */}
      <TangentAlertOverlay isVisible={showTangentAlert} />
      
      {/* Tangent Alert Button - to the left of create menu */}
      <div className="fixed bottom-8 right-36 z-[70]">
        <TangentAlertButton 
          onTriggerAlert={triggerTangentAlert}
          isInCooldown={isInCooldown}
          cooldownMs={cooldownMs}
        />
      </div>
      
      {/* Floating Action Menu - adjusted positioning */}
      <div className="fixed bottom-8 right-8 z-[70]">
        <FloatingActionMenu options={floatingMenuOptions} />
      </div>
    </>;
});

MeetingLayout.displayName = 'MeetingLayout';
