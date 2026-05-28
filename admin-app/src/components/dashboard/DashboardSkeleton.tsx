import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const DashboardSkeleton = () => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          
          {/* KPI Cards Skeleton */}
          <div className="lg:max-w-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                      <div className="flex items-baseline gap-1">
                        <Skeleton className="h-8 w-12" />
                        <Skeleton className="h-6 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Tasks Section Skeleton */}
        <div className="lg:col-span-3">
          <Card className="h-[500px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-fade-in flex items-center gap-3 p-3 border rounded-lg" style={{ animationDelay: `${(i - 1) * 40}ms` }}>
                  <Skeleton className="h-4 w-4 rounded-[4px]" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Goals Section Skeleton */}
        <div className="lg:col-span-3">
          <Card className="h-[500px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-fade-in p-4 border rounded-lg" style={{ animationDelay: `${(i - 1) * 40}ms` }}>
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-3 w-32 mb-2" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Metrics Section Skeleton */}
        <div className="lg:col-span-4">
          <Card className="h-[500px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <div className="border-b bg-muted/50 p-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="space-y-0">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-fade-in flex items-center justify-between p-3 border-b" style={{ animationDelay: `${(i - 1) * 40}ms` }}>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
