
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Lightbulb } from 'lucide-react';
import { SimpleStrategyProvider } from '@/contexts/SimpleStrategyContext';
import { QuarterlyGoalsSection } from '@/components/strategy/sections/QuarterlyGoalsSection';
import { CombinedGoalsBoard } from '@/components/shared/CombinedGoalsBoard';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';

interface Annual90DayPrioritiesSectionProps {
  teamId: string;
}

const QuarterlyFocusContent: React.FC<{ teamId: string }> = ({ teamId }) => {
  const { teams } = useOptimizedUserTeams();

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Target className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Quarterly Focus</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Set quarterly targets and align goals for the next 90 days.
        </p>
      </div>

      {/* Quarterly Targets - Revenue, Profit, Key Metrics */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Quarterly Targets</h3>
          <QuarterlyGoalsSection teamId={teamId} />
        </CardContent>
      </Card>

      {/* Goals from /goals page */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Goals</h3>
          <CombinedGoalsBoard 
            teams={teams}
            teamId={teamId}
          />
        </CardContent>
      </Card>

      {/* Planning Tips */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-3">
              <h4 className="font-medium">Quarterly Planning Tips</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="p-3 bg-background rounded-lg">
                  <p className="font-medium text-foreground mb-1">Set clear targets</p>
                  <p>Define specific revenue & profit goals for the quarter</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="font-medium text-foreground mb-1">Align goals to targets</p>
                  <p>Each goal should contribute to quarterly targets</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="font-medium text-foreground mb-1">Assign clear owners</p>
                  <p>One person accountable for each goal</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="font-medium text-foreground mb-1">Track key metrics</p>
                  <p>Monitor leading indicators weekly</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const Annual90DayPrioritiesSection: React.FC<Annual90DayPrioritiesSectionProps> = ({ teamId }) => {
  return (
    <SimpleStrategyProvider teamId={teamId}>
      <QuarterlyFocusContent teamId={teamId} />
    </SimpleStrategyProvider>
  );
};

export default Annual90DayPrioritiesSection;
