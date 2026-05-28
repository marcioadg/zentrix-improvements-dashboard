
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

// DEPRECATED: Use NewMeetingTimerContext instead
// This context is being phased out in favor of NewMeetingTimerContext
// @deprecated

interface MeetingTimerContextType {
  isRunning: boolean;
  currentSection: number;
  totalSections: number;
  sectionDurations: Record<number, number>;
  currentSectionDuration: number;
  isPaused: boolean;
  isScriber: boolean;
  meetingId: string | null;
  canControlTimer: boolean;
  getCurrentSectionDuration: () => number;
  getOverallDuration: () => number;
  formatDuration: (ms: number) => string;
  startMeeting: (teamId: string, role: 'scriber' | 'participant') => Promise<void>;
  endMeeting: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  nextSection: () => void;
  previousSection: () => void;
  goToSection: (sectionIndex: number) => void;
  scriberId: string | null;
}

const MeetingTimerContext = createContext<MeetingTimerContextType | null>(null);

export const useMeetingTimer = () => {
  // Add deprecation warning
  logger.warn(
    'DEPRECATED: useMeetingTimer() is deprecated. Please use useNewMeetingTimer() from NewMeetingTimerContext instead.'
  );
  
  const context = useContext(MeetingTimerContext);
  if (!context) {
    throw new Error('useMeetingTimer must be used within MeetingTimerProvider');
  }
  return context;
};

interface MeetingTimerProviderProps {
  children: ReactNode;
}

export const MeetingTimerProvider: React.FC<MeetingTimerProviderProps> = ({ children }) => {
  // DEPRECATED: This entire provider is deprecated
  logger.warn(
    'DEPRECATED: MeetingTimerProvider is deprecated. Please use NewMeetingTimerProvider instead.'
  );

  const { user } = useAuth();
  const { toast } = useToast();
  
  // Minimal implementation to prevent breaking existing code
  const [isRunning, setIsRunning] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionDurations, setSectionDurations] = useState<Record<number, number>>({});
  const [currentSectionDuration, setCurrentSectionDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [scriberId, setScriberId] = useState<string | null>(null);

  const totalSections = 7; // Standard L10 sections
  const isScriber = user?.id === scriberId;
  const canControlTimer = isScriber;

  const getCurrentSectionDuration = useCallback(() => currentSectionDuration, [currentSectionDuration]);
  const getOverallDuration = useCallback(() => {
    return Object.values(sectionDurations).reduce((total, duration) => total + duration, 0) + currentSectionDuration;
  }, [sectionDurations, currentSectionDuration]);

  const formatDuration = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const startMeeting = useCallback(async (teamId: string, role: 'scriber' | 'participant') => {
    logger.warn('DEPRECATED: Please use NewMeetingTimerContext.startMeeting() instead');
    // Minimal implementation
    setIsRunning(true);
    if (role === 'scriber') {
      setScriberId(user?.id || null);
    }
  }, [user?.id]);

  const endMeeting = useCallback(() => {
    logger.warn('DEPRECATED: Please use NewMeetingTimerContext.endMeeting() instead');
    setIsRunning(false);
    setCurrentSection(0);
    setSectionDurations({});
    setCurrentSectionDuration(0);
    setMeetingId(null);
    setScriberId(null);
  }, []);

  const pauseTimer = useCallback(() => {
    logger.warn('DEPRECATED: Please use NewMeetingTimerContext.pauseTimer() instead');
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    logger.warn('DEPRECATED: Please use NewMeetingTimerContext.resumeTimer() instead');
    setIsPaused(false);
  }, []);

  const nextSection = useCallback(() => {
    logger.warn('DEPRECATED: Please use NewMeetingTimerContext.changeSection() instead');
    if (currentSection < totalSections - 1) {
      setCurrentSection(prev => prev + 1);
    }
  }, [currentSection, totalSections]);

  const previousSection = useCallback(() => {
    logger.warn('DEPRECATED: Please use NewMeetingTimerContext.changeSection() instead');
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
    }
  }, [currentSection]);

  const goToSection = useCallback((sectionIndex: number) => {
    logger.warn('DEPRECATED: Please use NewMeetingTimerContext.changeSection() instead');
    if (sectionIndex >= 0 && sectionIndex < totalSections) {
      setCurrentSection(sectionIndex);
    }
  }, [totalSections]);

  const value: MeetingTimerContextType = {
    isRunning,
    currentSection,
    totalSections,
    sectionDurations,
    currentSectionDuration,
    isPaused,
    isScriber,
    meetingId,
    canControlTimer,
    getCurrentSectionDuration,
    getOverallDuration,
    formatDuration,
    startMeeting,
    endMeeting,
    pauseTimer,
    resumeTimer,
    nextSection,
    previousSection,
    goToSection,
    scriberId,
  };

  return (
    <MeetingTimerContext.Provider value={value}>
      {children}
    </MeetingTimerContext.Provider>
  );
};
