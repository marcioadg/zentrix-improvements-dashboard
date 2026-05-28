import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyProductivity, sortCompanies, filterCompanies, SortField, SortDirection } from '@/hooks/useCompanyProductivity';
import { CompanyProductivityCard } from './components/CompanyProductivityCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ListTodo, CheckCircle, AlertCircle, Calendar, ArrowUpDown, Search } from 'lucide-react';

export function TeamProductivityModule() {
  const { data: companies, isLoading } = useCompanyProductivity();
  const [searchTerm, setSearchTerm] = useState('');
  const [minMembers, setMinMembers] = useState(0);
  const [engagementFilter, setEngagementFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortField, setSortField] = useState<SortField>('productivity_score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredAndSortedCompanies = useMemo(() => {
    if (!companies) return [];
    const filtered = filterCompanies(companies, searchTerm, minMembers, engagementFilter);
    return sortCompanies(filtered, sortField, sortDirection);
  }, [companies, searchTerm, minMembers, engagementFilter, sortField, sortDirection]);

  const platformKPIs = useMemo(() => {
    if (!companies) return { totalTasks: 0, completionRate: 0, issuesResolved: 0, totalMeetings: 0 };
    
    const totalTasks = companies.reduce((sum, c) => sum + c.tasks_total, 0);
    const completedTasks = companies.reduce((sum, c) => sum + c.tasks_completed, 0);
    const issuesResolved = companies.reduce((sum, c) => sum + c.issues_resolved, 0);
    const totalMeetings = companies.reduce((sum, c) => sum + c.meetings_count, 0);
    
    return {
      totalTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      issuesResolved,
      totalMeetings,
    };
  }, [companies]);

  const top10ByTaskCompletion = useMemo(() => {
    if (!companies) return [];
    return [...companies]
      .filter(c => c.tasks_total > 0)
      .sort((a, b) => b.task_completion_rate - a.task_completion_rate)
      .slice(0, 10)
      .map(c => ({ name: c.company_name, value: c.task_completion_rate }));
  }, [companies]);

  const top10ByIssueResolution = useMemo(() => {
    if (!companies) return [];
    return [...companies]
      .filter(c => c.issues_total > 0)
      .sort((a, b) => b.issue_resolution_rate - a.issue_resolution_rate)
      .slice(0, 10)
      .map(c => ({ name: c.company_name, value: c.issue_resolution_rate }));
  }, [companies]);

  const top10ByMeetings = useMemo(() => {
    if (!companies) return [];
    return [...companies]
      .sort((a, b) => b.meetings_count - a.meetings_count)
      .slice(0, 10)
      .map(c => ({ name: c.company_name, value: c.meetings_count }));
  }, [companies]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 70) return 'default';
    if (score >= 40) return 'secondary';
    return 'destructive';
  };

  const getBarColor = (index: number) => {
    if (index === 0) return 'hsl(var(--primary))';
    if (index === 1) return 'hsl(var(--primary) / 0.7)';
    if (index === 2) return 'hsl(var(--primary) / 0.5)';
    return 'hsl(var(--muted-foreground))';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Platform KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{platformKPIs.totalTasks}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{platformKPIs.completionRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Issues Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{platformKPIs.issuesResolved}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Meetings (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{platformKPIs.totalMeetings}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Company Productivity Ranking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={engagementFilter} onValueChange={(v: any) => setEngagementFilter(v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engagement</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={minMembers.toString()} onValueChange={(v) => setMinMembers(Number(v))}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Companies</SelectItem>
                <SelectItem value="5">5+ Members</SelectItem>
                <SelectItem value="10">10+ Members</SelectItem>
                <SelectItem value="20">20+ Members</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('company_name')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Company <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort('member_count')}
                      className="flex items-center gap-1 ml-auto hover:text-foreground"
                    >
                      Members <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort('task_completion_rate')}
                      className="flex items-center gap-1 ml-auto hover:text-foreground"
                    >
                      Tasks <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Goals</TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort('meetings_count')}
                      className="flex items-center gap-1 ml-auto hover:text-foreground"
                    >
                      Meetings <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort('productivity_score')}
                      className="flex items-center gap-1 ml-auto hover:text-foreground"
                    >
                      Score <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No companies found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedCompanies.map((company, index) => (
                    <TableRow key={company.company_id}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell className="font-medium">{company.company_name}</TableCell>
                      <TableCell className="text-right">{company.member_count}</TableCell>
                      <TableCell className="text-right">
                        {company.tasks_completed}/{company.tasks_total}
                      </TableCell>
                      <TableCell className="text-right">{company.goals_total}</TableCell>
                      <TableCell className="text-right">{company.meetings_count}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getScoreBadgeVariant(company.productivity_score)}>
                          {company.productivity_score}
                          {company.productivity_score >= 85 && ' ★'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers - Detailed Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Top 5 Performers</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAndSortedCompanies.slice(0, 5).map((company, index) => (
            <CompanyProductivityCard key={company.company_id} company={company} rank={index + 1} />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Completion Rate (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10ByTaskCompletion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {top10ByTaskCompletion.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue Resolution Rate (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10ByIssueResolution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {top10ByIssueResolution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meeting Count (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10ByMeetings} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {top10ByMeetings.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
