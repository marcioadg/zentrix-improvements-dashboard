
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { SimpleStrategyProvider } from '@/contexts/SimpleStrategyContext';
import { PurposeSection } from '@/components/strategy/sections/PurposeSection';
import { CoreValuesSection } from '@/components/strategy/sections/CoreValuesSection';
import { LongTermObjectiveSection } from '@/components/strategy/sections/LongTermObjectiveSection';
import { MarketingSection } from '@/components/strategy/sections/MarketingSection';

interface AnnualVisionReviewSectionProps {
  teamId: string;
}

const VisionReviewContent: React.FC<{ teamId: string }> = ({ teamId }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Eye className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Strategy Review</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Review and confirm your company's foundational elements. Ensure the team is aligned 
          on mission, values, and long-term goals.
        </p>
      </div>

      {/* Strategic Foundation */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Foundation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <PurposeSection />
          <CoreValuesSection />
          <LongTermObjectiveSection />
        </CardContent>
      </Card>

      {/* Marketing Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketingSection teamId={teamId} />
        </CardContent>
      </Card>
    </div>
  );
};

export const AnnualVisionReviewSection: React.FC<AnnualVisionReviewSectionProps> = ({ teamId }) => {
  return (
    <SimpleStrategyProvider teamId={teamId}>
      <VisionReviewContent teamId={teamId} />
    </SimpleStrategyProvider>
  );
};

export default AnnualVisionReviewSection;
