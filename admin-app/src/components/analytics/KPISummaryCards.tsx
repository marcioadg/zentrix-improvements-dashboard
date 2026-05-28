import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Minus, Target, Star, CheckCircle2, AlertCircle } from 'lucide-react';

interface KPICardData {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  iconBg: string;
}

interface KPISummaryCardsProps {
  goalsAchieved: number;
  goalsAchievedTrend?: number;
  avgMeetingRating: number;
  avgMeetingRatingTrend?: number;
  tasksCompleted: number;
  tasksCompletedTrend?: number;
  issuesResolved: number;
  issuesResolvedTrend?: number;
  loading?: boolean;
  onGoalsClick?: () => void;
  onMeetingRatingClick?: () => void;
  onTasksClick?: () => void;
  onIssuesClick?: () => void;
}

export const KPISummaryCards: React.FC<KPISummaryCardsProps> = ({
  goalsAchieved,
  goalsAchievedTrend,
  avgMeetingRating,
  avgMeetingRatingTrend,
  tasksCompleted,
  tasksCompletedTrend,
  issuesResolved,
  issuesResolvedTrend,
  loading = false,
  onGoalsClick,
  onMeetingRatingClick,
  onTasksClick,
  onIssuesClick,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, index) => (
          <Card
            key={index}
            className="border border-border/40 shadow-md rounded-xl"
          >
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <Skeleton className="h-9 w-20 mb-2" />
                <Skeleton className="h-3 w-16 self-end" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  const cards: KPICardData[] = [
    {
      title: 'Goals On-track & Completed',
      value: `${goalsAchieved}%`,
      trend: goalsAchievedTrend,
      icon: <Target className="h-5 w-5" />,
      iconBg: 'bg-chart-1/10',
    },
    {
      title: 'Avg Meeting Rating',
      value: avgMeetingRating.toFixed(1),
      trend: avgMeetingRatingTrend,
      icon: <Star className="h-5 w-5" />,
      iconBg: 'bg-chart-2/10',
    },
    {
      title: 'Tasks Completed',
      value: tasksCompleted,
      trend: tasksCompletedTrend,
      icon: <CheckCircle2 className="h-5 w-5" />,
      iconBg: 'bg-chart-3/10',
    },
    {
      title: 'Issues Resolved',
      value: issuesResolved,
      trend: issuesResolvedTrend,
      icon: <AlertCircle className="h-5 w-5" />,
      iconBg: 'bg-chart-4/10',
    },
  ];

  const clickHandlers = [onGoalsClick, onMeetingRatingClick, onTasksClick, onIssuesClick];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {cards.map((card, index) => (
        <Card
          key={card.title}
          role="button"
          tabIndex={0}
          aria-label={`View ${card.title} details`}
          className="border border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{
            animationDelay: `${index * 100}ms`,
            animation: 'fadeIn 0.5s ease-out forwards',
            opacity: 0,
          }}
          onClick={clickHandlers[index]}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              clickHandlers[index]?.();
            }
          }}
        >
          <CardContent className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-lg ${card.iconBg} flex-shrink-0`}>
                {card.icon}
              </div>
              <p className="text-sm text-muted-foreground font-medium text-left">{card.title}</p>
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <p className="text-3xl font-bold tracking-tight mb-2 text-left">{card.value}</p>
              {card.trend !== undefined && (
                <div className={`flex items-center gap-1 text-xs font-medium ${card.trend >= 0 ? 'text-chart-2' : 'text-chart-5'}`}>
                  {card.trend >= 0 ? (
                    <Plus className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  <span>{Math.round(Math.abs(card.trend))}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
