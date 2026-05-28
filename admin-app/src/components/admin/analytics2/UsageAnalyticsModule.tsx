import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsageAnalytics } from '@/hooks/useUsageAnalytics';
import { LoadingState } from '@/components/ui/loading-state';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Clock, TrendingUp, Activity } from 'lucide-react';
import { ActivityHeatmap } from './charts/ActivityHeatmap';

export const UsageAnalyticsModule = () => {
  const { metrics, dauTrend, heatmap, durationTrend, loading, error } = useUsageAnalytics();

  if (loading) {
    return <LoadingState message="Loading usage analytics..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading usage analytics: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Usage Analytics</h3>
        <p className="text-muted-foreground">
          Platform-wide usage metrics, trends, and activity patterns
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.dau || 0}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.wau || 0}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.mau || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.avg_session_minutes || 0}</div>
            <p className="text-xs text-muted-foreground">Minutes per session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.total_platform_hours || 0}</div>
            <p className="text-xs text-muted-foreground">Platform usage (30d)</p>
          </CardContent>
        </Card>
      </div>

      {/* DAU/WAU/MAU Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity Trend</CardTitle>
          <CardDescription>Daily, weekly, and monthly active users over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dauTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis className="text-xs" />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid var(--border)' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="dau" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="DAU"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="wau" 
                stroke="hsl(var(--primary) / 0.6)" 
                strokeWidth={2}
                name="WAU"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="mau" 
                stroke="hsl(var(--primary) / 0.3)" 
                strokeWidth={2}
                name="MAU"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>Session distribution by day of week and hour (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap data={heatmap} />
        </CardContent>
      </Card>

      {/* Session Duration Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Average Session Duration</CardTitle>
          <CardDescription>Average session length in minutes over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={durationTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis className="text-xs" label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid var(--border)' }}
              />
              <Bar 
                dataKey="avg_duration" 
                fill="hsl(var(--primary))" 
                name="Avg Duration (min)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
