import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { sendInvitation } from '@/services/invitationService';
import { trackOnboardingEvent, type OnboardingSource } from '@/services/onboardingEventService';
import { logger } from '@/lib/logger';
import {
  Video,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  Mail,
  CheckCircle2,
} from 'lucide-react';

interface FirstMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * When set, the modal fires onboarding_events for the given source
   * (e.g. 'ad2') so we can measure the activation split — solo / invite /
   * dismissed. Leave undefined when the modal is opened from a non-onboarding
   * surface (like the dashboard banner) to avoid polluting funnel data.
   */
  source?: OnboardingSource;
}

type View = 'choice' | 'invite';
type PermissionLevel = 'view-only' | 'member' | 'manager' | 'director';

interface Invitee {
  email: string;
  permission: PermissionLevel;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same set of permission levels surfaced in AddMemberModal on /people, so the
// invitation here behaves identically.
const PERMISSION_LEVELS: Array<{ value: PermissionLevel; label: string; description: string }> = [
  { value: 'director',  label: 'Director',  description: 'Full company access and user management' },
  { value: 'manager',   label: 'Manager',   description: 'Can manage teams and view analytics' },
  { value: 'member',    label: 'Member',    description: 'Basic access to teams and tasks' },
  { value: 'view-only', label: 'View Only', description: 'Can view teams and tasks but cannot edit' },
];

export const FirstMeetingModal: React.FC<FirstMeetingModalProps> = ({ open, onOpenChange, source }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const [view, setView] = useState<View>('choice');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('Leadership');
  const [teamLoading, setTeamLoading] = useState(false);
  const [invitees, setInvitees] = useState<Invitee[]>([{ email: '', permission: 'member' }]);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [choiceFired, setChoiceFired] = useState(false);

  // Reset state when the modal opens fresh + record the modal-opened event.
  useEffect(() => {
    if (open) {
      setView('choice');
      setInvitees([{ email: '', permission: 'member' }]);
      setSending(false);
      setStarting(false);
      setChoiceFired(false);
      if (source) {
        trackOnboardingEvent({
          source,
          eventType: 'first_meeting_modal_opened',
          userId: user?.id,
          email: user?.email,
        });
      }
    }
  }, [open, source, user?.id, user?.email]);

  // Find the leadership team for the current company so we know where to start the meeting.
  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    let cancelled = false;
    setTeamLoading(true);

    (async () => {
      try {
        const { data: leadership } = await supabase
          .from('teams')
          .select('id, name')
          .eq('company_id', currentCompany.id)
          .eq('is_leadership', true)
          .maybeSingle();

        let resolvedId = leadership?.id ?? null;
        let resolvedName = leadership?.name ?? null;

        // Fallback: pick any team in the company if no leadership team exists yet.
        if (!resolvedId) {
          const { data: anyTeam } = await supabase
            .from('teams')
            .select('id, name')
            .eq('company_id', currentCompany.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          resolvedId = anyTeam?.id ?? null;
          resolvedName = anyTeam?.name ?? null;
        }

        if (!cancelled) {
          setTeamId(resolvedId);
          if (resolvedName) setTeamName(resolvedName);
        }
      } catch (err) {
        logger.warn('FirstMeetingModal: failed to resolve team id', err);
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, currentCompany?.id]);

  const validInvitees = useMemo(
    () => invitees
      .map(i => ({ email: i.email.trim(), permission: i.permission }))
      .filter(i => EMAIL_REGEX.test(i.email)),
    [invitees],
  );

  const fireChoice = (choice: 'solo' | 'invite_only' | 'invite_then_meeting' | 'dismissed', extra?: Record<string, unknown>) => {
    if (!source) return;
    if (choiceFired) return;
    setChoiceFired(true);
    trackOnboardingEvent({
      source,
      eventType: 'first_meeting_choice',
      userId: user?.id,
      email: user?.email,
      metadata: { choice, ...(extra ?? {}) },
    });
  };

  const startMeeting = (cameFromInvite = false) => {
    if (!teamId) {
      toast({
        title: 'No team available',
        description: 'Please create a team before starting a meeting.',
        variant: 'destructive',
      });
      return;
    }
    if (!cameFromInvite) fireChoice('solo');
    setStarting(true);
    onOpenChange(false);
    navigate(`/meeting/${teamId}/weekly`);
  };

  const sendInvitesAndStart = async (alsoStart: boolean) => {
    if (!currentCompany?.id) return;
    if (validInvitees.length === 0) {
      toast({
        title: 'Add at least one email',
        description: 'Enter a valid email to send an invite.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      // Mirror the /people invite flow: dispatch the optimistic-user-invitation
      // event so any onboarding widgets pick it up immediately.
      try {
        window.dispatchEvent(new CustomEvent('optimistic-user-invitation'));
      } catch { /* no-op */ }

      const teamIds = teamId ? [teamId] : undefined;
      const results = await Promise.all(
        validInvitees.map(({ email, permission }) =>
          sendInvitation({
            email,
            companyId: currentCompany.id,
            invitedBy: user?.id,
            teamIds,
            permissionLevel: permission,
          }).catch(err => ({ success: false, error: err?.message || 'Failed' })),
        ),
      );

      const succeeded = results.filter(r => r.success).length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        if (source) {
          trackOnboardingEvent({
            source,
            eventType: 'invites_sent',
            userId: user?.id,
            email: user?.email,
            metadata: {
              count: succeeded,
              failed,
              also_started_meeting: alsoStart,
            },
          });
        }
        fireChoice(alsoStart ? 'invite_then_meeting' : 'invite_only', { invites_count: succeeded });
        toast({
          title: succeeded === 1 ? 'Invite sent' : `${succeeded} invites sent`,
          description: failed > 0
            ? `${failed} ${failed === 1 ? 'invite' : 'invites'} could not be sent.`
            : 'Your teammates will receive an email shortly.',
        });
      } else {
        toast({
          title: 'Could not send invites',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      if (alsoStart) {
        startMeeting(true);
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      logger.error('FirstMeetingModal: invite send failed', err);
      toast({ title: 'Something went wrong', variant: 'destructive' });
      setSending(false);
    }
  };

  const updateEmailAt = (idx: number, value: string) => {
    setInvitees(prev => prev.map((i, n) => (n === idx ? { ...i, email: value } : i)));
  };

  const updatePermissionAt = (idx: number, value: PermissionLevel) => {
    setInvitees(prev => prev.map((i, n) => (n === idx ? { ...i, permission: value } : i)));
  };

  const addEmailRow = () => {
    if (invitees.length >= 10) return;
    setInvitees(prev => [...prev, { email: '', permission: 'member' }]);
  };

  const removeEmailRow = (idx: number) => {
    setInvitees(prev => (prev.length === 1
      ? [{ email: '', permission: 'member' }]
      : prev.filter((_, i) => i !== idx)));
  };

  // Treat any close that isn't a meeting-start or invite-send as "dismissed".
  // The choiceFired guard in fireChoice prevents double-counting when the
  // close comes from those success paths.
  const handleDialogChange = (next: boolean) => {
    if (!next) fireChoice('dismissed');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-[560px] p-0 overflow-hidden gap-0">
        {/* Decorative header band */}
        <div
          className="relative px-7 pt-7 pb-6 border-b border-border"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.02) 60%, transparent 100%)',
          }}
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/[0.06] blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-[10px] shadow-md ring-1 ring-white/10 flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark)) 100%)',
              }}
            >
              {view === 'choice' ? (
                <Video className="h-6 w-6 text-white" strokeWidth={2.25} />
              ) : (
                <UserPlus className="h-6 w-6 text-white" strokeWidth={2.25} />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                {view === 'choice' ? 'Recommended next step' : 'Step 1 of 2'}
              </p>
              <h2 className="mt-0.5 text-[18px] font-semibold leading-tight text-foreground">
                {view === 'choice' ? 'Run your first meeting' : 'Invite your teammates'}
              </h2>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                {view === 'choice'
                  ? 'Run it solo for a quick demo, or invite teammates first so the room is full.'
                  : "We'll email each person a one-click link to join your workspace."}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        {view === 'choice' ? (
          <div className="p-6 space-y-3">
            <ChoiceCard
              icon={<UserPlus className="h-5 w-5 text-white" strokeWidth={2.25} />}
              title="Invite teammates first"
              subtitle="Send them an email — they can join the meeting in one click."
              accent="primary"
              onClick={() => setView('invite')}
              cta="Invite people"
            />
            <ChoiceCard
              icon={<Video className="h-5 w-5 text-foreground" strokeWidth={2.25} />}
              title="Start solo right now"
              subtitle="Zentrix AI captures the meeting — share the recap with the team afterward."
              accent="neutral"
              loading={starting || teamLoading}
              onClick={startMeeting}
              cta={teamLoading ? 'Loading…' : 'Start meeting'}
            />

            <button
              type="button"
              onClick={() => handleDialogChange(false)}
              className="w-full pt-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe later
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Invitee rows: email + permission level + remove */}
            <div className="space-y-2">
              {invitees.map((invitee, idx) => {
                const trimmed = invitee.email.trim();
                const isValid = trimmed.length > 0 && EMAIL_REGEX.test(trimmed);
                const isInvalid = trimmed.length > 0 && !isValid;
                return (
                  <div key={idx} className="space-y-1">
                    {idx === 0 && (
                      <div className="flex items-center gap-2">
                        <Label className="flex-1 text-[11px] text-muted-foreground font-medium">
                          Email address{invitees.length > 1 ? 'es' : ''}
                        </Label>
                        <Label className="w-[124px] text-[11px] text-muted-foreground font-medium">
                          Permission
                        </Label>
                        {invitees.length > 1 && (
                          <span aria-hidden className="w-10 flex-shrink-0" />
                        )}
                      </div>
                    )}
                    <div className="relative flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="email"
                          inputMode="email"
                          value={invitee.email}
                          onChange={(e) => updateEmailAt(idx, e.target.value)}
                          placeholder="teammate@company.com"
                          className={`h-10 pl-9 pr-9 text-sm ${
                            isInvalid ? 'border-destructive focus-visible:ring-destructive' : ''
                          }`}
                          autoFocus={idx === 0}
                        />
                        {isValid && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </div>
                      <Select
                        value={invitee.permission}
                        onValueChange={(v) => updatePermissionAt(idx, v as PermissionLevel)}
                      >
                        <SelectTrigger className="h-10 w-[124px] text-xs flex-shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERMISSION_LEVELS.map(level => (
                            <SelectItem key={level.value} value={level.value} className="text-sm">
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {invitees.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmailRow(idx)}
                          className="h-10 w-10 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
                          aria-label="Remove email"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {invitees.length < 10 && (
                <button
                  type="button"
                  onClick={addEmailRow}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Add another
                </button>
              )}
            </div>

            {/* Tip */}
            <div className="flex items-start gap-2.5 rounded-md border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-snug text-muted-foreground">
                Invitees join your <span className="font-medium text-foreground">{teamName}</span> team
                automatically with the permission you select. You can change it later on the People page.
              </p>
            </div>
          </div>
        )}

        {/* Footer for invite view */}
        {view === 'invite' && (
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setView('choice')}
              disabled={sending}
              className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sending || validInvitees.length === 0}
                onClick={() => sendInvitesAndStart(false)}
                className="h-9 text-[12px]"
              >
                Send & close
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={sending || starting || validInvitees.length === 0 || teamLoading}
                onClick={() => sendInvitesAndStart(true)}
                className="h-9 text-[12px] text-white shadow-md"
                style={{
                  background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark)) 100%)',
                }}
              >
                {sending || starting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Video className="mr-1.5 h-3.5 w-3.5" />
                )}
                Send & start meeting
                {!sending && !starting && <ArrowRight className="ml-1 h-3 w-3" />}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface ChoiceCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: 'primary' | 'neutral';
  cta: string;
  loading?: boolean;
  onClick: () => void;
}

const ChoiceCard: React.FC<ChoiceCardProps> = ({ icon, title, subtitle, accent, cta, loading, onClick }) => {
  const isPrimary = accent === 'primary';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`group relative w-full text-left rounded-[10px] border transition-all overflow-hidden disabled:opacity-60 ${
        isPrimary
          ? 'border-primary/25 bg-card hover:border-primary/40 hover:shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.4)]'
          : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'
      }`}
    >
      {isPrimary && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.04] to-transparent" />
      )}
      <div className="relative flex items-center gap-3.5 p-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-[8px] flex-shrink-0 ${
            isPrimary ? 'shadow-sm ring-1 ring-white/10' : 'border border-border bg-muted'
          }`}
          style={
            isPrimary
              ? { background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark)) 100%)' }
              : undefined
          }
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-foreground leading-tight">{title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</div>
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-medium flex-shrink-0 ${
          isPrimary ? 'text-primary' : 'text-foreground'
        }`}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              {cta}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </div>
      </div>
    </button>
  );
};
