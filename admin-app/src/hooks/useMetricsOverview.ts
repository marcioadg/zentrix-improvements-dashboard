import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';

interface MetricOverview {
  id: string;
  name: string;
  value: string;
  unit: string;
  target: number | null;
  targetLogic: string | null;
  status: 'on-track' | 'behind' | 'ahead' | 'no-target';
  weekStart: string;
  teamName: string;
}

export const useMetricsOverview = () => {
  const [myMetrics, setMyMetrics] = useState<MetricOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { teams } = useUserTeams();

  // Get the first team to fetch metrics from
  const firstTeam = teams?.[0];
  const hasTeams = teams && teams.length > 0;
  
  // Only fetch metrics if we have teams
  const { metrics: allMetrics, loading: metricsLoading } = useWeeklyMetrics(
    hasTeams ? firstTeam?.id : undefined,
    'last_13_weeks'
  );

  useEffect(() => {
    if (!user || metricsLoading) {
      setLoading(metricsLoading);
      return;
    }

    // Early return when no teams to prevent infinite loops
    if (!hasTeams) {
      setMyMetrics([]);
      setLoading(false);
      return;
    }

    // processing metrics

    // Filter metrics where user is the owner
    const userOwnedMetrics = allMetrics?.filter(metric => metric.owner_id === user.id) || [];
    
    // console debug removed

    const overviewMetrics: MetricOverview[] = userOwnedMetrics.map(metric => {
      // Get the most recent week's data (only past/current weeks with actual values)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const pastWeekStarts = Object.keys(metric.weeklyValues || {})
        .filter(weekStart => {
          const weekDate = new Date(weekStart);
          weekDate.setHours(0, 0, 0, 0);
          return weekDate <= today;
        })
        .sort()
        .reverse();
      
      // Find the most recent week with actual data (skip null values)
      let latestWeek: string | null = null;
      let latestValue: number | null = null;
      
      for (const week of pastWeekStarts) {
        const value = metric.weeklyValues[week];
        if (value !== null && value !== undefined) {
          latestWeek = week;
          latestValue = value;
          break;
        }
      }
      
      // Determine status based on target
      let status: MetricOverview['status'] = 'no-target';
      
      if (metric.target_value && latestValue !== null && latestValue !== undefined) {
        const targetLogic = metric.target_logic || 'gte';
        
        if (targetLogic === 'gte' || targetLogic === 'gt') {
          // Higher is better
          if (latestValue >= metric.target_value) {
            status = 'on-track';
          } else if (latestValue >= metric.target_value * 0.8) {
            status = 'behind';
          } else {
            status = 'behind';
          }
        } else {
          // Lower is better (lte, lt)
          if (latestValue <= metric.target_value) {
            status = 'on-track';
          } else {
            status = 'behind';
          }
        }
        
        // Check if significantly ahead
        if (targetLogic === 'gte' || targetLogic === 'gt') {
          if (latestValue > metric.target_value * 1.2) {
            status = 'ahead';
          }
        }
      }

      return {
        id: metric.id,
        name: metric.metric_name,
        value: latestValue?.toString() || '0',
        unit: metric.unit || '',
        target: metric.target_value,
        targetLogic: metric.target_logic,
        status,
        weekStart: latestWeek || '',
        teamName: metric.team_name || 'Team'
      };
    });

    setMyMetrics(overviewMetrics);
    setLoading(false);
  }, [user?.id, hasTeams, metricsLoading, allMetrics?.length]);

  return { myMetrics, loading };
};