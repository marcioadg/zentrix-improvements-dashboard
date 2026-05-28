import React, { useState, useEffect, useMemo } from 'react';
import { Clock, CheckCircle2, Circle, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

// Format duration in minutes to human-readable (e.g., "2h" for 120min, "1h 30m" for 90min)
const formatPlannedDuration = (minutes: number): string => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMins}m`;
  }
  return `${minutes}m`;
};
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { AgendaItem } from '@/types/meeting';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logger } from '@/utils/logger';

interface TeslaMeetingAgendaProps {
  agendaItems: AgendaItem[];
  currentSection: number;
  onSectionChange: (index: number) => void;
  totalPlannedTimeMinutes: number;
  sectionAccumulatedTimes: Record<number, number>;
  sectionDurations: Record<number, number>;
  currentSectionDuration: number;
  teamId: string;
  meetingType?: string;
}

export const TeslaMeetingAgenda: React.FC<TeslaMeetingAgendaProps> = ({
  agendaItems,
  currentSection,
  onSectionChange,
  totalPlannedTimeMinutes,
  sectionAccumulatedTimes,
  sectionDurations,
  currentSectionDuration,
  teamId,
  meetingType,
}) => {
  const { formatDuration, isRunning, timerState } = useNewMeetingTimer();
  
  const isAnnualMeeting = meetingType === 'annual';
  
  // For annual meetings: Day 1 = sections 0-6, Day 2 = sections 7-12
  const DAY_1_END_INDEX = 6;
  
  // Auto-detect which day based on current section
  const getCurrentDay = () => currentSection > DAY_1_END_INDEX ? 2 : 1;
  const [selectedDay, setSelectedDay] = useState(getCurrentDay);
  
  // Update selected day when currentSection changes
  useEffect(() => {
    if (isAnnualMeeting) {
      setSelectedDay(getCurrentDay());
    }
  }, [currentSection, isAnnualMeeting]);
  
  // Filter agenda items based on selected day for annual meetings
  const displayedItems = useMemo(() => {
    if (!isAnnualMeeting) return agendaItems.map((item, index) => ({ ...item, originalIndex: index }));
    
    return agendaItems
      .map((item, index) => ({ ...item, originalIndex: index }))
      .filter((_, index) => {
        if (selectedDay === 1) return index <= DAY_1_END_INDEX;
        return index > DAY_1_END_INDEX;
      });
  }, [agendaItems, isAnnualMeeting, selectedDay]);
  
  // Calculate per-day totals for annual meetings
  const dayTotals = useMemo(() => {
    if (!isAnnualMeeting) return { day1: 0, day2: 0 };
    
    const day1Minutes = agendaItems
      .slice(0, DAY_1_END_INDEX + 1)
      .reduce((total, item) => total + item.duration, 0);
    const day2Minutes = agendaItems
      .slice(DAY_1_END_INDEX + 1)
      .reduce((total, item) => total + item.duration, 0);
    
    return { day1: day1Minutes, day2: day2Minutes };
  }, [agendaItems, isAnnualMeeting]);
  
  const formatDayDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleSectionClick = (index: number) => {
    logger.log('🎯 TeslaMeetingAgenda: Section clicked', { index, currentSection, isPaused: timerState.isPaused });
    
    // Block section changes when paused
    if (timerState.isPaused) {
      logger.log('🚫 TeslaMeetingAgenda: Section change blocked - meeting is paused');
      return;
    }
    
    if (index !== currentSection) {
      onSectionChange(index);
    }
  };

  const getSectionDuration = (index: number) => {
    if (index === currentSection) {
      // For the active section, currentSectionDuration already includes accumulated time
      return currentSectionDuration;
    }
    // For inactive sections, show their accumulated time
    return sectionAccumulatedTimes[index] || 0;
  };

  const isOvertime = (index: number, plannedDurationMs: number) => {
    const actualDuration = getSectionDuration(index);
    return actualDuration > plannedDurationMs;
  };

  return (
    <div className="bg-card rounded-lg border border-border/50 p-5">
      <div className="mb-5">
        <h3 className="font-medium text-foreground mb-1">
          {isAnnualMeeting ? 'Annual Planning Agenda' : 'Agenda'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isAnnualMeeting 
            ? `Day ${selectedDay} • ${formatDayDuration(selectedDay === 1 ? dayTotals.day1 : dayTotals.day2)}`
            : totalPlannedTimeMinutes > 59 
              ? `${Math.floor(totalPlannedTimeMinutes / 60)}h ${totalPlannedTimeMinutes % 60 > 0 ? `${totalPlannedTimeMinutes % 60}m` : ''} planned`
              : `${totalPlannedTimeMinutes} minutes planned`
          }
        </p>
      </div>

      {/* Day Tabs for Annual Meetings */}
      {isAnnualMeeting && (
        <div className="flex border-b border-border mb-4">
          <button
            onClick={() => setSelectedDay(1)}
            className={cn(
              "flex-1 py-2 text-xs font-medium border-b-2 transition-colors",
              selectedDay === 1
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Day 1
          </button>
          <button
            onClick={() => setSelectedDay(2)}
            className={cn(
              "flex-1 py-2 text-xs font-medium border-b-2 transition-colors",
              selectedDay === 2
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Day 2
          </button>
        </div>
      )}

      <div className="space-y-1">
        {displayedItems.map((item) => {
          const index = item.originalIndex;
          const isActive = index === currentSection;
          const isCompleted = index < currentSection;
          const duration = getSectionDuration(index);
          const plannedDurationMs = item.duration * 60 * 1000;
          const overtime = isOvertime(index, plannedDurationMs);

          const buttonContent = (
            <button
              key={item.id}
              onClick={() => handleSectionClick(index)}
              disabled={!isRunning || timerState.isPaused}
              className={`group w-full text-left p-3 rounded-md transition-all duration-200 relative ${
                isActive
                  ? 'bg-primary/5 border-l-2 border-l-primary text-foreground'
                  : isCompleted
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-l-2 border-l-emerald-400 dark:border-l-emerald-600 text-foreground hover:bg-emerald-50 dark:hover:bg-emerald-900/50'
                  : 'hover:bg-muted/50 border-l-2 border-l-transparent text-muted-foreground hover:text-foreground'
              } ${!isRunning || timerState.isPaused ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{item.title}</span>
                <div className="flex items-center gap-1.5">
                  {isCompleted ? (
                    <div className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
                  ) : isActive ? (
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  ) : (
                    <div className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full" />
                  )}
                  {timerState.isPaused && isActive && (
                    <Pause className="h-3 w-3 text-orange-500" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatPlannedDuration(item.duration)}
                </span>
                {duration > 0 && (
                  <span className={`font-mono font-medium ${
                    overtime ? 'text-destructive' : isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {formatDuration(duration)}
                    {overtime && (
                      <span className="ml-1 text-destructive">•</span>
                    )}
                  </span>
                )}
              </div>

              {isActive && (
                <div className="mt-2 w-full bg-muted/30 rounded-full h-0.5">
                  <div
                    className={`h-0.5 rounded-full transition-all duration-300 ${
                      overtime ? 'bg-destructive' : 'bg-primary'
                    }`}
                    style={{
                      width: `${Math.min((duration / plannedDurationMs) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </button>
          );

          // Wrap with tooltip if meeting is paused and button is disabled
          if (timerState.isPaused && (!isRunning || timerState.isPaused)) {
            return (
              <TooltipProvider key={item.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {buttonContent}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Resume the meeting to change sections</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return buttonContent;
        })}
      </div>
    </div>
  );
};