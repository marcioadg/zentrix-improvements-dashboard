import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link2, Loader2, Send, UsersRound } from 'lucide-react';
import { MobileBaseModal, useMobileModalInputFocus } from './MobileBaseModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PERMISSION_OPTIONS } from '@/utils/permissionMapping';
import { logger } from '@/utils/logger';

const PERMISSION_HIERARCHY = ['view-only', 'member', 'manager', 'director', 'super_admin'];

const getPermissionIndex = (level: string) => {
  const idx = PERMISSION_HIERARCHY.indexOf(level);
  if (idx !== -1) return idx;
  if (level === 'admin') return PERMISSION_HIERARCHY.indexOf('director');
  if (level === 'owner') return PERMISSION_HIERARCHY.indexOf('super_admin');
  return PERMISSION_HIERARCHY.indexOf('member');
};

interface InviteTeam {
  id: string;
  name: string;
}

interface MobileInviteMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  invitedBy?: string;
  inviterPermissionLevel: string;
  teams: InviteTeam[];
  onInvited?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MobileInviteMemberSheet: React.FC<MobileInviteMemberSheetProps> = ({
  open,
  onOpenChange,
  companyId,
  invitedBy,
  inviterPermissionLevel,
  teams,
  onInvited,
}) => {
  const { toast } = useToast();
  const handleInputFocus = useMobileModalInputFocus();
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<string>('member');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const isSuperAdmin = inviterPermissionLevel === 'super_admin';
  const inviterIdx = getPermissionIndex(inviterPermissionLevel);

  const availablePermissions = useMemo(
    () =>
      PERMISSION_OPTIONS.filter(
        (opt) => isSuperAdmin || getPermissionIndex(opt.value) < inviterIdx,
      ),
    [isSuperAdmin, inviterIdx],
  );

  useEffect(() => {
    if (open) {
      setEmail('');
      setSelectedTeamIds([]);
      setShareLink(null);
      setLinkCopied(false);
      setPermissionLevel(
        availablePermissions.find((opt) => opt.value === 'member')?.value
          ?? availablePermissions[0]?.value
          ?? 'member',
      );
    }
  }, [open, availablePermissions]);

  // Settings drive the link; if either changes after a link is generated,
  // drop the stale one so the user generates a new one with the new defaults.
  useEffect(() => {
    if (shareLink) {
      setShareLink(null);
      setLinkCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLevel, selectedTeamIds.join('|')]);

  const SHAREABLE_LEVELS = new Set(['view-only', 'member', 'manager']);
  const canShareLink = SHAREABLE_LEVELS.has(permissionLevel);

  const trimmedEmail = email.trim();
  const emailValid = EMAIL_REGEX.test(trimmedEmail);
  const canSubmit = emailValid && !!companyId && !!invitedBy && !submitting;

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  };

  const handleGenerateLink = async () => {
    if (!companyId || !canShareLink) return;
    setLinkLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('os-create-invite-link', {
        body: {
          companyId,
          defaultPermissionLevel: permissionLevel,
          defaultTeamIds: selectedTeamIds,
        },
      });
      if (error) throw error;
      if (!data?.success || !data?.token) {
        throw new Error(data?.error || 'Could not generate invite link');
      }
      const url = `${window.location.origin}/join/${data.token}`;
      setShareLink(url);
      try {
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        toast({
          title: 'Invite link copied',
          description: 'Share it with anyone — they’ll join this workspace.',
        });
      } catch {
        // Clipboard write failed (e.g. permissions); user can still copy manually.
        toast({
          title: 'Invite link ready',
          description: 'Tap the link to copy manually.',
        });
      }
    } catch (err: any) {
      logger.error('Failed to generate invite link:', err);
      toast({
        title: 'Error',
        description: err?.message || 'Could not generate invite link',
        variant: 'destructive',
      });
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopyExistingLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
    } catch {
      // ignore — the link is visible for manual copy
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('os-invite-user', {
        body: {
          email: trimmedEmail,
          fullName: '',
          companyId,
          invitedBy,
          teamIds: selectedTeamIds,
          permissionLevel,
          siteUrl: window.location.origin,
        },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Failed to send invitation');

      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${trimmedEmail}.`,
      });
      onInvited?.();
      onOpenChange(false);
    } catch (err: any) {
      logger.error('Failed to send mobile invite:', err);
      toast({
        title: 'Error',
        description: err?.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileBaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Invite member"
      description="Send an invitation to join this workspace."
      onSubmit={handleSubmit}
      submitText={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <span className="inline-flex items-center gap-1.5">
          <Send className="h-4 w-4" />
          Send invite
        </span>
      )}
      submitDisabled={!canSubmit}
      loading={submitting}
      cancelText="Cancel"
    >
      <div className="space-y-5 py-1">
        <div className="space-y-1.5">
          <Label htmlFor="mobile-invite-email" className="text-[13px]">
            Email
          </Label>
          <Input
            id="mobile-invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={handleInputFocus}
            placeholder="name@company.com"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {!!email && !emailValid && (
            <p className="text-[11.5px] text-destructive">Enter a valid email address.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">Permission level</Label>
          <div className="flex flex-wrap gap-1.5">
            {availablePermissions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPermissionLevel(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                  permissionLevel === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">Assign to teams</Label>
          {teams.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No teams available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {teams.map((team) => {
                const selected = selectedTeamIds.includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleTeam(team.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <UsersRound className="h-3 w-3" />
                    {team.name}
                  </button>
                );
              })}
            </div>
          )}
          {selectedTeamIds.length > 0 && (
            <p className="text-[11.5px] text-muted-foreground">
              {selectedTeamIds.length} team{selectedTeamIds.length === 1 ? '' : 's'} selected
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-border/40 space-y-2">
          <Label className="text-[13px]">Or share an invite link</Label>
          <p className="text-[11.5px] text-muted-foreground">
            Anyone with this link can join with the permission level and teams selected above.
          </p>
          {!canShareLink ? (
            <p className="text-[11.5px] text-amber-600">
              Share links can only grant View Only, Member, or Manager. Pick one of those above.
            </p>
          ) : !shareLink ? (
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={linkLoading || !companyId}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border/70 text-[13px] font-medium text-foreground hover:bg-muted/40 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {linkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Get share link
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/40">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0 text-[12px] font-mono truncate text-foreground">
                  {shareLink}
                </div>
                <button
                  type="button"
                  onClick={handleCopyExistingLink}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium bg-background border border-border/60 hover:bg-muted"
                >
                  {linkCopied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileBaseModal>
  );
};
