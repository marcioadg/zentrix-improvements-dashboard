
import React from 'react';
import { useOptimisticOwnership } from '@/hooks/useOptimisticOwnership';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

export const OptimisticStatusIndicator: React.FC = () => {
  const { getPendingChanges } = useOptimisticOwnership();
  const pendingChanges = getPendingChanges();

  if (pendingChanges.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg p-3 max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Syncing Changes</span>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {pendingChanges.map((change) => (
          <div key={change.id} className="flex items-center gap-2">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
            <span>
              {change.originalOwnerName} → {change.newOwnerName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
