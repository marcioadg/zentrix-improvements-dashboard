import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const cleanupAuthState = () => {
  try {
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');

    // Remove all Supabase auth keys from localStorage
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    }

    // Remove from sessionStorage if in use
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {}
  } catch (e) {
    logger.warn('cleanupAuthState: error while cleaning storage', e);
  }
};

export const robustSignOut = async () => {
  logger.log('🔒 robustSignOut: starting sign out and cleanup');
  cleanupAuthState();
  try {
    await supabase.auth.signOut({ scope: 'global' as any });
    logger.log('✅ robustSignOut: global signOut completed');
  } catch (err) {
    logger.warn('⚠️ robustSignOut: signOut failed (continuing):', err);
  }
  // Extra cleanup just in case
  cleanupAuthState();
};
