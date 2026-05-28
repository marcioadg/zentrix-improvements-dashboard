
import { supabase } from '@/integrations/supabase/client';
import { getWeekStart } from '@/lib/weekUtils';
import { logger } from '@/utils/logger';

export interface WeekMappingResult {
  success: boolean;
  migratedRecords: number;
  error?: string;
}

/**
 * Maps a date from one week start system to another
 * @param originalDate The original week start date
 * @param fromWeekStart The original week start system ('monday' | 'sunday')
 * @param toWeekStart The target week start system ('monday' | 'sunday')
 * @returns The new week start date in the target system
 */
export const mapWeekStartDate = (
  originalDate: string,
  fromWeekStart: 'monday' | 'sunday',
  toWeekStart: 'monday' | 'sunday'
): string => {
  logger.log(`🔄 Mapping week start: ${originalDate} from ${fromWeekStart} to ${toWeekStart}`);
  
  // Always return the same date - Sunday and Monday should show the same data
  // regardless of week start preference
  logger.log(`🔄 Keeping same date for consistent data: ${originalDate}`);
  return originalDate;
};

/**
 * Migrates all weekly metrics for a user from one week start system to another
 */
export const migrateUserWeekStartData = async (
  userId: string,
  fromWeekStart: 'monday' | 'sunday',
  toWeekStart: 'monday' | 'sunday'
): Promise<WeekMappingResult> => {
  if (fromWeekStart === toWeekStart) {
    return { success: true, migratedRecords: 0 };
  }

  try {
    logger.log(`Migrating metrics from ${fromWeekStart} to ${toWeekStart} for user:`, userId);

    // Get all metrics for this user
    const { data: metrics, error: fetchError } = await supabase
      .from('weekly_metrics')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (fetchError) {
      logger.error('Error fetching metrics for migration:', fetchError);
      return { success: false, migratedRecords: 0, error: fetchError.message };
    }

    if (!metrics || metrics.length === 0) {
      return { success: true, migratedRecords: 0 };
    }

    // Group metrics by their new week start dates to handle potential conflicts
    const migrationMap = new Map<string, any[]>();
    
    metrics.forEach(metric => {
      const newWeekStart = mapWeekStartDate(metric.week_start_date, fromWeekStart, toWeekStart);
      const key = `${metric.metric_name}-${metric.owner_id}-${newWeekStart}`;
      
      if (!migrationMap.has(key)) {
        migrationMap.set(key, []);
      }
      migrationMap.get(key)!.push({
        ...metric,
        new_week_start_date: newWeekStart
      });
    });

    // Process migrations - for conflicts, we'll keep the most recent value
    const updatePromises: Promise<any>[] = [];
    let migratedRecords = 0;

    migrationMap.forEach((conflictingMetrics, key) => {
      if (conflictingMetrics.length === 1) {
        // Simple case - no conflict
        const metric = conflictingMetrics[0];
        if (metric.week_start_date !== metric.new_week_start_date) {
          updatePromises.push(
            Promise.resolve(
              supabase
                .from('weekly_metrics')
                .update({ week_start_date: metric.new_week_start_date })
                .eq('id', metric.id)
            )
          );
          migratedRecords++;
        }
      } else {
        // Conflict case - multiple metrics map to the same new week
        // Keep the most recent one and delete the others
        const sortedMetrics = conflictingMetrics.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        
        const keepMetric = sortedMetrics[0];
        const deleteMetrics = sortedMetrics.slice(1);

        // Update the kept metric with new week start
        if (keepMetric.week_start_date !== keepMetric.new_week_start_date) {
          updatePromises.push(
            Promise.resolve(
              supabase
                .from('weekly_metrics')
                .update({ week_start_date: keepMetric.new_week_start_date })
                .eq('id', keepMetric.id)
            )
          );
          migratedRecords++;
        }

        // Soft delete the conflicting metrics
        deleteMetrics.forEach(metric => {
          updatePromises.push(
            Promise.resolve(
              supabase
                .from('weekly_metrics')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', metric.id)
            )
          );
        });
      }
    });

    // Execute all updates
    const results = await Promise.all(updatePromises);
    
    // Check for any errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      logger.error('Migration errors:', errors);
      return { 
        success: false, 
        migratedRecords: 0, 
        error: `Failed to migrate ${errors.length} records` 
      };
    }

    logger.log(`Successfully migrated ${migratedRecords} metrics`);
    return { success: true, migratedRecords };

  } catch (error) {
    logger.error('Migration error:', error);
    return { 
      success: false, 
      migratedRecords: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
