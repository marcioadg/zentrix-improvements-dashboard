import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CompanyWithStats } from '@/hooks/useCompanyManagement';

interface CompanyStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyWithStats | null;
  onConfirm: (status: 'Free' | 'Trial' | 'Paid', trialMonths?: number) => Promise<void>;
}

export const CompanyStatusModal = ({
  open,
  onOpenChange,
  company,
  onConfirm,
}: CompanyStatusModalProps) => {
  const [status, setStatus] = useState<'Free' | 'Trial' | 'Paid'>(
    (company?.status === 'Blocked' ? 'Free' : company?.status) || 'Free'
  );
  const [trialMonths, setTrialMonths] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(status, status === 'Trial' ? trialMonths : undefined);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Company Status</DialogTitle>
          <DialogDescription>
            Update the subscription status for {company.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Free">Free</SelectItem>
                <SelectItem value="Trial">Trial</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === 'Trial' && (
            <div className="space-y-2">
              <Label htmlFor="trial-months">Trial Duration (Months)</Label>
              <Input
                id="trial-months"
                type="number"
                min={1}
                max={12}
                value={trialMonths}
                onChange={(e) => setTrialMonths(parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-muted-foreground">
                Trial will expire in {trialMonths} month{trialMonths !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {status === 'Paid' && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Setting status to Paid will mark the company as having an active subscription.
                For actual Stripe integration, use the billing management features.
              </p>
            </div>
          )}

          {status === 'Free' && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Setting status to Free will remove any trial or subscription benefits.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
