import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Shield, Receipt, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Search, RefreshCw, Activity, Crown, Clock, Sparkles, XCircle, Smartphone, Monitor } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { UserManagement } from '@/components/admin/UserManagement';
import { AdminUsersView } from '@/components/admin/AdminUsersView';
import { AdminActionsLog } from '@/components/admin/AdminActionsLog';
import { InvoicePreviewTool } from '@/components/admin/InvoicePreviewTool';
import { StripeModeToggle } from '@/components/admin/StripeModeToggle';
import { StripeAccountToggle } from '@/components/admin/StripeAccountToggle';
import { PlatformWebhookConfig } from '@/components/admin/PlatformWebhookConfig';
import { PlatformUsageContent } from '@/components/admin/PlatformUsageContent';
import { AnnouncementManagement } from '@/components/announcements/AnnouncementManagement';
import { FeatureLaunchManager } from '@/components/features/FeatureLaunchManager';
import { AdminEmailMessage } from '@/components/admin/AdminEmailMessage';
import { CompanyUsersModal } from '@/components/admin/CompanyUsersModal';
import { CompanyWithStats } from '@/hooks/useCompanyManagement';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CompanyStatusDropdown } from '@/components/admin/CompanyStatusDropdown';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsOverview } from '@/components/admin/AnalyticsOverview';
import { CompanyStatusModal } from '@/components/modals/CompanyStatusModal';
import { CompanyDeletionModal } from '@/components/modals/CompanyDeletionModal';
import { useToast } from '@/hooks/use-toast';
import { FilterSplitButton } from '@/components/admin/FilterSplitButton';
import { deleteCompanyCompletely } from '@/services/companyDeletionService';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { CustomerSuccessContent } from '@/components/admin/CustomerSuccessContent';
import { Analytics2Content } from '@/components/admin/Analytics2Content';
import { BlogManagement } from '@/components/admin/BlogManagement';
import { SupportInbox } from '@/components/admin/SupportInbox';
import { VTOLeadsTable } from '@/components/admin/VTOLeadsTable';
import { OnboardingAnalyticsTab } from '@/components/admin/OnboardingAnalyticsTab';
import { logger } from '@/utils/logger';
const EXCLUDED_COMPANIES_KEY = 'admin_excluded_companies';

interface CompanyAttribution {
  gclid: boolean;
  fbclid: boolean;
  li_fat_id: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_adset: string | null;
  utm_ad: string | null;
  landing_page_url: string | null;
  referral_source: string | null;
}
const VALID_TABS = ['overview', 'analytics', 'onboarding', 'management', 'customer-success', 'analytics2', 'blog', 'vto-leads', 'support', 'platform', 'settings'] as const;
type TabValue = typeof VALID_TABS[number];

// Clickable Device cell on the Overview tab.
// Shows the founder's first-signup device as an icon (or — when unknown), and
// opens a popover with the all-time mobile vs. desktop usage breakdown on click.
// Usage data is fetched lazily the first time the popover opens, then cached.
const DeviceUsagePopover: React.FC<{
  companyId: string;
  firstDeviceType: string | null | undefined;
}> = ({ companyId, firstDeviceType }) => {
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<{ mobile: number; desktop: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || usage || loading) return;
    setLoading(true);
    supabase
      .from('user_activity_sessions')
      .select('device_type, duration_minutes')
      .eq('company_id', companyId)
      .not('duration_minutes', 'is', null)
      .then(({ data }) => {
        let mobile = 0;
        let desktop = 0;
        data?.forEach((s: { device_type: string | null; duration_minutes: number | null }) => {
          if (!s.duration_minutes) return;
          if (s.device_type === 'mobile') mobile += s.duration_minutes;
          else if (s.device_type === 'web') desktop += s.duration_minutes;
        });
        setUsage({ mobile, desktop });
        setLoading(false);
      });
  }, [open, companyId, usage, loading]);

  const fmt = (m: number) => {
    if (!m) return '0m';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r === 0 ? `${h}h` : `${h}h ${r}m`;
  };

  const firstLabel =
    firstDeviceType === 'mobile' ? 'Mobile' :
    firstDeviceType === 'web' ? 'Desktop' :
    'Unknown';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted/50 transition-colors"
          aria-label="View device usage breakdown"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {firstDeviceType === 'mobile' ? (
            <Smartphone className="h-4 w-4 text-blue-500" />
          ) : firstDeviceType === 'web' ? (
            <Monitor className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 text-sm" align="center">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">First access</span>
            <span className="font-medium inline-flex items-center gap-1.5">
              {firstDeviceType === 'mobile' && <Smartphone className="h-3.5 w-3.5 text-blue-500" />}
              {firstDeviceType === 'web' && <Monitor className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />}
              {firstLabel}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </span>
            <span className="font-medium">
              {loading ? '…' : usage ? fmt(usage.mobile) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </span>
            <span className="font-medium">
              {loading ? '…' : usage ? fmt(usage.desktop) : '—'}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const CompanyManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Tab state synced with URL
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    const tabParam = searchParams.get('tab');
    return tabParam && VALID_TABS.includes(tabParam as TabValue) ? tabParam as TabValue : 'overview';
  });

  // Sync tab state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as TabValue)) {
      setActiveTab(tabParam as TabValue);
    } else if (!tabParam) {
      setActiveTab('overview');
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    if (VALID_TABS.includes(newTab as TabValue)) {
      setActiveTab(newTab as TabValue);
      setSearchParams({ tab: newTab });
    }
  };
  const {
    companies,
    recentCompanies,
    recentlyActiveCompanies,
    adminActions,
    loading,
    refetch
  } = useSuperAdmin();
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
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    company: CompanyWithStats | null;
  }>({
    open: false,
    company: null
  });
  const [excludedCompanyIds, setExcludedCompanyIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'created' | 'login' | 'users' | 'usage' | 'status' | 'name' | 'health_score' | 'plan'>('login');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAtRisk, setShowAtRisk] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState<string>('all');
  const [companyAttributions, setCompanyAttributions] = useState<Record<string, CompanyAttribution>>({});
  const [companyDeviceTypes, setCompanyDeviceTypes] = useState<Record<string, string | null>>({});

  // Fetch first device type per company (from the earliest member by joined_at)
  useEffect(() => {
    const fetchDeviceTypes = async () => {
      if (!companies || companies.length === 0) return;

      const { data: members, error: membersError } = await supabase
        .from('company_members')
        .select('user_id, company_id, joined_at')
        .not('user_id', 'is', null)
        .order('joined_at', { ascending: true });

      if (membersError || !members) return;

      // Get the earliest member per company
      const earliestMemberPerCompany = new Map<string, string>();
      members.forEach(m => {
        if (m.user_id && !earliestMemberPerCompany.has(m.company_id)) {
          earliestMemberPerCompany.set(m.company_id, m.user_id);
        }
      });

      const userIds = [...new Set(earliestMemberPerCompany.values())];
      if (userIds.length === 0) return;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_device_type')
        .in('id', userIds);

      if (profilesError || !profiles) return;

      const userDeviceMap = new Map(profiles.map(p => [p.id, p.first_device_type]));
      const result: Record<string, string | null> = {};

      earliestMemberPerCompany.forEach((userId, companyId) => {
        result[companyId] = userDeviceMap.get(userId) || null;
      });

      setCompanyDeviceTypes(result);
    };

    fetchDeviceTypes();
  }, [companies]);

  // Fetch attribution data per company
  useEffect(() => {
    const fetchAttributions = async () => {
      const { data, error } = await supabase
        .from('user_attributions')
        .select('user_id, gclid, fbclid, li_fat_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_adset, utm_ad, landing_page_url, referral_source');
      
      if (error || !data) return;

      // Get company_id for each user via company_members
      const userIds = data.map(d => d.user_id);
      if (userIds.length === 0) return;

      const { data: members } = await supabase
        .from('company_members')
        .select('user_id, company_id')
        .in('user_id', userIds);

      if (!members) return;

      const userToCompany = new Map(members.map(m => [m.user_id, m.company_id]));
      const result: Record<string, CompanyAttribution> = {};

      data.forEach(attr => {
        const companyId = userToCompany.get(attr.user_id);
        if (!companyId) return;
        
        // Merge: if any member has attribution, the company shows it
        const existing = result[companyId];
        result[companyId] = {
          gclid: (existing?.gclid || false) || !!attr.gclid,
          fbclid: (existing?.fbclid || false) || !!attr.fbclid,
          li_fat_id: (existing?.li_fat_id || false) || !!attr.li_fat_id,
          utm_source: attr.utm_source || existing?.utm_source || null,
          utm_medium: attr.utm_medium || existing?.utm_medium || null,
          utm_campaign: attr.utm_campaign || existing?.utm_campaign || null,
          utm_content: (attr as any).utm_content || existing?.utm_content || null,
          utm_term: (attr as any).utm_term || existing?.utm_term || null,
          utm_adset: (attr as any).utm_adset || existing?.utm_adset || null,
          utm_ad: (attr as any).utm_ad || existing?.utm_ad || null,
          landing_page_url: (attr as any).landing_page_url || existing?.landing_page_url || null,
          referral_source: (attr as any).referral_source || existing?.referral_source || null,
        };
      });

      setCompanyAttributions(result);
    };

    fetchAttributions();
  }, [companies]);

  // Load excluded companies from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(EXCLUDED_COMPANIES_KEY);
    if (saved) {
      try {
        setExcludedCompanyIds(JSON.parse(saved));
      } catch (error) {
        logger.error('Error loading excluded companies:', error);
      }
    }
  }, []);
  const handleCompanyClick = (company: any) => {
    logger.log('🔍 Clicked company:', company.name, 'Current metrics_count:', company.metrics_count);

    // Open modal immediately with current data, refetch in background
    refetch();

    const companyData = company;
    
    logger.log('✅ Using company data:', {
      name: companyData.name,
      metrics_count: companyData.metrics_count,
      team_count: companyData.team_count,
      user_count: companyData.user_count
    });
    
    // Convert to CompanyWithStats format with the FRESH data
    const companyWithStats: CompanyWithStats = {
      id: companyData.id,
      name: companyData.name,
      slug: companyData.slug || '',
      created_at: companyData.created_at,
      user_count: companyData.user_count || 0,
      team_count: companyData.team_count || 0,
      metrics_count: companyData.metrics_count || 0,
      status: (companyData.subscription_tier as 'Trial' | 'Free' | 'Paid') || 'Free',
      last_login: companyData.last_login_at || null,
      directors: [],
      usage_hours_7d: companyData.usage_hours_7d || 0,
      pending_user_count: companyData.pending_user_count || 0,
      company_status: companyData.company_status || 'Active',
      subscription_tier: companyData.subscription_tier || 'Free',
      trial_end: companyData.trial_end || null,
      cancelled_at: companyData.cancelled_at || null,
      cancellation_reason: companyData.cancellation_reason || null,
      cancellation_feedback: companyData.cancellation_feedback || null,
      subscription_end: companyData.subscription_end || null,
    };
    
    setUsersModal({
      open: true,
      company: companyWithStats
    });
  };
  const handleSaveExclusions = (excludedIds: string[]) => {
    setExcludedCompanyIds(excludedIds);
    localStorage.setItem(EXCLUDED_COMPANIES_KEY, JSON.stringify(excludedIds));
    logger.log('Saved excluded companies:', excludedIds);
  };
  const handleClearFilters = () => {
    setExcludedCompanyIds([]);
    localStorage.removeItem(EXCLUDED_COMPANIES_KEY);
  };

  const handleStatusClick = (company: CompanyWithStats) => {
    setStatusModal({
      open: true,
      company
    });
  };

  const handleDeleteClick = (company: CompanyWithStats) => {
    setDeleteModal({
      open: true,
      company
    });
  };

  const handleStatusConfirm = async (status: 'Free' | 'Trial' | 'Paid', trialMonths?: number) => {
    if (!statusModal.company) return;
    
    try {
      const updates: any = { subscription_tier: status };
      
      if (status === 'Trial' && trialMonths) {
        const trialEnd = new Date();
        trialEnd.setMonth(trialEnd.getMonth() + trialMonths);
        updates.trial_end = trialEnd.toISOString();
      } else if (status !== 'Trial') {
        updates.trial_end = null;
      }

      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', statusModal.company.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Company status changed to ${status}`,
      });

      await refetch();
      setStatusModal({ open: false, company: null });
    } catch (error) {
      logger.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update company status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.company) return;
    
    try {
      const result = await deleteCompanyCompletely(deleteModal.company.id);
      
      if (result.success) {
        toast({
          title: 'Company Deleted',
          description: result.message,
        });
        await refetch();
        setDeleteModal({ open: false, company: null });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      logger.error('Error deleting company:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete company',
        variant: 'destructive',
      });
    }
  };

  // Filter companies based on exclusions and at-risk status
  const isCompanyAtRisk = (company: any) => {
    if (!company.last_login_at) return true;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(company.last_login_at) < sevenDaysAgo;
  };

  const filteredRecentCompanies = recentCompanies?.filter(company => !excludedCompanyIds.includes(company.id));
  const filteredActiveCompanies = recentlyActiveCompanies?.filter(company => {
    const isExcluded = excludedCompanyIds.includes(company.id);
    const matchesAtRisk = !showAtRisk || isCompanyAtRisk(company);
    const matchesSearch = !searchQuery || company.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier =
      subscriptionTier === 'all' ||
      (subscriptionTier === 'Trial'
        ? (company.trial_end != null &&
            company.subscription_tier !== 'Paid' &&
            company.subscription_tier !== 'Cancelled')
        : (company.subscription_tier || 'Free') === subscriptionTier);
    return !isExcluded && matchesAtRisk && matchesSearch && matchesTier;
  });

  // Sort filtered active companies
  const sortedActiveCompanies = [...(filteredActiveCompanies || [])].sort((a, b) => {
    if (sortBy === 'created') {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'users') {
      const totalA = a.user_count + a.pending_user_count;
      const totalB = b.user_count + b.pending_user_count;
      return sortOrder === 'asc' ? totalA - totalB : totalB - totalA;
    } else if (sortBy === 'usage') {
      const usageA = a.usage_hours_7d || 0;
      const usageB = b.usage_hours_7d || 0;
      return sortOrder === 'asc' ? usageA - usageB : usageB - usageA;
    } else if (sortBy === 'name') {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    } else if (sortBy === 'status') {
      const statusOrder = { 'Stuck': 0, 'Working': 1, 'Active': 2 };
      const statusA = statusOrder[a.company_status || 'Active'];
      const statusB = statusOrder[b.company_status || 'Active'];
      return sortOrder === 'asc' ? statusA - statusB : statusB - statusA;
    } else if (sortBy === 'health_score') {
      const scoreA = a.health_score?.total || 0;
      const scoreB = b.health_score?.total || 0;
      return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    } else if (sortBy === 'plan') {
      // Custom sorting for plans: Cancelled < Free < Trial (by days remaining) < Paid
      const getPlanSortValue = (company: typeof a) => {
        const tier = company.subscription_tier || 'Free';
        if (tier === 'Cancelled') return -1;
        if (tier === 'Free') return 0;
        if (tier === 'Paid') return 10000;
        if (tier === 'Trial' && company.trial_end) {
          const daysLeft = Math.max(0, Math.ceil((new Date(company.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          return 1000 + daysLeft; // Base 1000 + days remaining
        }
        return 1000; // Trial without end date
      };
      const planA = getPlanSortValue(a);
      const planB = getPlanSortValue(b);
      return sortOrder === 'asc' ? planA - planB : planB - planA;
    } else {
      // Sort by login - when sorting old to new (asc), "Never" comes first
      if (!a.last_login_at && !b.last_login_at) return 0;
      if (!a.last_login_at) return sortOrder === 'asc' ? -1 : 1;
      if (!b.last_login_at) return sortOrder === 'asc' ? 1 : -1;
      const dateA = new Date(a.last_login_at).getTime();
      const dateB = new Date(b.last_login_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });
  const toggleSort = (column: 'created' | 'login' | 'users' | 'usage' | 'status' | 'name' | 'health_score' | 'plan') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };
  const getSortIcon = (column: 'created' | 'login' | 'users' | 'usage' | 'status' | 'name' | 'health_score' | 'plan') => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };
  const visibleCompanyCount = (companies?.length || 0) - excludedCompanyIds.length;
  const getDaysAgo = (date: string | null): {
    text: string;
    isOld: boolean;
    days: number;
  } => {
    if (!date) return {
      text: 'Never',
      isOld: true,
      days: Infinity
    };
    const now = new Date();
    const past = new Date(date);
    const diffTime = Math.abs(now.getTime() - past.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return {
      text: 'Today',
      isOld: false,
      days: 0
    };
    if (diffDays === 1) return {
      text: '1 day ago',
      isOld: false,
      days: 1
    };
    
    // Show months if more than 30 days
    if (diffDays >= 30) {
      const diffMonths = Math.floor(diffDays / 30);
      return {
        text: diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`,
        isOld: diffDays > 7,
        days: diffDays
      };
    }
    
    return {
      text: `${diffDays} days ago`,
      isOld: diffDays > 7,
      days: diffDays
    };
  };
  return <div className="min-h-screen bg-background">
      {/* Content */}
      <div className={`mx-auto px-6 py-8 ${activeTab === 'overview' ? '' : 'max-w-7xl'}`}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <TabsList className="grid w-full max-w-7xl grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 h-auto gap-1">
              <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs md:text-sm">Analytics</TabsTrigger>
              <TabsTrigger value="onboarding" className="text-xs md:text-sm">Onboarding</TabsTrigger>
              <TabsTrigger value="management" className="text-xs md:text-sm">Users</TabsTrigger>
              <TabsTrigger value="customer-success" className="text-xs md:text-sm">Customer Success</TabsTrigger>
              <TabsTrigger value="analytics2" className="text-xs md:text-sm">Analytics 2</TabsTrigger>
              <TabsTrigger value="blog" className="text-xs md:text-sm">Blog</TabsTrigger>
              <TabsTrigger value="vto-leads" className="text-xs md:text-sm">VTO Leads</TabsTrigger>
              <TabsTrigger value="platform" className="text-xs md:text-sm">Platform</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs md:text-sm">Settings</TabsTrigger>
              <TabsTrigger value="support" className="text-xs md:text-sm">Chat</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company Management</p>
              </div>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Search and Filter Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search companies by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Select value={subscriptionTier} onValueChange={setSubscriptionTier}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tiers</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Trial">Trial</SelectItem>
                      <SelectItem value="Free">Free</SelectItem>
                    </SelectContent>
                  </Select>
                  <FilterSplitButton
                    companies={companies?.map(c => ({ id: c.id, name: c.name })) || []}
                    currentFilters={{
                      searchQuery,
                      excludedCompanyIds,
                      showAtRisk,
                      subscriptionTier,
                    }}
                    onLoadFilter={(filterData) => {
                      if (filterData.searchQuery !== undefined) setSearchQuery(filterData.searchQuery);
                      if (filterData.excludedCompanyIds !== undefined) {
                        setExcludedCompanyIds(filterData.excludedCompanyIds);
                        localStorage.setItem(EXCLUDED_COMPANIES_KEY, JSON.stringify(filterData.excludedCompanyIds));
                      }
                      if (filterData.showAtRisk !== undefined) setShowAtRisk(filterData.showAtRisk);
                      if (filterData.subscriptionTier !== undefined) setSubscriptionTier(filterData.subscriptionTier);
                    }}
                    onClearFilter={() => {
                      setSearchQuery('');
                      setExcludedCompanyIds([]);
                      setShowAtRisk(false);
                      setSubscriptionTier('all');
                      localStorage.removeItem(EXCLUDED_COMPANIES_KEY);
                    }}
                  />
                  <Button 
                    variant={showAtRisk ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setShowAtRisk(!showAtRisk)}
                    className="gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    At Risk
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetch()}
                    disabled={loading}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                
                {/* Potential MRR Display */}
                <Card className="flex-shrink-0 ml-auto">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Potential MRR</p>
                        <p className="text-xl font-bold">
                          ${loading ? '...' : (sortedActiveCompanies.reduce((sum, c) => sum + c.user_count + c.pending_user_count, 0) * 5).toLocaleString()}
                        </p>
                      </div>
                      <Receipt className="h-8 w-8 text-muted-foreground opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <Card>
              
                <CardContent>
                  {loading ? <div className="space-y-2">
                      {[...Array(5)].map((_, i) => <div key={i} className="flex items-center justify-between">
                          <div className="h-4 bg-muted rounded animate-pulse w-32"></div>
                          <div className="h-3 bg-muted rounded animate-pulse w-20"></div>
                        </div>)}
                    </div> : sortedActiveCompanies?.length ? <TooltipProvider>
                      <div className="rounded-lg border border-border/50 shadow-sm overflow-auto" style={{ height: 'calc(100vh - 280px)' }}>
                      <table className="w-full min-w-max caption-bottom text-sm relative">
                        <TableHeader className="bg-gradient-to-r from-muted/30 to-muted/10 backdrop-blur-sm sticky top-0 z-10">
                          <TableRow className="border-b border-border/50 hover:bg-transparent">
                            <TableHead className="cursor-pointer hover:bg-muted/20 transition-all duration-150 font-semibold" onClick={() => toggleSort('name')}>
                              <div className="flex items-center gap-1">
                                Company
                                {getSortIcon('name')}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/20 transition-all duration-150 font-semibold" onClick={() => toggleSort('status')}>
                              <div className="flex items-center gap-1">
                                Status
                                {getSortIcon('status')}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/20 transition-all duration-150 font-semibold" onClick={() => toggleSort('health_score')}>
                              <div className="flex items-center gap-1">
                                Score
                                {getSortIcon('health_score')}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/20 transition-all duration-150 font-semibold" onClick={() => toggleSort('plan')}>
                              <div className="flex items-center gap-1">
                                Plan
                                {getSortIcon('plan')}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/20 transition-all duration-150 font-semibold whitespace-nowrap" onClick={() => toggleSort('usage')}>
                              <div className="flex items-center gap-1">
                                7-d Usage
                                {getSortIcon('usage')}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/20 transition-all duration-150 font-semibold" onClick={() => toggleSort('users')}>
                              <div className="flex items-center gap-1">
                                Users
                                {getSortIcon('users')}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/20 transition-all duration-150 font-semibold whitespace-nowrap" onClick={() => toggleSort('login')}>
                              <div className="flex items-center gap-1">
                                Median Login
                                {getSortIcon('login')}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/20 transition-all duration-150 font-semibold" onClick={() => toggleSort('created')}>
                              <div className="flex items-center gap-1">
                                Created
                                {getSortIcon('created')}
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold whitespace-nowrap">Device</TableHead>
                            <TableHead className="font-semibold whitespace-nowrap">Source</TableHead>
                            <TableHead className="font-semibold whitespace-nowrap">Medium</TableHead>
                            <TableHead className="font-semibold whitespace-nowrap">Campaign</TableHead>
                            <TableHead className="font-semibold whitespace-nowrap">Content</TableHead>
                            <TableHead className="font-semibold whitespace-nowrap">Term</TableHead>
                            <TableHead className="font-semibold whitespace-nowrap">Adset</TableHead>
                            <TableHead className="font-semibold whitespace-nowrap">Ad</TableHead>
                            <TableHead className="font-semibold whitespace-nowrap">Landing Page</TableHead>
                            <TableHead className="font-semibold whitespace-nowrap">Referral</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedActiveCompanies.map(company => {
                      const createdDaysAgo = getDaysAgo(company.created_at);
                      const loginDaysAgo = getDaysAgo(company.last_login_at);
                      return <TableRow key={company.id} className="cursor-pointer border-b border-border/30 hover:bg-muted/30 transition-all duration-150 hover:shadow-sm group" onClick={() => handleCompanyClick(company)}>
                                <TableCell className="font-semibold text-slate-700 dark:text-slate-300">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate" title={company.name}>{company.name}</span>
                                    {createdDaysAgo.days <= 7 && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                                        New
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <CompanyStatusDropdown
                                    companyId={company.id}
                                    currentStatus={company.company_status || 'Active'}
                                    onStatusChange={refetch}
                                  />
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {company.health_score ? (
                                      <TooltipProvider delayDuration={100}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="inline-block">
                                              <Badge 
                                                variant={
                                                  company.health_score.color === 'green' ? 'success' :
                                                  company.health_score.label === 'Fair' ? 'warning' :
                                                  company.health_score.label === 'At Risk' ? 'danger' :
                                                  company.health_score.color === 'yellow' ? 'warning' :
                                                  'danger'
                                                }
                                                className="cursor-help gap-1.5 whitespace-nowrap h-6 inline-flex items-center"
                                              >
                                                <Activity className="h-3 w-3" />
                                                {company.health_score.label}
                                              </Badge>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent 
                                            side="top" 
                                            className="max-w-xs bg-popover border shadow-xl z-[100]"
                                          >
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
                                      </TooltipProvider>
                                ) : (
                                    <span className="text-xs text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const tier = (company.subscription_tier || 'Free') as 'Trial' | 'Free' | 'Paid' | 'Blocked' | 'Cancelled';
                                    // A trial that expired with subscribed=true derives to 'Free' in
                                    // the service, but the admin needs to see *why* it's free.
                                    // Treat those as "trial ended" visually — same badge as the
                                    // 'Blocked' branch below.
                                    const trialEndDate = company.trial_end ? new Date(company.trial_end) : null;
                                    const trialHasEnded = trialEndDate ? trialEndDate.getTime() < Date.now() : false;
                                    const isExpiredTrialShowingAsFree = tier === 'Free' && trialHasEnded;

                                    const variant =
                                      tier === 'Paid' ? 'premium' as const :
                                      tier === 'Trial' ? 'trial' as const :
                                      tier === 'Blocked' ? 'destructive' as const :
                                      tier === 'Cancelled' ? (company.subscribed ? 'warning' as const : 'destructive' as const) :
                                      isExpiredTrialShowingAsFree ? 'destructive' as const :
                                      'free' as const;

                                    return (
                                      <Badge
                                        variant={variant}
                                        className={`gap-1.5 inline-flex items-center ${(tier === 'Blocked' || tier === 'Cancelled' || isExpiredTrialShowingAsFree) ? 'h-auto py-1 flex-col' : 'h-6 whitespace-nowrap'}`}
                                      >
                                        {tier === 'Paid' && <Crown className="h-3 w-3" />}
                                        {tier === 'Trial' && <Clock className="h-3 w-3" />}
                                        {tier === 'Free' && !isExpiredTrialShowingAsFree && <Sparkles className="h-3 w-3" />}
                                        {tier === 'Cancelled' && <XCircle className="h-3 w-3" />}
                                        {tier === 'Cancelled' ? (
                                          <>
                                            <span>{company.subscribed ? 'Cancelling' : 'Cancelled'}</span>
                                            {company.subscribed && company.subscription_end ? (
                                              <span className="text-xs">ends {formatDistanceToNow(new Date(company.subscription_end), { addSuffix: true })}</span>
                                            ) : company.cancelled_at && (
                                              <span className="text-xs">{differenceInDays(new Date(), new Date(company.cancelled_at))} days ago</span>
                                            )}
                                          </>
                                        ) : tier === 'Trial' && company.trial_end ?
                                          `T-${Math.max(0, Math.ceil((new Date(company.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}` :
                                          (tier === 'Blocked' || isExpiredTrialShowingAsFree) ? (company.trial_end
                                            ? (
                                              <>
                                                <span>Trial Ended</span>
                                                <span className="text-xs">{differenceInDays(new Date(), new Date(company.trial_end))} days ago</span>
                                              </>
                                            )
                                            : 'Trial Ended') :
                                          tier
                                        }
                                      </Badge>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {(() => {
                                    const hours = company.usage_hours_7d || 0;
                                    if (hours < 1) {
                                      return `${Math.round(hours * 60)}m`;
                                    }
                                    return `${hours.toFixed(1)}h`;
                                  })()}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {company.user_count}
                                  {company.pending_user_count > 0 && (
                                    <span className="text-xs text-amber-600 dark:text-amber-400 ml-1 font-medium">
                                      +{company.pending_user_count}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className={`text-sm font-medium whitespace-nowrap ${loginDaysAgo.isOld ? 'bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent' : 'text-slate-600 dark:text-slate-400'}`}>
                                  {loginDaysAgo.text}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {createdDaysAgo.text}
                                </TableCell>
                                <TableCell
                                  className="text-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DeviceUsagePopover
                                    companyId={company.id}
                                    firstDeviceType={companyDeviceTypes[company.id]}
                                  />
                                </TableCell>
                                {(() => {
                                  const attr = companyAttributions[company.id];
                                  const dash = <span className="text-xs text-muted-foreground">—</span>;
                                  return (
                                    <>
                                      <TableCell className="text-xs whitespace-nowrap">{attr?.utm_source || dash}</TableCell>
                                      <TableCell className="text-xs whitespace-nowrap">{attr?.utm_medium || dash}</TableCell>
                                      <TableCell className="text-xs whitespace-nowrap">{attr?.utm_campaign || dash}</TableCell>
                                      <TableCell className="text-xs whitespace-nowrap">{attr?.utm_content || dash}</TableCell>
                                      <TableCell className="text-xs whitespace-nowrap">{attr?.utm_term || dash}</TableCell>
                                      <TableCell className="text-xs whitespace-nowrap">{attr?.utm_adset || dash}</TableCell>
                                      <TableCell className="text-xs whitespace-nowrap">{attr?.utm_ad || dash}</TableCell>
                                      <TableCell className="text-xs whitespace-nowrap max-w-[200px] truncate" title={attr?.landing_page_url || ''}>{attr?.landing_page_url ? new URL(attr.landing_page_url).pathname : dash}</TableCell>
                                      <TableCell className="text-xs whitespace-nowrap">{attr?.referral_source || dash}</TableCell>
                                    </>
                                  );
                                })()}
                              </TableRow>;
                    })}
                        </TableBody>
                      </table>
                    </div>
                    </TooltipProvider> : excludedCompanyIds.length > 0 ? <p className="text-sm text-muted-foreground">All active companies are filtered</p> : <p className="text-sm text-muted-foreground">No recent logins</p>}
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsOverview
              companies={companies || []}
              loading={loading}
              onRefresh={refetch}
            />
          </TabsContent>

          <TabsContent value="onboarding" className="space-y-6">
            <OnboardingAnalyticsTab />
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="platform" className="space-y-6">
            <Tabs defaultValue="usage" className="space-y-6">
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="usage">Usage</TabsTrigger>
                <TabsTrigger value="announcements">Announcements</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="email-message">Email Message</TabsTrigger>
              </TabsList>

              <TabsContent value="usage">
                <PlatformUsageContent />
              </TabsContent>

              <TabsContent value="announcements">
                <Card>
                  <CardHeader>
                    <CardTitle>System Announcements</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Create and manage system-wide announcements that appear at the top of the app for all users.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AnnouncementManagement />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features">
                <Card>
                  <CardHeader>
                    <CardTitle>Feature Launches</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Launch new features and updates with beautiful news cards that appear in user dashboards.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <FeatureLaunchManager />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="email-message">
                <AdminEmailMessage />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Tabs defaultValue="admin-users" className="space-y-6">
              <TabsList className="grid w-full max-w-lg grid-cols-4">
                <TabsTrigger value="admin-users">Admin Users</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="system">System Tools</TabsTrigger>
                <TabsTrigger value="crm">CRM</TabsTrigger>
              </TabsList>

              <TabsContent value="admin-users">
                <AdminUsersView />
              </TabsContent>

              <TabsContent value="billing" className="space-y-4">
                <StripeAccountToggle />
                <StripeModeToggle />
                <InvoicePreviewTool companies={companies} />
              </TabsContent>

              <TabsContent value="system">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">RLS Policies</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Review and configure database security policies.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => navigate('/rls')} className="w-full">
                        Manage RLS Policies
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">User Permissions</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Manage user roles, permissions, and access levels.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => navigate('/permissions')} className="w-full">
                        Manage Permissions
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">System Testing</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Run automated tests and diagnostics.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => navigate('/testing')} className="w-full">
                        Run Tests
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance Monitor</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Analyze system performance and speed tests.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => navigate('/speed')} className="w-full">
                        Speed Test
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="crm">
                <PlatformWebhookConfig />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="customer-success" className="space-y-6">
            <CustomerSuccessContent />
          </TabsContent>

          <TabsContent value="analytics2" className="space-y-6">
            <Analytics2Content />
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            <BlogManagement />
          </TabsContent>

          <TabsContent value="vto-leads" className="space-y-6">
            <VTOLeadsTable />
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <SupportInbox />
          </TabsContent>
        </Tabs>
      </div>

      {/* Company Users Modal */}
      <CompanyUsersModal 
        open={usersModal.open} 
        onOpenChange={open => setUsersModal({
          open,
          company: usersModal.company
        })} 
        company={usersModal.company}
        onStatusChange={refetch}
        onChangeStatus={handleStatusClick}
        onDeleteCompany={handleDeleteClick}
      />

      {/* Company Status Modal */}
      <CompanyStatusModal
        open={statusModal.open}
        onOpenChange={open => setStatusModal({ open, company: statusModal.company })}
        company={statusModal.company}
        onConfirm={handleStatusConfirm}
      />

      {/* Company Deletion Modal */}
      <CompanyDeletionModal
        open={deleteModal.open}
        onOpenChange={open => setDeleteModal({ open, company: deleteModal.company })}
        company={deleteModal.company}
        onConfirm={handleDeleteConfirm}
      />

    </div>;
};