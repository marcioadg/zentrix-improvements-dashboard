import { supabase } from '@/integrations/supabase/client';
import type { CustomerSuccessData, CustomerSuccessRow } from '@/types/customerSuccess';
import type { CompanyStats } from '@/types/superAdmin';
import { logger } from '@/utils/logger';
import { calculateHealthScore, HealthScoreBreakdown } from '@/utils/companyHealthScore';

/**
 * Calculate customer tier based on MRR
 * Tier 1: Top tier (highest MRR)
 * Tier 2: Mid tier
 * Tier 3: Lower tier
 */
export const calculateCustomerTier = (mrr: number): 1 | 2 | 3 => {
  if (mrr >= 500) return 1; // Tier 1: $500+ MRR
  if (mrr >= 100) return 2; // Tier 2: $100-$499 MRR
  return 3; // Tier 3: < $100 MRR
};

/**
 * Map health score label to Customer Health option value
 * Mapping:
 * - Excellent (85+) → Healthy
 * - Good (70-84) → Fine
 * - Fair (55-69) → Not bad/ Not good
 * - At Risk (40-54) → Not Good
 * - Critical (0-39) → Unhealthy
 */
export const mapHealthScoreToCustomerHealth = (
  healthScore: HealthScoreBreakdown
): string => {
  switch (healthScore.label) {
    case 'Excellent':
      return 'Healthy';
    case 'Good':
      return 'Fine';
    case 'Fair':
      return 'Not bad/ Not good';
    case 'At Risk':
      return 'Not Good';
    case 'Critical':
      return 'Unhealthy';
    default:
      return 'Not bad/ Not good';
  }
};

/**
 * Calculate red flags for a company based on usage and subscription data
 */
export const calculateRedFlags = (
  company: CompanyStats,
  subscription: any
): string[] => {
  const redFlags: string[] = [];
  const now = new Date();

  // Check login recency
  if (company.last_login_at) {
    const daysSinceLogin = Math.floor(
      (now.getTime() - new Date(company.last_login_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLogin > 14) redFlags.push('No login in 14+ days');
  } else {
    redFlags.push('Never logged in');
  }

  // Check usage
  const usageHours = company.usage_hours_7d || 0;
  if (usageHours === 0) redFlags.push('Zero usage this week');

  // Check trial status - only flag if trial expired AND not subscribed
  if (subscription?.trial_end && !subscription.subscribed) {
    const trialEnd = new Date(subscription.trial_end);
    const daysUntilExpiry = Math.floor(
      (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      redFlags.push('Trial expiring soon');
    } else if (daysUntilExpiry <= 0) {
      redFlags.push('Trial expired');
    }
  }

  // Check user adoption
  if (company.pending_user_count > company.user_count) {
    redFlags.push('Low user adoption');
  }

  return redFlags;
};

/**
 * Generate a fluid, natural explanation of why the customer has their health status
 */
export const generateHealthExplanation = (
  healthScore: HealthScoreBreakdown,
  company: CompanyStats,
  redFlags: string[]
): string => {
  const score = healthScore.total;
  const usageHours = company.usage_hours_7d || 0;
  
  // Critical health (0-39)
  if (score < 40) {
    if (healthScore.recency === 0) {
      return "This account shows no recent activity and may need immediate outreach to prevent churn.";
    }
    if (usageHours === 0) {
      return "Despite having access, this team isn't using the platform. Consider a re-engagement call.";
    }
    if (company.pending_user_count > company.user_count) {
      return "Most invited users haven't joined yet, suggesting onboarding friction.";
    }
    return "Multiple warning signs indicate this account needs attention soon.";
  }
  
  // At Risk (40-54)
  if (score < 55) {
    if (healthScore.recency < 20) {
      return "Activity has dropped recently. A quick check-in could help identify any blockers.";
    }
    if (usageHours < 2) {
      return "Usage is lower than expected. They might benefit from a refresher on key features.";
    }
    return "Showing some concerning patterns but recoverable with proactive support.";
  }
  
  // Fair (55-69)
  if (score < 70) {
    if (company.pending_user_count > 0) {
      return `Doing okay but ${company.pending_user_count} pending invite${company.pending_user_count > 1 ? 's' : ''} could boost adoption.`;
    }
    if (usageHours < 5) {
      return "Moderate engagement. There's room to deepen their usage of the platform.";
    }
    return "Steady usage with potential for growth through feature discovery.";
  }
  
  // Good (70-84)
  if (score < 85) {
    if (healthScore.adoption >= 15) {
      return "Strong team adoption and consistent engagement. Keep nurturing the relationship.";
    }
    return "Regular activity and good health. A great candidate for expansion opportunities.";
  }
  
  // Excellent (85+)
  if (healthScore.bonus > 0) {
    return "Power user with exceptional engagement. Consider for case studies or referrals.";
  }
  return "Thriving account with strong adoption across the team. Keep up the great work!";
}

/**
 * Generate actionable suggested next steps based on health status and red flags
 */
export const generateSuggestedActions = (
  healthScore: HealthScoreBreakdown,
  company: CompanyStats,
  redFlags: string[],
  subscription: any
): string[] => {
  const actions: string[] = [];
  const score = healthScore.total;
  
  // Priority actions based on red flags
  if (redFlags.includes('Never logged in')) {
    actions.push('Send personalized welcome email with quick-start guide');
  }
  
  if (redFlags.includes('No login in 14+ days')) {
    actions.push('Schedule a re-engagement call to understand blockers');
  }
  
  if (redFlags.includes('Zero usage this week')) {
    actions.push('Offer a 15-minute feature walkthrough session');
  }
  
  if (redFlags.includes('Trial expiring soon')) {
    actions.push('Send trial extension offer with conversion incentive');
  }
  
  if (redFlags.includes('Trial expired')) {
    actions.push('Reach out with a special win-back discount');
  }
  
  if (redFlags.includes('Low user adoption')) {
    actions.push('Share team adoption tips and invite templates');
  }
  
  // Score-based actions if no specific red flag actions
  if (actions.length === 0) {
    if (score < 40) {
      actions.push('Urgent: Schedule executive outreach call');
    } else if (score < 55) {
      actions.push('Book a health check call this week');
    } else if (score < 70) {
      actions.push('Send feature spotlight email to boost engagement');
    } else if (score < 85) {
      actions.push('Consider for upsell or expansion opportunity');
    } else {
      actions.push('Request testimonial or case study participation');
    }
  }
  
  // Add secondary action based on context
  if (company.pending_user_count > 2 && !actions.some(a => a.includes('adoption'))) {
    actions.push('Follow up on pending team invitations');
  }
  
  if (score >= 70 && company.user_count >= 5) {
    actions.push('Invite to customer advisory board');
  }
  
  return actions.slice(0, 2); // Limit to 2 most relevant actions
}

/**
 * Calculate MRR from subscription data
 * Only use period_amount_charged - this is synced from Stripe with real payment data
 * If it's 0 or null, the customer is not paying
 */
const calculateMRR = (subscription: any): number => {
  if (!subscription) return 0;
  
  // Only use period_amount_charged if it has a real value (synced from Stripe)
  if (subscription.period_amount_charged != null && Number(subscription.period_amount_charged) > 0) {
    return Number(subscription.period_amount_charged);
  }
  
  // If no period_amount_charged, customer is not paying
  return 0;
};

/**
 * Calculate subscription status based on subscription data
 * Premium: Actively paying (has stripe subscription and period_amount_charged > 0)
 * Free Trial: In trial period (trial_end is in future)
 * Expired: Trial ended and not subscribed
 */
const calculateSubsStatus = (subscription: any): string | null => {
  if (!subscription) return null;
  
  const now = new Date();
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
  
  // Check if actively paying (Premium)
  if (
    subscription.subscribed === true && 
    subscription.stripe_subscription_id && 
    subscription.period_amount_charged != null && 
    Number(subscription.period_amount_charged) > 0
  ) {
    return 'Premium';
  }
  
  // Check if was a paying customer but cancelled (has stripe_customer_id but no longer subscribed)
  if (
    subscription.stripe_customer_id && 
    subscription.subscribed === false &&
    subscription.subscription_tier &&
    ['Premium', 'Basic', 'Enterprise', 'Paid'].includes(subscription.subscription_tier)
  ) {
    return 'Cancelled';
  }
  
  // Check if in trial period (Free Trial)
  if (trialEnd && trialEnd > now && !subscription.stripe_subscription_id) {
    return 'Free Trial';
  }
  
  // Check if trial expired and not subscribed (Expired)
  if (trialEnd && trialEnd <= now && subscription.subscribed === false) {
    return 'Expired';
  }
  
  // Default to null if status cannot be determined
  return null;
};

/**
 * Fetch all customer success data with company and subscription info
 */
export const fetchCustomerSuccessData = async (
  companies: CompanyStats[]
): Promise<CustomerSuccessRow[]> => {
  try {
    // Fetch all customer success tracking data
    const { data: trackingData, error: trackingError } = await supabase
      .from('customer_success_tracking')
      .select('*');

    if (trackingError) {
      logger.error('Error fetching customer success tracking:', trackingError);
    }

    // Fetch subscription data for MRR calculation and status
    const { data: subscriptions, error: subsError } = await supabase
      .from('company_subscriptions')
      .select('company_id, period_amount_charged, base_price_per_user, quantity, user_count, subscribed, trial_end, stripe_subscription_id, stripe_customer_id, subscription_tier');

    if (subsError) {
      logger.error('Error fetching subscriptions:', subsError);
    }

    // Fetch company admins (directors) - the responsible person for each company
    const { data: adminsData, error: adminsError } = await supabase
      .from('company_members')
      .select(`
        company_id,
        user_id,
        permission_level,
        joined_at,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('permission_level', 'director')
      .eq('status', 'active');

    if (adminsError) {
      logger.error('Error fetching company admins:', adminsError);
    }

    // Create a map of admin data by company_id (use earliest joined director)
    const adminMap = new Map<string, { name: string | null; email: string | null }>();
    if (adminsData) {
      // Sort by joined_at to get the earliest (first) director
      const sortedAdmins = [...adminsData].sort((a, b) => 
        new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
      );
      
      for (const admin of sortedAdmins) {
        if (!adminMap.has(admin.company_id)) {
          const profile = admin.profiles as any;
          adminMap.set(admin.company_id, {
            name: profile?.full_name || null,
            email: profile?.email || null,
          });
        }
      }
    }

    // Create a map of tracking data by company_id
    const trackingMap = new Map(
      (trackingData || []).map(item => [item.company_id, item])
    );

    // Create a map of subscription data by company_id
    const subsMap = new Map(
      (subscriptions || []).map(sub => [sub.company_id, sub])
    );

    // Combine data
    const rows: CustomerSuccessRow[] = companies.map(company => {
      const tracking = trackingMap.get(company.id);
      const subscription = subsMap.get(company.id);
      const adminInfo = adminMap.get(company.id);
      const mrr = calculateMRR(subscription);
      const customer_tier = calculateCustomerTier(mrr);
      const calculatedSubsStatus = calculateSubsStatus(subscription);

      // Calculate health score and map to customer health
      const healthScore = calculateHealthScore(
        company.last_login_at,
        company.usage_hours_7d || 0,
        company.user_count,
        company.pending_user_count,
        company.created_at
      );
      const calculatedCustomerHealth = mapHealthScoreToCustomerHealth(healthScore);

      // Calculate red flags, health explanation, and suggested actions
      const redFlags = calculateRedFlags(company, subscription);
      const healthExplanation = generateHealthExplanation(healthScore, company, redFlags);
      const suggestedActions = generateSuggestedActions(healthScore, company, redFlags, subscription);

      return {
        id: tracking?.id || '',
        company_id: company.id,
        company_name: company.name,
        account_stage: tracking?.account_stage || null,
        customer_migration: tracking?.customer_migration || null,
        customer_health: calculatedCustomerHealth, // Auto-calculated from health score
        health_score_label: healthScore.label, // Original score label for display
        health_score: healthScore.total, // Numeric score for display
        red_flags: redFlags, // Red flags for this company
        health_explanation: healthExplanation, // Brief explanation of health status
        suggested_actions: suggestedActions, // Actionable next steps
        whatsapp_group: tracking?.whatsapp_group || null,
        onboarding_video: tracking?.onboarding_video || null,
        subs_status: calculatedSubsStatus, // Use calculated status based on subscription data
        customer_status_notes: tracking?.customer_status_notes || null,
        mrr,
        customer_tier,
        trial_end: subscription?.trial_end || null,
        admin_name: adminInfo?.name || null,
        admin_email: adminInfo?.email || null,
        created_at: tracking?.created_at || new Date().toISOString(),
        updated_at: tracking?.updated_at || new Date().toISOString(),
      };
    });

    return rows;
  } catch (error) {
    logger.error('Error in fetchCustomerSuccessData:', error);
    return [];
  }
};

/**
 * Update customer success data for a company
 */
export const updateCustomerSuccess = async (
  companyId: string,
  data: Partial<CustomerSuccessData>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('customer_success_tracking')
      .upsert(
        {
          company_id: companyId,
          ...data,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'company_id',
        }
      );

    if (error) {
      logger.error('Error updating customer success data:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    logger.error('Error in updateCustomerSuccess:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sync subscription status for all companies
 * This will update the subs_status field in customer_success_tracking based on actual subscription data
 */
export const syncAllSubscriptionStatuses = async (): Promise<{ 
  success: boolean; 
  updated: number; 
  error?: string 
}> => {
  try {
    // Fetch all subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('company_subscriptions')
      .select('company_id, subscribed, trial_end, stripe_subscription_id, period_amount_charged');

    if (subsError) {
      logger.error('Error fetching subscriptions for sync:', subsError);
      return { success: false, updated: 0, error: subsError.message };
    }

    let updated = 0;

    // Update each company's subs_status
    for (const subscription of subscriptions || []) {
      const subsStatus = calculateSubsStatus(subscription);
      
      if (subsStatus) {
        const { error } = await supabase
          .from('customer_success_tracking')
          .upsert(
            {
              company_id: subscription.company_id,
              subs_status: subsStatus,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'company_id',
            }
          );

        if (!error) {
          updated++;
        } else {
          logger.error(`Error updating subs_status for company ${subscription.company_id}:`, error);
        }
      }
    }

    logger.info(`Synced subscription status for ${updated} companies`);
    return { success: true, updated };
  } catch (error: any) {
    logger.error('Error in syncAllSubscriptionStatuses:', error);
    return { success: false, updated: 0, error: error.message };
  }
};
