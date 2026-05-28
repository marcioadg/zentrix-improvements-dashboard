import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { AlertTriangle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CANCELLATION_REASONS = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'switching_tool', label: 'Switching to a different tool' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'too_complex', label: 'Too complex / hard to use' },
  { value: 'not_using_enough', label: 'Not using it enough' },
  { value: 'just_testing', label: 'Just testing / evaluating' },
  { value: 'team_downsizing', label: 'Company / team is downsizing' },
  { value: 'other', label: 'Other' },
];

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cancelImmediately: boolean, reason?: string, feedback?: string) => Promise<any>;
  subscriptionEndDate?: string;
  isLoading?: boolean;
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  subscriptionEndDate,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleConfirm = async () => {
    const result = await onConfirm(false, reason, feedback);
    if (result?.success) {
      onOpenChange(false);
      setReason('');
      setFeedback('');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason('');
      setFeedback('');
    }
    onOpenChange(open);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'the end of your billing period';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Before you go..."
      description="We'd love to know why you're leaving"
      onSubmit={handleConfirm}
      onCancel={() => onOpenChange(false)}
      submitText={isLoading ? 'Processing...' : 'Cancel subscription'}
      cancelText="Keep subscription"
      submitDisabled={!reason || isLoading}
      cancelDisabled={isLoading}
      loading={isLoading}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              You'll keep access until {formatDate(subscriptionEndDate)}
            </p>
            <p className="text-muted-foreground mt-1">
              After that, your subscription will end and no further charges will be made.
            </p>
          </div>
        </div>

        <RadioGroup value={reason} onValueChange={setReason}>
          <div className="space-y-2">
            {CANCELLATION_REASONS.map((r) => (
              <div
                key={r.value}
                className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
                <Label htmlFor={`reason-${r.value}`} className="cursor-pointer flex-1">
                  {r.label}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="space-y-2">
          <Label htmlFor="feedback" className="text-sm text-muted-foreground">
            Anything else you'd like to share? (optional)
          </Label>
          <Textarea
            id="feedback"
            placeholder="Tell us how we can improve..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </BaseModal>
  );
};
