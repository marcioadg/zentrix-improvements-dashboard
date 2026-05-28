import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket } from 'lucide-react';
import { SimpleStrategyProvider, useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { ThreeYearMilestonesSection } from '@/components/strategy/sections/ThreeYearMilestonesSection';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';

interface AnnualThreeYearGoalsSectionProps {
  teamId: string;
}

const ThreeYearGoalsContent: React.FC<{ teamId: string }> = ({ teamId }) => {
  const { data, updateThreeYearDate } = useSimpleStrategy();

  const targetDateText = data.threeYearMilestones.targetDate 
    ? format(data.threeYearMilestones.targetDate, 'MMMM yyyy')
    : '3 years';

  return (
    <div className="space-y-6">
      <div className="relative mb-8">
        {/* DatePicker at top right */}
        <div className="absolute top-0 right-0">
          <DatePicker
            date={data.threeYearMilestones.targetDate}
            onSelect={updateThreeYearDate}
            placeholder="Target date"
            className="rounded-lg"
          />
        </div>
        
        {/* Centered header content */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Rocket className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">3-Year Goals</h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Define where your company will be in {targetDateText}. Set specific, measurable targets 
            for revenue, profit, and key metrics.
          </p>
        </div>
      </div>

      {/* Strategy 3-Year Milestones Section */}
      <ThreeYearMilestonesSection />

      {/* Discussion Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>Discussion Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">Stretch vs. Achievable</p>
              <p className="text-sm text-muted-foreground">
                Are these targets ambitious enough? Are they realistic?
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">Resource Requirements</p>
              <p className="text-sm text-muted-foreground">
                What resources (people, capital, technology) do we need?
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">Biggest Obstacles</p>
              <p className="text-sm text-muted-foreground">
                What could prevent us from achieving these goals?
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">Market Assumptions</p>
              <p className="text-sm text-muted-foreground">
                What assumptions about the market are we making?
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const AnnualThreeYearGoalsSection: React.FC<AnnualThreeYearGoalsSectionProps> = ({ teamId }) => {
  return (
    <SimpleStrategyProvider teamId={teamId}>
      <ThreeYearGoalsContent teamId={teamId} />
    </SimpleStrategyProvider>
  );
};

export default AnnualThreeYearGoalsSection;
