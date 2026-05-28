import React from 'react';
import { Clock, Users, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { ScribeManager } from './ScribeManager';
import { MinimalTimerDisplay } from './MinimalTimerDisplay';
import { useParams } from 'react-router-dom';

export const MeetingHeader: React.FC = () => {
  const { 
    isRunning,
    currentRole,
    scriberId,
    currentUserId,
    calculations,
    formatDuration 
  } = useNewMeetingTimer();
  
  const { teamId } = useParams<{ teamId: string }>();

  if (!isRunning) {
    return null;
  }

  const isCurrentUserScriber = currentUserId === scriberId;

  return (
    <div className="bg-background/80 backdrop-blur-sm border-b border-border/20 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Section timer and status */}
        <div className="flex items-center gap-4">
          <MinimalTimerDisplay variant="header" />
        </div>

        {/* Role and scriber controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge 
              variant={isCurrentUserScriber ? "default" : "outline"}
              className="text-xs px-2 py-1 font-medium"
            >
              {isCurrentUserScriber ? (
                <div className="flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Scriber
                </div>
              ) : (
                "Participant"
              )}
            </Badge>
          </div>

          {/* Scriber Manager */}
          {teamId && <ScribeManager teamId={teamId} />}
        </div>
      </div>
    </div>
  );
};