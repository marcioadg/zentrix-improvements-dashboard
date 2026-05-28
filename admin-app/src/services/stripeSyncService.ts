import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Sync MRR data from Stripe to Supabase
 */
export const syncStripeMRR = async (): Promise<{ success: boolean; error?: string; updatedCount?: number }> => {
  try {
    logger.info('Starting Stripe MRR sync...');

    const { data, error } = await supabase.functions.invoke('sync-stripe-mrr', {
      body: {},
    });

    if (error) {
      logger.error('Error calling sync-stripe-mrr function:', error);
      return { success: false, error: error.message };
    }

    logger.info('Stripe MRR sync completed:', data);
    return { 
      success: true, 
      updatedCount: data?.details?.updatedCount || 0 
    };
  } catch (error: any) {
    logger.error('Error in syncStripeMRR:', error);
    return { success: false, error: error.message };
  }
};
