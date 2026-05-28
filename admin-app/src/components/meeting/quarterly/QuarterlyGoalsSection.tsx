import React from "react";
import { useParams } from 'react-router-dom';
import { QuarterlyGoalsContent } from '@/components/shared/QuarterlyGoalsContent';

export const QuarterlyGoalsSection: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* STICKY HEADER - "Quarterly Goals" title */}
      <div className="sticky top-0 bg-background z-10 border-b border-border/30 pb-4">
        <h2 className="text-2xl font-bold">Quarterly Goals</h2>
      </div>
      
      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-hidden pt-4">
        <QuarterlyGoalsContent showHeader={false} teamId={teamId} />
      </div>
    </div>
  );
};

export default QuarterlyGoalsSection;
