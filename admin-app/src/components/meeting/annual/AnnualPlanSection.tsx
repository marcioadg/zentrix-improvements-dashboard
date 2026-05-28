import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Target, TrendingUp } from 'lucide-react';
import { SimpleStrategyProvider, useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { OneYearGoalsSection } from '@/components/strategy/sections/OneYearGoalsSection';
import { YearlyGoalsSection } from '@/components/strategy/sections/YearlyGoalsSection';
import { DatePicker } from '@/components/ui/date-picker';

interface AnnualPlanSectionProps {
  teamId: string;
}

const AnnualPlanContent: React.FC = () => {
  const { data, updateOneYearDate } = useSimpleStrategy();
  const currentYear = new Date().getFullYear();
  const targetYear = currentYear + 1;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Annual Plan</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Define your company's annual revenue, profit, and goals for the upcoming year.
        </p>
      </div>

      {/* Annual Goals - Connected to Strategy */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Annual Goals
            </CardTitle>
            <div className="w-48">
              <DatePicker
                date={data.oneYearGoals.targetDate}
                onSelect={updateOneYearDate}
                placeholder="Target date"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Set financial targets and key metrics that align with your 3-year vision.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* One Year Goals Section - Revenue, Profit, Key Metrics */}
          <OneYearGoalsSection />
          
          {/* Yearly Goals Section - Annual Objectives */}
          <YearlyGoalsSection />
        </CardContent>
      </Card>

      {/* Goal Validation Discussion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Goal Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">Alignment Check</p>
              <p className="text-sm text-muted-foreground">
                Do these goals move us toward our 3-year targets?
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">Capacity Check</p>
              <p className="text-sm text-muted-foreground">
                Do we have the resources to achieve all of these?
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">Measurability</p>
              <p className="text-sm text-muted-foreground">
                How will we know when each goal is complete?
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">Risk Assessment</p>
              <p className="text-sm text-muted-foreground">
                What could prevent us from achieving these goals?
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const AnnualPlanSection: React.FC<AnnualPlanSectionProps> = ({ teamId }) => {
  return (
    <SimpleStrategyProvider teamId={teamId}>
      <AnnualPlanContent />
    </SimpleStrategyProvider>
  );
};

export default AnnualPlanSection;
