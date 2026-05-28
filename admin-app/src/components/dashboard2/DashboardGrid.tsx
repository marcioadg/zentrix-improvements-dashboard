import React, { memo } from 'react';

interface DashboardGridProps {
  children: React.ReactNode;
}

export const DashboardGrid: React.FC<DashboardGridProps> = memo(({ children }) => {
  return (
    <div 
      className="grid w-full gap-6 sm:gap-5 md:gap-6"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        minHeight: '600px'
      }}
    >
      {children}
    </div>
  );
});

DashboardGrid.displayName = 'DashboardGrid';