
import React from 'react';
import { OneYearGoalsSection } from './sections/OneYearGoalsSection';
import { QuarterlyGoalsSection } from './sections/QuarterlyGoalsSection';
import { YearlyGoalsSection } from './sections/YearlyGoalsSection';
import { IssuesSection } from './sections/IssuesSection';
import { DatePicker } from '@/components/ui/date-picker';
import { CalendarIcon } from 'lucide-react';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExecutionTabProps {
  selectedTeamId: string | null;
  isLeadershipMember: boolean;
  hasStrategicPlan: boolean;
  isLeadershipTeam: boolean;
}

export const ExecutionTab: React.FC<ExecutionTabProps> = ({ 
  selectedTeamId,
  isLeadershipMember,
  hasStrategicPlan,
  isLeadershipTeam
}) => {
  const { data, updateOneYearDate, updateQuarterlyGoals, isPreviewing } = useSimpleStrategy();

  // If no team is selected, this component won't render (handled by parent)
  if (!selectedTeamId) {
    return null;
  }

  // Annual Goals and Quarterly Focus can only be edited by leadership teams or teams with their own strategic plan
  // Note: Do NOT use isFetching here — background refetches during autosave would
  // toggle edit mode off, applying pointer-events-none and killing input focus mid-typing
  const canEditExecution = (isLeadershipTeam || hasStrategicPlan) && !isPreviewing;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Two-column layout for Annual and Quarterly goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Annual Goals */}
        <Card hover={false}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Annual Goals</CardTitle>
              <div className="flex items-center gap-3">
                {!canEditExecution && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          View Only
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isPreviewing ? 'Read-only preview mode' : 'Only leadership teams or teams with their own strategic plan can edit Annual Goals'}</p>

                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <div className={!canEditExecution ? 'pointer-events-none opacity-75' : ''}>
                  <DatePicker
                    date={data.oneYearGoals.targetDate}
                    onSelect={updateOneYearDate}
                    placeholder="Target date"
                    className="w-48"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className={`space-y-8 ${!canEditExecution ? 'pointer-events-none opacity-75' : ''}`}>
            <OneYearGoalsSection />
            <YearlyGoalsSection />
          </CardContent>
        </Card>

        {/* Right Column - Quarterly Focus */}
        <Card hover={false}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Quarterly Focus</CardTitle>
              <div className="flex items-center gap-3">
                {!canEditExecution && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          View Only
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isPreviewing ? 'Read-only preview mode' : 'Only leadership teams or teams with their own strategic plan can edit Quarterly Focus'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <div className={!canEditExecution ? 'pointer-events-none opacity-75' : ''}>
                  <DatePicker
                    date={data.quarterlyGoals.targetDate}
                    onSelect={(date) => updateQuarterlyGoals({ targetDate: date })}
                    placeholder="Target date"
                    className="w-48"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className={!canEditExecution ? 'pointer-events-none opacity-75' : ''}>
            <QuarterlyGoalsSection />
          </CardContent>
        </Card>
      </div>

      {/* Full-width Issues List */}
      <Card hover={false}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Issues</CardTitle>
            {isPreviewing && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      View Only
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Read-only preview mode</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent className={isPreviewing ? 'pointer-events-none opacity-75' : ''}>
          <IssuesSection selectedTeamId={selectedTeamId} />
        </CardContent>
      </Card>
    </div>
  );
};
