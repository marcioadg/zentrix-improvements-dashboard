/**
 * Refresh Telemetry System
 * Automatically logs suspected page refresh triggers to Supabase
 * 
 * Usage:
 *   import { logRefreshTrigger } from '@/utils/refreshTelemetry';
 *   logRefreshTrigger('company-switch', { from: oldId, to: newId });
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface RefreshTelemetryEvent {
  source: string;
  metadata?: Record<string, any>;
  url?: string;
  user_id?: string;
  timestamp?: string;
}

/**
 * Log a potential refresh trigger event
 * Sends data to Supabase for analysis
 */
export const logRefreshTrigger = async (
  source: string, 
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const event: RefreshTelemetryEvent = {
      source,
      metadata: metadata || {},
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // Get current user ID if available
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      event.user_id = user.id;
    }

    // Log for immediate visibility
    logger.warn('🔄 REFRESH TRIGGER DETECTED:', {
      source,
      ...metadata,
      timestamp: event.timestamp,
      url: event.url,
    });

    // Send to Supabase (non-blocking)
    // Note: Table will be created via migration if it doesn't exist
    supabase
      .from('refresh_telemetry')
      .insert({
        source: event.source,
        metadata: event.metadata,
        url: event.url,
        user_id: event.user_id,
        created_at: event.timestamp,
      })
      .then(({ error }) => {
        if (error) {
          logger.error('Failed to log refresh telemetry:', error);
        }
      });

  } catch (error) {
    // Fail silently - telemetry should never break the app
    logger.error('Refresh telemetry error:', error);
  }
};

/**
 * Wrap window.location.reload() with telemetry
 */
export const reloadWithTelemetry = (source: string, metadata?: Record<string, any>): void => {
  logRefreshTrigger(source, metadata);
  
  // Small delay to ensure telemetry is sent before reload
  setTimeout(() => {
    window.location.reload();
  }, 100);
};
