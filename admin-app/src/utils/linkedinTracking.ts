import { logger } from '@/utils/logger';
/**
 * LinkedIn Conversion Tracking
 * 
 * Fires LinkedIn conversion events via the Insight Tag (lintrk).
 */

declare global {
  interface Window {
    lintrk?: (action: string, data: Record<string, unknown>) => void;
  }
}

/**
 * Track a lead conversion on LinkedIn Ads.
 * Call this when a signup/lead form is completed.
 */
export function trackLinkedInLead(): void {
  if (typeof window !== 'undefined' && window.lintrk) {
    window.lintrk('track', { conversion_id: 26115802 });
    logger.log('📘 LinkedIn: Lead conversion event sent');
  }
}
