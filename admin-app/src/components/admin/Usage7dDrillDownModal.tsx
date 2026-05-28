import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Building2, 
  Users, 
  Clock, 
  AlertTriangle, 
  UserX, 
  User, 
  Camera,
  History,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CompanyStats } from '@/types/superAdmin';
import { FilterSplitButton } from './FilterSplitButton';
import { SavedFilter } from '@/hooks/useSavedCompanyFilters';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import {
  saveUsageSnapshot,
  fetchUsageSnapshots,
  deleteUsageSnapshot,
  formatSnapshotDate,
  UsageSnapshot,
  CompanyBreakdownItem,
} from '@/services/usageSnapshotService';

interface Usage7dDrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: CompanyStats[];
}

interface TopUserData {
  name: string;
  hours: number;
}

export const Usage7dDrillDownModal: React.FC<Usage7dDrillDownModalProps> = ({
  open,
  onOpenChange,
  companies,
}) => {
  const [searchText, setSearchText] = useState('');
  const [showAtRisk, setShowAtRisk] = useState(false);
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [excludedCompanyIds, setExcludedCompanyIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'name' | 'usage' | 'users'>('usage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [topUsers, setTopUsers] = useState<Record<string, TopUserData>>({});
  
  // Snapshot state
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [snapshots, setSnapshots] = useState<UsageSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [snapshotIndex, setSnapshotIndex] = useState<number | null>(null); // null = live data, 0+ = snapshot index

  const viewingSnapshot = snapshotIndex !== null ? snapshots[snapshotIndex] : null;

  // Fetch top user per company
  useEffect(() => {
    const fetchTopUsers = async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: usageData } = await supabase
        .from('company_usage_stats')
        .select('company_id, user_id, total_minutes')
        .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0]);

      if (!usageData || usageData.length === 0) return;

      // Group by company and aggregate per user
      const companyUserUsage: Record<string, Record<string, number>> = {};
      usageData.forEach(row => {
        if (!companyUserUsage[row.company_id]) {
          companyUserUsage[row.company_id] = {};
        }
        companyUserUsage[row.company_id][row.user_id] =
          (companyUserUsage[row.company_id][row.user_id] || 0) + row.total_minutes;
      });

      // Find top user per company
      const topUserIds: Record<string, { userId: string; minutes: number }> = {};
      Object.entries(companyUserUsage).forEach(([companyId, users]) => {
        let maxUserId = '';
        let maxMinutes = 0;
        Object.entries(users).forEach(([userId, minutes]) => {
          if (minutes > maxMinutes) {
            maxMinutes = minutes;
            maxUserId = userId;
          }
        });
        if (maxUserId) {
          topUserIds[companyId] = { userId: maxUserId, minutes: maxMinutes };
        }
      });

      // Fetch user names
      const userIds = [...new Set(Object.values(topUserIds).map(u => u.userId))];
      if (userIds.length === 0) return;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const userNames: Record<string, string> = {};
      profiles?.forEach(p => {
        userNames[p.id] = p.full_name || 'Unknown';
      });

      // Build final top users map
      const result: Record<string, TopUserData> = {};
      Object.entries(topUserIds).forEach(([companyId, { userId, minutes }]) => {
        result[companyId] = {
          name: userNames[userId] || 'Unknown',
          hours: Math.round((minutes / 60) * 10) / 10,
        };
      });

      setTopUsers(result);
    };

    if (open && !viewingSnapshot) {
      fetchTopUsers();
    }
  }, [open, viewingSnapshot]);

  // Fetch existing snapshots when modal opens
  useEffect(() => {
    const loadSnapshots = async () => {
      setIsLoadingSnapshots(true);
      try {
        const data = await fetchUsageSnapshots();
        setSnapshots(data);
      } catch (error) {
        logger.error('Failed to load snapshots:', error);
      } finally {
        setIsLoadingSnapshots(false);
      }
    };

    if (open) {
      loadSnapshots();
      setSnapshotIndex(null); // Reset to live view when opening
    }
  }, [open]);

  // Filter logic for snapshot data - check if company has low usage (simulating "at risk")
  const isSnapshotCompanyAtRisk = (company: CompanyBreakdownItem) => {
    // For snapshots, consider "at risk" as having very low or no usage
    return company.usage_hours < 0.5;
  };

  // Filter logic for snapshot data - check if company has no users
  const isSnapshotCompanyOrphaned = (company: CompanyBreakdownItem) => {
    return company.user_count === 0;
  };

  // Filter logic functions for live data
  const isCompanyAtRisk = (company: CompanyStats) => {
    if (!company.last_login_at) return true;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(company.last_login_at) < sevenDaysAgo;
  };

  const isCompanyOrphaned = (company: CompanyStats) => {
    return company.user_count === 0 || company.team_count === 0;
  };

  // Filter and sort companies (or show snapshot data)
  const filteredCompanies = useMemo(() => {
    // If viewing a snapshot, filter and return its data
    if (viewingSnapshot) {
      return viewingSnapshot.company_breakdown
        .filter(company => {
          // Filter out excluded companies
          if (excludedCompanyIds.includes(company.id)) return false;
          
          const matchesSearch = !searchText ||
            company.name.toLowerCase().includes(searchText.toLowerCase());
          const matchesRiskFilter = !showAtRisk || isSnapshotCompanyAtRisk(company);
          const matchesOrphanedFilter = !showOrphaned || isSnapshotCompanyOrphaned(company);

          return matchesSearch && matchesRiskFilter && matchesOrphanedFilter;
        })
        .sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'usage':
              comparison = a.usage_hours - b.usage_hours;
              break;
            case 'users':
              comparison = a.user_count - b.user_count;
              break;
            default:
              comparison = b.usage_hours - a.usage_hours;
          }
          return sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    return [...companies]
      .filter(company => {
        // Filter out excluded companies
        if (excludedCompanyIds.includes(company.id)) return false;
        
        const matchesSearch = !searchText ||
          company.name.toLowerCase().includes(searchText.toLowerCase());
        const matchesRiskFilter = !showAtRisk || isCompanyAtRisk(company);
        const matchesOrphanedFilter = !showOrphaned || isCompanyOrphaned(company);

        return matchesSearch && matchesRiskFilter && matchesOrphanedFilter;
      })
      .map(company => ({
        id: company.id,
        name: company.name,
        usage_hours: company.usage_hours_7d || 0,
        user_count: company.user_count || 0,
        avg_per_user: company.user_count > 0
          ? (company.usage_hours_7d || 0) / company.user_count
          : 0,
        top_user: topUsers[company.id] || null,
      }))
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'usage':
            comparison = a.usage_hours - b.usage_hours;
            break;
          case 'users':
            comparison = a.user_count - b.user_count;
            break;
          default:
            comparison = b.usage_hours - a.usage_hours;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [companies, searchText, showAtRisk, showOrphaned, excludedCompanyIds, sortField, sortDirection, topUsers, viewingSnapshot]);

  // Calculate totals based on filtered data
  const totals = useMemo(() => {
    const totalHours = filteredCompanies.reduce((sum, c) => sum + c.usage_hours, 0);
    const totalUsers = filteredCompanies.reduce((sum, c) => sum + c.user_count, 0);
    const activeCompanies = filteredCompanies.filter(c => c.usage_hours > 0).length;
    return { totalHours, totalUsers, activeCompanies };
  }, [filteredCompanies]);

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${hours.toFixed(1)}h`;
  };

  const getUsageBadge = (hours: number) => {
    if (hours >= 10) return { label: 'High', className: 'bg-success/10 text-success border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' };
    if (hours >= 2) return { label: 'Medium', className: 'bg-warning/10 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' };
    if (hours > 0) return { label: 'Low', className: 'bg-warning/10 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' };
    return { label: 'None', className: 'bg-muted text-muted-foreground' };
  };

  const currentFilters: SavedFilter['filter_data'] = {
    searchQuery: searchText,
    showAtRisk,
    excludedCompanyIds,
  };

  const handleLoadFilter = (filters: SavedFilter['filter_data']) => {
    setSearchText(filters.searchQuery || '');
    setShowAtRisk(filters.showAtRisk || false);
    setExcludedCompanyIds(filters.excludedCompanyIds || []);
  };

  // Save snapshot handler
  const handleSaveSnapshot = async () => {
    // Get unfiltered data for the snapshot
    const allCompaniesData: CompanyBreakdownItem[] = companies.map(company => ({
      id: company.id,
      name: company.name,
      usage_hours: company.usage_hours_7d || 0,
      user_count: company.user_count || 0,
      avg_per_user: company.user_count > 0
        ? (company.usage_hours_7d || 0) / company.user_count
        : 0,
      top_user: topUsers[company.id] || null,
    }));

    const allTotalHours = allCompaniesData.reduce((sum, c) => sum + c.usage_hours, 0);
    const allTotalUsers = allCompaniesData.reduce((sum, c) => sum + c.user_count, 0);
    const allActiveCompanies = allCompaniesData.filter(c => c.usage_hours > 0).length;

    setIsSavingSnapshot(true);
    try {
      const snapshot = await saveUsageSnapshot({
        total_hours: allTotalHours,
        total_users: allTotalUsers,
        active_companies: allActiveCompanies,
        company_breakdown: allCompaniesData,
      });

      setSnapshots(prev => [snapshot, ...prev]);
      
      toast({
        title: 'Snapshot saved',
        description: `Recorded ${allActiveCompanies} active companies with ${allTotalHours.toFixed(1)}h total usage.`,
      });
    } catch (error) {
      logger.error('Failed to save snapshot:', error);
      toast({
        title: 'Error saving snapshot',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  // Delete current snapshot handler
  const handleDeleteCurrentSnapshot = async () => {
    if (!viewingSnapshot) return;
    
    try {
      await deleteUsageSnapshot(viewingSnapshot.id);
      const newSnapshots = snapshots.filter(s => s.id !== viewingSnapshot.id);
      setSnapshots(newSnapshots);
      
      // Navigate to next snapshot or live view
      if (newSnapshots.length === 0) {
        setSnapshotIndex(null);
      } else if (snapshotIndex !== null && snapshotIndex >= newSnapshots.length) {
        setSnapshotIndex(newSnapshots.length - 1);
      }
      
      toast({
        title: 'Snapshot deleted',
      });
    } catch (error) {
      logger.error('Failed to delete snapshot:', error);
      toast({
        title: 'Error deleting snapshot',
        variant: 'destructive',
      });
    }
  };

  // Navigation handlers
  const goToPreviousSnapshot = () => {
    if (snapshotIndex === null) {
      // From live view, go to most recent snapshot
      if (snapshots.length > 0) {
        setSnapshotIndex(0);
      }
    } else if (snapshotIndex < snapshots.length - 1) {
      // Go to older snapshot
      setSnapshotIndex(snapshotIndex + 1);
    }
  };

  const goToNextSnapshot = () => {
    if (snapshotIndex === null) return;
    
    if (snapshotIndex === 0) {
      // Go back to live view
      setSnapshotIndex(null);
    } else {
      // Go to newer snapshot
      setSnapshotIndex(snapshotIndex - 1);
    }
  };

  const canGoPrevious = snapshots.length > 0 && (snapshotIndex === null || snapshotIndex < snapshots.length - 1);
  const canGoNext = snapshotIndex !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <DialogTitle>
                Usage (7d) Breakdown
              </DialogTitle>
              {viewingSnapshot && (
                <Badge variant="secondary" className="ml-2">
                  Historical
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{totals.totalHours.toFixed(1)}h</span>
                <span className="text-muted-foreground">total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{totals.activeCompanies}</span>
                <span className="text-muted-foreground">active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{totals.totalUsers}</span>
                <span className="text-muted-foreground">users</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterSplitButton
              companies={companies.map(c => ({ id: c.id, name: c.name }))}
              currentFilters={currentFilters}
              onLoadFilter={handleLoadFilter}
              onClearFilter={() => {
                setSearchText('');
                setShowAtRisk(false);
                setExcludedCompanyIds([]);
              }}
            />
            <Button
              variant={showAtRisk ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAtRisk(!showAtRisk)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              At Risk
            </Button>
            <Button
              variant={showOrphaned ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOrphaned(!showOrphaned)}
            >
              <UserX className="h-4 w-4 mr-1" />
              Orphaned
            </Button>
          </div>

          {/* Snapshot navigation and save */}
          <div className="flex items-center gap-2">
            {/* Snapshot navigator */}
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Previous snapshot"
                onClick={goToPreviousSnapshot}
                disabled={!canGoPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1.5 px-2 min-w-[120px] justify-center">
                <History className="h-4 w-4 text-muted-foreground" />
                {viewingSnapshot ? (
                  <span className="text-sm font-medium truncate">
                    {formatSnapshotDate(viewingSnapshot.snapshot_date).split(',')[0]}
                  </span>
                ) : (
                  <span className="text-sm font-medium">Live</span>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Next snapshot"
                onClick={goToNextSnapshot}
                disabled={!canGoNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Delete snapshot button (only when viewing a snapshot) */}
            {viewingSnapshot && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Delete snapshot"
                onClick={handleDeleteCurrentSnapshot}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {/* Save snapshot button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSnapshot}
              disabled={isSavingSnapshot || viewingSnapshot !== null}
            >
              {isSavingSnapshot ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-1" />
              )}
              Save Snapshot
            </Button>
          </div>
        </div>

        {/* Viewing snapshot info banner */}
        {viewingSnapshot && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Viewing snapshot from <span className="font-medium text-foreground">{formatSnapshotDate(viewingSnapshot.snapshot_date)}</span>
              {showAtRisk && <span className="ml-2">(At Risk: low usage companies)</span>}
            </span>
          </div>
        )}

        {/* Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          <table className="w-full">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Company</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Usage</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Users</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Avg/User</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Top User</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Activity</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company, idx) => {
                const badge = getUsageBadge(company.usage_hours);
                return (
                  <tr
                    key={company.id}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{company.name}</span>
                        {idx < 3 && company.usage_hours > 0 && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            Top {idx + 1}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatHours(company.usage_hours)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {company.user_count}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {formatHours(company.avg_per_user)}
                    </td>
                    <td className="px-4 py-3">
                      {company.top_user ? (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium truncate max-w-[120px]">
                              {company.top_user.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatHours(company.top_user.hours)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {searchText ? 'No matching companies found' : 'No companies available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>

        <div className="text-sm text-muted-foreground text-right">
          {viewingSnapshot 
            ? `Showing ${filteredCompanies.length} of ${viewingSnapshot.company_breakdown.length} companies from snapshot`
            : `Showing ${filteredCompanies.length} of ${companies.length} companies`
          }
        </div>
      </DialogContent>
    </Dialog>
  );
};
