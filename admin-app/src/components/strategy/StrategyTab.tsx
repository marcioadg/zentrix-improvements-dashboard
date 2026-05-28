import React from 'react';
import { PurposeSection } from './sections/PurposeSection';
import { CoreValuesSection } from './sections/CoreValuesSection';
import { LongTermObjectiveSection } from './sections/LongTermObjectiveSection';
import { ThreeYearMilestonesSection } from './sections/ThreeYearMilestonesSection';
import { UniqueEdgeSection } from './sections/UniqueEdgeSection';
import { MarketingSection } from './sections/MarketingSection';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StrategyTabProps {
  selectedTeamId: string | null;
  isLeadershipMember: boolean;
  hasStrategicPlan: boolean;
  isLeadershipTeam: boolean;
}
export const StrategyTab: React.FC<StrategyTabProps> = ({
  selectedTeamId,
  isLeadershipMember,
  hasStrategicPlan,
  isLeadershipTeam
}) => {
  const { isPreviewing, data, updateThreeYearDate } = useSimpleStrategy();

  // If no team is selected, this component won't render (handled by parent)
  if (!selectedTeamId) {
    return null;
  }

  // For non-leadership teams, show all sections but make strategic foundation read-only
  // Note: Do NOT use isFetching here — background refetches during autosave would
  // toggle read-only mode, applying pointer-events-none and killing input focus mid-typing
  const isReadOnlyMode = !isLeadershipMember || isPreviewing;

  // 3-Year Milestones can only be edited by leadership teams or teams with their own strategic plan
  const canEditThreeYear = (isLeadershipTeam || hasStrategicPlan) && !isPreviewing;

  return <div className="max-w-6xl mx-auto space-y-8">
      {/* Main content area with side-by-side layout */}
      <div className="flex gap-6 h-full">
        {/* Strategic Foundation - 3/5 width */}
        <Card className="flex-[3]" hover={false}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Strategic Foundation</CardTitle>
              {isReadOnlyMode && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        View Only
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPreviewing ? 'Read-only preview mode' : 'Only leadership teams can edit strategic foundation'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className={isReadOnlyMode ? 'pointer-events-none opacity-75' : ''}>
              <PurposeSection />
            </div>
            <div className={`border-t border-border pt-6 ${isReadOnlyMode ? 'pointer-events-none opacity-75' : ''}`}>
              <CoreValuesSection />
            </div>
            <div className={`border-t border-border pt-6 ${isReadOnlyMode ? 'pointer-events-none opacity-75' : ''}`}>
              <LongTermObjectiveSection />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-[2]" hover={false}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="whitespace-nowrap">3-Year Milestones</CardTitle>
              <div className="flex items-center gap-2">
                <DatePicker
                  date={data.threeYearMilestones.targetDate}
                  onSelect={updateThreeYearDate}
                  placeholder="Target date"
                />
                {!canEditThreeYear && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          View Only
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isPreviewing ? 'Read-only preview mode' : 'Only leadership teams or teams with their own strategic plan can edit 3-Year Milestones'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className={!canEditThreeYear ? 'pointer-events-none opacity-75' : ''}>
            <ThreeYearMilestonesSection teamId={selectedTeamId} />
          </CardContent>
        </Card>
      </div>

      {/* Marketing Section - Full Width */}
      <Card hover={false}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Marketing Strategy</CardTitle>
            {!canEditThreeYear && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      View Only
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isPreviewing ? 'Read-only preview mode' : 'Only leadership teams or teams with their own strategic plan can edit it'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent className={!canEditThreeYear ? 'pointer-events-none opacity-75' : ''}>
          <MarketingSection teamId={selectedTeamId} />
        </CardContent>
      </Card>
    </div>;
};