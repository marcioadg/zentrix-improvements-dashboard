
import React from 'react';
import { EnhancedSkeleton, SkeletonText, SkeletonCircle } from './enhanced-skeleton';

export const MetricsTableSkeleton: React.FC = () => {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg bg-card">
          <div className="w-6 h-6">
            <EnhancedSkeleton width={24} height={24} />
          </div>
          <div className="flex-1">
            <SkeletonText width="60%" />
          </div>
          <div className="w-20">
            <SkeletonText />
          </div>
          <div className="flex space-x-2">
            {Array.from({ length: 4 }, (_, j) => (
              <div key={j} className="w-16">
                <SkeletonText size="sm" />
              </div>
            ))}
          </div>
          <div className="w-8">
            <EnhancedSkeleton width={32} height={32} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TeamMemberCardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg bg-card">
          <SkeletonCircle size="lg" />
          <div className="flex-1 space-y-2">
            <SkeletonText width="40%" />
            <SkeletonText width="60%" size="sm" />
          </div>
          <div className="w-24">
            <SkeletonText size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TaskItemSkeleton: React.FC = () => {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="p-4 border rounded-lg bg-card space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonText width="50%" />
            <EnhancedSkeleton width={60} height={24} variant="card" />
          </div>
          <SkeletonText lines={2} size="sm" />
          <div className="flex items-center space-x-4 pt-2">
            <SkeletonCircle size="sm" />
            <SkeletonText width="30%" size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const IssueItemSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3 border rounded-md bg-card">
          <div className="w-4">
            <EnhancedSkeleton width={16} height={16} />
          </div>
          <div className="flex-1">
            <SkeletonText width="70%" />
          </div>
          <SkeletonCircle size="sm" />
          <div className="w-20">
            <SkeletonText size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DashboardCardSkeleton: React.FC = () => {
  return (
    <div className="p-6 border rounded-lg bg-card space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonText width="40%" />
        <EnhancedSkeleton width={24} height={24} />
      </div>
      <div className="space-y-3">
        <SkeletonText lines={3} />
      </div>
      <div className="flex justify-between items-center pt-4">
        <SkeletonText width="30%" size="sm" />
        <EnhancedSkeleton width={80} height={32} variant="card" />
      </div>
    </div>
  );
};

export const KanbanColumnSkeleton: React.FC = () => {
  return (
    <div className="bg-muted rounded-lg p-4 space-y-3">
      <SkeletonText width="60%" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-card rounded-lg p-3 space-y-2">
            <SkeletonText width="80%" />
            <SkeletonText lines={2} size="sm" />
            <div className="flex justify-between items-center pt-2">
              <SkeletonCircle size="sm" />
              <EnhancedSkeleton width={50} height={20} variant="card" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
