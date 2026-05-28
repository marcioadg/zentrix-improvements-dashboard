
import React from 'react';

interface QuarterlyReviewSectionProps {
  teamId: string;
}

export const QuarterlyReviewSection: React.FC<QuarterlyReviewSectionProps> = ({ teamId }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Review Prior Quarter</h2>
        <p className="text-muted-foreground font-medium mb-6">
          Look back and assess previous quarter results (30 minutes)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-secondary/50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-800 mb-3">1. Look Back</h3>
          <p className="text-purple-700 text-sm">
            Review the goals and objectives from the previous quarter.
          </p>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h3 className="font-semibold text-indigo-800 mb-3">2. Completion Percentage</h3>
          <p className="text-indigo-700 text-sm">
            Calculate and discuss completion percentages for each objective.
          </p>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <h3 className="font-semibold text-teal-800 mb-3">3. Align on Results</h3>
          <p className="text-teal-700 text-sm">
            Ensure everyone agrees on the previous quarter's outcomes.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-muted rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Previous Quarter Goals</h4>
          <textarea
            className="w-full h-24 p-3 border border-border rounded-md resize-none"
            placeholder="List and review previous quarter's goals..."
          />
        </div>

        <div className="bg-muted rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Results & Lessons Learned</h4>
          <textarea
            className="w-full h-24 p-3 border border-border rounded-md resize-none"
            placeholder="Document results, completion rates, and key lessons..."
          />
        </div>
      </div>
    </div>
  );
};
