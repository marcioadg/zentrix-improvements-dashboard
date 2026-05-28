
import { useCallback } from 'react';
import { useFallbackSectionNavigation } from './useFallbackSectionNavigation';
import { logger } from '@/utils/logger';

export const useEnhancedMeetingSectionHandlers = (
  liveSectionDuration: number,
  setLiveSectionDuration: (duration: number) => void
) => {
  const {
    currentSection,
    sectionDurations,
    sectionStartTime,
    handleSectionChange: fallbackHandleSectionChange,
    getCurrentSectionDuration,
    isUsingLocalState,
    syncRetryCount
  } = useFallbackSectionNavigation();

  const handleSectionDurationUpdate = useCallback((sectionIndex: number, duration: number) => {
    logger.log(`🔄 useEnhancedMeetingSectionHandlers: Section ${sectionIndex} duration update: ${duration}ms`);
    
    // Simple validation - just ensure non-negative
    const validatedDuration = Math.max(0, duration || 0);
    
    if (sectionIndex === currentSection) {
      setLiveSectionDuration(validatedDuration);
    }
  }, [currentSection, setLiveSectionDuration]);

  const handleSectionChange = useCallback(async (newSectionIndex: number) => {
    logger.log(`🔄 useEnhancedMeetingSectionHandlers: Section change requested from ${currentSection} to ${newSectionIndex}`);
    
    const currentSectionDuration = getCurrentSectionDuration();
    logger.log(`🔄 useEnhancedMeetingSectionHandlers: Current section duration: ${currentSectionDuration}ms`);
    
    // Reset live section duration when changing sections
    setLiveSectionDuration(0);
    
    // Use fallback navigation
    await fallbackHandleSectionChange(newSectionIndex, currentSectionDuration);
  }, [currentSection, getCurrentSectionDuration, setLiveSectionDuration, fallbackHandleSectionChange]);

  return {
    currentSection,
    sectionDurations,
    sectionStartTime,
    handleSectionChange,
    handleSectionDurationUpdate,
    isUsingLocalState,
    syncRetryCount
  };
};
