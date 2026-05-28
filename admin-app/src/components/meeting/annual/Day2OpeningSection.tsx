import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sun, Coffee, Target, Zap } from 'lucide-react';

interface Day2OpeningSectionProps {
  teamId: string;
}

export const Day2OpeningSection: React.FC<Day2OpeningSectionProps> = ({ teamId }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sun className="h-6 w-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-foreground">Day 2 Opening</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Welcome back! Let's quickly reconnect and set the stage for Day 2.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Coffee className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Reflect on Day 1</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Share one key insight from yesterday
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Set Intentions</p>
                <p className="text-sm text-muted-foreground mt-1">
                  What do you want to accomplish today?
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/5/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-medium text-sm">Energy Check</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Rate 1-10 and share what you need
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-medium text-foreground">Today's Focus:</span>{' '}
            Annual Plan → Quarterly Focus → Solve Issues → Wrap-up
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Day2OpeningSection;
