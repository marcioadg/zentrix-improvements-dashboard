
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const PeopleLoading: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">People</h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            View all team members in your organization
          </p>
        </div>
      </div>
      
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="animate-pulse space-y-3 sm:space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-muted rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded-[4px] w-3/4 sm:w-1/4"></div>
                  <div className="h-3 bg-muted rounded-[4px] w-full sm:w-1/3 mt-1"></div>
                </div>
                <div className="h-8 w-20 bg-muted rounded-[4px] self-end sm:self-auto"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
