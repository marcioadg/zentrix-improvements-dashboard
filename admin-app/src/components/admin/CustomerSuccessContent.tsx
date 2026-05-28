import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, Table, LayoutGrid, Filter } from 'lucide-react';
import { CustomerSuccessTable } from './CustomerSuccessTable';
import { CustomerSuccessKanban } from './CustomerSuccessKanban';
import { CustomerSuccessMetricsComponent } from './CustomerSuccessMetrics';
import { CustomerSuccessKPIDrilldownModal, DrilldownType } from './CustomerSuccessKPIDrilldownModal';
import { SyncStripeMRRButton } from './SyncStripeMRRButton';
import { useCompanyManagementOptimized } from '@/hooks/useCompanyManagementOptimized';
import { syncStripeMRR } from '@/services/stripeSyncService';
import { fetchCustomerSuccessData, syncAllSubscriptionStatuses } from '@/services/customerSuccessService';
import { 
  calculateCustomerSuccessMetrics, 
  calculateMRRGrowthFromDB, 
  fetchMRRGrowthData,
  getTopUsageCompanies 
} from '@/services/customerSuccessAnalytics';
import { logger } from '@/utils/logger';
import type { CustomerSuccessRow } from '@/types/customerSuccess';

export const CustomerSuccessContent: React.FC = () => {
  const { companies, loading } = useCompanyManagementOptimized();
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [customerData, setCustomerData] = useState<CustomerSuccessRow[]>([]);
  const [mrrGrowthData, setMrrGrowthData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [hideClosedAccounts, setHideClosedAccounts] = useState(true);
  const [drilldownType, setDrilldownType] = useState<DrilldownType>(null);

  // Auto-sync MRR from Stripe when component mounts
  useEffect(() => {
    const autoSyncMRR = async () => {
      setSyncing(true);
      try {
        logger.info('Auto-syncing MRR from Stripe...');
        const result = await syncStripeMRR();
        logger.info('Auto-sync completed successfully');
        
        // Sync subscription statuses based on latest subscription data
        logger.info('Syncing subscription statuses...');
        const statusResult = await syncAllSubscriptionStatuses();
        logger.info(`Subscription status sync completed: ${statusResult.updated} companies updated`);
        
        // Force table refresh after sync
        if (result.success) {
          setRefreshKey(prev => prev + 1);
        }
      } catch (error) {
        logger.error('Auto-sync failed:', error);
      } finally {
        setSyncing(false);
      }
    };

    autoSyncMRR();
  }, []);

  // Load customer data when companies change
  useEffect(() => {
    const loadCustomerData = async () => {
      if (companies.length > 0) {
        const data = await fetchCustomerSuccessData(companies);
        setCustomerData(data);
      }
    };

    loadCustomerData();
  }, [companies, refreshKey]);

  // Calculate MRR growth: Stripe for historical months + DB for current month
  useEffect(() => {
    const loadMRRData = async () => {
      if (customerData.length === 0) return;
      
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Fetch both sources in parallel
      const [stripeHistory, subsResult] = await Promise.all([
        fetchMRRGrowthData(),
        supabase.from('company_subscriptions').select('company_id, period_amount_charged'),
      ]);
      
      const subs = subsResult.data || [];
      const mrrData = calculateMRRGrowthFromDB(customerData, subs, stripeHistory);
      setMrrGrowthData(mrrData);
    };

    loadMRRData();
  }, [customerData, refreshKey]);

  // Calculate metrics
  const metrics = calculateCustomerSuccessMetrics(customerData, companies);
  const usageData = getTopUsageCompanies(companies, customerData);

  // Filter out closed accounts for kanban view based on toggle
  const HIDDEN_STAGES = ['Internal Company', 'Test Company', 'Done', 'Churned'];
  const filteredKanbanData = hideClosedAccounts 
    ? customerData.filter(c => !HIDDEN_STAGES.includes(c.account_stage || ''))
    : customerData;

  // Handler for updating customer data from Kanban
  const handleKanbanUpdate = (companyId: string, field: string, value: string) => {
    setCustomerData(prev =>
      prev.map(row =>
        row.company_id === companyId ? { ...row, [field]: value } : row
      )
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Success Dashboard
              </CardTitle>
              <CardDescription>
                Track and manage customer health, engagement, and success metrics across all companies.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && setViewMode(value as 'table' | 'kanban')}
                className="bg-muted rounded-lg p-1"
              >
                <ToggleGroupItem value="table" aria-label="Table view" className="px-3">
                  <Table className="h-4 w-4 mr-2" />
                  Table
                </ToggleGroupItem>
                <ToggleGroupItem value="kanban" aria-label="Kanban view" className="px-3">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </ToggleGroupItem>
              </ToggleGroup>
              <SyncStripeMRRButton onSyncComplete={() => setRefreshKey(prev => prev + 1)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Metrics Dashboard */}
          {customerData.length > 0 && mrrGrowthData.length > 0 && (
            <CustomerSuccessMetricsComponent
              metrics={metrics}
              mrrGrowthData={mrrGrowthData}
              usageData={usageData}
              onCardClick={setDrilldownType}
            />
          )}

          {/* KPI Drilldown Modal */}
          <CustomerSuccessKPIDrilldownModal
            open={drilldownType !== null}
            onOpenChange={(open) => !open && setDrilldownType(null)}
            type={drilldownType}
            customerData={customerData}
          />

          {/* Customer View - Table or Kanban */}
          {viewMode === 'table' ? (
            <CustomerSuccessTable 
              key={refreshKey} 
              companies={companies} 
              loading={loading || syncing} 
            />
          ) : (
            <div className="space-y-4">
              {/* Kanban Filter Toggle */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="hide-closed-kanban" className="text-sm font-medium cursor-pointer">
                    Hide Closed Accounts
                  </Label>
                  <Switch
                    id="hide-closed-kanban"
                    checked={hideClosedAccounts}
                    onCheckedChange={setHideClosedAccounts}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredKanbanData.length} of {customerData.length} companies
                </div>
              </div>
              
              <CustomerSuccessKanban 
                data={filteredKanbanData}
                loading={loading || syncing}
                onUpdate={handleKanbanUpdate}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
