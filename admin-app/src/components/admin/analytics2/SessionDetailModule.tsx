import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionCard } from './components/SessionCard';
import { useUserAnalytics } from '@/hooks/useUserAnalytics';
import { useUserSessions } from '@/hooks/useUserSessions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Clock, Activity, TrendingUp, Calendar, Info } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export const SessionDetailModule = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ended'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'longest'>('newest');

  const { users, loading: usersLoading } = useUserAnalytics();
  const { sessions, loading: sessionsLoading } = useUserSessions(selectedUserId);

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // Get selected user data
  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId);
  }, [users, selectedUserId]);

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.session_start).getTime() - new Date(a.session_start).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.session_start).getTime() - new Date(b.session_start).getTime();
      } else {
        // longest
        return (b.duration_minutes || 0) - (a.duration_minutes || 0);
      }
    });

    return filtered;
  }, [sessions, statusFilter, sortBy]);

  // Calculate session statistics
  const sessionStats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const avgSession = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    const longestSession = sessions.length > 0 
      ? Math.max(...sessions.map(s => s.duration_minutes || 0))
      : 0;

    // Most active day of week
    const dayCount = new Map<number, number>();
    sessions.forEach(s => {
      const day = new Date(s.session_start).getDay();
      dayCount.set(day, (dayCount.get(day) || 0) + 1);
    });
    let mostActiveDay = 0;
    let maxCount = 0;
    dayCount.forEach((count, day) => {
      if (count > maxCount) {
        maxCount = count;
        mostActiveDay = day;
      }
    });
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Most active hour
    const hourCount = new Map<number, number>();
    sessions.forEach(s => {
      const hour = new Date(s.session_start).getHours();
      hourCount.set(hour, (hourCount.get(hour) || 0) + 1);
    });
    let mostActiveHour = 0;
    maxCount = 0;
    hourCount.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        mostActiveHour = hour;
      }
    });

    return {
      totalSessions,
      totalMinutes,
      avgSession,
      longestSession,
      mostActiveDay: dayNames[mostActiveDay],
      mostActiveHour: `${mostActiveHour}:00`,
    };
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* Limitations Notice */}
      <Card className="border-blue-200 dark:border-blue-800 bg-primary/5/50 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 text-primary dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Session timeline shows login/logout data. Granular event tracking (page views, button clicks, errors) 
              is not currently implemented but can be added in a future phase.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Search */}
      <GlassCard>
        <CardHeader>
          <CardTitle>Select User</CardTitle>
          <CardDescription>Search and select a user to view their session history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User List */}
          {searchQuery && (
            <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.slice(0, 10).map(user => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto p-3"
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setSearchQuery('');
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {user.full_name?.[0] || user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{user.full_name || user.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.company_name} • {user.total_sessions} sessions
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              )}
            </div>
          )}
        </CardContent>
      </GlassCard>

      {/* Selected User Summary */}
      {selectedUser && (
        <GlassCard>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">
                  {selectedUser.full_name?.[0] || selectedUser.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{selectedUser.full_name || selectedUser.email}</h3>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.company_name}</p>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  Total Sessions
                </div>
                <p className="text-2xl font-bold">{sessionStats.totalSessions}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Total Time
                </div>
                <p className="text-2xl font-bold">{Math.round(sessionStats.totalMinutes / 60)}h</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  Avg Session
                </div>
                <p className="text-2xl font-bold">{sessionStats.avgSession}m</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Longest
                </div>
                <p className="text-2xl font-bold">{sessionStats.longestSession}m</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Active Day
                </div>
                <p className="text-lg font-bold">{sessionStats.mostActiveDay}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Active Hour
                </div>
                <p className="text-lg font-bold">{sessionStats.mostActiveHour}</p>
              </div>
            </div>
          </CardContent>
        </GlassCard>
      )}

      {/* Session Timeline */}
      {selectedUser && (
        <GlassCard>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Session Timeline</CardTitle>
                <CardDescription>
                  {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="longest">Longest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSessions.length > 0 ? (
              <div className="space-y-3">
                {filteredSessions.map(session => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No sessions found</p>
              </div>
            )}
          </CardContent>
        </GlassCard>
      )}

      {/* Empty State */}
      {!selectedUser && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No User Selected</h3>
            <p className="text-sm text-muted-foreground">
              Search and select a user above to view their session timeline
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
