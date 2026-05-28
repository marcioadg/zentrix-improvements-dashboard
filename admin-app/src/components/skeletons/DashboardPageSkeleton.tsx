import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const DashboardPageSkeleton: React.FC = () => (
  <div className="p-8 space-y-12 max-w-7xl mx-auto animate-fade-in">
    {/* Header with Welcome and KPIs */}
    <div className="flex justify-between items-start">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-6 w-32" />
      </div>
      
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="animate-fade-in p-4 border rounded-[6px] bg-card space-y-2" style={{ animationDelay: `${index * 40}ms` }}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>

    {/* Main Dashboard Grid - 3 columns */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-[4px]" />
          <Skeleton className="h-6 w-20" />
        </div>
        
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-fade-in flex items-center gap-3 p-3 border rounded-[6px]" style={{ animationDelay: `${index * 40}ms` }}>
              <Skeleton className="w-4 h-4 rounded-[4px]" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goals Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-[4px]" />
          <Skeleton className="h-6 w-20" />
        </div>
        
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-fade-in p-3 border rounded-[6px] space-y-2" style={{ animationDelay: `${index * 40}ms` }}>
              <Skeleton className="h-4 w-4/5" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 flex-1" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-[4px]" />
          <Skeleton className="h-6 w-24" />
        </div>
        
        {/* Metrics table */}
        <div className="border rounded-[6px] overflow-hidden">
          {/* Table header */}
          <div className="border-b bg-muted/50 p-3">
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
          
          {/* Table rows */}
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-fade-in grid grid-cols-4 gap-4 p-3 border-b last:border-b-0" style={{ animationDelay: `${index * 40}ms` }}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
