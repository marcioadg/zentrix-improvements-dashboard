import { CompanyStats } from '@/types/superAdmin';
import { calculateCompanyOnboarding } from '@/utils/companyOnboarding';
import { calculate7DayGrowth } from './analyticsHistoryService';
import { logger } from '@/utils/logger';

export interface PlatformAnalytics {
  totalCompanies: number;
  paidCompanies: number;
  mrr: number;
  potentialMrr: number;
  totalUsage7d: number;
  totalUsers: number;
  totalTeams: number;
  totalMetrics: number;
  totalGoals: number;
  onboardingCompletionPercentage: number;
  
  // Growth data (7-day change)
  growth: {
    totalCompanies: number | null;
    paidCompanies: number | null;
    mrr: number | null;
    potentialMrr: number | null;
    totalUsage7d: number | null;
    totalUsers: number | null;
    totalTeams: number | null;
    totalMetrics: number | null;
    totalGoals: number | null;
    onboardingCompletionPercentage: number | null;
  };
}

const BASE_PRICE_PER_USER = 5.00;

export const calculatePlatformAnalytics = async (companies: CompanyStats[]): Promise<PlatformAnalytics> => {
  logger.log('📊 Calculating platform analytics for', companies.length, 'companies');
  
  // Current metrics
  const totalCompanies = companies.length;
  
  const paidCompanies = companies.filter(c => c.subscription_tier === 'Paid').length;
  
  // MRR calculation (paid companies only)
  const mrr = companies
    .filter(c => c.subscription_tier === 'Paid')
    .reduce((sum, company) => {
      return sum + (company.user_count * BASE_PRICE_PER_USER);
    }, 0);
  
  // Potential MRR (if all companies paid)
  const potentialMrr = companies.reduce((sum, company) => {
    return sum + (company.user_count * BASE_PRICE_PER_USER);
  }, 0);
  
  const totalUsage7d = companies.reduce((sum, c) => sum + (c.usage_hours_7d || 0), 0);
  const totalUsers = companies.reduce((sum, c) => sum + c.user_count, 0);
  const totalTeams = companies.reduce((sum, c) => sum + c.team_count, 0);
  const totalMetrics = companies.reduce((sum, c) => sum + c.metrics_count, 0);
  const totalGoals = companies.reduce((sum, c) => sum + (c.goals_count || 0), 0);
  
  // Onboarding completion calculation
  const fullyOnboardedCount = companies.filter(company => {
    const onboarding = calculateCompanyOnboarding(company as any);
    return onboarding.completedCount === onboarding.totalCount;
  }).length;
  
  const onboardingCompletionPercentage = totalCompanies > 0 
    ? (fullyOnboardedCount / totalCompanies) * 100 
    : 0;

  // Calculate 7-day growth from historical snapshots
  const currentMetrics = {
    totalCompanies,
    paidCompanies,
    mrr,
    potentialMrr,
    totalUsage7d,
    totalUsers,
    totalTeams,
    totalMetrics,
    totalGoals,
    onboardingCompletionPercentage
  };
  
  const growth = await calculate7DayGrowth(currentMetrics);
  
  logger.log('✅ Analytics calculated:', {
    totalCompanies,
    paidCompanies,
    mrr: `$${mrr.toFixed(2)}`,
    potentialMrr: `$${potentialMrr.toFixed(2)}`,
    totalUsage7d: `${totalUsage7d.toFixed(1)}h`,
    onboardingCompletionPercentage: `${onboardingCompletionPercentage.toFixed(1)}%`
  });
  
  return {
    totalCompanies,
    paidCompanies,
    mrr,
    potentialMrr,
    totalUsage7d,
    totalUsers,
    totalTeams,
    totalMetrics,
    totalGoals,
    onboardingCompletionPercentage,
    growth
  };
};

