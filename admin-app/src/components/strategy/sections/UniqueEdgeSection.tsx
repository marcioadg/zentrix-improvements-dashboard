
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';

export const UniqueEdgeSection: React.FC = () => {
  const { data, updateData } = useSimpleStrategy();

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="uniqueEdge" className="text-base font-semibold">
          Niche / Unique Edge
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          What sets us apart from the competition?
        </p>
      </div>
      <Textarea
        id="uniqueEdge"
        value={data.uniqueEdge}
        onChange={(e) => updateData({ uniqueEdge: e.target.value })}
        placeholder="Our competitive advantage is..."
        autoResize
      />
    </div>
  );
};
