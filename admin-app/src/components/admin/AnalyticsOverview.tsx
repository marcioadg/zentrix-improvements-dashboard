import React, { useMemo, useState } from 'react';
import { CompanyStats } from '@/types/superAdmin';
import { calculatePlatformAnalytics } from '@/services/analyticsService';
import { AnalyticsMetricCard } from './AnalyticsMetricCard';
import { Usage7dDrillDownModal } from './Usage7dDrillDownModal';
import { 
  Building2, 
  CreditCard, 
  TrendingUp, 
  Target, 
  Activity, 
  Users, 
  UsersRound, 
  BarChart3, 
  CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface AnalyticsOverviewProps {
  companies: CompanyStats[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  companies,
  loading = false,
  onRefresh
}) => {
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [showUsageDrillDown, setShowUsageDrillDown] = useState(false);

  React.useEffect(() => {
    if (loading || companies.length === 0) {
      setAnalytics(null);
      return;
    }
    
    calculatePlatformAnalytics(companies).then(setAnalytics).catch(() => setAnalytics(null));
  }, [companies, loading]);

  if (!analytics && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Platform Analytics</h3>
            <p className="text-muted-foreground">
              Key metrics and 7-day growth trends across all companies
            </p>
          </div>
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Companies */}
          <AnalyticsMetricCard
            title="Total Companies"
            value={analytics?.totalCompanies || 0}
            growth={analytics?.growth.totalCompanies || null}
            icon={Building2}
            loading={loading}
          />

          {/* Paid Companies */}
          <AnalyticsMetricCard
            title="Paid Companies"
            value={analytics?.paidCompanies || 0}
            growth={analytics?.growth.paidCompanies || null}
            icon={CreditCard}
            loading={loading}
          />

          {/* MRR */}
          <AnalyticsMetricCard
            title="MRR"
            value={analytics?.mrr || 0}
            growth={analytics?.growth.mrr || null}
            icon={TrendingUp}
            prefix="$"
            decimals={2}
            loading={loading}
          />

          {/* Potential MRR */}
          <AnalyticsMetricCard
            title="Potential MRR"
            value={analytics?.potentialMrr || 0}
            growth={analytics?.growth.potentialMrr || null}
            icon={Target}
            prefix="$"
            decimals={2}
            loading={loading}
          />

          {/* 7-Day Usage */}
          <AnalyticsMetricCard
            title="Usage (7d)"
            value={analytics?.totalUsage7d || 0}
            growth={analytics?.growth.totalUsage7d || null}
            icon={Activity}
            suffix="h"
            decimals={1}
            loading={loading}
            onClick={() => setShowUsageDrillDown(true)}
          />

          {/* Total Users */}
          <AnalyticsMetricCard
            title="Total Users"
            value={analytics?.totalUsers || 0}
            growth={analytics?.growth.totalUsers || null}
            icon={Users}
            loading={loading}
          />

          {/* Total Teams */}
          <AnalyticsMetricCard
            title="Total Teams"
            value={analytics?.totalTeams || 0}
            growth={analytics?.growth.totalTeams || null}
            icon={UsersRound}
            loading={loading}
          />

          {/* Total Metrics */}
          <AnalyticsMetricCard
            title="Total Metrics"
            value={analytics?.totalMetrics || 0}
            growth={analytics?.growth.totalMetrics || null}
            icon={BarChart3}
            loading={loading}
          />

          {/* Total Goals */}
          <AnalyticsMetricCard
            title="Total Goals"
            value={analytics?.totalGoals || 0}
            growth={analytics?.growth.totalGoals || null}
            icon={Target}
            loading={loading}
          />

          {/* Onboarding Completion % */}
          <AnalyticsMetricCard
            title="Onboarding Completion"
            value={analytics?.onboardingCompletionPercentage || 0}
            growth={analytics?.growth.onboardingCompletionPercentage || null}
            icon={CheckCircle2}
            suffix="%"
            decimals={1}
            loading={loading}
          />
        </div>

        {/* Info Banner */}
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Daily Snapshots Active:</strong> The system captures analytics snapshots daily. 
            Growth percentages will appear once 7+ days of historical data is collected. 
            Run the edge function manually or wait for the daily cron job to collect data.
          </p>
        </div>
      </div>

      {/* Usage Drill-Down Modal */}
      <Usage7dDrillDownModal
        open={showUsageDrillDown}
        onOpenChange={setShowUsageDrillDown}
        companies={companies}
      />
    </>
  );
};
