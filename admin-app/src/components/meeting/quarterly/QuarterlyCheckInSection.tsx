import React from 'react';
interface QuarterlyCheckInSectionProps {
  teamId: string;
}
export const QuarterlyCheckInSection: React.FC<QuarterlyCheckInSectionProps> = ({
  teamId
}) => {
  return <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Check-In</h2>
        <p className="text-muted-foreground font-medium mb-6">
          Start with positive reports and identify issues (15 minutes)
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">- Bests: Personal and Business.</h3>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">- Update: What's working / not working?</h3>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">- Expectations for this Session</h3>
        </div>
      </div>

      
    </div>;
};