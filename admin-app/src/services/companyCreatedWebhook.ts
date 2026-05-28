import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Fire-and-forget webhook for company creation events.
 * Non-blocking - errors are logged but won't affect company creation flow.
 */
export const sendCompanyCreatedWebhook = async (
  companyId: string,
  companyName: string,
  companySlug: string
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.log('No authenticated user for company_created webhook, skipping');
      return;
    }

    logger.log('🏢 Sending company_created webhook:', { companyId, companyName, companySlug });

    // Fire and forget - don't await the result
    supabase.functions.invoke('send-webhook-event', {
      body: {
        event_type: 'company_created',
        company_id: companyId,
        user_id: user.id,
        event_data: {
          company_id: companyId,
          company_name: companyName,
          company_slug: companySlug,
          created_at: new Date().toISOString(),
        },
      },
    }).then(({ data, error }) => {
      if (error) {
        logger.error('❌ company_created webhook error:', error);
      } else if (data?.success) {
        logger.log('✅ company_created webhook sent successfully');
      } else {
        logger.warn('⚠️ company_created webhook returned:', data);
      }
    }).catch((err) => {
      logger.error('❌ company_created webhook failed:', err);
    });
  } catch (error) {
    logger.error('❌ Error preparing company_created webhook:', error);
  }
};
