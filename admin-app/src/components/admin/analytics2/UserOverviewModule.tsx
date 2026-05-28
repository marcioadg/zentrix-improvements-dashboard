import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Users, Clock, Activity } from 'lucide-react';
import { useUserAnalytics } from '@/hooks/useUserAnalytics';
import { UserAnalytics } from '@/services/analytics2Service';

type SortField = 'full_name' | 'company_name' | 'last_login_at' | 'total_sessions' | 'total_time_in_app' | 'churn_score' | 'created_at';
type SortDirection = 'asc' | 'desc';

export const UserOverviewModule = () => {
  const { users, loading } = useUserAnalytics();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [churnFilter, setChurnFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch =
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.company_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesChurn = churnFilter === 'all' || user.churn_risk === churnFilter;
      const matchesStatus = statusFilter === 'all' || user.account_status === statusFilter;

      return matchesSearch && matchesChurn && matchesStatus;
    });

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'full_name':
          comparison = (a.full_name || '').localeCompare(b.full_name || '');
          break;
        case 'company_name':
          comparison = a.company_name.localeCompare(b.company_name);
          break;
        case 'last_login_at':
          const aDate = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
          const bDate = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'total_sessions':
          comparison = a.total_sessions - b.total_sessions;
          break;
        case 'total_time_in_app':
          comparison = a.total_time_in_app - b.total_time_in_app;
          break;
        case 'churn_score':
          comparison = a.churn_score - b.churn_score;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [users, searchQuery, sortField, sortDirection, churnFilter, statusFilter]);

  const getChurnBadge = (risk: UserAnalytics['churn_risk']) => {
    const variants = {
      low: { variant: 'default' as const, label: 'Low Risk' },
      medium: { variant: 'secondary' as const, label: 'Medium Risk' },
      high: { variant: 'destructive' as const, label: 'High Risk' },
    };
    const { variant, label } = variants[risk];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      owner: 'bg-purple-500 text-white',
      director: 'bg-primary text-white',
      admin: 'bg-green-500 text-white',
      manager: 'bg-yellow-500 text-white',
      member: 'bg-gray-500 text-white',
    };
    return (
      <Badge className={roleColors[role] || 'bg-gray-400 text-white'}>
        {role}
      </Badge>
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes % 60}m`;
  };

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.account_status === 'active').length,
      highRisk: users.filter(u => u.churn_risk === 'high').length,
      totalSessions: users.reduce((sum, u) => sum + u.total_sessions, 0),
    };
  }, [users]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Overview</CardTitle>
          <CardDescription>Loading user data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Users</CardTitle>
            <Activity className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.highRisk}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={churnFilter === 'high' ? 'destructive' : 'outline'}
                onClick={() => setChurnFilter(churnFilter === 'high' ? 'all' : 'high')}
              >
                High Risk
              </Button>
              <Button
                variant={churnFilter === 'medium' ? 'secondary' : 'outline'}
                onClick={() => setChurnFilter(churnFilter === 'medium' ? 'all' : 'medium')}
              >
                Medium Risk
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
              >
                Active Only
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center gap-2">
                      Name
                      {getSortIcon('full_name')}
                    </div>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('company_name')}>
                    <div className="flex items-center gap-2">
                      Company
                      {getSortIcon('company_name')}
                    </div>
                  </TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('last_login_at')}>
                    <div className="flex items-center gap-2">
                      Last Login
                      {getSortIcon('last_login_at')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('total_sessions')}>
                    <div className="flex items-center gap-2">
                      Sessions
                      {getSortIcon('total_sessions')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('total_time_in_app')}>
                    <div className="flex items-center gap-2">
                      Total Time
                      {getSortIcon('total_time_in_app')}
                    </div>
                  </TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('churn_score')}>
                    <div className="flex items-center gap-2">
                      Churn Risk
                      {getSortIcon('churn_score')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'No Name'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>{user.company_name}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-sm">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>{user.total_sessions}</TableCell>
                      <TableCell>{formatDuration(user.total_time_in_app)}</TableCell>
                      <TableCell>
                        {user.plan_tier ? (
                          <Badge variant={user.subscribed ? 'default' : 'secondary'}>
                            {user.plan_tier}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Free</span>
                        )}
                      </TableCell>
                      <TableCell>{getChurnBadge(user.churn_risk)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
