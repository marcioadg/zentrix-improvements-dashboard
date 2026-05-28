import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, AlertTriangle, TrendingDown, MessageSquare } from 'lucide-react';
import { SimpleStrategyProvider } from '@/contexts/SimpleStrategyContext';
import { ThreeYearMilestonesSection } from '@/components/strategy/sections/ThreeYearMilestonesSection';
import { SwotSection } from '@/components/strategy/sections/SwotSection';

interface AnnualReviewIssuesSectionProps {
  teamId: string;
}

export const AnnualReviewIssuesSection: React.FC<AnnualReviewIssuesSectionProps> = ({ teamId }) => {
  return (
    <SimpleStrategyProvider teamId={teamId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Review 3-Year Plan & Key Challenges</h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Review your 3-year strategic plan and identify key challenges from your SWOT analysis.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: 3-Year Plan */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Rocket className="h-5 w-5 text-purple-500" />
                3-Year Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThreeYearMilestonesSection />
            </CardContent>
          </Card>

          {/* Right: Key Challenges (Weaknesses & Threats from SWOT) */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Key Challenges (from SWOT)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Weaknesses */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                  Weaknesses
                </h4>
                <SwotSection 
                  category="weaknesses" 
                  placeholder="Add a weakness..."
                  color="neutral"
                />
              </div>

              {/* Threats */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Threats
                </h4>
                <SwotSection 
                  category="threats" 
                  placeholder="Add a threat..."
                  color="neutral"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SimpleStrategyProvider>
  );
};

export default AnnualReviewIssuesSection;
