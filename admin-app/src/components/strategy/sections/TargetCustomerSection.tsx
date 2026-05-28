
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';

export const TargetCustomerSection: React.FC = () => {
  const { data, updateData } = useSimpleStrategy();

  const updateCustomer = (field: keyof typeof data.targetCustomer, value: string) => {
    updateData({
      targetCustomer: {
        ...data.targetCustomer,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">
          Target Customer Profile
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Who are we serving?
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="demographics">Demographics</Label>
          <Textarea
            id="demographics"
            value={data.targetCustomer.demographics}
            onChange={(e) => updateCustomer('demographics', e.target.value)}
            placeholder="Age, location, income, company size, industry..."
            autoResize
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="psychographics">Psychographics</Label>
          <Textarea
            id="psychographics"
            value={data.targetCustomer.psychographics}
            onChange={(e) => updateCustomer('psychographics', e.target.value)}
            placeholder="Values, attitudes, interests, lifestyle, motivations..."
            autoResize
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="behavior">Behavior</Label>
          <Textarea
            id="behavior"
            value={data.targetCustomer.behavior}
            onChange={(e) => updateCustomer('behavior', e.target.value)}
            placeholder="How they buy, use products, make decisions..."
            autoResize
          />
        </div>
      </div>
    </div>
  );
};
