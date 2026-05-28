
import React from 'react';
import { MetricsPageHeader } from './MetricsPageHeader';
import { MetricsTableSkeleton } from '@/components/ui/skeleton-layouts';

export const MetricsPageLoadingState: React.FC = () => {
  return (
    <div className="space-y-6">
      <MetricsPageHeader />
      <MetricsTableSkeleton />
    </div>
  );
};
