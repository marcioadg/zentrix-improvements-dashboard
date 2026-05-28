import React from 'react';
import { ArrowLeft, Activity, Users, Clock, TrendingUp, Calendar, ArrowUpDown, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { usePlatformUsage } from '@/hooks/usePlatformUsage';
import { TimePeriod, SortOption } from '@/types/platformUsage';
import { formatDistanceToNow } from 'date-fns';

export default function PlatformUsage() {
  const navigate = useNavigate();
  const { companyStats, overviewStats, loading, timePeriod, setTimePeriod, sortOption, setSortOption, searchTerm, setSearchTerm } = usePlatformUsage();

  const timePeriodLabels: Record<TimePeriod, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    'all': 'All Time'
  };

  const sortLabels: Record<SortOption, string> = {
    name_asc: 'A-Z',
    name_desc: 'Z-A',
    created_newest: 'Created (Newest first)',
    created_oldest: 'Created (Oldest first)',
    hours_desc: 'Total Hours (Most to Least)',
    hours_asc: 'Total Hours (Least to Most)',
    avg_session_desc: 'Avg Session (Longest to Shortest)',
    avg_session_asc: 'Avg Session (Shortest to Longest)',
    last_activity: 'Last Activity (Recent first)',
    active_users: 'Active Users (Most to Least)',
    sessions_desc: 'Sessions (Most to Least)'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState message="Loading platform usage data..." fullScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <Activity className="h-8 w-8 text-primary" />
                  Platform Usage
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Track usage hours and activity across all companies
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(timePeriodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {overviewStats?.total_companies || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Total Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {overviewStats?.total_hours.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all companies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Average Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {overviewStats?.average_hours_per_company.toFixed(1) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Per company
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Most Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground truncate">
                  {overviewStats?.most_active_company?.name || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overviewStats?.most_active_company?.hours.toFixed(1) || 0} hours
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Company Usage Table */}
        <Card>
          <CardHeader>
            <CardTitle>Company Usage Details</CardTitle>
            <CardDescription>
              Detailed breakdown of usage by company for {timePeriodLabels[timePeriod].toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companyStats.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No usage data available for this period</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Company Name</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Active Users</TableHead>
                      <TableHead className="text-right">Avg Session</TableHead>
                      <TableHead className="text-right">Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyStats.map((company) => (
                      <TableRow key={company.company_id}>
                        <TableCell className="font-medium">
                          {company.company_name}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {company.total_hours.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {company.total_sessions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-mono">
                            {company.active_users_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {company.average_session_minutes.toFixed(1)} min
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {company.last_activity_date 
                            ? formatDistanceToNow(new Date(company.last_activity_date), { addSuffix: true })
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
