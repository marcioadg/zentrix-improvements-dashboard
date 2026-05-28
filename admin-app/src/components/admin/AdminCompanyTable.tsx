import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Building2, MoreHorizontal, Eye, Pencil, Users } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import type { CompanyStats } from '@/types/superAdmin';

export const AdminCompanyTable: React.FC = () => {
  const { companies, loading } = useSuperAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  const handleViewDetails = (company: CompanyStats) => {
    setSelectedCompany(company);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading companies...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Company Management</h2>
        <p className="text-muted-foreground">
          Manage organizations on the platform. {filteredCompanies.length} of {companies.length} companies shown.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{company.user_count}</span>
                        {company.pending_user_count > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            +{company.pending_user_count} pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{company.team_count}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={company.status === 'active' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {company.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {company.subscription_tier ? (
                        <Badge
                          variant="outline"
                          className={
                            company.subscription_tier === 'Paid'
                              ? 'border-emerald-500/30 text-emerald-600'
                              : company.subscription_tier === 'Trial'
                              ? 'border-amber-500/30 text-amber-600'
                              : 'border-muted-foreground/30 text-muted-foreground'
                          }
                        >
                          {company.subscription_tier}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Free</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(company.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" aria-label="More actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(company)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(company)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCompanies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No companies found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <p className="font-medium">{selectedCompany.slug}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedCompany.status === 'active' ? 'default' : 'secondary'} className="capitalize mt-1">
                    {selectedCompany.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="font-medium">{selectedCompany.user_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Users</p>
                  <p className="font-medium">{selectedCompany.pending_user_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="font-medium">{selectedCompany.team_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Metrics</p>
                  <p className="font-medium">{selectedCompany.metrics_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subscription</p>
                  <p className="font-medium">{selectedCompany.subscription_tier ?? 'Free'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(selectedCompany.created_at).toLocaleDateString()}</p>
                </div>
                {selectedCompany.last_login_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Activity</p>
                    <p className="font-medium">{new Date(selectedCompany.last_login_at).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedCompany.goals_count != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Goals</p>
                    <p className="font-medium">{selectedCompany.goals_count}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
