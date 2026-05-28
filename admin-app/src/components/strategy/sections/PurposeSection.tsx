
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';

export const PurposeSection: React.FC = () => {
  const { data, updateData } = useSimpleStrategy();

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="purpose" className="text-lg font-semibold">
          Purpose Statement
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Why do we exist beyond making money?
        </p>
      </div>
      <Textarea
        id="purpose"
        value={data.purpose}
        onChange={(e) => updateData({ purpose: e.target.value })}
        placeholder="Our purpose is to..."
        className="text-base"
        autoResize
      />
    </div>
  );
};
