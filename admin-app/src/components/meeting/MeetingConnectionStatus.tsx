
import React from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useMeeting } from '@/contexts/MeetingContext';

interface MeetingConnectionStatusProps {
  isUsingLocalState: boolean;
  syncRetryCount: number;
  isStartingMeeting: boolean;
  startAttempts: number;
  lastError: string | null;
  hasTriedAutoStart: boolean;
  canStartManually: boolean;
  backgroundSyncActive?: boolean;
  isLocalTimerRunning?: boolean;
}

export const MeetingConnectionStatus: React.FC<MeetingConnectionStatusProps> = ({
  isUsingLocalState,
  syncRetryCount,
  isStartingMeeting,
  startAttempts,
  lastError,
  hasTriedAutoStart,
  canStartManually,
  backgroundSyncActive = false,
  isLocalTimerRunning = false
}) => {
  const {
    activeMeetingId,
    isDatabaseConnected,
    diagnosticInfo,
    hasActiveMeeting
  } = useMeeting();

  const getStatusInfo = () => {
    // Starting up
    if (isStartingMeeting) {
      return {
        icon: <div className="animate-spin h-4 w-4 border-2 border-info border-t-transparent rounded-full" />,
        text: `Starting meeting... (attempt ${startAttempts})`,
        className: 'bg-info/10 border-info/30 text-info dark:text-info'
      };
    }

    // Manual start needed (only if no local timer at all)
    if (canStartManually && !diagnosticInfo.localTimerRunning) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        text: 'Meeting needs to be started manually',
        className: 'bg-warning/10 border-warning/30 text-warning dark:text-warning'
      };
    }

    // Timer working perfectly - database synced
    if (diagnosticInfo.localTimerRunning && activeMeetingId && isDatabaseConnected) {
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        text: 'Meeting active and fully synced',
        className: 'bg-success/10 border-success/30 text-success dark:text-success'
      };
    }

    // Timer working - database sync in progress
    if (diagnosticInfo.localTimerRunning && !activeMeetingId && backgroundSyncActive) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        text: 'Timer running - Syncing to database...',
        className: 'bg-info/10 border-info/30 text-info dark:text-info'
      };
    }

    // Timer working - database disconnected but will retry
    if (diagnosticInfo.localTimerRunning && !isDatabaseConnected) {
      return {
        icon: <Clock className="h-4 w-4" />,
        text: 'Timer running - Database offline (auto-retry)',
        className: 'bg-warning/10 border-warning/30 text-warning dark:text-warning'
      };
    }

    // Timer working - database sync has issues but timer continues
    if (diagnosticInfo.localTimerRunning && !activeMeetingId) {
      const retryText = syncRetryCount > 0 ? ` (retry ${syncRetryCount}/3)` : '';
      return {
        icon: <Clock className="h-4 w-4" />,
        text: `Timer running - Sync pending${retryText}`,
        className: 'bg-warning/10 border-warning/30 text-warning dark:text-warning'
      };
    }

    // Database error with local fallback active
    if (lastError && diagnosticInfo.localTimerRunning) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `Timer running - Sync error: ${lastError.substring(0, 30)}${lastError.length > 30 ? '...' : ''}`,
        className: 'bg-warning/10 border-warning/30 text-warning dark:text-warning'
      };
    }

    // Complete failure
    if (lastError && !diagnosticInfo.localTimerRunning) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `Start failed: ${lastError.substring(0, 40)}${lastError.length > 40 ? '...' : ''}`,
        className: 'bg-error/10 border-error/30 text-error dark:text-error'
      };
    }

    // Local mode with sync attempts
    if (isUsingLocalState) {
      return {
        icon: <Clock className="h-4 w-4" />,
        text: syncRetryCount > 0 ? `Local mode - Syncing... (${syncRetryCount}/3)` : 'Local mode - Changes saved locally',
        className: 'bg-warning/10 border-warning/30 text-warning dark:text-warning'
      };
    }

    // Waiting to start (but haven't tried yet)
    if (!hasTriedAutoStart) {
      return {
        icon: <Clock className="h-4 w-4" />,
        text: 'Preparing meeting...',
        className: 'bg-muted border-border text-muted-foreground'
      };
    }

    // Default case - show what we know
    return {
      icon: <WifiOff className="h-4 w-4" />,
      text: hasActiveMeeting ? 'Meeting active' : 'Waiting for meeting to start...',
      className: hasActiveMeeting ? 'bg-success/10 border-success/30 text-success dark:text-success' : 'bg-muted border-border text-muted-foreground'
    };
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  // Enhanced diagnostic info tooltip for debugging
  const diagnosticText = [
    `Local Timer: ${diagnosticInfo.localTimerRunning ? 'Running' : 'Stopped'}`,
    `DB Meeting: ${diagnosticInfo.databaseMeetingExists ? 'Yes' : 'No'}`,
    `Connected: ${isDatabaseConnected ? 'Yes' : 'No'}`,
    `Has Meeting: ${hasActiveMeeting ? 'Yes' : 'No'}`,
    syncRetryCount > 0 ? `Retry: ${syncRetryCount}` : null
  ].filter(Boolean).join(' | ');

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${statusInfo.className}`}
      title={diagnosticText}
    >
      {statusInfo.icon}
      <span>{statusInfo.text}</span>
      {backgroundSyncActive && (
        <span className="text-xs opacity-75 ml-1">(auto-sync)</span>
      )}
      {diagnosticInfo.localTimerRunning && !activeMeetingId && (
        <span className="text-xs opacity-75 ml-1">(local)</span>
      )}
    </div>
  );
};
