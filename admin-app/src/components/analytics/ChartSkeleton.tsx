import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const ChartSkeleton: React.FC = () => {
  return (
    <Card className="border border-border/40 shadow-md rounded-xl">
      <CardHeader className="pb-4">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-96 w-full skeleton-shimmer" />
      </CardContent>
    </Card>
  );
};
