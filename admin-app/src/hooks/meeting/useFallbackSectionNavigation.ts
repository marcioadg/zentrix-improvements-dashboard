
import { useState, useCallback, useEffect } from 'react';
import { useMeeting } from '@/contexts/MeetingContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useFallbackSectionNavigation = () => {
  const [localCurrentSection, setLocalCurrentSection] = useState(0);
  const [localSectionDurations, setLocalSectionDurations] = useState<Record<number, number>>({});
  const [syncRetryCount, setSyncRetryCount] = useState(0);
  
  const { 
    activeMeetingId, 
    updateSectionState, 
    currentSection, 
    sectionDurations, 
    currentTime,
    getEffectiveSectionStartTime,
    hasActiveMeeting
  } = useMeeting();
  const { toast } = useToast();

  const MAX_SYNC_RETRIES = 3;

  // Use database state if available, otherwise use local state
  const effectiveCurrentSection = hasActiveMeeting ? currentSection : localCurrentSection;
  const effectiveSectionDurations = hasActiveMeeting ? sectionDurations : localSectionDurations;

  const syncWithDatabase = useCallback(async (
    sectionIndex: number, 
    sectionStartTime: number, 
    durations: Record<number, number>
  ) => {
    if (!activeMeetingId) {
      logger.log('useFallbackSectionNavigation: No activeMeetingId, using local state only');
      return false;
    }

    try {
      logger.log('useFallbackSectionNavigation: Attempting database sync');
      await updateSectionState(sectionIndex, sectionStartTime, durations);
      logger.log('useFallbackSectionNavigation: Database sync successful');
      setSyncRetryCount(0);
      return true;
    } catch (error) {
      logger.error('useFallbackSectionNavigation: Database sync failed:', error);
      
      if (syncRetryCount < MAX_SYNC_RETRIES) {
        setSyncRetryCount(prev => prev + 1);
        setTimeout(() => {
          syncWithDatabase(sectionIndex, sectionStartTime, durations);
        }, 1000);
      } else {
        toast({
          title: "Sync Warning",
          description: "Section changes are saved locally but couldn't sync with server.",
          variant: "destructive",
        });
      }
      return false;
    }
  }, [activeMeetingId, updateSectionState, syncRetryCount, toast]);

  const handleSectionChange = useCallback(async (
    newSectionIndex: number,
    currentSectionDuration: number
  ) => {
    logger.log('useFallbackSectionNavigation: Handling section change', {
      from: effectiveCurrentSection,
      to: newSectionIndex,
      currentSectionDuration,
      hasActiveMeeting
    });

    if (effectiveCurrentSection === newSectionIndex) {
      return;
    }

    // Update local state immediately for responsive UI
    const validatedCurrentDuration = Math.max(0, isFinite(currentSectionDuration) ? currentSectionDuration : 0);
    const updatedDurations = {
      ...effectiveSectionDurations,
      [effectiveCurrentSection]: validatedCurrentDuration
    };

    setLocalCurrentSection(newSectionIndex);
    setLocalSectionDurations(updatedDurations);

    // Use guaranteed effective time for new section start
    const newSectionStartTime = currentTime;

    logger.log('useFallbackSectionNavigation: Local state updated', {
      newSection: newSectionIndex,
      newStartTime: newSectionStartTime,
      updatedDurations
    });

    // Attempt to sync with database if we have an active meeting
    if (hasActiveMeeting && activeMeetingId) {
      syncWithDatabase(newSectionIndex, newSectionStartTime, updatedDurations);
    }
  }, [effectiveCurrentSection, effectiveSectionDurations, hasActiveMeeting, activeMeetingId, currentTime, syncWithDatabase]);

  const getCurrentSectionDuration = useCallback(() => {
    // Use guaranteed effective section start time - never null
    const effectiveSectionStartTime = getEffectiveSectionStartTime();
    const duration = currentTime - effectiveSectionStartTime;
    const validDuration = Math.max(0, duration);
    
    logger.log('useFallbackSectionNavigation: getCurrentSectionDuration', {
      currentTime,
      effectiveSectionStartTime,
      duration,
      validDuration
    });
    
    return validDuration;
  }, [getEffectiveSectionStartTime, currentTime]);

  return {
    currentSection: effectiveCurrentSection,
    sectionDurations: effectiveSectionDurations,
    sectionStartTime: getEffectiveSectionStartTime(),
    handleSectionChange,
    getCurrentSectionDuration,
    isUsingLocalState: !hasActiveMeeting,
    syncRetryCount
  };
};
