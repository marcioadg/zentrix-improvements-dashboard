import { CustomerSuccessRow } from '@/types/customerSuccess';
import { CompanyStats } from '@/types/superAdmin';
import { logger } from '@/utils/logger';

export interface CustomerSuccessMetrics {
  totalMRR: number;
  churnRate: number;
  averageLTV: number;
  arpa: number;
  activeCustomers: number;
  atRiskCustomers: number;
  payingCustomers: number;
  payingCustomersOnTime: number;
  healthDistribution: {
    'Unhealthy': number;
    'Not Good': number;
    'Not bad/ Not good': number;
    'Fine': number;
    'Healthy': number;
    'Unknown': number;
  };
}

export interface MRRGrowthDataPoint {
  month: string;
  mrr: number;
}

export interface UsageDataPoint {
  company_name: string;
  usage_hours: number;
}

// Account stages to exclude from metrics (closed accounts)
const EXCLUDED_ACCOUNT_STAGES = ['Internal Company', 'Test Company', 'Done', 'Churned'];


export const calculateCustomerSuccessMetrics = (
  customerData: CustomerSuccessRow[],
  companies: CompanyStats[]
): CustomerSuccessMetrics => {
  // Filter out closed accounts (internal, test, done, churned) for revenue metrics
  const filteredCustomerData = customerData.filter(
    c => !EXCLUDED_ACCOUNT_STAGES.includes(c.account_stage || '')
  );

  // Total MRR
  const totalMRR = filteredCustomerData.reduce((sum, customer) => sum + customer.mrr, 0);

  // Churn Rate: based on ever-paying customers, independent of account stage labels
  // This avoids hiding real churn when a company is labeled as "Test Company" by mistake.
  const currentlyPaying = customerData.filter(
    c => c.subs_status === 'Premium' || (c.mrr > 0 && (c.subs_status === 'Active' || c.subs_status === 'Expired'))
  );

  const churnedPayingCustomers = customerData.filter(
    c => c.subs_status === 'Cancelled' || c.account_stage === 'Churned' || c.account_stage === 'Done'
  );

  // Use unique companies to avoid double counting if a record matches multiple conditions
  const currentlyPayingIds = new Set(currentlyPaying.map(c => c.company_id));
  const churnedIds = new Set(churnedPayingCustomers.map(c => c.company_id));
  const totalEverPaying = new Set([...currentlyPayingIds, ...churnedIds]).size;

  const churnRate = totalEverPaying > 0 ? (churnedIds.size / totalEverPaying) * 100 : 0;

  // Average LTV = ARPA / monthly churn rate
  const monthlyChurnRate = churnRate / 100;
  const arpaForLtv = currentlyPaying.length > 0 
    ? totalMRR / currentlyPaying.length 
    : 0;
  const averageLTV = monthlyChurnRate > 0 
    ? arpaForLtv / monthlyChurnRate 
    : arpaForLtv * 12; // fallback if no churn yet

  // Active vs At-Risk customers (health-based)
  const activeCustomers = filteredCustomerData.filter(
    c => c.customer_health === 'Healthy' || c.customer_health === 'Fine'
  ).length;
  const atRiskCustomers = filteredCustomerData.filter(
    c => c.customer_health === 'Not Good' || c.customer_health === 'Not bad/ Not good' || c.customer_health === 'Unhealthy'
  ).length;

  // Paying Customers (with paid subscription - Premium or Active with MRR > 0)
  const payingCustomersData = filteredCustomerData.filter(
    c => c.mrr > 0 && (c.subs_status === 'Active' || c.subs_status === 'Premium' || c.subs_status === 'Expired')
  );
  const payingCustomers = payingCustomersData.length;
  
  // Paying customers on time (Active or Premium status, not Expired)
  const payingCustomersOnTime = payingCustomersData.filter(
    c => c.subs_status === 'Active' || c.subs_status === 'Premium'
  ).length;

  // Health Distribution using exact status names
  const healthDistribution = {
    'Unhealthy': filteredCustomerData.filter(c => c.customer_health === 'Unhealthy').length,
    'Not Good': filteredCustomerData.filter(c => c.customer_health === 'Not Good').length,
    'Not bad/ Not good': filteredCustomerData.filter(c => c.customer_health === 'Not bad/ Not good').length,
    'Fine': filteredCustomerData.filter(c => c.customer_health === 'Fine').length,
    'Healthy': filteredCustomerData.filter(c => c.customer_health === 'Healthy').length,
    'Unknown': filteredCustomerData.filter(c => !c.customer_health).length,
  };

  // ARPA (Average Revenue Per Account)
  const arpa = payingCustomers > 0 ? totalMRR / payingCustomers : 0;

  return {
    totalMRR,
    churnRate,
    averageLTV,
    arpa,
    activeCustomers,
    atRiskCustomers,
    payingCustomers,
    payingCustomersOnTime,
    healthDistribution,
  };
};

// Calculate MRR growth data: historical from Stripe + current month from DB (same as Total MRR)
export const calculateMRRGrowthFromDB = (
  customerData: CustomerSuccessRow[],
  subscriptions: Array<{ company_id: string; period_amount_charged: number | null }>,
  stripeHistory: MRRGrowthDataPoint[] = []
): MRRGrowthDataPoint[] => {
  // Filter out closed accounts (same logic as Total MRR card)
  const filteredCompanyIds = new Set(
    customerData
      .filter(c => !EXCLUDED_ACCOUNT_STAGES.includes(c.account_stage || ''))
      .map(c => c.company_id)
  );

  // Calculate current MRR from same source as Total MRR
  const currentMRR = subscriptions
    .filter(s => filteredCompanyIds.has(s.company_id))
    .reduce((sum, s) => sum + (s.period_amount_charged || 0), 0);

  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'short' });

  // Use Stripe history for past months, override current month with DB value
  if (stripeHistory.length > 0) {
    const result = stripeHistory.map(point => {
      if (point.month === currentMonthLabel) {
        return { ...point, mrr: Math.round(currentMRR * 100) / 100 };
      }
      return point;
    });
    
    // If current month not in Stripe data, add it
    if (!result.find(p => p.month === currentMonthLabel)) {
      result.push({ month: currentMonthLabel, mrr: Math.round(currentMRR * 100) / 100 });
    }
    
    return result;
  }

  return [{ month: currentMonthLabel, mrr: Math.round(currentMRR * 100) / 100 }];
};

// Fetch historical MRR from Stripe
export const fetchMRRGrowthData = async (): Promise<MRRGrowthDataPoint[]> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('get-stripe-mrr-history');
    
    if (error) {
      logger.error('Error fetching MRR history:', error);
      return [];
    }
    
    if (data && data.success && data.data) {
      return data.data.map((point: any) => ({
        month: point.month,
        mrr: point.mrr,
      }));
    }
    
    return [];
  } catch (error) {
    logger.error('Failed to fetch MRR history:', error);
    return [];
  }
};

// Calculate conversion rate from Free Trial to Paid within a given period
// Logic: Of all trials created in the period, how many have converted to paid?
// Also counts conversions that happened in the period (subscribed_at) for trials created earlier.
export interface ConversionRateResult {
  rate: number;
  totalTrials: number;
  converted: number;
}

export const calculateConversionRate = async (periodDays: number): Promise<ConversionRateResult> => {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);
  const cutoffISO = cutoffDate.toISOString();
  
  // Fetch trials created within the period
  const { data, error } = await supabase
    .from('company_subscriptions')
    .select('company_id, subscription_tier, stripe_subscription_id, created_at, subscribed, subscribed_at')
    .gte('created_at', cutoffISO);
  
  if (error || !data) {
    logger.error('Error fetching conversion data:', error);
    return { rate: 0, totalTrials: 0, converted: 0 };
  }

  const totalTrials = data.length;
  
  // Of those trials created in the period, how many converted to Premium
  const converted = data.filter(
    s => s.subscription_tier === 'Premium' && s.stripe_subscription_id
  ).length;

  const rate = totalTrials > 0 ? (converted / totalTrials) * 100 : 0;

  return { rate, totalTrials, converted };
};

export const calculateOverallConversionRate = async (): Promise<ConversionRateResult> => {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const { data, error } = await supabase
    .from('company_subscriptions')
    .select('company_id, subscription_tier, stripe_subscription_id');
  
  if (error || !data) {
    logger.error('Error fetching overall conversion data:', error);
    return { rate: 0, totalTrials: 0, converted: 0 };
  }

  const totalTrials = data.length;
  const converted = data.filter(
    s => s.subscription_tier === 'Premium' && s.stripe_subscription_id
  ).length;
  const rate = totalTrials > 0 ? (converted / totalTrials) * 100 : 0;

  return { rate, totalTrials, converted };
};

// Get top 10 companies by usage (excluding internal and test companies)
export const getTopUsageCompanies = (
  companies: CompanyStats[],
  customerData: CustomerSuccessRow[]
): UsageDataPoint[] => {
  // Get list of closed account company IDs (internal, test, done, churned)
  const excludedCompanyIds = new Set(
    customerData
      .filter(c => EXCLUDED_ACCOUNT_STAGES.includes(c.account_stage || ''))
      .map(c => c.company_id)
  );

  return companies
    .filter(c => c.usage_hours_7d && c.usage_hours_7d > 0 && !excludedCompanyIds.has(c.id))
    .sort((a, b) => (b.usage_hours_7d || 0) - (a.usage_hours_7d || 0))
    .slice(0, 10)
    .map(c => ({
      company_name: c.name,
      usage_hours: c.usage_hours_7d || 0,
    }));
};
