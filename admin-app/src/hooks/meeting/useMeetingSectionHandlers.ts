
import { useMeeting } from '@/contexts/MeetingContext';
import { logger } from '@/utils/logger';

export const useMeetingSectionHandlers = (
  liveSectionDuration: number,
  setLiveSectionDuration: (duration: number) => void
) => {
  const {
    currentSection,
    sectionDurations,
    updateSectionState
  } = useMeeting();

  // Handler to capture real-time duration updates from individual sections
  const handleSectionDurationUpdate = (sectionIndex: number, duration: number) => {
    logger.log(`useMeetingSectionHandlers: Duration update for section ${sectionIndex}: ${duration}`);
    
    if (sectionIndex === currentSection) {
      // This is the live current section - update live duration
      setLiveSectionDuration(duration);
    }
  };

  // Enhanced section change handler with database persistence and detailed logging
  const handleSectionChange = async (index: number) => {
    logger.log(`useMeetingSectionHandlers: Section change requested from ${currentSection} to ${index}`);
    
    if (currentSection === index) {
      logger.log(`useMeetingSectionHandlers: Already on section ${index}, ignoring`);
      return;
    }
    
    try {
      // Store the final duration of the previous section
      logger.log(`useMeetingSectionHandlers: Storing final duration ${liveSectionDuration} for completed section ${currentSection}`);
      const updatedDurations = {
        ...sectionDurations,
        [currentSection]: liveSectionDuration
      };
      
      // Reset live duration for new section and set new section start time
      setLiveSectionDuration(0);
      const newSectionStartTime = Date.now();
      
      logger.log(`useMeetingSectionHandlers: Calling updateSectionState with:`, {
        newSectionIndex: index,
        newSectionStartTime,
        updatedDurations
      });
      
      // Update state in database and context
      await updateSectionState(index, newSectionStartTime, updatedDurations);
      
      logger.log(`useMeetingSectionHandlers: Successfully switched to section ${index} and persisted to database`);
    } catch (error) {
      logger.error(`useMeetingSectionHandlers: Error switching to section ${index}:`, error);
    }
  };

  return {
    handleSectionDurationUpdate,
    handleSectionChange,
  };
};
