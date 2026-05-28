import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ChevronDown, Search, Users, Building2, Shield, UserX, MoreHorizontal, Trash2, UserMinus, UserCog, Globe, MousePointerClick, Filter, Crown, Clock, Sparkles } from 'lucide-react';
import { useSuperAdminUsers, SuperAdminUser, LeadProfiling } from '@/hooks/useSuperAdminUsers';
import { UserDeletionModal } from './UserDeletionModal';
import { BulkUserDeletionModal } from './BulkUserDeletionModal';
import { TeamMembershipDisplay } from './TeamMembershipDisplay';
import { addUserToTeamDirectly, removeUserFromTeamDirectly } from '@/services/directTeamMemberService';
import { bulkDeleteUsers, bulkDeactivateUsers } from '@/services/bulkUserDeletionService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfileModal } from '@/components/modals/UserProfileModal';
import { UnifiedUser } from '@/hooks/useUserManagement';
import { logger } from '@/utils/logger';
export const UserManagement = () => {
  const {
    users,
    companies,
    loading,
    updateUserCompanyMemberships,
    refetch
  } = useSuperAdminUsers();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();

  // Log empty user lists for debugging
  React.useEffect(() => {
    if (!loading && users.length === 0) {
      logger.warn('UserManagement: No users returned. This might indicate permission issues or RPC failure.');
    }
  }, [loading, users]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [userToDelete, setUserToDelete] = useState<SuperAdminUser | null>(null);
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [bulkDeletionModalOpen, setBulkDeletionModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<UnifiedUser | null>(null);
  const [userProfileModalOpen, setUserProfileModalOpen] = useState(false);
  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) || user.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCompany = filterCompany === 'all' || user.primary_company_id === filterCompany || user.company_memberships.some(m => m.company_id === filterCompany);
      
      // If no filters active, show all
      if (activeFilters.size === 0) return matchesSearch && matchesCompany;

      // User must match at least one active filter
      let matchesAnyFilter = false;

      // User type filters
      if (activeFilters.has('orphaned')) {
        if (user.company_memberships.length === 0 && !user.primary_company_id && user.role !== 'pending') matchesAnyFilter = true;
      }
      if (activeFilters.has('multi-company')) {
        if (user.company_memberships.length > 1) matchesAnyFilter = true;
      }
      if (activeFilters.has('super-admin')) {
        if (user.role === 'super_admin') matchesAnyFilter = true;
      }
      if (activeFilters.has('inactive')) {
        if (user.status === 'inactive') matchesAnyFilter = true;
      }

      // Subscription filters
      if (activeFilters.has('paid')) {
        if (user.company_memberships.some(cm => ['Paid', 'Premium', 'Basic', 'Enterprise'].includes(cm.subscription_tier || ''))) matchesAnyFilter = true;
      }
      if (activeFilters.has('trial')) {
        if (user.company_memberships.some(cm => cm.subscription_tier === 'Trial')) matchesAnyFilter = true;
      }
      if (activeFilters.has('free')) {
        if (user.company_memberships.some(cm => !cm.subscription_tier || cm.subscription_tier === 'Free')) matchesAnyFilter = true;
      }

      // Attribution filters - click IDs
      if (activeFilters.has('gclid')) {
        if (user.attribution?.gclid) matchesAnyFilter = true;
      }
      if (activeFilters.has('fbclid')) {
        if (user.attribution?.fbclid) matchesAnyFilter = true;
      }
      if (activeFilters.has('li_fat_id')) {
        if (user.attribution?.li_fat_id) matchesAnyFilter = true;
      }

      // Qualified leads filter
      if (activeFilters.has('qualified-leads')) {
        const hasAdAttribution = !!(user.attribution?.gclid || user.attribution?.fbclid || user.attribution?.li_fat_id);
        if (hasAdAttribution && user.lead_profiling && user.lead_profiling.is_disqualified === false) matchesAnyFilter = true;
      }

      // Attribution filters - UTM
      if (activeFilters.has('has-utm-source')) {
        if (user.attribution?.utm_source && user.attribution.utm_source !== 'direct') matchesAnyFilter = true;
      }
      if (activeFilters.has('has-utm-campaign')) {
        if (user.attribution?.utm_campaign) matchesAnyFilter = true;
      }
      if (activeFilters.has('has-utm-medium')) {
        if (user.attribution?.utm_medium && user.attribution.utm_medium !== 'none') matchesAnyFilter = true;
      }
      if (activeFilters.has('has-utm-adset')) {
        if (user.attribution?.utm_adset) matchesAnyFilter = true;
      }
      if (activeFilters.has('has-utm-ad')) {
        if (user.attribution?.utm_ad) matchesAnyFilter = true;
      }

      // General attribution filters
      if (activeFilters.has('organic')) {
        if (user.attribution?.utm_source === 'direct') matchesAnyFilter = true;
      }
      if (activeFilters.has('referral')) {
        if (user.attribution?.referral_source && user.attribution.referral_source !== 'not_specified') matchesAnyFilter = true;
      }
      if (activeFilters.has('has-attribution')) {
        if (user.attribution) matchesAnyFilter = true;
      }
      if (activeFilters.has('no-attribution')) {
        if (!user.attribution) matchesAnyFilter = true;
      }
      // Presentation filters
      if (activeFilters.has('ecoa')) {
        if (user.attribution?.utm_source === 'ecoa') matchesAnyFilter = true;
      }

      return matchesSearch && matchesCompany && matchesAnyFilter;
    });
  }, [users, searchQuery, filterCompany, activeFilters]);
  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };
  const handleCompanyMembershipChange = async (user: SuperAdminUser, selectedCompanies: string[]) => {
    try {
      await updateUserCompanyMemberships(user.id, selectedCompanies);
      toast({
        title: "Success",
        description: "Company memberships updated successfully"
      });
      refetch();
    } catch (error) {
      logger.error('Error updating company memberships:', error);
      toast({
        title: "Error",
        description: "Failed to update company memberships",
        variant: "destructive"
      });
    }
  };
  const handleDeleteUser = (user: SuperAdminUser) => {
    setUserToDelete(user);
    setDeletionModalOpen(true);
  };
  const handleUserDeleted = () => {
    refetch();
    setUserToDelete(null);
  };
  const handleUserClick = (user: SuperAdminUser) => {
    // Convert SuperAdminUser to UnifiedUser format
    const unifiedUser: UnifiedUser = {
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role,
      permission_level: user.role,
      // Use role as permission_level for admin interface
      capabilities: [],
      joined_at: user.created_at,
      created_at: user.created_at,
      // Add the missing created_at property
      access_type: 'direct' as const,
      company_memberships: user.company_memberships?.map(cm => ({
        company_id: cm.company_id,
        permission_level: cm.role
      })) || [],
      primary_company_id: user.primary_company_id
    };
    setSelectedUserForProfile(unifiedUser);
    setUserProfileModalOpen(true);
  };
  const handleUserUpdated = () => {
    refetch();
  };
  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableUsers = filteredUsers.filter(filterUser => filterUser.id !== user?.id); // Don't allow selecting current user
      setSelectedUsers(new Set(selectableUsers.map(filterUser => filterUser.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };
  const selectedUserObjects = users.filter(user => selectedUsers.has(user.id));
  const allSelected = filteredUsers.length > 0 && filteredUsers.every(filterUser => selectedUsers.has(filterUser.id) || filterUser.id === user?.id);
  const someSelected = selectedUsers.size > 0;
  const handleBulkDelete = async (userIds: string[], transferToUserId?: string, options?: {
    deleteData: boolean;
  }) => {
    if (!user?.id) return;
    setBulkActionLoading(true);
    try {
      const result = await bulkDeleteUsers(userIds, user.id, transferToUserId, options);
      if (result.success) {
        toast({
          title: "Bulk Deletion Completed",
          description: `Successfully deleted ${result.successCount} user(s)`
        });
      } else {
        toast({
          title: "Bulk Deletion Partially Failed",
          description: `Deleted ${result.successCount} users, ${result.failureCount} failed`,
          variant: "destructive"
        });
      }
      setSelectedUsers(new Set());
      setBulkDeletionModalOpen(false);
      refetch();
    } catch (error) {
      logger.error('Bulk deletion error:', error);
      toast({
        title: "Bulk Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete users",
        variant: "destructive"
      });
    } finally {
      setBulkActionLoading(false);
    }
  };
  const handleBulkDeactivate = async () => {
    if (!user?.id || selectedUsers.size === 0) return;
    setBulkActionLoading(true);
    try {
      const result = await bulkDeactivateUsers(Array.from(selectedUsers), user.id);
      if (result.success) {
        toast({
          title: "Bulk Deactivation Completed",
          description: `Successfully deactivated ${result.successCount} user(s)`
        });
      } else {
        toast({
          title: "Bulk Deactivation Partially Failed",
          description: `Deactivated ${result.successCount} users, ${result.failureCount} failed`,
          variant: "destructive"
        });
      }
      setSelectedUsers(new Set());
      refetch();
    } catch (error) {
      logger.error('Bulk deactivation error:', error);
      toast({
        title: "Bulk Deactivation Failed",
        description: error instanceof Error ? error.message : "Failed to deactivate users",
        variant: "destructive"
      });
    } finally {
      setBulkActionLoading(false);
    }
  };
  const getAttributionBadge = (user: SuperAdminUser) => {
    if (!user.attribution) return null;
    if (user.attribution.gclid) return <Badge variant="outline" className="ml-1 text-xs border-blue-500/30 text-primary"><MousePointerClick className="w-3 h-3 mr-1" />Google</Badge>;
    if (user.attribution.fbclid) return <Badge variant="outline" className="ml-1 text-xs border-indigo-500/30 text-indigo-600"><MousePointerClick className="w-3 h-3 mr-1" />Facebook</Badge>;
    if (user.attribution.li_fat_id) return <Badge variant="outline" className="ml-1 text-xs border-sky-500/30 text-sky-600"><MousePointerClick className="w-3 h-3 mr-1" />LinkedIn</Badge>;
    if (user.attribution.utm_source === 'ecoa') return <Badge variant="outline" className="ml-1 text-xs border-emerald-500/30 text-emerald-600"><Globe className="w-3 h-3 mr-1" />Ecoa</Badge>;
    if (user.attribution.utm_source && user.attribution.utm_source !== 'direct') return <Badge variant="outline" className="ml-1 text-xs"><Globe className="w-3 h-3 mr-1" />{user.attribution.utm_source}</Badge>;
    if (user.attribution.utm_source === 'direct') return <Badge variant="outline" className="ml-1 text-xs text-muted-foreground"><Globe className="w-3 h-3 mr-1" />Direct</Badge>;
    return null;
  };

  const getUserTypeBadge = (user: SuperAdminUser) => {
    if (user.role === 'pending') {
      return <Badge variant="secondary" className="ml-2">Pending Invitation</Badge>;
    }
    if (user.status === 'inactive') {
      return <Badge variant="outline" className="ml-2 border-muted-foreground/50 text-muted-foreground">Inactive</Badge>;
    }
    if (user.role === 'super_admin') {
      return <Badge variant="destructive" className="ml-2"><Shield className="w-3 h-3 mr-1" />Super Admin</Badge>;
    }
    if (user.company_memberships.length === 0 && !user.primary_company_id) {
      return <Badge variant="secondary" className="ml-2"><UserX className="w-3 h-3 mr-1" />Orphaned</Badge>;
    }
    if (user.company_memberships.length > 1) {
      return <Badge variant="outline" className="ml-2"><Building2 className="w-3 h-3 mr-1" />Multi-Company</Badge>;
    }
    return null;
  };
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
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
      </Card>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          Manage user accounts across all companies. {filteredUsers.length} of {users.length} users shown.
        </p>
      </div>

      {/* Bulk Actions Bar */}
      {someSelected && <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                </span>
                <Button variant="outline" size="sm" onClick={() => setSelectedUsers(new Set())}>
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkDeactivate} disabled={bulkActionLoading} className="flex items-center gap-2">
                  <UserMinus className="h-4 w-4" />
                  Deactivate Selected
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setBulkDeletionModalOpen(true)} disabled={bulkActionLoading} className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>}

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(company => <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="whitespace-nowrap">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters {activeFilters.size > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{activeFilters.size}</Badge>}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* User Type */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">User Type</div>
                <DropdownMenuCheckboxItem checked={activeFilters.has('orphaned')} onCheckedChange={() => toggleFilter('orphaned')} onSelect={(e) => e.preventDefault()}>
                  <UserX className="h-4 w-4 mr-2" /> Orphaned
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('multi-company')} onCheckedChange={() => toggleFilter('multi-company')} onSelect={(e) => e.preventDefault()}>
                  <Building2 className="h-4 w-4 mr-2" /> Multi-Company
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('super-admin')} onCheckedChange={() => toggleFilter('super-admin')} onSelect={(e) => e.preventDefault()}>
                  <Shield className="h-4 w-4 mr-2" /> Super Admin
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('inactive')} onCheckedChange={() => toggleFilter('inactive')} onSelect={(e) => e.preventDefault()}>
                  <UserMinus className="h-4 w-4 mr-2" /> Inactive
                </DropdownMenuCheckboxItem>
                
                <DropdownMenuSeparator />

                {/* Subscription Status */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Subscription</div>
                <DropdownMenuCheckboxItem checked={activeFilters.has('paid')} onCheckedChange={() => toggleFilter('paid')} onSelect={(e) => e.preventDefault()}>
                  <Crown className="h-4 w-4 mr-2" /> Paid
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('trial')} onCheckedChange={() => toggleFilter('trial')} onSelect={(e) => e.preventDefault()}>
                  <Clock className="h-4 w-4 mr-2" /> Trial
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('free')} onCheckedChange={() => toggleFilter('free')} onSelect={(e) => e.preventDefault()}>
                  <Sparkles className="h-4 w-4 mr-2" /> Free
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />

                {/* Click IDs */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Ad Click IDs</div>
                <DropdownMenuCheckboxItem checked={activeFilters.has('gclid')} onCheckedChange={() => toggleFilter('gclid')} onSelect={(e) => e.preventDefault()}>
                  📢 Google Ads (gclid)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('fbclid')} onCheckedChange={() => toggleFilter('fbclid')} onSelect={(e) => e.preventDefault()}>
                  📘 Facebook Ads (fbclid)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('li_fat_id')} onCheckedChange={() => toggleFilter('li_fat_id')} onSelect={(e) => e.preventDefault()}>
                  💼 LinkedIn Ads (li_fat_id)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('qualified-leads')} onCheckedChange={() => toggleFilter('qualified-leads')} onSelect={(e) => e.preventDefault()}>
                  ✅ Qualified Leads
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />

                {/* UTM Parameters */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">UTM Parameters</div>
                <DropdownMenuCheckboxItem checked={activeFilters.has('has-utm-source')} onCheckedChange={() => toggleFilter('has-utm-source')} onSelect={(e) => e.preventDefault()}>
                  UTM Source
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('has-utm-medium')} onCheckedChange={() => toggleFilter('has-utm-medium')} onSelect={(e) => e.preventDefault()}>
                  UTM Medium
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('has-utm-campaign')} onCheckedChange={() => toggleFilter('has-utm-campaign')} onSelect={(e) => e.preventDefault()}>
                  UTM Campaign
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('has-utm-adset')} onCheckedChange={() => toggleFilter('has-utm-adset')} onSelect={(e) => e.preventDefault()}>
                  UTM Adset
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('has-utm-ad')} onCheckedChange={() => toggleFilter('has-utm-ad')} onSelect={(e) => e.preventDefault()}>
                  UTM Ad
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />

                {/* General */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">General</div>
                <DropdownMenuCheckboxItem checked={activeFilters.has('organic')} onCheckedChange={() => toggleFilter('organic')} onSelect={(e) => e.preventDefault()}>
                  🌱 Organic / Direct
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('referral')} onCheckedChange={() => toggleFilter('referral')} onSelect={(e) => e.preventDefault()}>
                  🔗 Referral
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('has-attribution')} onCheckedChange={() => toggleFilter('has-attribution')} onSelect={(e) => e.preventDefault()}>
                  ✅ Has Attribution
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={activeFilters.has('no-attribution')} onCheckedChange={() => toggleFilter('no-attribution')} onSelect={(e) => e.preventDefault()}>
                  ❌ No Attribution
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />

                {/* Presentations */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Presentations</div>
                <DropdownMenuCheckboxItem checked={activeFilters.has('ecoa')} onCheckedChange={() => toggleFilter('ecoa')} onSelect={(e) => e.preventDefault()}>
                  🎤 Ecoa Presentation
                </DropdownMenuCheckboxItem>

                {activeFilters.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveFilters(new Set())} className="text-destructive justify-center">
                      Clear All Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
               <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Companies</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(currentUser => <TableRow key={currentUser.id}>
                    <TableCell>
                      <Checkbox checked={selectedUsers.has(currentUser.id)} onCheckedChange={checked => handleSelectUser(currentUser.id, !!checked)} disabled={currentUser.id === user?.id} // Can't select self
                  />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors" onClick={() => handleUserClick(currentUser)}>
                          <div className="font-medium flex items-center flex-wrap">
                            {currentUser.full_name}
                            {getUserTypeBadge(currentUser)}
                            {getAttributionBadge(currentUser)}
                          </div>
                          <div className="text-sm text-muted-foreground">{currentUser.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {currentUser.company_memberships.length > 0 ? <div className="flex flex-wrap gap-1">
                            {currentUser.company_memberships.slice(0, 3).map(membership => {
                        const company = companies.find(c => c.id === membership.company_id);
                        const tier = membership.subscription_tier || 'Free';
                        const getPlanIcon = () => {
                          if (tier === 'Paid' || tier === 'Premium' || tier === 'Basic' || tier === 'Enterprise') return <Crown className="w-3 h-3" />;
                          if (tier === 'Trial') return <Clock className="w-3 h-3" />;
                          return <Sparkles className="w-3 h-3" />;
                        };
                        const getPlanLabel = () => {
                          if (['Paid', 'Premium', 'Basic', 'Enterprise'].includes(tier)) return 'Paid';
                          if (tier === 'Trial') {
                            if (membership.trial_end) {
                              const daysLeft = Math.max(0, Math.ceil((new Date(membership.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                              return `T-${daysLeft}`;
                            }
                            return 'Trial';
                          }
                          return 'Free';
                        };
                        const getPlanBadgeClass = () => {
                          if (['Paid', 'Premium', 'Basic', 'Enterprise'].includes(tier)) return 'border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400';
                          if (tier === 'Trial') return 'border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400';
                          return 'border-muted-foreground/30 text-muted-foreground';
                        };
                        return <div key={membership.company_id} className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {company?.name || 'Unknown'} ({membership.role})
                                  </Badge>
                                  <Badge variant="outline" className={`text-[10px] h-4 px-1.5 gap-0.5 ${getPlanBadgeClass()}`}>
                                    {getPlanIcon()}
                                    {getPlanLabel()}
                                  </Badge>
                                </div>;
                      })}
                            {currentUser.company_memberships.length > 3 && <Badge variant="secondary" className="text-xs">
                                +{currentUser.company_memberships.length - 3} more
                              </Badge>}
                          </div> : <span className="text-sm text-muted-foreground">No companies</span>}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(currentUser.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {currentUser.last_login_at 
                          ? new Date(currentUser.last_login_at).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      {currentUser.status === 'inactive' ? (
                        <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground">Inactive</Badge>
                      ) : currentUser.status === 'active' ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" aria-label="More actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUserClick(currentUser)}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Manage User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteUser(currentUser)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>)}
                
                {filteredUsers.length === 0 && <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found matching your criteria
                    </TableCell>
                  </TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete User Modal */}
      <UserDeletionModal user={userToDelete} open={deletionModalOpen} onOpenChange={setDeletionModalOpen} onUserDeleted={handleUserDeleted} />

      {/* Bulk Delete Modal */}
      <BulkUserDeletionModal open={bulkDeletionModalOpen} onOpenChange={setBulkDeletionModalOpen} selectedUsers={selectedUserObjects} allUsers={users} onConfirm={handleBulkDelete} loading={bulkActionLoading} />

      {/* User Profile Modal */}
      <UserProfileModal open={userProfileModalOpen} onOpenChange={setUserProfileModalOpen} user={selectedUserForProfile} onUserUpdated={handleUserUpdated} />
    </div>;
};