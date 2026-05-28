
import React from 'react';
import { Users } from 'lucide-react';
import { MetricsPageHeader } from './MetricsPageHeader';
import { EmptyState } from '@/components/ui/empty-state';

export const MetricsPageEmptyState: React.FC = () => {
  return (
    <div className="space-y-6">
      <MetricsPageHeader />
      <EmptyState
        icon={Users}
        title="No teams yet"
        description="Ask your admin for team access. You can track personal goals from your dashboard."
      />
    </div>
  );
};
