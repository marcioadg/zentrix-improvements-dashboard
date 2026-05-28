// 🚫 LOCKED: Do not modify this page via Lovable or AI editor

import React, { useState, useEffect, useMemo } from 'react';
import { Users, CheckCircle2 } from 'lucide-react';
import { SectionTimer } from './SectionTimer';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  completed: boolean;
}

interface MeetingAgendaSidebarProps {
  agendaItems: AgendaItem[];
  currentSection: number;
  onSectionChange: (index: number) => void;
  teamName: string;
  sectionDurations: Record<number, number>;
  currentSectionDuration: number;
  teamId: string;
  meetingType?: string;
}

export const MeetingAgendaSidebar: React.FC<MeetingAgendaSidebarProps> = ({
  agendaItems,
  currentSection,
  onSectionChange,
  teamName,
  sectionDurations,
  currentSectionDuration,
  teamId,
  meetingType,
}) => {
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
  
  // Calculate total planned time
  const totalPlannedTimeMinutes = agendaItems.reduce((total, item) => total + item.duration, 0);
  
  const formatDayDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="w-80 bg-background dark:bg-foreground border-r border-border dark:border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border dark:border-border">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-primary dark:text-primary" />
          <h2 className="font-semibold text-foreground dark:text-muted">{teamName}</h2>
        </div>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
          {isAnnualMeeting ? 'Annual Planning Session' : 'Level 10 Meeting™'}
        </p>
      </div>

      {/* Day Tabs for Annual Meetings */}
      {isAnnualMeeting && (
        <div className="flex border-b border-border dark:border-border">
          <button
            onClick={() => setSelectedDay(1)}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
              selectedDay === 1
                ? "border-primary text-primary dark:border-primary dark:text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-muted-foreground"
            )}
          >
            Day 1 ({formatDayDuration(dayTotals.day1)})
          </button>
          <button
            onClick={() => setSelectedDay(2)}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
              selectedDay === 2
                ? "border-primary text-primary dark:border-primary dark:text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-muted-foreground"
            )}
          >
            Day 2 ({formatDayDuration(dayTotals.day2)})
          </button>
        </div>
      )}

      {/* Agenda Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-foreground dark:text-muted-foreground mb-3">
            {isAnnualMeeting 
              ? `Day ${selectedDay} Agenda` 
              : `Agenda (${totalPlannedTimeMinutes} min total)`}
          </h3>
          <div className="space-y-2">
            {displayedItems.map((item) => {
              const index = item.originalIndex;
              const isActive = index === currentSection;
              const isCompleted = index < currentSection;

              logger.log(`MeetingAgendaSidebar: Rendering agenda item ${index} (${item.title}), isActive: ${isActive}, isCompleted: ${isCompleted}`);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    logger.log(`MeetingAgendaSidebar: Clicked section ${index} (${item.title})`);
                    onSectionChange(index);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isActive
                      ? 'bg-primary/10 dark:bg-primary/60 border-primary/30 dark:border-primary text-primary dark:text-primary-foreground hover:bg-primary/20 dark:hover:bg-primary/70'
                      : isCompleted
                      ? 'bg-success/5 dark:bg-green-950/60 border-green-200 dark:border-green-700 text-green-900 dark:text-green-100 hover:bg-success/10 dark:hover:bg-green-900/70'
                      : 'bg-background dark:bg-foreground border-border dark:border-border text-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{item.title}</span>
                    <div className="flex items-center gap-1">
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-success dark:text-green-400" />}
                    </div>
                  </div>
                  
                  {/* Use the array index for SectionTimer - this is the key fix */}
                  <SectionTimer
                    sectionId={index}
                    plannedDurationMinutes={item.duration}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    savedSectionDurations={sectionDurations}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};
