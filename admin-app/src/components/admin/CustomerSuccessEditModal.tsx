import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Building2, DollarSign, AlertTriangle, Info, Clock, User, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateCustomerSuccess } from '@/services/customerSuccessService';
import type { CustomerSuccessRow } from '@/types/customerSuccess';
import {
  ACCOUNT_STAGE_OPTIONS,
  CUSTOMER_MIGRATION_OPTIONS,
  CUSTOMER_HEALTH_OPTIONS,
  WHATSAPP_GROUP_OPTIONS,
  ONBOARDING_VIDEO_OPTIONS,
  SUBS_STATUS_OPTIONS,
} from '@/types/customerSuccess';
import { format, differenceInDays } from 'date-fns';

interface CustomerSuccessEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerSuccessRow | null;
  onUpdate: (companyId: string, updates: Partial<CustomerSuccessRow>) => void;
}

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

export const CustomerSuccessEditModal: React.FC<CustomerSuccessEditModalProps> = ({
  open,
  onOpenChange,
  customer,
  onUpdate,
}) => {
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [localNotes, setLocalNotes] = useState(customer?.customer_status_notes || '');
  const { toast } = useToast();

  // Update local notes when customer changes
  React.useEffect(() => {
    setLocalNotes(customer?.customer_status_notes || '');
  }, [customer?.customer_status_notes]);

  if (!customer) return null;

  const handleFieldUpdate = async (field: string, value: string | null) => {
    setSaving(prev => new Set(prev).add(field));

    const result = await updateCustomerSuccess(customer.company_id, {
      [field]: value,
    });

    setSaving(prev => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });

    if (result.success) {
      onUpdate(customer.company_id, { [field]: value });
      toast({
        title: 'Success',
        description: 'Customer data updated',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update',
        variant: 'destructive',
      });
    }
  };

  const handleNotesUpdate = async () => {
    await handleFieldUpdate('customer_status_notes', localNotes);
  };

  const renderSelectField = (
    label: string,
    field: string,
    value: string | null,
    options: readonly { value: string; color: string }[]
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select
        value={value || ''}
        onValueChange={(val) => handleFieldUpdate(field, val)}
        disabled={saving.has(field)}
      >
        <SelectTrigger className="w-full bg-background">
          {saving.has(field) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SelectValue placeholder="Select..." />
          )}
        </SelectTrigger>
        <SelectContent className="bg-background">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                {option.value}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <span>{customer.company_name}</span>
            <Badge className={getTierBadgeClass(customer.customer_tier)}>
              Tier {customer.customer_tier}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Admin/Responsible Info */}
          {(customer.admin_name || customer.admin_email) && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="text-xs font-medium text-primary mb-2">Company Responsible</div>
              <div className="flex flex-col gap-1">
                {customer.admin_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{customer.admin_name}</span>
                  </div>
                )}
                {customer.admin_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${customer.admin_email}`} 
                      className="text-primary hover:underline"
                    >
                      {customer.admin_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Read-only Info Section */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">MRR:</span>
              <span className="font-medium">${customer.mrr.toFixed(2)}</span>
            </div>
            
            {customer.health_score !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Health Score:</span>
                <span className="font-medium">{customer.health_score}/100</span>
                {customer.health_score_label && (
                  <span className="text-xs text-muted-foreground">({customer.health_score_label})</span>
                )}
              </div>
            )}

            {/* Trial Info */}
            {customer.subs_status === 'Free Trial' && customer.trial_end && (
              <div className="col-span-2 flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-sm">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-700 dark:text-amber-400">In Trial</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {(() => {
                    const daysLeft = differenceInDays(new Date(customer.trial_end), new Date());
                    if (daysLeft <= 0) return 'Expired';
                    if (daysLeft === 1) return '1 day left';
                    return `${daysLeft} days left`;
                  })()}
                </span>
                <span className="text-muted-foreground">
                  (ends {format(new Date(customer.trial_end), 'MMM d, yyyy')})
                </span>
              </div>
            )}
          </div>

          {/* Health Explanation */}
          {customer.health_explanation && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground capitalize">{customer.health_explanation}</p>
            </div>
          )}

          {/* Red Flags */}
          {customer.red_flags && customer.red_flags.length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
              <div className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Red Flags
              </div>
              {customer.red_flags.map((flag, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-destructive/80">
                  <span>• {flag}</span>
                </div>
              ))}
            </div>
          )}

          {/* Editable Fields */}
          <div className="grid grid-cols-2 gap-4">
            {renderSelectField('Account Stage', 'account_stage', customer.account_stage, ACCOUNT_STAGE_OPTIONS)}
            {renderSelectField('Customer Migration', 'customer_migration', customer.customer_migration, CUSTOMER_MIGRATION_OPTIONS)}
            {renderSelectField('WhatsApp Group', 'whatsapp_group', customer.whatsapp_group, WHATSAPP_GROUP_OPTIONS)}
            {renderSelectField('Onboarding Video', 'onboarding_video', customer.onboarding_video, ONBOARDING_VIDEO_OPTIONS)}
            {renderSelectField('Subscription Status', 'subs_status', customer.subs_status, SUBS_STATUS_OPTIONS)}
            
            {/* Customer Health - Read Only */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Customer Health</Label>
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      CUSTOMER_HEALTH_OPTIONS.find(opt => opt.value === customer.customer_health)?.color || 'hsl(var(--muted))',
                  }}
                />
                <span className="text-sm">
                  {customer.customer_health || 'N/A'}
                </span>
                <span className="text-xs text-muted-foreground">(Auto-calculated)</span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Customer Status Notes</Label>
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Add status updates, notes, or action items..."
              className="min-h-[120px] bg-background resize-y"
            />
            <Button
              onClick={handleNotesUpdate}
              disabled={saving.has('customer_status_notes') || localNotes === customer.customer_status_notes}
              className="w-full"
            >
              {saving.has('customer_status_notes') ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notes
                </>
              )}
            </Button>
          </div>

          {/* Suggested Actions */}
          {customer.suggested_actions && customer.suggested_actions.length > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <div className="text-sm font-medium text-primary">Suggested Actions</div>
              {customer.suggested_actions.map((action, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  • {action}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
