import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, Users, Calendar, MoreHorizontal, Search, Trash2, RefreshCw, BarChart3, AlertTriangle, Edit, ArrowUpDown, ArrowUp, ArrowDown, Plus, UserX, Activity } from 'lucide-react';
import { useCompanyManagement, CompanyWithStats } from '@/hooks/useCompanyManagement';
import { CompanyDeletionModal } from '@/components/modals/CompanyDeletionModal';
import { CompanyUsersModal } from './CompanyUsersModal';
import { CompanyStatusModal } from '@/components/modals/CompanyStatusModal';
import { SavedCompanyFilters } from './SavedCompanyFilters';
import { CompanyFilterState } from '@/hooks/useCompanyFilterPreferences';
import { logger } from '@/utils/logger';
type SortField = 'name' | 'users' | 'teams' | 'metrics' | 'last_login' | 'status' | 'created_at' | 'health_score' | 'usage';
type SortDirection = 'asc' | 'desc';

interface CompanyManagementViewProps {
  onCreateCompany: () => void;
}

export const CompanyManagementView = ({ onCreateCompany }: CompanyManagementViewProps) => {
  const {
    companies,
    loading,
    updateCompanyStatus,
    deleteCompany,
    refetch
  } = useCompanyManagement();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAtRisk, setShowAtRisk] = useState(false);
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    company: CompanyWithStats | null;
  }>({
    open: false,
    company: null
  });
  const [usersModal, setUsersModal] = useState<{
    open: boolean;
    company: CompanyWithStats | null;
  }>({
    open: false,
    company: null
  });
  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    company: CompanyWithStats | null;
  }>({
    open: false,
    company: null
  });
  const isCompanyAtRisk = (company: CompanyWithStats) => {
    if (!company.last_login) return true;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(company.last_login) < sevenDaysAgo;
  };

  const isCompanyOrphaned = (company: CompanyWithStats) => {
    return company.user_count === 0 || company.team_count === 0;
  };
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
  const sortedAndFilteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) || company.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRiskFilter = !showAtRisk || isCompanyAtRisk(company);
    const matchesOrphanedFilter = !showOrphaned || isCompanyOrphaned(company);
    return matchesSearch && matchesRiskFilter && matchesOrphanedFilter;
  }).sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'users':
        comparison = a.user_count - b.user_count;
        break;
      case 'teams':
        comparison = a.team_count - b.team_count;
        break;
      case 'metrics':
        comparison = a.metrics_count - b.metrics_count;
        break;
      case 'last_login':
        const aDate = a.last_login ? new Date(a.last_login).getTime() : 0;
        const bDate = b.last_login ? new Date(b.last_login).getTime() : 0;
        comparison = aDate - bDate;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'health_score':
        const aScore = a.health_score?.total || 0;
        const bScore = b.health_score?.total || 0;
        comparison = aScore - bScore;
        break;
      case 'usage':
        const aUsage = a.usage_hours_7d || 0;
        const bUsage = b.usage_hours_7d || 0;
        comparison = aUsage - bUsage;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  const handleDeleteClick = (company: CompanyWithStats) => {
    setDeleteModal({
      open: true,
      company
    });
  };
  const handleStatusClick = (company: CompanyWithStats) => {
    setStatusModal({
      open: true,
      company
    });
  };
  const handleDeleteConfirm = async () => {
    if (deleteModal.company) {
      await deleteCompany(deleteModal.company.id);
      setDeleteModal({
        open: false,
        company: null
      });
    }
  };
  const handleStatusConfirm = async (status: 'Free' | 'Trial' | 'Paid', trialMonths?: number) => {
    if (statusModal.company) {
      await updateCompanyStatus(statusModal.company.id, status, trialMonths);
      setStatusModal({
        open: false,
        company: null
      });
    }
  };
  const getTotalStats = () => {
    return {
      totalCompanies: companies.length,
      totalUsers: companies.reduce((sum, c) => sum + c.user_count, 0),
      totalTeams: companies.reduce((sum, c) => sum + c.team_count, 0),
      totalMetrics: companies.reduce((sum, c) => sum + c.metrics_count, 0)
    };
  };
  const stats = getTotalStats();
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle>Company Management</CardTitle>
          <CardDescription>Loading company data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading companies...</p>
            </div>
          </div>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Company Management</h2>
          <p className="text-muted-foreground">
            Manage all companies, view their stats, and perform administrative actions
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
            
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMetrics}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
            
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMetrics}</div>
          </CardContent>
        </Card>
      </div>

      {/* Company Table */}
      <Card>
        <CardContent className="pt-6">
          {/* Search and Filters */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search companies by name or slug..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Button variant={showAtRisk ? "default" : "outline"} onClick={() => setShowAtRisk(!showAtRisk)} className="whitespace-nowrap">
                <AlertTriangle className="h-4 w-4 mr-2" />
                At Risk
              </Button>
              <Button variant={showOrphaned ? "default" : "outline"} onClick={() => setShowOrphaned(!showOrphaned)} className="whitespace-nowrap">
                <UserX className="h-4 w-4 mr-2" />
                Orphaned
              </Button>
              <Button 
                variant="outline" 
                onClick={async () => {
                  logger.log('🔄 Manual cache clear and refresh triggered');
                  await refetch();
                }}
                className="whitespace-nowrap"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={onCreateCompany}>
                <Plus className="h-4 w-4 mr-2" />
                Create Company
              </Button>
            </div>

            <div className="flex items-center justify-end">
              <SavedCompanyFilters
                currentFilters={{
                  searchQuery,
                  showAtRisk,
                  showOrphaned,
                  sortField,
                  sortDirection,
                }}
                onLoadFilter={(filters: CompanyFilterState) => {
                  setSearchQuery(filters.searchQuery);
                  setShowAtRisk(filters.showAtRisk);
                  setShowOrphaned(filters.showOrphaned);
                  setSortField(filters.sortField);
                  setSortDirection(filters.sortDirection);
                }}
              />
            </div>
          </div>

          {/* Companies Table */}
          <div className="rounded-md border">
            <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">
                      Company
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('users')}>
                    <div className="flex items-center gap-2">
                      Users
                      {getSortIcon('users')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('teams')}>
                    <div className="flex items-center gap-2">
                      Teams
                      {getSortIcon('teams')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('metrics')}>
                    <div className="flex items-center gap-2">
                      Metrics
                      {getSortIcon('metrics')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('last_login')}>
                    <div className="flex items-center gap-2">
                      Last Login
                      {getSortIcon('last_login')}
                    </div>
                  </TableHead>
                  <TableHead>Directors</TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('health_score')}>
                    <div className="flex items-center gap-2">
                      Score
                      {getSortIcon('health_score')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('usage')}>
                    <div className="flex items-center gap-2">
                      7-d Usage
                      {getSortIcon('usage')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center gap-2">
                      Created
                      {getSortIcon('created_at')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredCompanies.map(company => <TableRow key={company.id} className="cursor-pointer hover:bg-accent" onClick={() => setUsersModal({
                  open: true,
                  company
                })}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{company.name}</span>
                        <span className="text-sm text-muted-foreground">{company.slug}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{company.user_count}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{company.team_count}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span>{company.metrics_count}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {company.last_login ? new Date(company.last_login).toLocaleDateString() : 'Never'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {company.directors.length > 0 ? company.directors.join(', ') : 'No directors'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant={
                          company.subscribed === false ? 'destructive' :
                          company.subscription_tier === 'Paid' ? 'default' :
                          company.subscription_tier === 'Trial' ? 'secondary' :
                          'outline'
                        }
                        className="h-6 inline-flex items-center"
                      >
                        {(() => {
                          if (company.subscribed === false) {
                            return 'Blocked';
                          }
                          
                          if (company.subscription_tier === 'Paid') {
                            return 'Paid';
                          }
                          
                          if (company.subscription_tier === 'Trial') {
                            const trialEnd = company.trial_end ? new Date(company.trial_end) : null;
                            const daysRemaining = trialEnd ? Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                            return `T - ${daysRemaining} days`;
                          }
                          
                          if (company.subscription_tier === 'Free') {
                            return 'Free';
                          }
                          
                          return 'Free';
                        })()}
                      </Badge>
                    </TableCell>
                    
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {company.health_score ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    company.health_score.color === 'green' ? 'default' :
                                    company.health_score.color === 'yellow' ? 'secondary' :
                                    company.health_score.color === 'orange' ? 'outline' :
                                    'destructive'
                                  }
                                  className="cursor-help h-6 inline-flex items-center"
                                >
                                  {company.health_score.label} ({company.health_score.total})
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-2">
                                <div className="font-semibold flex items-center gap-2">
                                  <Activity className="h-4 w-4" />
                                  Health Score: {company.health_score.total}/100
                                </div>
                                <div className="text-xs space-y-1">
                                  <div>Recency: {company.health_score.recency}/40</div>
                                  <div>Usage Intensity: {company.health_score.usage}/30</div>
                                  <div>User Adoption: {company.health_score.adoption}/20</div>
                                  <div>Account Health: {company.health_score.bonus}/10</div>
                                </div>
                                <div className="text-xs pt-1 border-t">
                                  Grade: <span className="font-medium">{company.health_score.grade}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {company.usage_hours_7d ? `${company.usage_hours_7d}h` : '0h'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(company.created_at).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={e => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        handleStatusClick(company);
                      }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Change Status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        handleDeleteClick(company);
                      }} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Company
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
            </TooltipProvider>
          </div>
          
          {sortedAndFilteredCompanies.length === 0 && <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No companies found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'No companies match your search criteria.' : 'Companies will appear here once they are created.'}
              </p>
            </div>}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <CompanyDeletionModal open={deleteModal.open} onOpenChange={open => setDeleteModal({
      open,
      company: null
    })} onConfirm={handleDeleteConfirm} company={deleteModal.company} />

      {/* Company Users Modal */}
      <CompanyUsersModal 
        open={usersModal.open} 
        onOpenChange={open => setUsersModal({
          open,
          company: null
        })} 
        company={usersModal.company}
        onChangeStatus={handleStatusClick}
        onDeleteCompany={handleDeleteClick}
      />

      {/* Company Status Modal */}
      <CompanyStatusModal open={statusModal.open} onOpenChange={open => setStatusModal({
      open,
      company: null
    })} company={statusModal.company} onConfirm={handleStatusConfirm} />
    </div>;
};