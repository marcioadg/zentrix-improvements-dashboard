
import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { migrateUserWeekStartData, WeekMappingResult } from '@/services/weekMappingService';
import { logger } from '@/utils/logger';

export const useWeekStartMigration = (onMigrationComplete?: () => void) => {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [isMigrating, setIsMigrating] = useState(false);

  const changeWeekStartDay = useCallback(async (
    newWeekStartDay: 'monday' | 'sunday'
  ): Promise<boolean> => {
    logger.log('🚀 useWeekStartMigration: changeWeekStartDay called with:', newWeekStartDay);
    
    if (!user || !settings) {
      logger.error('User or settings not available for migration', { user: !!user, settings: !!settings });
      return false;
    }

    const currentWeekStartDay = settings.week_start_day;
    logger.log('🔄 Current week start day:', currentWeekStartDay, 'New:', newWeekStartDay);
    
    if (currentWeekStartDay === newWeekStartDay) {
      logger.log('✅ No change needed, week start days are the same');
      return true; // No change needed
    }

    setIsMigrating(true);
    logger.log('🔄 Starting migration process...');

    try {
      logger.log(`🔧 Changing week start from ${currentWeekStartDay} to ${newWeekStartDay} for user:`, user.id);

      // First, migrate the data
      const migrationResult: WeekMappingResult = await migrateUserWeekStartData(
        user.id,
        currentWeekStartDay,
        newWeekStartDay
      );

      if (!migrationResult.success) {
        toastRef.current({
          title: "Migration Failed",
          description: `Failed to migrate metric data: ${migrationResult.error}`,
          variant: "destructive"
        });
        return false;
      }

      const settingsUpdated = await updateSettings({
        week_start_day: newWeekStartDay
      });

      if (!settingsUpdated) {
        toastRef.current({
          title: "Settings Update Failed",
          description: "Failed to update week start day setting",
          variant: "destructive"
        });
        return false;
      }

      if (onMigrationComplete) {
        onMigrationComplete();
      }

      if (migrationResult.migratedRecords > 0) {
        toastRef.current({
          title: "Week Start Day Updated",
          description: `Successfully updated week start day and migrated ${migrationResult.migratedRecords} metric records.`,
        });
      } else {
        toastRef.current({
          title: "Week Start Day Updated",
          description: "Week start day updated successfully.",
        });
      }

      return true;

    } catch (error) {
      logger.error('Error changing week start day:', error);
      toastRef.current({
        title: "Error",
        description: "An unexpected error occurred while updating week start day",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsMigrating(false);
    }
  }, [user, settings, updateSettings]);

  return {
    isMigrating,
    changeWeekStartDay
  };
};
