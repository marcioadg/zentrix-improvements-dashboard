import { describe, it, expect } from 'vitest';
import { CustomerSuccessRow } from '@/types/customerSuccess';
import { CompanyStats } from '@/types/superAdmin';
import {
  calculateCustomerSuccessMetrics,
  calculateMRRGrowthFromDB,
  getTopUsageCompanies,
  MRRGrowthDataPoint,
} from './customerSuccessAnalytics';

function makeCustomer(overrides: Partial<CustomerSuccessRow> = {}): CustomerSuccessRow {
  return {
    id: 'cs-1',
    company_id: 'c-1',
    account_stage: 'Active Subscription',
    customer_migration: null,
    customer_health: 'Healthy',
    whatsapp_group: null,
    onboarding_video: null,
    subs_status: 'Premium',
    customer_status_notes: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    company_name: 'Acme',
    mrr: 100,
    customer_tier: 1,
    ...overrides,
  };
}

function makeCompany(overrides: Partial<CompanyStats> = {}): CompanyStats {
  return {
    id: 'c-1',
    name: 'Acme',
    slug: 'acme',
    created_at: '2025-01-01',
    subscription_tier: 'Paid',
    user_count: 5,
    team_count: 2,
    metrics_count: 10,
    goals_count: 3,
    usage_hours_7d: 20,
    ...overrides,
  } as CompanyStats;
}

describe('calculateCustomerSuccessMetrics', () => {
  it('returns zero metrics for empty data', () => {
    const result = calculateCustomerSuccessMetrics([], []);
    expect(result.totalMRR).toBe(0);
    expect(result.churnRate).toBe(0);
    expect(result.arpa).toBe(0);
    expect(result.payingCustomers).toBe(0);
    expect(result.activeCustomers).toBe(0);
    expect(result.atRiskCustomers).toBe(0);
  });

  it('calculates totalMRR excluding closed accounts', () => {
    const customers = [
      makeCustomer({ company_id: 'c-1', mrr: 100 }),
      makeCustomer({ company_id: 'c-2', mrr: 200, account_stage: 'Internal Company' }),
      makeCustomer({ company_id: 'c-3', mrr: 50, account_stage: 'Free Trial' }),
    ];
    const result = calculateCustomerSuccessMetrics(customers, []);
    // Only c-1 and c-3 are included (c-2 is Internal Company)
    expect(result.totalMRR).toBe(150);
  });

  it('calculates churn rate from ever-paying customers', () => {
    const customers = [
      makeCustomer({ company_id: 'c-1', subs_status: 'Premium', mrr: 100 }),
      makeCustomer({ company_id: 'c-2', subs_status: 'Cancelled', mrr: 0 }),
    ];
    const result = calculateCustomerSuccessMetrics(customers, []);
    // 1 currently paying, 1 churned => 2 ever-paying, churn = 50%
    expect(result.churnRate).toBe(50);
  });

  it('calculates health distribution', () => {
    const customers = [
      makeCustomer({ customer_health: 'Healthy' }),
      makeCustomer({ customer_health: 'Healthy', company_id: 'c-2' }),
      makeCustomer({ customer_health: 'Not Good', company_id: 'c-3' }),
      makeCustomer({ customer_health: null as any, company_id: 'c-4' }),
    ];
    const result = calculateCustomerSuccessMetrics(customers, []);
    expect(result.healthDistribution['Healthy']).toBe(2);
    expect(result.healthDistribution['Not Good']).toBe(1);
    expect(result.healthDistribution['Unknown']).toBe(1);
  });

  it('calculates paying customers and on-time counts', () => {
    const customers = [
      makeCustomer({ company_id: 'c-1', mrr: 100, subs_status: 'Premium' }),
      makeCustomer({ company_id: 'c-2', mrr: 50, subs_status: 'Active' }),
      makeCustomer({ company_id: 'c-3', mrr: 30, subs_status: 'Expired' }),
      makeCustomer({ company_id: 'c-4', mrr: 0, subs_status: 'Free Trial' }),
    ];
    const result = calculateCustomerSuccessMetrics(customers, []);
    expect(result.payingCustomers).toBe(3); // Premium, Active, Expired with mrr>0
    expect(result.payingCustomersOnTime).toBe(2); // Premium, Active only
  });

  it('calculates ARPA correctly', () => {
    const customers = [
      makeCustomer({ company_id: 'c-1', mrr: 100, subs_status: 'Premium' }),
      makeCustomer({ company_id: 'c-2', mrr: 200, subs_status: 'Active' }),
    ];
    const result = calculateCustomerSuccessMetrics(customers, []);
    expect(result.arpa).toBe(150); // 300 / 2
  });

  it('excludes Test Company and Done from metrics', () => {
    const customers = [
      makeCustomer({ company_id: 'c-1', mrr: 100, account_stage: 'Test Company' }),
      makeCustomer({ company_id: 'c-2', mrr: 200, account_stage: 'Done' }),
      makeCustomer({ company_id: 'c-3', mrr: 50, account_stage: 'Active Subscription' }),
    ];
    const result = calculateCustomerSuccessMetrics(customers, []);
    expect(result.totalMRR).toBe(50);
  });

  it('counts active and at-risk customers', () => {
    const customers = [
      makeCustomer({ company_id: 'c-1', customer_health: 'Healthy' }),
      makeCustomer({ company_id: 'c-2', customer_health: 'Fine' }),
      makeCustomer({ company_id: 'c-3', customer_health: 'Not Good' }),
      makeCustomer({ company_id: 'c-4', customer_health: 'Unhealthy' }),
      makeCustomer({ company_id: 'c-5', customer_health: 'Not bad/ Not good' }),
    ];
    const result = calculateCustomerSuccessMetrics(customers, []);
    expect(result.activeCustomers).toBe(2);
    expect(result.atRiskCustomers).toBe(3);
  });

  it('calculates averageLTV with zero churn as 12x ARPA', () => {
    const customers = [
      makeCustomer({ company_id: 'c-1', mrr: 120, subs_status: 'Premium' }),
    ];
    const result = calculateCustomerSuccessMetrics(customers, []);
    // No churn => fallback = ARPA * 12 = 120 * 12 = 1440
    expect(result.averageLTV).toBe(1440);
  });
});

describe('calculateMRRGrowthFromDB', () => {
  it('returns single data point when no stripe history', () => {
    const customerData = [makeCustomer({ company_id: 'c-1', mrr: 100 })];
    const subscriptions = [{ company_id: 'c-1', period_amount_charged: 100 }];
    const result = calculateMRRGrowthFromDB(customerData, subscriptions);
    expect(result).toHaveLength(1);
    expect(result[0].mrr).toBe(100);
  });

  it('excludes closed accounts from MRR calculation', () => {
    const customerData = [
      makeCustomer({ company_id: 'c-1', mrr: 100 }),
      makeCustomer({ company_id: 'c-2', mrr: 200, account_stage: 'Churned' }),
    ];
    const subscriptions = [
      { company_id: 'c-1', period_amount_charged: 100 },
      { company_id: 'c-2', period_amount_charged: 200 },
    ];
    const result = calculateMRRGrowthFromDB(customerData, subscriptions);
    expect(result[0].mrr).toBe(100);
  });

  it('overrides current month in stripe history', () => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'short' });
    const customerData = [makeCustomer({ company_id: 'c-1' })];
    const subscriptions = [{ company_id: 'c-1', period_amount_charged: 150 }];
    const stripeHistory: MRRGrowthDataPoint[] = [
      { month: 'Jan', mrr: 50 },
      { month: currentMonth, mrr: 999 },
    ];
    const result = calculateMRRGrowthFromDB(customerData, subscriptions, stripeHistory);
    const currentEntry = result.find(p => p.month === currentMonth);
    expect(currentEntry!.mrr).toBe(150);
  });

  it('appends current month if not in stripe history', () => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'short' });
    const customerData = [makeCustomer({ company_id: 'c-1' })];
    const subscriptions = [{ company_id: 'c-1', period_amount_charged: 75 }];
    const stripeHistory: MRRGrowthDataPoint[] = [{ month: 'Jan', mrr: 50 }];
    const result = calculateMRRGrowthFromDB(customerData, subscriptions, stripeHistory);
    expect(result).toHaveLength(currentMonth === 'Jan' ? 1 : 2);
    const currentEntry = result.find(p => p.month === currentMonth);
    expect(currentEntry!.mrr).toBe(75);
  });
});

describe('getTopUsageCompanies', () => {
  it('returns empty for no companies', () => {
    expect(getTopUsageCompanies([], [])).toEqual([]);
  });

  it('excludes companies with zero usage', () => {
    const companies = [makeCompany({ usage_hours_7d: 0 })];
    expect(getTopUsageCompanies(companies, [])).toEqual([]);
  });

  it('excludes companies matching closed account stages', () => {
    const companies = [
      makeCompany({ id: 'c-1', name: 'Active Co', usage_hours_7d: 50 }),
      makeCompany({ id: 'c-2', name: 'Internal Co', usage_hours_7d: 100 }),
    ];
    const customerData = [
      makeCustomer({ company_id: 'c-2', account_stage: 'Internal Company' }),
    ];
    const result = getTopUsageCompanies(companies, customerData);
    expect(result).toHaveLength(1);
    expect(result[0].company_name).toBe('Active Co');
  });

  it('sorts by usage descending and limits to 10', () => {
    const companies = Array.from({ length: 15 }, (_, i) =>
      makeCompany({ id: `c-${i}`, name: `Company ${i}`, usage_hours_7d: (i + 1) * 10 })
    );
    const result = getTopUsageCompanies(companies, []);
    expect(result).toHaveLength(10);
    expect(result[0].company_name).toBe('Company 14');
    expect(result[0].usage_hours).toBe(150);
  });
});
