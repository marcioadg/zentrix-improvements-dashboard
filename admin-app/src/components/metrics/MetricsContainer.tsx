
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricsContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const MetricsContainer: React.FC<MetricsContainerProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={`w-full ${className}`}>
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="md:overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="min-w-full">
              {children}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
