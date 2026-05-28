/**
 * CompanyMobile - Mobile-only Company page (/m/company)
 * 
 * APPLE APP STORE COMPLIANCE: This page has zero subscription/payment checks.
 * Mobile experience is completely free — no subscription gating.
 * 
 * Uses mobile-specific components exclusively, fully separated from web.
 * Shows company Teams and Members in two tabs.
 */
import React, { useState, useMemo, memo, useCallback } from 'react';
import { Building2, Users, UsersRound, Mail, Shield, RefreshCw, ChevronDown, Trash2, Loader2, Plus, Check, Search, UserPlus, MoreVertical, UserX, UserCheck, X, AlertTriangle, Send, Copy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MobileBottomNav from '@/components/MobileBottomNav';
import { MobileContainer } from '@/components/layout/MobileContainer';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MobilePageHeader,
  MobileCard,
  MobileEmptyState,
  MobileSegmentedControl,
  MobilePageSkeleton,
} from '@/components/mobile';
import { logger } from '@/utils/logger';
import { removeMemberFromTeam } from '@/services/teamMembershipOperations';
import { createTeamWithMembers } from '@/services/teamOperationsService';
import { addMembersToTeam } from '@/services/teamMemberService';
import { deactivateUserAccount, reactivateUserAccount } from '@/services/userUpdateService';
import { removeUserFromCompany } from '@/services/companyUserManagement';
import { useUserManagement } from '@/hooks/useUserManagement';
import { PERMISSION_OPTIONS } from '@/utils/permissionMapping';
import { useToast } from '@/hooks/use-toast';
import { MobileInviteMemberSheet } from '@/components/mobile/modals';

// ─── Types ────────────────────────────────────────────────────────
interface CompanyTeam {
  id: string;
  name: string;
  description?: string | null;
  member_count: number;
}

interface TeamMemberInfo {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

// ─── Team Card (Expandable) ──────────────────────────────────────
const TeamCard = memo(({ team, companyId, onMemberRemoved }: { team: CompanyTeam; companyId?: string; onMemberRemoved: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [addingMode, setAddingMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);
  const { toast } = useToast();

  const { data: teamMembers = [], isLoading: membersLoading, refetch: refetchMembers } = useQuery<TeamMemberInfo[]>({
    queryKey: ['mobile-team-members', team.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id, profiles:user_id(id, full_name, email, avatar_url)')
        .eq('team_id', team.id);

      if (error) {
        logger.error('Error fetching team members:', error);
        throw error;
      }

      return (data || []).map((m: any) => ({
        user_id: m.user_id,
        full_name: m.profiles?.full_name || null,
        email: m.profiles?.email || null,
        avatar_url: m.profiles?.avatar_url || null,
      }));
    },
    enabled: expanded,
  });

  // Fetch all company members (for add member picker)
  const { data: allCompanyMembers = [] } = useQuery<TeamMemberInfo[]>({
    queryKey: ['mobile-company-users-for-add', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .rpc('get_company_accessible_users', {
          target_company_id: companyId,
          include_inactive: false,
        });
      if (error) throw error;
      return (data || []).map((u: any) => ({
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        avatar_url: u.avatar_url,
      }));
    },
    enabled: addingMode && !!companyId,
  });

  // Members not already in this team
  const availableMembers = useMemo(() => {
    const existingIds = new Set(teamMembers.map(m => m.user_id));
    return allCompanyMembers.filter(m => m.user_id && !existingIds.has(m.user_id));
  }, [allCompanyMembers, teamMembers]);

  const filteredAvailable = useMemo(() => {
    if (!searchQuery.trim()) return availableMembers;
    const q = searchQuery.toLowerCase();
    return availableMembers.filter(m =>
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    );
  }, [availableMembers, searchQuery]);

  const toggleSelect = useCallback((userId: string) => {
    setSelectedIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  }, []);

  const handleAddMembers = useCallback(async () => {
    if (!selectedIds.length) return;
    setAddingLoading(true);
    try {
      await addMembersToTeam(team.id, selectedIds);
      toast({ title: 'Success', description: `Added ${selectedIds.length} member(s)` });
      setSelectedIds([]);
      setAddingMode(false);
      setSearchQuery('');
      refetchMembers();
      onMemberRemoved(); // reuse to update team counts
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add members', variant: 'destructive' });
    } finally {
      setAddingLoading(false);
    }
  }, [selectedIds, team.id, toast, refetchMembers, onMemberRemoved]);

  const handleRemove = useCallback(async (userId: string) => {
    setRemovingUserId(userId);
    setConfirmingUserId(null);
    const success = await removeMemberFromTeam({ userId, teamId: team.id, toast });
    setRemovingUserId(null);
    if (success) {
      refetchMembers();
      onMemberRemoved();
    }
  }, [team.id, toast, refetchMembers, onMemberRemoved]);

  return (
    <MobileCard className="p-0 overflow-hidden">
      {/* Header — tap to expand */}
      <button
        type="button"
        className="w-full p-4 flex items-center gap-3 text-left"
        onClick={() => { setExpanded(prev => !prev); setAddingMode(false); setSelectedIds([]); setSearchQuery(''); }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <UsersRound className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {team.name}
          </h3>
          {team.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {team.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-full">
            <Users className="h-3 w-3" />
            <span>{team.member_count}</span>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded member list */}
      {expanded && (
        <div className="border-t border-border/40">
          {membersLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : teamMembers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No members</p>
          ) : (
            <div className="divide-y divide-border/30">
              {teamMembers.map(member => {
                const initials = (member.full_name || member.email || '?')
                  .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const isConfirming = confirmingUserId === member.user_id;
                const isRemoving = removingUserId === member.user_id;

                return (
                  <div key={member.user_id} className="px-4 py-3 flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.full_name || 'Unnamed'}
                      </p>
                      {member.email && (
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      )}
                    </div>

                    {isRemoving ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                    ) : isConfirming ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="text-xs font-medium text-destructive px-2 py-1 rounded-md bg-destructive/10 active:scale-95 transition-transform"
                          onClick={() => handleRemove(member.user_id)}
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-muted-foreground px-2 py-1 rounded-md bg-muted/60 active:scale-95 transition-transform"
                          onClick={() => setConfirmingUserId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all shrink-0"
                        onClick={() => setConfirmingUserId(member.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Member Section */}
          {addingMode ? (
            <div className="border-t border-border/40 p-3 space-y-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="w-full bg-muted/40 border border-border/50 rounded-xl pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
                />
              </div>

              {/* Selectable list */}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30">
                {filteredAvailable.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {availableMembers.length === 0 ? 'All company members are already in this team' : 'No results'}
                  </p>
                ) : (
                  filteredAvailable.map(member => {
                    const initials = (member.full_name || member.email || '?')
                      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    const isSelected = selectedIds.includes(member.user_id);

                    return (
                      <button
                        key={member.user_id}
                        type="button"
                        onClick={() => toggleSelect(member.user_id)}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 text-left active:scale-[0.98] transition-all ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px] font-semibold bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.full_name || 'Unnamed'}
                          </p>
                          {member.email && (
                            <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddMembers}
                  disabled={selectedIds.length === 0 || addingLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-all"
                >
                  {addingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Add{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingMode(false); setSelectedIds([]); setSearchQuery(''); }}
                  className="px-4 py-2.5 rounded-xl bg-muted/60 text-sm font-medium text-muted-foreground active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setAddingMode(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/60 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary active:scale-[0.98] transition-all"
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </button>
            </div>
          )}
        </div>
      )}
    </MobileCard>
  );
});
TeamCard.displayName = 'TeamCard';

interface CompanyMember {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  permission_level: string;
  role: string | null;
  status?: string;
  email_confirmed_at?: string | null;
}

// ─── Member Card with Edit Actions ───────────────────────────────
const getPermissionBadgeColor = (level: string) => {
  switch (level) {
    case 'super_admin': return 'bg-[var(--active)]/20 text-[var(--active)] border-[var(--active)]/30';
    case 'director': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'manager': return 'bg-[var(--active)]/10 text-[var(--active)] border-[var(--active)]/20';
    case 'view-only': return 'bg-muted text-muted-foreground border-border';
    case 'inactive': return 'bg-muted text-muted-foreground border-border';
    default: return 'bg-muted text-muted-foreground border-border'; // member
  }
};

const PERMISSION_HIERARCHY = ['view-only', 'member', 'manager', 'director', 'super_admin'];

const getPermissionIndex = (level: string) => {
  const idx = PERMISSION_HIERARCHY.indexOf(level);
  if (idx !== -1) return idx;
  if (level === 'admin') return PERMISSION_HIERARCHY.indexOf('director');
  if (level === 'owner') return PERMISSION_HIERARCHY.indexOf('super_admin');
  return PERMISSION_HIERARCHY.indexOf('member');
};

const MemberCard = memo(({ 
  member, 
  companyId, 
  currentUserId, 
  currentUserPermissionLevel,
  onRefresh 
}: { 
  member: CompanyMember; 
  companyId?: string; 
  currentUserId?: string; 
  currentUserPermissionLevel: string;
  onRefresh: () => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { toast } = useToast();

  const isPending = member.status === 'pending' || (!member.email_confirmed_at && member.status !== 'inactive' && !member.user_id);

  const initials = (member.full_name || member.email || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const permissionLabel = member.permission_level
    ?.replace(/_/g, ' ')
    ?.replace(/\b\w/g, l => l.toUpperCase()) || 'Member';

  const isInactive = member.status === 'inactive';
  const isSelf = member.user_id === currentUserId;
  const isSuperAdmin = currentUserPermissionLevel === 'super_admin';
  const currentLevelIdx = getPermissionIndex(currentUserPermissionLevel);
  const targetLevelIdx = getPermissionIndex(member.permission_level || 'member');

  // Same logic as desktop UserRow: must be manager+, not self, and strictly higher than target (or super_admin)
  const canManageThisMember = isSuperAdmin || (
    currentLevelIdx >= getPermissionIndex('manager') &&
    !isSelf &&
    currentLevelIdx > targetLevelIdx
  );

  // ─── Resend Invite (reuses same edge function as desktop) ──────
  const handleResendInvite = useCallback(async () => {
    if (!companyId || !currentUserId || !member.email) return;
    setResendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke('os-invite-user', {
        body: {
          email: member.email,
          fullName: (member.full_name === 'Pending User') ? '' : (member.full_name || ''),
          companyId,
          invitedBy: currentUserId,
          teamIds: [],
          permissionLevel: member.permission_level || 'member',
          siteUrl: window.location.origin,
        },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Failed to resend');
      setResendSuccess(true);
      toast({ title: 'Invitation Resent', description: 'Invitation has been resent successfully.' });
      setTimeout(() => setResendSuccess(false), 2000);
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to resend invitation', variant: 'destructive' });
    } finally {
      setResendingInvite(false);
    }
  }, [companyId, currentUserId, member.email, member.full_name, member.permission_level, toast, onRefresh]);

  // ─── Copy Invite Link (same query as desktop UserRow) ──────────
  const handleCopyInviteLink = useCallback(async () => {
    if (!member.email) return;
    try {
      const { data: invitation, error } = await supabase
        .from('invitations')
        .select('invitation_token, company_id')
        .ilike('email', member.email)
        .eq('status', 'pending')
        .maybeSingle();

      if (error || !invitation?.invitation_token) {
        toast({ title: 'Not Found', description: 'Could not find invitation link. Try resending the invitation.', variant: 'destructive' });
        return;
      }

      const baseUrl = window.location.origin;
      const inviteLink = `${baseUrl}/accept-invitation?token=${encodeURIComponent(invitation.invitation_token)}&email=${encodeURIComponent(member.email)}&company_id=${encodeURIComponent(invitation.company_id)}&invited=1`;
      await navigator.clipboard.writeText(inviteLink);
      toast({ title: 'Link Copied', description: 'Invitation link copied to clipboard.' });
    } catch (err: any) {
      logger.error('Failed to copy invite link:', err);
      toast({ title: 'Error', description: 'Failed to copy link', variant: 'destructive' });
    }
  }, [member.email, toast]);

  const handlePermissionChange = useCallback(async (newLevel: string) => {
    if (!companyId || !currentUserId || newLevel === member.permission_level) return;
    setActionLoading('permission');
    try {
      const { data, error } = await supabase.rpc('update_user_permission', {
        p_user_id: member.user_id,
        p_company_id: companyId,
        p_field: 'permission_level',
        p_value: newLevel,
        p_updated_by: currentUserId,
      });
      if (error) throw error;
      const response = data as { success: boolean; error?: string };
      if (!response.success) throw new Error(response.error || 'Update failed');
      toast({ title: 'Updated', description: `Permission changed to ${newLevel.replace(/-/g, ' ')}` });
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update permission', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, currentUserId, member.user_id, member.permission_level, toast, onRefresh]);

  const handleToggleStatus = useCallback(async () => {
    if (!companyId) return;
    setActionLoading('status');
    try {
      if (isInactive) {
        await reactivateUserAccount(member.user_id, companyId);
        toast({ title: 'Reactivated', description: `${member.full_name || 'User'} has been reactivated` });
      } else {
        await deactivateUserAccount(member.user_id, companyId);
        toast({ title: 'Deactivated', description: `${member.full_name || 'User'} has been deactivated` });
      }
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update status', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, member.user_id, member.full_name, isInactive, toast, onRefresh]);

  const handleRemove = useCallback(async () => {
    if (!companyId || !currentUserId) return;
    setActionLoading('remove');
    try {
      await removeUserFromCompany(member.user_id, companyId, currentUserId);
      toast({ title: 'Removed', description: `${member.full_name || 'User'} has been removed from the company` });
      setConfirmRemove(false);
      setShowActions(false);
      onRefresh();
    } catch (err: any) {
      const msg = err.message === 'SELF_REMOVAL' ? "You can't remove yourself" : (err.message || 'Failed to remove user');
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, currentUserId, member.user_id, member.full_name, toast, onRefresh]);

  return (
    <MobileCard className={`p-0 overflow-hidden ${isInactive ? 'opacity-60' : ''}`}>
      <div className="p-4 flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={member.avatar_url || undefined} />
          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {member.full_name || 'Unnamed'}
            </h3>
            {isPending && !isInactive && (
              <span className="text-[10px] font-medium text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded-full shrink-0">
                Pending
              </span>
            )}
            {isInactive && (
              <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full shrink-0">
                Inactive
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {member.email}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${getPermissionBadgeColor(member.permission_level)}`}>
            <Shield className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{permissionLabel}</span>
          </div>
          {canManageThisMember && !isSelf && (
            <button
              type="button"
              onClick={() => { setShowActions(prev => !prev); setConfirmRemove(false); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-90 transition-all"
            >
              {showActions ? <X className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Inline Action Panel */}
      {showActions && (
        <div className="border-t border-border/40 p-3 space-y-3">
          {isPending ? (
            /* ─── Pending User: Resend & Copy Link ─── */
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Invitation Actions</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={resendingInvite}
                  onClick={handleResendInvite}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium active:scale-[0.97] transition-all ${
                    resendSuccess
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {resendingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : resendSuccess ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {resendSuccess ? 'Sent!' : 'Resend Invite'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-muted/60 text-muted-foreground hover:bg-muted active:scale-[0.97] transition-all"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </button>
              </div>
            </div>
          ) : (
            /* ─── Active/Inactive User: Permission Level Chips ─── */
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Permission Level</p>
              <div className="flex flex-wrap gap-1.5">
                {PERMISSION_OPTIONS
                  .filter(opt => isSuperAdmin || getPermissionIndex(opt.value) < currentLevelIdx)
                  .map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={actionLoading === 'permission'}
                    onClick={() => handlePermissionChange(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                      member.permission_level === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {actionLoading === 'permission' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center" />}
              </div>
            </div>
          )}

          {/* Status Toggle + Remove */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!!actionLoading}
              onClick={handleToggleStatus}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium active:scale-[0.97] transition-all ${
                isInactive
                  ? 'bg-status-success/10 text-status-success'
                  : 'bg-status-warning/10 text-status-warning'
              }`}
            >
              {actionLoading === 'status' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isInactive ? (
                <UserCheck className="h-4 w-4" />
              ) : (
                <UserX className="h-4 w-4" />
              )}
              {isInactive ? 'Reactivate' : 'Deactivate'}
            </button>

            {!confirmRemove ? (
              <button
                type="button"
                disabled={!!actionLoading}
                onClick={() => setConfirmRemove(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-destructive/10 text-destructive active:scale-[0.97] transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            ) : (
              <div className="flex-1 flex gap-1.5">
                <button
                  type="button"
                  disabled={!!actionLoading}
                  onClick={handleRemove}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground active:scale-[0.97] transition-all"
                >
                  {actionLoading === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium bg-muted/60 text-muted-foreground active:scale-[0.97] transition-all"
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </MobileCard>
  );
});
MemberCard.displayName = 'MemberCard';

// ─── Create Team Inline ───────────────────────────────────────────
const CreateTeamInline = memo(({ companyId, userId, onCreated }: { companyId?: string; userId?: string; onCreated: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !companyId || !userId) return;
    setLoading(true);
    try {
      await createTeamWithMembers(name.trim(), companyId, userId);
      setName('');
      setIsOpen(false);
      onCreated();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create team',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [name, companyId, userId, onCreated, toast]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border/60 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary active:scale-[0.98] transition-all"
      >
        <Plus className="h-4 w-4" />
        New Team
      </button>
    );
  }

  return (
    <MobileCard className="p-4">
      <div className="space-y-3">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Team name"
          className="w-full bg-transparent border border-border/60 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-all"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
          <button
            type="button"
            onClick={() => { setIsOpen(false); setName(''); }}
            className="px-4 py-2.5 rounded-xl bg-muted/60 text-sm font-medium text-muted-foreground active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </MobileCard>
  );
});
CreateTeamInline.displayName = 'CreateTeamInline';

// ─── Main Page ────────────────────────────────────────────────────
const CompanyMobile: React.FC = () => {
  const [activeTab, setActiveTab] = useState('teams');
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  useUserManagement(); // Keep hook active for real-time subscriptions


  // ─── Fetch Teams ────────────────────────────────────────────────
  const {
    data: teams = [],
    isLoading: teamsLoading,
    refetch: refetchTeams,
  } = useQuery<CompanyTeam[]>({
    queryKey: ['mobile-company-teams', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('id, name, description')
        .eq('company_id', currentCompany?.id)
        .order('name');

      if (error) {
        logger.error('CompanyMobile: Error fetching teams:', error);
        throw error;
      }

      // Get member counts per team
      const teamIds = (teamsData || []).map(t => t.id);
      const { data: membersData } = await supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', teamIds);

      const countMap = new Map<string, number>();
      (membersData || []).forEach(m => {
        countMap.set(m.team_id, (countMap.get(m.team_id) || 0) + 1);
      });

      return (teamsData || []).map(t => ({
        ...t,
        member_count: countMap.get(t.id) || 0,
      }));
    },
    enabled: !!currentCompany?.id,
  });

  // ─── Fetch Members ─────────────────────────────────────────────
  const {
    data: members = [],
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useQuery<CompanyMember[]>({
    queryKey: ['mobile-company-members', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      // No subscription check here — mobile is completely free
      const { data, error } = await supabase
        .rpc('get_company_accessible_users', {
          target_company_id: currentCompany?.id,
          include_inactive: true,
        });

      if (error) {
        logger.error('CompanyMobile: Error fetching members:', error);
        throw error;
      }

      return (data || []).map((u: any) => ({
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        avatar_url: u.avatar_url,
        permission_level: u.permission_level,
        role: u.role,
        status: u.status,
        email_confirmed_at: u.email_confirmed_at,
      }));
    },
    enabled: !!currentCompany?.id,
  });

  // Derive current user's permission level from the members list
  const currentUserPermissionLevel = useMemo(() => {
    if (!user?.id || !members.length) return 'member';
    const me = members.find(m => m.user_id === user.id);
    return me?.permission_level || 'member';
  }, [user?.id, members]);

  const canInvite = useMemo(
    () => getPermissionIndex(currentUserPermissionLevel) >= getPermissionIndex('manager'),
    [currentUserPermissionLevel],
  );

  const handleInvited = useCallback(() => {
    refetchMembers();
    refetchTeams();
  }, [refetchMembers, refetchTeams]);

  // ─── Pull to Refresh ───────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    if (activeTab === 'teams') {
      await refetchTeams();
    } else {
      await refetchMembers();
    }
  }, [activeTab, refetchTeams, refetchMembers]);

  const { handlers, isRefreshing, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // ─── Segments config ───────────────────────────────────────────
  const segments = useMemo(() => [
    { id: 'teams', label: 'Teams', count: teams.length },
    { id: 'members', label: 'Members', count: members.length },
  ], [teams.length, members.length]);

  const isLoading = activeTab === 'teams' ? teamsLoading : membersLoading;

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background" {...handlers}>
      {isRefreshing && (
        <div className="flex justify-center py-2">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      <MobilePageHeader
        title={currentCompany?.name || 'Company'}
        icon={Building2}
        showSearch
      >
        <MobileSegmentedControl
          segments={segments}
          value={activeTab}
          onChange={setActiveTab}
        />
      </MobilePageHeader>

      <MobileContainer className="pb-24">
        {isLoading ? (
          <div className="space-y-3 px-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'teams' ? (
          <div className="space-y-2 px-4">
            {teams.length === 0 ? (
              <MobileEmptyState
                icon={UsersRound}
                title="No teams yet"
                description="Teams will appear here once they are created."
              />
            ) : (
              teams.map(team => (
                <TeamCard key={team.id} team={team} companyId={currentCompany?.id} onMemberRemoved={() => refetchTeams()} />
              ))
            )}
            <CreateTeamInline
              companyId={currentCompany?.id}
              userId={user?.id}
              onCreated={() => refetchTeams()}
            />
          </div>
        ) : (
          members.length === 0 ? (
            <div className="space-y-2 px-4">
              {canInvite && (
                <button
                  type="button"
                  onClick={() => setShowInviteSheet(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border/60 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary active:scale-[0.98] transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </button>
              )}
              <MobileEmptyState
                icon={Users}
                title="No members yet"
                description="Company members will appear here."
              />
            </div>
          ) : (
            <div className="space-y-2 px-4">
              {canInvite && (
                <button
                  type="button"
                  onClick={() => setShowInviteSheet(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border/60 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary active:scale-[0.98] transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </button>
              )}
              {[...members].sort((a, b) => {
                // 1. Current user always first
                if (a.user_id === user?.id) return -1;
                if (b.user_id === user?.id) return 1;

                const aInactive = a.status === 'inactive';
                const bInactive = b.status === 'inactive';
                const aPending = a.status === 'pending' || (!a.email_confirmed_at && !aInactive && !a.user_id);
                const bPending = b.status === 'pending' || (!b.email_confirmed_at && !bInactive && !b.user_id);
                const aActive = !aInactive && !aPending;
                const bActive = !bInactive && !bPending;

                // 2. Active users first
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;

                // 3. Among active: higher permission first
                if (aActive && bActive) {
                  return getPermissionIndex(b.permission_level || 'member') - getPermissionIndex(a.permission_level || 'member');
                }

                // 4. Pending before inactive
                if (aPending && bInactive) return -1;
                if (aInactive && bPending) return 1;

                return 0;
              }).map(member => (
                <MemberCard 
                  key={member.user_id || member.email} 
                  member={member} 
                  companyId={currentCompany?.id}
                  currentUserId={user?.id}
                  currentUserPermissionLevel={currentUserPermissionLevel}
                  onRefresh={() => refetchMembers()}
                />
              ))}
            </div>
          )
        )}
      </MobileContainer>

      <MobileInviteMemberSheet
        open={showInviteSheet}
        onOpenChange={setShowInviteSheet}
        companyId={currentCompany?.id}
        invitedBy={user?.id}
        inviterPermissionLevel={currentUserPermissionLevel}
        teams={teams.map(t => ({ id: t.id, name: t.name }))}
        onInvited={handleInvited}
      />

      <MobileBottomNav />
    </div>
  );
};

export default CompanyMobile;
