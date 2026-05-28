import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Activity, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useActivityFeed } from '@/hooks/useActivityFeed';

export const ActivityFeed: React.FC = () => {
  const { activities, loading, error } = useActivityFeed();

  if (error) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[320px] gap-3 text-center">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-[14px] font-medium text-foreground">Could not load activity</p>
          <p className="text-[13px] text-muted-foreground">Check your connection and try refreshing</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto max-h-[320px]">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-border last:border-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src={activity.user?.avatar_url} />
              <AvatarFallback>
                {activity.user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <span className="font-medium">{activity.user?.name || 'Someone'}</span>
                <span className="text-muted-foreground"> {activity.action} </span>
                <span className="font-medium">{activity.target}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {activity.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <Activity className="h-8 w-8 text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">No recent activity</p>
            <p className="text-[13px] text-muted-foreground">Actions from your team will show up here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};