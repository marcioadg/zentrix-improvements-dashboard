import { useMemo } from 'react';
import { TimeSeriesAnalyticsData } from '@/types/analytics';

interface AnalyticsSummary {
  goalsAchieved: number;
  avgMeetingRating: number;
  tasksCompleted: number;
  issuesResolved: number;
}

export const useAnalyticsSummary = (data: TimeSeriesAnalyticsData | undefined): AnalyticsSummary => {
  return useMemo(() => {
    if (!data) {
      return {
        goalsAchieved: 0,
        avgMeetingRating: 0,
        tasksCompleted: 0,
        issuesResolved: 0,
      };
    }

    // Calculate goals achieved percentage (average of Completed percentage)
    const goalsTimeSeries = data.goals.timeSeries || [];
    const goalsAchieved = goalsTimeSeries.length > 0
      ? goalsTimeSeries.reduce((sum, point) => sum + (point['Completed'] as number || 0), 0) / goalsTimeSeries.length
      : 0;

    // Calculate average meeting rating
    const meetingRatingsTimeSeries = data.meetingRatings.timeSeries || [];
    const avgMeetingRating = meetingRatingsTimeSeries.length > 0
      ? meetingRatingsTimeSeries.reduce((sum, point) => sum + (point['Average Rating'] as number || 0), 0) / meetingRatingsTimeSeries.length
      : 0;

    // Calculate total tasks completed
    const taskCompletionTimeSeries = data.taskCompletion.timeSeries || [];
    const tasksCompleted = taskCompletionTimeSeries.reduce(
      (sum, point) => sum + (point['On Time'] as number || 0) + (point['Late'] as number || 0),
      0
    );

    // Calculate total issues resolved
    const productivityTimeSeries = data.meetingProductivity.timeSeries || [];
    const issuesResolved = productivityTimeSeries.reduce(
      (sum, point) => sum + (point['Issues Solved'] as number || 0),
      0
    );

    return {
      goalsAchieved: Math.round(goalsAchieved),
      avgMeetingRating,
      tasksCompleted: Math.round(tasksCompleted),
      issuesResolved: Math.round(issuesResolved),
    };
  }, [data]);
};
