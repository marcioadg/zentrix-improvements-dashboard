
import React from "react";
import TrainingOverviewCards from "@/components/training/TrainingOverviewCards";
import UserTrainingMatrix from "@/components/training/UserTrainingMatrix";

/**
 * Main page for company-wide training management.
 * Dashboard - statistics, user matrix, charts.
 */
const TrainingManagement: React.FC = () => {
  // Everything is split into subcomponents for overview cards/statistics and matrix lists.
  return (
    <div className="py-8 px-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Training Management</h1>
      <p className="text-muted-foreground mb-8">Track, manage, and analyze training across your organization.</p>
      <TrainingOverviewCards />
      <div className="mt-8">
        <UserTrainingMatrix />
      </div>
      {/* (You can expand this with analytics/charts if needed) */}
    </div>
  );
};

export default TrainingManagement;
