import React from 'react';
import { Compass } from 'lucide-react';
import { SimpleStrategyProvider } from '@/contexts/SimpleStrategyContext';
import { SwotSection } from '@/components/strategy/sections/SwotSection';

interface StrategicAnalysisSectionProps {
  teamId: string;
}

export const StrategicAnalysisSection: React.FC<StrategicAnalysisSectionProps> = ({ teamId }) => {
  return (
    <SimpleStrategyProvider teamId={teamId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Compass className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">SWOT Analysis</h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Analyze your organization's Strengths, Weaknesses, Opportunities, and Threats. 
            Changes made here will be saved to your team's strategy.
          </p>
        </div>

        {/* SWOT Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
    </SimpleStrategyProvider>
  );
};

export default StrategicAnalysisSection;
