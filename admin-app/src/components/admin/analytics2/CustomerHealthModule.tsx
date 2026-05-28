import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanyHealth, CompanyHealthData } from '@/hooks/useCompanyHealth';
import { CompanyHealthCard } from './components/CompanyHealthCard';
import { AlertCircle, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const CustomerHealthModule = () => {
  const { data: companies, isLoading, error } = useCompanyHealth();
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!companies) return null;

    const atRisk = companies.filter(c => c.category === 'at_risk').length;
    const stable = companies.filter(c => c.category === 'stable').length;
    const expansion = companies.filter(c => c.category === 'expansion_ready').length;
    const avgScore = companies.reduce((sum, c) => sum + c.health_score.total, 0) / companies.length;
    const declining = companies.filter(c => c.usage_trend === 'declining').length;

    return { atRisk, stable, expansion, avgScore: Math.round(avgScore), declining };
  }, [companies]);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];

    return companies.filter(company => {
      const matchesSearch = company.company_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === 'all' || company.account_stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [companies, searchQuery, stageFilter]);

  // Group companies by category
  const groupedCompanies = useMemo(() => {
    return {
      at_risk: filteredCompanies.filter(c => c.category === 'at_risk'),
      stable: filteredCompanies.filter(c => c.category === 'stable'),
      expansion_ready: filteredCompanies.filter(c => c.category === 'expansion_ready'),
    };
  }, [filteredCompanies]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading customer health data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {isLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : kpis ? (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-destructive">{kpis.atRisk}</div>
                    <div className="text-sm text-muted-foreground">At Risk</div>
                  </div>
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-success">{kpis.stable}</div>
                    <div className="text-sm text-muted-foreground">Stable</div>
                  </div>
                  <Users className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-primary">{kpis.expansion}</div>
                    <div className="text-sm text-muted-foreground">Expansion Ready</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{kpis.avgScore}</div>
                    <div className="text-sm text-muted-foreground">Avg Score</div>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-warning">{kpis.declining}</div>
                    <div className="text-sm text-muted-foreground">Declining Usage</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-warning rotate-180" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Filters and View Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer Health</CardTitle>
              <CardDescription>Monitor and manage customer health across all accounts</CardDescription>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'table')}>
              <TabsList>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex gap-4 mt-4">
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="Free Trial">Free Trial</SelectItem>
                <SelectItem value="Active Subscription">Active Subscription</SelectItem>
                <SelectItem value="At churn Risk">At Churn Risk</SelectItem>
                <SelectItem value="Churned">Churned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : view === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* At Risk Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">At Risk</Badge>
                  <span className="text-sm text-muted-foreground">
                    {groupedCompanies.at_risk.length} companies
                  </span>
                </div>
                <div className="space-y-3">
                  {groupedCompanies.at_risk.map(company => (
                    <CompanyHealthCard key={company.company_id} company={company} />
                  ))}
                  {groupedCompanies.at_risk.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No at-risk companies
                    </div>
                  )}
                </div>
              </div>

              {/* Stable Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">Stable</Badge>
                  <span className="text-sm text-muted-foreground">
                    {groupedCompanies.stable.length} companies
                  </span>
                </div>
                <div className="space-y-3">
                  {groupedCompanies.stable.map(company => (
                    <CompanyHealthCard key={company.company_id} company={company} />
                  ))}
                  {groupedCompanies.stable.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No stable companies
                    </div>
                  )}
                </div>
              </div>

              {/* Expansion Ready Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-primary">Expansion Ready</Badge>
                  <span className="text-sm text-muted-foreground">
                    {groupedCompanies.expansion_ready.length} companies
                  </span>
                </div>
                <div className="space-y-3">
                  {groupedCompanies.expansion_ready.map(company => (
                    <CompanyHealthCard key={company.company_id} company={company} />
                  ))}
                  {groupedCompanies.expansion_ready.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No expansion-ready companies
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Company</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Score</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Grade</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Stage</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">MRR</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Red Flags</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map(company => (
                    <tr key={company.company_id} className="border-b border-border hover:bg-muted/50 transition-colors duration-150">
                      <td className="p-3 text-sm">{company.company_name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={
                          company.health_score.total >= 85 ? 'bg-success/5 text-success border-green-200' :
                          company.health_score.total >= 70 ? 'bg-success/5 text-success border-green-200' :
                          company.health_score.total >= 55 ? 'bg-warning/5 text-yellow-700 border-yellow-200' :
                          company.health_score.total >= 40 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-destructive/5 text-red-700 border-red-200'
                        }>
                          {company.health_score.total}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm font-medium">{company.health_score.grade}</td>
                      <td className="p-3 text-sm text-muted-foreground">{company.account_stage || '-'}</td>
                      <td className="p-3 text-sm text-right font-medium">
                        {company.mrr > 0 ? `$${company.mrr.toFixed(0)}` : '-'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                        {company.red_flags.length > 0 ? company.red_flags.join(', ') : '-'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                        {company.suggested_actions.length > 0 ? company.suggested_actions[0] : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
