import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Building2, Activity, UserPlus, Clock, UsersRound } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { formatDistanceToNow } from 'date-fns';

export const AdminDashboardStats: React.FC = () => {
  const { stats, recentSignups, loading } = useAdminDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      description: 'Registered accounts',
    },
    {
      title: 'Total Companies',
      value: stats.totalCompanies,
      icon: Building2,
      description: 'Active organizations',
    },
    {
      title: 'Active Sessions (24h)',
      value: stats.activeSessions,
      icon: Activity,
      description: 'Logged in today',
    },
    {
      title: 'Signups (7 days)',
      value: stats.recentSignups,
      icon: UserPlus,
      description: 'New registrations',
    },
    {
      title: 'Active Users (7 days)',
      value: stats.activeUsers7d,
      icon: Clock,
      description: 'Logged in this week',
    },
    {
      title: 'Total Teams',
      value: stats.totalTeams,
      icon: UsersRound,
      description: 'Across all companies',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Recent Signups (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No signups in the last 7 days
            </p>
          ) : (
            <div className="space-y-3">
              {recentSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={signup.avatar_url ?? undefined} alt={signup.full_name} />
                      <AvatarFallback className="text-xs">
                        {signup.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{signup.full_name}</p>
                      <p className="text-xs text-muted-foreground">{signup.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatDistanceToNow(new Date(signup.created_at))} ago
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
