import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TaskCardSkeleton = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-muted rounded-[4px] w-20 animate-pulse"></div>
        <div className="h-6 bg-muted rounded-[4px] w-16 animate-pulse"></div>
      </div>
      
      <div className="flex-1 min-h-0">
        <div className="space-y-3 pr-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 py-3 px-2">
              <div className="w-4 h-4 bg-muted rounded-[4px] animate-pulse mt-0.5"></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className={`h-4 bg-muted rounded-[4px] animate-pulse ${
                    index === 0 ? 'w-32' : 
                    index === 1 ? 'w-24' : 
                    index === 2 ? 'w-28' : 
                    index === 3 ? 'w-20' : 'w-26'
                  }`}></div>
                  <div className="h-3 bg-muted rounded-[4px] w-12 animate-pulse"></div>
                </div>
                <div className="h-3 bg-muted rounded-[4px] w-16 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};