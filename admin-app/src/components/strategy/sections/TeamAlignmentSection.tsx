
import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';

export const TeamAlignmentSection: React.FC = () => {
  const { data } = useSimpleStrategy();

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">
          Team Alignment
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          How teams align with quarterly priorities
        </p>
      </div>

      <div className="space-y-4">
        {data.quarterlyPriorities.length > 0 ? (
          data.quarterlyPriorities.map((priority) => (
            <div key={priority.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{priority.title}</h4>
                <Badge variant="outline">
                  {priority.owner || 'No owner'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Due: {priority.deadline || 'No deadline set'}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Add quarterly priorities first to see team alignment.</p>
          </div>
        )}
      </div>
    </div>
  );
};
