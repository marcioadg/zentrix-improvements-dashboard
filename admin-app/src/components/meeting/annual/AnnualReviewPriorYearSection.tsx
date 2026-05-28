import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleStrategyProvider } from "@/contexts/SimpleStrategyContext";
import { OneYearGoalsSection } from "@/components/strategy/sections/OneYearGoalsSection";
import { YearlyGoalsSection } from "@/components/strategy/sections/YearlyGoalsSection";
import { QuarterlyGoalsSection } from "@/components/strategy/sections/QuarterlyGoalsSection";
import { CombinedGoalsBoard } from "@/components/shared/CombinedGoalsBoard";
import { useOptimizedUserTeams } from "@/hooks/useOptimizedUserTeams";
import { Target, Calendar, TrendingUp } from "lucide-react";

interface AnnualReviewPriorYearSectionProps {
  teamId: string;
}

export const AnnualReviewPriorYearSection: React.FC<AnnualReviewPriorYearSectionProps> = ({ teamId }) => {
  const { teams } = useOptimizedUserTeams();

  return (
    <div className="py-4 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Review Prior Year Performance</h2>
      
      <div className="flex-1 overflow-y-auto space-y-6">
        <SimpleStrategyProvider teamId={teamId}>
          {/* Annual Goals & Quarterly Focus */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Annual Goals Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Annual Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <OneYearGoalsSection />
                <YearlyGoalsSection />
              </CardContent>
            </Card>
            
            {/* Quarterly Focus Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-primary" />
                  Quarterly Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuarterlyGoalsSection teamId={teamId} />
              </CardContent>
            </Card>
          </div>
        </SimpleStrategyProvider>
        
        {/* Current Team Goals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Current Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CombinedGoalsBoard 
              teams={teams}
              teamId={teamId}
              hideCompanyGoals
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnnualReviewPriorYearSection;
