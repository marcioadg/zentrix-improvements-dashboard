
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SwotSection } from './sections/SwotSection';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logger } from '@/utils/logger';

interface SwotTabProps {
  selectedTeamId: string | null;
  isLeadershipMember: boolean;
  hasStrategicPlan: boolean;
  isLeadershipTeam: boolean;
}

export const SwotTab: React.FC<SwotTabProps> = ({ 
  selectedTeamId,
  isLeadershipMember,
  hasStrategicPlan,
  isLeadershipTeam
}) => {
  const { isPreviewing, isFetching } = useSimpleStrategy();
  
  // Determine if user can edit SWOT analysis
  const isReadOnlyMode = selectedTeamId && !isLeadershipMember && !hasStrategicPlan || isPreviewing || isFetching;
  
  logger.log('🔍 SwotTab permissions:', {
    selectedTeamId,
    isLeadershipMember,
    hasStrategicPlan,
    isReadOnlyMode
  });

  return (
    <TooltipProvider>
      <div className="space-y-8 pb-6">
        {/* Header */}
        {isReadOnlyMode && (
          <div className="text-[13px] text-muted-foreground">(View Only)</div>
        )}

        {/* SWOT Grid */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${isReadOnlyMode ? 'opacity-60 pointer-events-none' : ''}`}>
          {/* Strengths */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Strengths</h3>
            <div className="bg-card/50 rounded-lg border border-border/50 p-4">
              <SwotSection 
                category="strengths" 
                placeholder="What advantages does your organization have?"
                color="neutral"
              />
            </div>
          </div>

          {/* Weaknesses */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Weaknesses</h3>
            <div className="bg-card/50 rounded-lg border border-border/50 p-4">
              <SwotSection 
                category="weaknesses" 
                placeholder="What areas need improvement?"
                color="neutral"
              />
            </div>
          </div>

          {/* Opportunities */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Opportunities</h3>
            <div className="bg-card/50 rounded-lg border border-border/50 p-4">
              <SwotSection 
                category="opportunities" 
                placeholder="What external opportunities can you leverage?"
                color="neutral"
              />
            </div>
          </div>

          {/* Threats */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Threats</h3>
            <div className="bg-card/50 rounded-lg border border-border/50 p-4">
              <SwotSection 
                category="threats" 
                placeholder="What external threats should you be aware of?"
                color="neutral"
              />
            </div>
          </div>
        </div>

        {/* No team selected message */}
        {!selectedTeamId && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-sm">Please select a team to access SWOT analysis data.</p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
