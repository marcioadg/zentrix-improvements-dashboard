import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingDown, Users, Activity, Building2 } from 'lucide-react';
import type { CustomerSuccessRow } from '@/types/customerSuccess';

export type DrilldownType = 'mrr' | 'churn' | 'active' | 'atRisk' | null;

interface CustomerSuccessKPIDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: DrilldownType;
  customerData: CustomerSuccessRow[];
}

const EXCLUDED_ACCOUNT_STAGES = ['Internal Company', 'Test Company', 'Done', 'Churned'];

export const CustomerSuccessKPIDrilldownModal: React.FC<CustomerSuccessKPIDrilldownModalProps> = ({
  open,
  onOpenChange,
  type,
  customerData,
}) => {
  // Filter out closed accounts for most views
  const activeCustomerData = customerData.filter(
    c => !EXCLUDED_ACCOUNT_STAGES.includes(c.account_stage || '')
  );

  const getModalConfig = () => {
    switch (type) {
      case 'mrr':
        return {
          title: 'MRR Breakdown by Customer',
          description: 'All paying customers and their monthly recurring revenue from Stripe',
          icon: <DollarSign className="h-5 w-5 text-primary" />,
          data: activeCustomerData
            .filter(c => c.mrr > 0)
            .sort((a, b) => b.mrr - a.mrr),
          columns: ['company', 'mrr', 'tier', 'status'],
        };
      case 'churn':
        return {
          title: 'Churned Customers',
          description: 'Customers who have cancelled their subscription',
          icon: <TrendingDown className="h-5 w-5 text-destructive" />,
          data: customerData.filter(c => 
            c.subs_status === 'Cancelled' || c.account_stage === 'Churned' || c.account_stage === 'Done'
          ),
          columns: ['company', 'mrr', 'health', 'stage'],
        };
      case 'active':
        // Paying customers: those with MRR > 0 and paid subscription status
        const payingCustomers = activeCustomerData
          .filter(c => c.mrr > 0 && (c.subs_status === 'Active' || c.subs_status === 'Premium' || c.subs_status === 'Expired'))
          .sort((a, b) => {
            // Sort by payment status first (on time first), then by MRR
            const aOnTime = a.subs_status === 'Active' || a.subs_status === 'Premium';
            const bOnTime = b.subs_status === 'Active' || b.subs_status === 'Premium';
            if (aOnTime !== bOnTime) return bOnTime ? 1 : -1;
            return b.mrr - a.mrr;
          });
        return {
          title: 'Paying Customers',
          description: 'Customers with paid subscriptions and their payment status',
          icon: <Users className="h-5 w-5 text-chart-2" />,
          data: payingCustomers,
          columns: ['company', 'mrr', 'paymentStatus', 'health'],
        };
      case 'atRisk':
        return {
          title: 'At-Risk Customers',
          description: 'Customers with Not Good, Not bad/Not good, or Unhealthy status',
          icon: <Activity className="h-5 w-5 text-amber-500" />,
          data: activeCustomerData
            .filter(c => 
              c.customer_health === 'Not Good' || 
              c.customer_health === 'Not bad/ Not good' || 
              c.customer_health === 'Unhealthy'
            )
            .sort((a, b) => {
              // Sort by severity: Unhealthy first, then Not Good, then Not bad/Not good
              const healthOrder: Record<string, number> = {
                'Unhealthy': 0,
                'Not Good': 1,
                'Not bad/ Not good': 2,
              };
              return (healthOrder[a.customer_health || ''] || 3) - (healthOrder[b.customer_health || ''] || 3);
            }),
          columns: ['company', 'health', 'mrr', 'flags'],
        };
      default:
        return null;
    }
  };

  const config = getModalConfig();
  if (!config) return null;

  const getHealthBadgeColor = (health: string | null) => {
    switch (health) {
      case 'Healthy': return 'bg-green-600 text-white';
      case 'Fine': return 'bg-green-400 text-white';
      case 'Not bad/ Not good': return 'bg-purple-500 text-white';
      case 'Not Good': return 'bg-orange-500 text-white';
      case 'Unhealthy': return 'bg-destructive text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSubscriptionBadgeColor = (status: string | null) => {
    switch (status) {
      case 'Active':
      case 'Premium': return 'bg-green-600 text-white';
      case 'Free Trial': return 'bg-amber-500 text-white';
      case 'Expired': return 'bg-destructive text-white';
      case 'Cancelled': return 'bg-gray-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPaymentStatusBadge = (subsStatus: string | null) => {
    const isOnTime = subsStatus === 'Active' || subsStatus === 'Premium';
    return {
      label: isOnTime ? 'Paying' : 'Delayed',
      className: isOnTime ? 'bg-green-600 text-white' : 'bg-destructive text-white',
    };
  };

  const totalMRR = config.data.reduce((sum, c) => sum + c.mrr, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-sm">
            <span className="text-muted-foreground">Total Companies:</span>{' '}
            <span className="font-semibold">{config.data.length}</span>
          </div>
          {type === 'mrr' || type === 'active' || type === 'churn' ? (
            <div className="text-sm">
              <span className="text-muted-foreground">Total MRR:</span>{' '}
              <span className="font-semibold text-primary">${totalMRR.toFixed(2)}</span>
            </div>
          ) : null}
        </div>

        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-2">
            {config.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No customers found in this category
              </div>
            ) : (
              config.data.map((customer) => (
                <div
                  key={customer.company_id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{customer.company_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {customer.customer_tier || 'No tier'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* MRR */}
                    {config.columns.includes('mrr') && (
                      <div className="text-right min-w-[80px]">
                        <div className="font-semibold text-primary">
                          ${customer.mrr.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">MRR</div>
                      </div>
                    )}

                    {/* Health Badge */}
                    {config.columns.includes('health') && (
                      <Badge className={`${getHealthBadgeColor(customer.customer_health)} min-w-[90px] justify-center`}>
                        {customer.customer_health || 'Unknown'}
                      </Badge>
                    )}

                    {/* Subscription Status */}
                    {config.columns.includes('status') && (
                      <Badge className={`${getSubscriptionBadgeColor(customer.subs_status)} min-w-[80px] justify-center`}>
                        {customer.subs_status || 'Unknown'}
                      </Badge>
                    )}

                    {/* Payment Status (for paying customers view) */}
                    {config.columns.includes('paymentStatus') && (() => {
                      const status = getPaymentStatusBadge(customer.subs_status);
                      return (
                        <Badge className={`${status.className} min-w-[80px] justify-center`}>
                          {status.label}
                        </Badge>
                      );
                    })()}

                    {/* Account Stage */}
                    {config.columns.includes('stage') && (
                      <Badge variant="outline" className="min-w-[100px] justify-center">
                        {customer.account_stage || 'Unknown'}
                      </Badge>
                    )}

                    {/* Tier */}
                    {config.columns.includes('tier') && (
                      <Badge variant="secondary" className="min-w-[70px] justify-center">
                        {customer.customer_tier || '-'}
                      </Badge>
                    )}

                    {/* Red Flags */}
                    {config.columns.includes('flags') && customer.red_flags && customer.red_flags.length > 0 && (
                      <div className="flex gap-1">
                        {customer.red_flags.slice(0, 2).map((flag, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {flag}
                          </Badge>
                        ))}
                        {customer.red_flags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{customer.red_flags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
