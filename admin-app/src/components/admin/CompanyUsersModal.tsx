import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Phone, Shield, Calendar, Clock, Send, Activity, TrendingUp, BarChart3, Network, CheckCircle2, Circle, Percent, Edit, Trash2, Crown, Sparkles, ChevronDown, Star, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CompanyWithStats } from '@/hooks/useCompanyManagement';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CompanyStatusDropdown } from './CompanyStatusDropdown';
import { checkAdminCompanyOnboarding, AdminOnboardingStatus } from '@/services/adminOnboardingService';
import { Progress } from '@/components/ui/progress';
import { logger } from '@/utils/logger';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CompanyUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyWithStats | null;
  onStatusChange?: () => void;
  onChangeStatus?: (company: CompanyWithStats) => void;
  onDeleteCompany?: (company: CompanyWithStats) => void;
}

interface CompanyUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string | null;
  permission_level: string;
  status: string;
  created_at: string;
  last_login_at?: string;
  invited_at?: string;
  last_reminder_sent_at?: string;
  reminder_count?: number;
  usage_hours_7d?: number;
  joined_at?: string;
}

export const CompanyUsersModal = ({ open, onOpenChange, company, onStatusChange, onChangeStatus, onDeleteCompany }: CompanyUsersModalProps) => {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<AdminOnboardingStatus | null>(null);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'email' | 'permission' | 'status' | 'last_login' | 'usage'>('permission');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [cancellationData, setCancellationData] = useState<{
    cancelled_at: string | null;
    cancellation_reason: string | null;
    cancellation_feedback: string | null;
    subscription_end: string | null;
  } | null>(null);
  const { toast } = useToast();

  const formatCreatedDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  useEffect(() => {
    if (open && company) {
      setOnboardingLoaded(false);
      setOnboardingStatus(null);
      setIsOnboardingOpen(false);
      fetchCompanyUsers();
      fetchCancellationData();
    }
  }, [open, company?.id]);

  // Lazy load onboarding only when the section is first expanded
  useEffect(() => {
    if (isOnboardingOpen && !onboardingLoaded && company) {
      setOnboardingLoaded(true);
      fetchOnboardingStatus();
    }
  }, [isOnboardingOpen]);

  const fetchCancellationData = async () => {
    if (!company) return;
    try {
      const { data } = await supabase
        .from('company_subscriptions')
        .select('cancelled_at, cancellation_reason, cancellation_feedback, subscription_end')
        .eq('company_id', company.id)
        .maybeSingle();
      setCancellationData(data);
    } catch (err) {
      logger.warn('Failed to fetch cancellation data', err);
    }
  };

  const fetchOnboardingStatus = async () => {
    if (!company) return;
    
    try {
      const status = await checkAdminCompanyOnboarding(company.id);
      setOnboardingStatus(status);
    } catch (error) {
      logger.error('Error fetching onboarding status:', error);
    }
  };

  const fetchCompanyUsers = async () => {
    if (!company) return;

    setLoading(true);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Run RPC and usage query in parallel
      const [
        { data, error },
        { data: usageData, error: usageError }
      ] = await Promise.all([
        supabase.rpc('get_company_accessible_users', {
          target_company_id: company.id,
          include_inactive: false
        }),
        supabase
          .from('company_usage_stats')
          .select('user_id, total_minutes')
          .eq('company_id', company.id)
          .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0])
      ]);

      if (error) throw error;
      if (usageError) logger.error('Error fetching usage data:', usageError);

      // Calculate total usage per user
      const usageByUser = new Map<string, number>();
      if (usageData) {
        usageData.forEach((stat) => {
          const current = usageByUser.get(stat.user_id) || 0;
          usageByUser.set(stat.user_id, current + (stat.total_minutes || 0));
        });
      }

      const usersWithUsage = (data || []).map(user => ({
        ...user,
        usage_hours_7d: Math.round(((usageByUser.get(user.id) || 0) / 60) * 10) / 10
      }));

      setUsers(usersWithUsage);
    } catch (error) {
      logger.error('Error fetching company users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Identify the founding member (earliest joined_at among directors+)
  const getFoundingMemberId = () => {
    const directorLevelUsers = users.filter(u => 
      ['owner', 'admin', 'director'].includes(u.permission_level) && 
      u.status === 'active'
    );
    
    if (directorLevelUsers.length === 0) return null;
    
    const foundingMember = directorLevelUsers.reduce((earliest, current) => {
      const earliestDate = earliest.joined_at || earliest.created_at;
      const currentDate = current.joined_at || current.created_at;
      
      if (!earliestDate) return current;
      if (!currentDate) return earliest;
      
      return new Date(currentDate) < new Date(earliestDate) ? current : earliest;
    });
    
    return foundingMember?.id;
  };

  const foundingMemberId = getFoundingMemberId();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPermissionBadgeVariant = (level: string) => {
    switch (level) {
      case 'director':
      case 'owner':
      case 'admin':
        return 'destructive'; // Red
      case 'manager':
        return 'default'; // Blue (uses primary color)
      case 'member':
        return 'outline'; // Will be styled green
      case 'view_only':
        return 'secondary'; // White/gray
      default:
        return 'outline';
    }
  };

  const getPermissionBadgeClassName = (level: string) => {
    switch (level) {
      case 'member':
        return 'border-green-500 text-success bg-success/5';
      case 'view_only':
        return 'border-border text-secondary-foreground bg-white';
      default:
        return '';
    }
  };

  const getDaysPending = (invitedAt?: string) => {
    if (!invitedAt) return 0;
    const now = new Date();
    const invited = new Date(invitedAt);
    const diffTime = Math.abs(now.getTime() - invited.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatLastReminderSent = (lastReminderSentAt?: string) => {
    if (!lastReminderSentAt) return 'Never sent';
    try {
      const now = new Date();
      const sent = new Date(lastReminderSentAt);
      const diffTime = Math.abs(now.getTime() - sent.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Sent today';
      if (diffDays === 1) return 'Sent 1 day ago';
      if (diffDays >= 30) {
        const diffMonths = Math.floor(diffDays / 30);
        return diffMonths === 1 ? 'Sent 1 month ago' : `Sent ${diffMonths} months ago`;
      }
      return `Sent ${diffDays} days ago`;
    } catch {
      return 'Never sent';
    }
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastLogin), { addSuffix: true });
    } catch {
      return 'Never';
    }
  };

  const isLoginOld = (lastLogin?: string) => {
    if (!lastLogin) return true; // Never logged in
    try {
      const loginDate = new Date(lastLogin);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return loginDate < sevenDaysAgo;
    } catch {
      return true;
    }
  };

  const handleResendInvitation = async (user: CompanyUser) => {
    if (!company) return;
    
    setResendingInvite(user.id);
    try {
      logger.log('Manually resending invitation for:', user.email);
      
      // Update the tracking columns to trigger an immediate reminder
      const { error: updateError } = await supabase
        .from('company_members')
        .update({
          last_reminder_sent_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // Set to 25 hours ago to trigger reminder
        })
        .eq('company_id', company.id)
        .eq('email', user.email)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      // Call the edge function to send the reminder immediately
      const { data, error } = await supabase.functions.invoke('send-invitation-reminders', {
        body: { manual: true }
      });

      if (error) throw error;

      // Update with the actual current timestamp for persistence
      const currentTime = new Date().toISOString();
      const { error: finalUpdateError } = await supabase
        .from('company_members')
        .update({
          last_reminder_sent_at: currentTime,
        })
        .eq('company_id', company.id)
        .eq('email', user.email)
        .eq('status', 'pending');

      if (finalUpdateError) {
        logger.error('Error updating final timestamp:', finalUpdateError);
      }

      // Update the local state with the current timestamp
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id 
            ? { ...u, last_reminder_sent_at: currentTime }
            : u
        )
      );

      toast({
        title: "Invitation Sent",
        description: `Reminder email sent to ${user.email}`,
      });

      logger.log('✅ Manual invitation reminder sent:', data);
    } catch (error) {
      logger.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to resend invitation',
        variant: "destructive",
      });
    } finally {
      setResendingInvite(null);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortedUsers = () => {
    return [...users].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
          break;
        case 'permission':
          const permissionOrder: Record<string, number> = {
            'super_admin': 0,
            'owner': 1,
            'admin': 2,
            'director': 3,
            'manager': 4,
            'member': 5,
            'view_only': 6
          };
          comparison = (permissionOrder[a.permission_level] ?? 999) - (permissionOrder[b.permission_level] ?? 999);
          break;
        case 'status':
          const statusOrder: Record<string, number> = {
            'active': 0,
            'pending': 1,
            'inactive': 2
          };
          comparison = (statusOrder[a.status] ?? 999) - (statusOrder[b.status] ?? 999);
          break;
        case 'last_login':
          const loginA = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
          const loginB = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
          comparison = loginA - loginB;
          break;
        case 'usage':
          comparison = (a.usage_hours_7d || 0) - (b.usage_hours_7d || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const SortButton = ({ field, label }: { field: typeof sortField; label: string }) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors text-xs font-medium text-muted-foreground"
      >
        {label}
        {isActive ? (
          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    );
  };

  const sortedUsers = getSortedUsers();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {company?.name}
              </DialogTitle>
              {company && (
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      (company as any).subscription_tier === 'Paid' ? 'premium' :
                      (company as any).subscription_tier === 'Trial' ? 'trial' :
                      'free'
                    }
                    className="flex items-center gap-1.5 h-6"
                  >
                    {(company as any).subscription_tier === 'Paid' && <Crown className="h-3 w-3" />}
                    {(company as any).subscription_tier === 'Trial' && <Clock className="h-3 w-3" />}
                    {(company as any).subscription_tier === 'Free' && <Sparkles className="h-3 w-3" />}
                    {(company as any).subscription_tier === 'Trial' && (company as any).trial_end ? 
                      `T-${Math.max(0, Math.ceil((new Date((company as any).trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}` :
                      (company as any).subscription_tier || 'Free'
                    }
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {onChangeStatus && company && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeStatus(company);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Change Status
                </Button>
              )}
              {onDeleteCompany && company && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCompany(company);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Company
                </Button>
              )}
            </div>
          </div>
          <DialogDescription>
            Company overview and user management
          </DialogDescription>
        </DialogHeader>

        {/* Company Stats Cards */}
        {company && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <Activity className="h-3 w-3 text-muted-foreground" />
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <CompanyStatusDropdown
                  companyId={company.id}
                  currentStatus={(company as any).company_status || 'Active'}
                  onStatusChange={onStatusChange}
                />
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Users</p>
                <Users className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold whitespace-nowrap">
                {company.user_count}
                {(company as any).pending_user_count > 0 && (
                  <span className="text-xs text-amber-600 ml-1">
                    +{(company as any).pending_user_count}
                  </span>
                )}
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Teams</p>
                <Network className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">
                {company.team_count}
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Metrics</p>
                <BarChart3 className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">
                {company.metrics_count}
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">7-Day Usage</p>
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">
                {((company as any).usage_hours_7d || 0).toFixed(1)}h
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Created</p>
                <Calendar className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {formatCreatedDate(company.created_at)}
              </p>
            </div>
          </div>
        )}

        {/* Cancellation Info */}
        {cancellationData?.cancelled_at && (
          <div className="mb-4 p-4 rounded-lg border border-red-200 bg-destructive/5 dark:border-red-800 dark:bg-red-950/30">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-destructive dark:text-red-400" />
              <h4 className="font-medium text-red-900 dark:text-red-100">Subscription Cancelled</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-destructive dark:text-red-300 font-medium">Cancelled:</span>
                <span className="ml-2 text-red-900 dark:text-red-100">
                  {format(new Date(cancellationData.cancelled_at), 'MMM d, yyyy · HH:mm')}
                  <span className="text-xs text-destructive ml-1">
                    ({formatDistanceToNow(new Date(cancellationData.cancelled_at), { addSuffix: true })})
                  </span>
                </span>
              </div>
              {cancellationData.subscription_end && (
                <div>
                  <span className="text-destructive dark:text-red-300 font-medium">Access until:</span>
                  <span className="ml-2 text-red-900 dark:text-red-100">
                    {format(new Date(cancellationData.subscription_end), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              {cancellationData.cancellation_reason && (
                <div>
                  <span className="text-destructive dark:text-red-300 font-medium">Reason:</span>
                  <span className="ml-2 text-red-900 dark:text-red-100">
                    {cancellationData.cancellation_reason.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
            {cancellationData.cancellation_feedback && (
              <div className="mt-2 text-sm">
                <span className="text-destructive dark:text-red-300 font-medium">Feedback:</span>
                <span className="ml-2 text-red-900 dark:text-red-100 italic">"{cancellationData.cancellation_feedback}"</span>
              </div>
            )}
          </div>
        )}

        {/* Onboarding Checklist */}
        {company && (
          <Collapsible open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen} className="mb-4">
            <div className="p-4 rounded-lg border bg-card">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Onboarding Progress
                    </h3>
                    {onboardingStatus && (
                      <Badge variant={onboardingStatus.percentage === 100 ? 'default' : 'secondary'}>
                        {onboardingStatus.completedCount}/{onboardingStatus.totalCount}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOnboardingOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                {!onboardingStatus ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {onboardingStatus.percentage}% Complete
                        </span>
                      </div>
                      <Progress value={onboardingStatus.percentage} className="h-2" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {onboardingStatus.items.map((item) => {
                        const IconComponent = item.icon;
                        return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-2 p-2 rounded text-sm ${
                              item.completed ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {item.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Circle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium ${item.completed ? '' : 'opacity-60'}`}>
                                {item.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members ({users.length})
            </h3>
          </div>

          {!loading && users.length > 0 && (
            <div className="flex items-center gap-4 mb-3 pb-2 border-b">
              <SortButton field="name" label="Name" />
              <SortButton field="email" label="Email" />
              <SortButton field="permission" label="Role" />
              <SortButton field="status" label="Status" />
              <SortButton field="last_login" label="Last Login" />
              <SortButton field="usage" label="Usage (7d)" />
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">This company doesn't have any users yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar_url} alt={user.full_name} />
                  <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-medium truncate flex items-center gap-1.5">
                      {user.full_name}
                      {user.id === foundingMemberId && (
                        <span className="inline-flex" title="Founding Member">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        </span>
                      )}
                    </p>
                    <Badge 
                      variant={getPermissionBadgeVariant(user.permission_level)}
                      className={getPermissionBadgeClassName(user.permission_level)}
                    >
                      {user.permission_level?.replace('_', ' ')}
                    </Badge>
                    {user.status === 'pending' && (
                      <Badge variant="secondary" className="text-amber-600 bg-amber-100">
                        Pending {getDaysPending(user.invited_at) > 0 && `(${getDaysPending(user.invited_at)}d)`}
                      </Badge>
                    )}
                    {user.status === 'inactive' && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    {user.email && (
                      <a 
                        href={`mailto:${user.email}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3" />
                        <span className="truncate underline decoration-dotted">{user.email}</span>
                      </a>
                    )}
                    {!user.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate text-amber-600">No email found</span>
                      </div>
                    )}

                    {user.phone && (
                      <a
                        href={`tel:${user.phone}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        <span className="truncate underline decoration-dotted">{user.phone}</span>
                      </a>
                    )}

                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className={isLoginOld(user.last_login_at) ? 'text-destructive' : ''}>
                        Last login: {formatLastLogin(user.last_login_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>
                        {(user.usage_hours_7d || 0).toFixed(1)}h (7d)
                      </span>
                    </div>
                  </div>
                </div>

                {user.status === 'pending' && (
                  <div className="ml-auto flex flex-col items-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResendInvitation(user)}
                      disabled={resendingInvite === user.id}
                      className="whitespace-nowrap"
                    >
                      {resendingInvite === user.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3 mr-2" />
                          Resend
                        </>
                      )}
                    </Button>
                    {user.last_reminder_sent_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatLastReminderSent(user.last_reminder_sent_at)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
