import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckSquare, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardKPIsProps {
  data: {
    completedGoalsPercentage?: number;
    completedTasksLast7DaysPercentage?: number;
    error?: string | null;
  } | null;
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ data }) => {
  const hasError = !!data?.error;
  const completedGoalsPercentage = data?.completedGoalsPercentage ?? 0;
  const completedTasksPercentage = data?.completedTasksLast7DaysPercentage ?? 0;
  const tasksHitTarget = !hasError && completedTasksPercentage >= 100;

  const kpis = [
    {
      id: "completed-goals",
      title: "Completed Goals",
      period: "This Quarter",
      value: hasError ? null : completedGoalsPercentage,
      suffix: "%",
      icon: Target,
      highlight: false,
    },
    {
      id: "tasks-completed",
      title: "Tasks Completed",
      period: "Last 7 Days",
      value: hasError ? null : completedTasksPercentage,
      suffix: "%",
      icon: CheckSquare,
      highlight: tasksHitTarget,
    }
  ];

  return (
    <div className="flex flex-col gap-content md:flex-row md:gap-section">
      {kpis.map((kpi) => (
        <div key={kpi.id} className="stack-xs min-w-0">
          <div className="stack-xs">
            <p className="mobile-body-sm">
              {kpi.title}
            </p>
            <p className="mobile-body-sm">
              {kpi.period}
            </p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn("mobile-metric font-semibold",
              kpi.highlight ? "text-status-success" : kpi.value === null ? "text-muted-foreground" : "text-foreground"
            )}>
              {kpi.value === null ? "—" : kpi.value}
            </span>
            {kpi.suffix && kpi.value !== null && (
              <span className="mobile-body-sm">
                {kpi.suffix}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};