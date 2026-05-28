
import React from 'react';

interface QuarterlyVisionSectionProps {
  teamId: string;
}

export const QuarterlyVisionSection: React.FC<QuarterlyVisionSectionProps> = ({ teamId }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Review Vision/Traction</h2>
        <p className="text-muted-foreground font-medium mb-6">
          Look forward and align on long-term vision (1 hour)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h3 className="font-semibold text-emerald-800 mb-3">1. Look Forward</h3>
          <p className="text-emerald-700 text-sm">
            Focus on future opportunities and strategic direction.
          </p>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
          <h3 className="font-semibold text-sky-800 mb-3">2. Align on Vision</h3>
          <p className="text-sky-700 text-sm">
            Ensure everyone understands and agrees with the vision.
          </p>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <h3 className="font-semibold text-rose-800 mb-3">3. Greater Good</h3>
          <p className="text-rose-700 text-sm">
            Remind everyone of the bigger purpose and impact.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-muted rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Vision & Mission Review</h4>
          <textarea
            className="w-full h-24 p-3 border border-border rounded-md resize-none"
            placeholder="Review and discuss company/team vision and mission..."
          />
        </div>

        <div className="bg-muted rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Strategic Alignment</h4>
          <textarea
            className="w-full h-24 p-3 border border-border rounded-md resize-none"
            placeholder="Document how current activities align with long-term goals..."
          />
        </div>
      </div>
    </div>
  );
};
