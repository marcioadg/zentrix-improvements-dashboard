
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';

export const LongTermObjectiveSection: React.FC = () => {
  const { data, updateData } = useSimpleStrategy();

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-lg font-semibold">
          Long-Term Objective
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Where are we going?
        </p>
      </div>

      <div>
        <Textarea
          value={data.longTermObjective}
          onChange={(e) => updateData({ longTermObjective: e.target.value })}
          placeholder="In the future, we will..."
          autoResize
        />
      </div>
    </div>
  );
};
