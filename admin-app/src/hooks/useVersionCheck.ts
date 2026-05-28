import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const CURRENT_VERSION = "1.2";

/**
 * Checks if the app version in the database differs from the current client version.
 * Returns whether a version mismatch banner should be shown.
 */
export function useVersionCheck() {
  const [showVersionBanner, setShowVersionBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkVersion = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('system_version')
          .eq('setting_key', 'app_version')
          .single();

        if (error) {
          logger.debug('Version check failed:', error.message);
          return;
        }

        if (!cancelled && data?.system_version && data.system_version !== CURRENT_VERSION) {
          setShowVersionBanner(true);
        }
      } catch {
        // Silently handle version check failures — non-critical
      }
    };

    checkVersion();

    return () => {
      cancelled = true;
    };
  }, []);

  return showVersionBanner;
}
