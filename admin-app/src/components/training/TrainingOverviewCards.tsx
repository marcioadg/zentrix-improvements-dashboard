
import React from "react";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import { useAssignments } from "@/hooks/useAssignments";
import { BarChart3, Users } from "lucide-react";

/**
 * Renders company-wide training statistics cards for the dashboard.
 */
const TrainingOverviewCards: React.FC = () => {
  const { playbooks, loading: loadingPlaybooks } = usePlaybooks();
  const { assignments, loading: loadingAssignments } = useAssignments();

  // Compute stats: total playbooks, unique users, overall % completion
  const totalPlaybooks = playbooks.length;
  const userIds = Array.from(new Set(assignments.map(a => a.user_id)));
  const totalUsers = userIds.length;
  // For overall completion, compute percentage of all assignments completed
  const completedAssignments = assignments.filter(a => a.progress_percentage >= 100).length;
  const overallCompletionPct = assignments.length ? Math.round(completedAssignments / assignments.length * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-card rounded-lg shadow flex flex-col items-center p-6">
        <BarChart3 className="h-8 w-8 text-primary mb-3" />
        <div className="text-2xl font-bold">{totalPlaybooks}</div>
        <div className="text-muted-foreground text-sm mt-1">Active Training Programs</div>
      </div>
      <div className="bg-card rounded-lg shadow flex flex-col items-center p-6">
        <Users className="h-8 w-8 text-primary mb-3" />
        <div className="text-2xl font-bold">{totalUsers}</div>
        <div className="text-muted-foreground text-sm mt-1">Users Assigned</div>
      </div>
      <div className="bg-card rounded-lg shadow flex flex-col items-center p-6">
        <BarChart3 className="h-8 w-8 text-primary mb-3" />
        <div className="text-2xl font-bold">{overallCompletionPct}%</div>
        <div className="text-muted-foreground text-sm mt-1">Overall Completion</div>
      </div>
    </div>
  );
};

export default TrainingOverviewCards;
