import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Calendar, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTeamInsights } from '@/hooks/useTeamInsights';

export const TeamInsights: React.FC = () => {
  const { activeMembers, upcomingMeetings, loading, error } = useTeamInsights();

  if (error) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Team Insights</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[320px] gap-3 text-center">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-[14px] font-medium text-foreground">Could not load team insights</p>
          <p className="text-[13px] text-muted-foreground">Check your connection and try refreshing</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Team Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Team Insights</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/people">
            <Users className="w-4 h-4 mr-2" />
            View Team
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto max-h-[320px]">
        {/* Most Active Members */}
        <div>
          <h4 className="text-sm font-medium mb-3">Most Active This Week</h4>
          <div className="space-y-2">
            {activeMembers.slice(0, 3).map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback>
                    {member.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.task_count} tasks + {member.issue_count} issues
                  </p>
                </div>
              </div>
            ))}
            {activeMembers.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity data</p>
            )}
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4" />
            <h4 className="text-sm font-medium">Upcoming Meetings</h4>
          </div>
          <div className="space-y-2">
            {upcomingMeetings.slice(0, 2).map((meeting) => (
              <div key={meeting.id} className="p-2 bg-muted/30 rounded">
                <p className="text-sm font-medium">{meeting.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(meeting.scheduled_time).toLocaleDateString()} at{' '}
                  {new Date(meeting.scheduled_time).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            ))}
            {upcomingMeetings.length === 0 && (
              <p className="text-sm text-muted-foreground">No upcoming meetings</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};