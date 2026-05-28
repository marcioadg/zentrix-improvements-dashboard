import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, DollarSign, AlertTriangle, Info, Lightbulb, Loader2, Clock, User, Mail } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { updateCustomerSuccess } from '@/services/customerSuccessService';
import type { CustomerSuccessRow } from '@/types/customerSuccess';
import { CUSTOMER_HEALTH_OPTIONS, ACCOUNT_STAGE_OPTIONS } from '@/types/customerSuccess';
import { format, differenceInDays } from 'date-fns';
import { CustomerSuccessEditModal } from './CustomerSuccessEditModal';

interface CustomerSuccessKanbanProps {
  data: CustomerSuccessRow[];
  loading: boolean;
  onUpdate?: (companyId: string, field: string, value: string) => void;
}

// Define columns in order from worst to best health
const KANBAN_COLUMNS = [
  { value: 'Unhealthy', label: 'Unhealthy', scoreLabel: 'Critical' },
  { value: 'Not Good', label: 'Not Good', scoreLabel: 'At Risk' },
  { value: 'Not bad/ Not good', label: 'Not bad/ Not good', scoreLabel: 'Fair' },
  { value: 'Fine', label: 'Fine', scoreLabel: 'Good' },
  { value: 'Healthy', label: 'Healthy', scoreLabel: 'Excellent' },
];

const getColumnColor = (value: string) => {
  const option = CUSTOMER_HEALTH_OPTIONS.find(opt => opt.value === value);
  return option?.color || 'hsl(var(--muted))';
};

const getTierBadgeClass = (tier: 1 | 2 | 3) => {
  switch (tier) {
    case 1:
      return 'bg-primary text-primary-foreground';
    case 2:
      return 'bg-secondary text-secondary-foreground';
    case 3:
      return 'bg-muted text-muted-foreground';
  }
};

export const CustomerSuccessKanban: React.FC<CustomerSuccessKanbanProps> = ({
  data,
  loading,
  onUpdate,
}) => {
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSuccessRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const handleCardClick = (item: CustomerSuccessRow, e: React.MouseEvent) => {
    // Don't open modal if clicking on the select dropdown
    const target = e.target as HTMLElement;
    if (target.closest('[role="combobox"]') || target.closest('[role="listbox"]')) {
      return;
    }
    setSelectedCustomer(item);
    setModalOpen(true);
  };

  const handleModalUpdate = (companyId: string, updates: Partial<CustomerSuccessRow>) => {
    // Update local state and notify parent
    Object.entries(updates).forEach(([field, value]) => {
      onUpdate?.(companyId, field, value as string);
    });
    
    // Update selected customer state for modal
    if (selectedCustomer && selectedCustomer.company_id === companyId) {
      setSelectedCustomer(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleAccountStageUpdate = async (companyId: string, value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(prev => new Set(prev).add(companyId));
    
    const result = await updateCustomerSuccess(companyId, { account_stage: value });
    
    setSaving(prev => {
      const next = new Set(prev);
      next.delete(companyId);
      return next;
    });

    if (result.success) {
      onUpdate?.(companyId, 'account_stage', value);
      toast({
        title: 'Success',
        description: 'Account stage updated',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Group data by customer_health
  const groupedData = KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.value] = data.filter(row => row.customer_health === column.value);
    return acc;
  }, {} as Record<string, CustomerSuccessRow[]>);

  return (
    <TooltipProvider>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map(column => {
          const items = groupedData[column.value] || [];
          const columnColor = getColumnColor(column.value);
          const totalMRR = items.reduce((sum, item) => sum + item.mrr, 0);

          return (
            <div
              key={column.value}
              className="flex-shrink-0 w-[300px] flex flex-col bg-muted/30 rounded-lg border border-border"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: columnColor }}
                  />
                  <h3 className="font-semibold text-sm">{column.label}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({column.scoreLabel})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{items.length} companies</span>
                  <span className="font-medium">${totalMRR.toFixed(0)} MRR</span>
                </div>
              </div>

              {/* Column Content */}
              <ScrollArea className="flex-1 max-h-[500px]">
                <div className="p-2 space-y-2">
                  {items.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No companies
                    </div>
                  ) : (
                    items.map(item => (
                      <Card
                        key={item.company_id}
                        className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all bg-card"
                        onClick={(e) => handleCardClick(item, e)}
                      >
                        <CardContent className="p-3">
                          {/* Header with name and tier */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate">
                                {item.company_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {item.health_score !== undefined && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs">
                                      {item.health_score}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Health Score: {item.health_score}/100</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Badge className={`${getTierBadgeClass(item.customer_tier)} text-xs`}>
                                T{item.customer_tier}
                              </Badge>
                            </div>
                          </div>

                          {/* Admin/Responsible Info */}
                          {(item.admin_name || item.admin_email) && (
                            <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {item.admin_name || item.admin_email}
                              </span>
                            </div>
                          )}

                          {/* In Trial Badge with end date */}
                          {item.subs_status === 'Free Trial' && item.trial_end && (
                            <div className="flex items-center gap-1.5 mb-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs">
                              <Clock className="h-3 w-3 text-amber-600 flex-shrink-0" />
                              <span className="font-medium text-amber-700 dark:text-amber-400">In Trial</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">
                                {(() => {
                                  const daysLeft = differenceInDays(new Date(item.trial_end), new Date());
                                  if (daysLeft <= 0) return 'Expired';
                                  if (daysLeft === 1) return '1 day left';
                                  return `${daysLeft} days left`;
                                })()}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-muted-foreground cursor-help">
                                    ({format(new Date(item.trial_end), 'MMM d')})
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Trial ends: {format(new Date(item.trial_end), 'PPP')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}

                          {/* Health Explanation */}
                          {item.health_explanation && (
                            <div className="flex items-start gap-1.5 mb-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="capitalize">{item.health_explanation}</span>
                            </div>
                          )}

                          {/* Red Flags */}
                          {item.red_flags && item.red_flags.length > 0 && (
                            <div className="mb-2 space-y-1">
                              {item.red_flags.map((flag, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1.5 text-xs text-destructive"
                                >
                                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                  <span>{flag}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Stats */}
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>MRR</span>
                              </div>
                              <span className="font-medium text-foreground">
                                ${item.mrr.toFixed(2)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>Stage</span>
                              <Select
                                value={item.account_stage || ''}
                                onValueChange={(value) => {
                                  const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
                                  handleAccountStageUpdate(item.company_id, value, fakeEvent);
                                }}
                                disabled={saving.has(item.company_id)}
                              >
                                <SelectTrigger 
                                  className="h-7 w-[130px] text-xs bg-background"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {saving.has(item.company_id) ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <SelectValue placeholder="Select..." />
                                  )}
                                </SelectTrigger>
                                <SelectContent className="bg-background">
                                  {ACCOUNT_STAGE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: option.color }}
                                        />
                                        <span className="text-xs">{option.value}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {item.subs_status && (
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Status</span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    item.subs_status === 'Premium'
                                      ? 'border-green-500 text-success'
                                      : item.subs_status === 'Expired'
                                      ? 'border-red-500 text-destructive'
                                      : 'border-yellow-500 text-warning'
                                  }`}
                                >
                                  {item.subs_status}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          {item.customer_status_notes && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2 border-t border-border pt-2">
                              {item.customer_status_notes}
                            </p>
                          )}

                          {/* Suggested Actions */}
                          {item.suggested_actions && item.suggested_actions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border space-y-1">
                              <div className="flex items-center gap-1 text-xs font-medium text-primary">
                                <Lightbulb className="h-3 w-3" />
                                <span>Suggested Actions</span>
                              </div>
                              {item.suggested_actions.map((action, index) => (
                                <div
                                  key={index}
                                  className="text-xs text-muted-foreground pl-4"
                                >
                                  • {action}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <CustomerSuccessEditModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        customer={selectedCustomer}
        onUpdate={handleModalUpdate}
      />
    </TooltipProvider>
  );
};
