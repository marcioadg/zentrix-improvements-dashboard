import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Search,
  Users,
  Video,
  UserPlus,
  DollarSign,
  ChevronRight,
  Activity,
  Building2,
  MapPin,
  Layers,
  MousePointerClick,
  Brain,
  Ban,
  HelpCircle,
} from 'lucide-react';
import type { OnboardingLead, LeadStatus } from '@/hooks/useOnboardingLeads';
import type { OnboardingEventRow } from '@/hooks/useOnboardingFunnel';

const formatMs = (ms: number | null): string => {
  if (ms == null) return '—';
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(0)}s`;
  const min = sec / 60;
  if (min < 60) return `${min.toFixed(1)}m`;
  const hr = min / 60;
  return `${hr.toFixed(1)}h`;
};

const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
};

const formatRelative = (iso: string | null): string => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
};

const STATUS_LABEL: Record<LeadStatus, { label: string; tone: string; icon: React.ReactNode }> = {
  browsed:       { label: 'Browsed',       tone: 'bg-muted text-muted-foreground border-border',                                          icon: <Search className="h-3 w-3" /> },
  signup_failed: { label: 'Signup failed', tone: 'bg-destructive/10 text-destructive border-destructive/20',                              icon: <XCircle className="h-3 w-3" /> },
  signed_up:     { label: 'Signed up',     tone: 'bg-muted text-muted-foreground border-border',                                          icon: <Users className="h-3 w-3" /> },
  in_funnel:     { label: 'In funnel',     tone: 'bg-primary/10 text-primary border-primary/20',                                          icon: <Clock className="h-3 w-3" /> },
  setup_failed:  { label: 'Setup failed',  tone: 'bg-destructive/10 text-destructive border-destructive/20',                              icon: <AlertTriangle className="h-3 w-3" /> },
  converted:     { label: 'Converted',     tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',        icon: <CheckCircle2 className="h-3 w-3" /> },
  activated:     { label: 'Activated',     tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',        icon: <Sparkles className="h-3 w-3" /> },
  active:        { label: 'Active',        tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',        icon: <Sparkles className="h-3 w-3" /> },
  churned:       { label: 'Churned',       tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',                icon: <RotateCcw className="h-3 w-3" /> },
  disqualified:  { label: 'Disqualified',  tone: 'bg-destructive/10 text-destructive border-destructive/20',                              icon: <Ban className="h-3 w-3" /> },
};

const StepBadge: React.FC<{ label: string; state: 'done' | 'skipped' | 'failed' | 'pending' }> = ({ label, state }) => {
  const cls = {
    done:    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    skipped: 'bg-amber-500/15  text-amber-700  dark:text-amber-400  border-amber-500/30',
    failed:  'bg-destructive/15 text-destructive border-destructive/30',
    pending: 'bg-muted text-muted-foreground border-border',
  }[state];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${cls}`}>
      {label}
    </span>
  );
};

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {title}
    </div>
    <div className="rounded-md border bg-card p-3 space-y-2">
      {children}
    </div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className={`text-foreground text-right break-all ${mono ? 'font-mono text-[11px]' : ''}`}>{value || '—'}</span>
  </div>
);

interface LeadDetailSheetProps {
  lead: OnboardingLead | null;
  events: OnboardingEventRow[];
  source: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_LABEL: Record<string, string> = {
  ceo_founder: 'CEO / Founder',
  c_level_vp: 'C-Level / VP',
  director_manager: 'Director / Manager',
  other: 'Other',
};
const EOS_LABEL: Record<string, string> = {
  eos_with_software: 'Yes (with software)',
  eos_no_software: 'Yes (no software)',
  familiar: 'Familiar with EOS',
  what_is_eos: "What is EOS?",
};
const INVESTMENT_LABEL: Record<string, string> = {
  free: 'Free only',
  '5_10': '$5–10',
  '10_20': '$10–20',
  '20_plus': '$20+',
};
const labelOr = (map: Record<string, string>, value: string | null) =>
  value == null ? null : (map[value] ?? value);

export const LeadDetailSheet: React.FC<LeadDetailSheetProps> = ({ lead, events, source, open, onOpenChange }) => {
  const isAd = source === 'ad';
  // Filter events to this lead's session and sort chronologically
  const leadEvents = useMemo(() => {
    if (!lead) return [];
    return events
      .filter(e => (e.session_id || e.user_id || e.email || e.id) === lead.session_id)
      .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  }, [lead, events]);

  if (!lead) return null;

  const status = STATUS_LABEL[lead.status];
  const firstSeenMs = new Date(lead.first_seen_at).getTime();

  // Step progression states differ between /ad (signup → workspace → 3 profiling Qs)
  // and /ad2 (signup → foundation → metrics → goals → review → workspace).
  const stepStates: Array<{ label: string; state: 'done' | 'skipped' | 'failed' | 'pending'; time: number | null }> = isAd
    ? [
        {
          label: 'Signup',
          state: lead.signup_completed_at ? 'done' : (lead.raw_event_count > 1 ? 'failed' : 'pending'),
          time: lead.time_in_signup_ms,
        },
        {
          label: 'Workspace',
          state: lead.workspace_created ? 'done' : lead.workspace_failed ? 'failed' : 'pending',
          time: null,
        },
        {
          label: 'Q1 · Role',
          state: lead.completed_q1_role ? 'done' : lead.reached_q1_role ? 'pending' : 'pending',
          time: lead.time_in_q1_ms,
        },
        {
          label: 'Q2 · EOS',
          state: lead.completed_q2_eos ? 'done' : lead.reached_q2_eos ? 'pending' : 'pending',
          time: lead.time_in_q2_ms,
        },
        {
          label: 'Q3 · Investment',
          state: lead.completed_q3_investment ? 'done' : lead.reached_q3_investment ? 'pending' : 'pending',
          time: lead.time_in_q3_ms,
        },
      ]
    : [
        {
          label: 'Signup',
          state: lead.signup_completed_at ? 'done' : (lead.raw_event_count > 1 ? 'failed' : 'pending'),
          time: lead.time_in_signup_ms,
        },
        {
          label: 'Foundation',
          state: lead.completed_foundation ? 'done' : lead.reached_foundation ? 'pending' : 'pending',
          time: lead.time_in_foundation_ms,
        },
        {
          label: 'Metrics',
          state: lead.completed_metrics ? 'done' : lead.skipped_metrics ? 'skipped' : 'pending',
          time: lead.time_in_metrics_ms,
        },
        {
          label: 'Goals',
          state: lead.completed_goals ? 'done' : 'pending',
          time: lead.time_in_goals_ms,
        },
        {
          label: 'Review',
          state: lead.reached_review ? 'done' : 'pending',
          time: lead.time_in_review_ms,
        },
        {
          label: 'Workspace',
          state: lead.workspace_created ? 'done' : lead.workspace_failed ? 'failed' : 'pending',
          time: null,
        },
        {
          label: 'Tour',
          state: lead.tour_completed || lead.tour_skipped ? 'done' : 'pending',
          time: null,
        },
        {
          label: 'Activation',
          state: lead.activation_action !== null ? 'done' : 'pending',
          time: null,
        },
      ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto">
        <SheetHeader className="space-y-2 pr-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold truncate">
                {lead.email || <span className="italic text-muted-foreground">anonymous visitor</span>}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {lead.session_id.slice(0, 24)}…
              </SheetDescription>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium shrink-0 ${status.tone}`}>
              {status.icon}{status.label}
            </span>
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          {/* Identity & timing */}
          <Section title="Timing" icon={<Clock className="h-3 w-3" />}>
            <Field label="First seen" value={`${formatDateTime(lead.first_seen_at)} (${formatRelative(lead.first_seen_at)})`} />
            <Field label="Last event" value={`${formatDateTime(lead.last_event_at)} (${formatRelative(lead.last_event_at)})`} />
            <Field label="Signup completed" value={lead.signup_completed_at ? formatDateTime(lead.signup_completed_at) : '—'} />
            <Field label="Workspace created" value={lead.workspace_created_at ? formatDateTime(lead.workspace_created_at) : '—'} />
            <Field label="Total time" value={formatMs(lead.total_time_ms)} />
            <Field label="Furthest step" value={lead.furthest_step} />
            <Field label="Raw event count" value={lead.raw_event_count} />
          </Section>

          {/* Step progression */}
          <Section title="Funnel progression" icon={<Layers className="h-3 w-3" />}>
            <div className="grid grid-cols-2 gap-2">
              {stepStates.map(s => (
                <div key={s.label} className="flex items-center justify-between rounded border px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <StepBadge label={s.label} state={s.state} />
                  </div>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{formatMs(s.time)}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Form snapshot — /ad2 wizard fields. Includes EOS for /ad2 since
              we collect it on the Foundation step (same lead_profiling.eos_usage
              column as /ad uses for its Q2 answer). */}
          {(lead.industry || lead.team_size || lead.country || lead.selected_metrics_count != null || lead.goals_count != null || (!isAd && lead.profile_eos)) && (
            <Section title="Form data captured" icon={<Building2 className="h-3 w-3" />}>
              <Field label="Industry" value={lead.industry} />
              <Field label="Team size" value={lead.team_size} />
              <Field label="Country" value={lead.country} />
              {!isAd && lead.profile_eos && (
                <Field label="EOS usage" value={labelOr(EOS_LABEL, lead.profile_eos)} />
              )}
              <Field
                label="Metrics"
                value={lead.selected_metrics_count != null
                  ? `${lead.selected_metrics_count}${lead.custom_metrics_count ? ` + ${lead.custom_metrics_count} custom` : ''}`
                  : null}
              />
              <Field label="Goals" value={lead.goals_count} />
              {lead.ai_suggestion_added != null && (
                <Field label="AI suggestion used" value={lead.ai_suggestion_added ? 'yes' : 'no'} />
              )}
            </Section>
          )}

          {/* /ad-only: Profiling answers + qualification verdict. Renders
              whenever any /ad-specific data has been captured. */}
          {isAd && (lead.profile_role || lead.profile_eos || lead.profile_investment || lead.is_mql !== null || lead.is_disqualified !== null) && (
            <Section title="Profiling answers" icon={<HelpCircle className="h-3 w-3" />}>
              <Field label="Q1 · Role"       value={labelOr(ROLE_LABEL, lead.profile_role)} />
              <Field label="Q2 · EOS usage"  value={labelOr(EOS_LABEL, lead.profile_eos)} />
              <Field label="Q3 · Investment" value={labelOr(INVESTMENT_LABEL, lead.profile_investment)} />
              <Field
                label="Qualification"
                value={
                  lead.is_disqualified ? (
                    <span className="inline-flex items-center gap-1 text-destructive"><Ban className="h-3 w-3" /> Disqualified</span>
                  ) : lead.is_mql ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><Brain className="h-3 w-3" /> MQL</span>
                  ) : null
                }
              />
            </Section>
          )}

          {/* Activation outcome (only meaningful if converted). On /ad we skip
              tour + activation_action since the /ad flow has neither. */}
          {lead.workspace_created && (
            <Section title="Post-onboarding activation" icon={<MousePointerClick className="h-3 w-3" />}>
              {!isAd && (
                <Field
                  label="Tour"
                  value={lead.tour_completed ? 'completed' : lead.tour_skipped ? 'skipped' : 'not yet'}
                />
              )}
              {!isAd && (
                <Field
                  label="Activation action"
                  value={
                    lead.activation_action === 'meeting' ? (
                      <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> started meeting</span>
                    ) : lead.activation_action === 'invites' ? (
                      <span className="inline-flex items-center gap-1"><UserPlus className="h-3 w-3" /> sent invites</span>
                    ) : 'none'
                  }
                />
              )}
              <Field
                label="Subscription"
                value={
                  lead.subscription_tier ? (() => {
                    const tier = lead.subscription_tier;
                    // "Paying" means a non-trial, non-free tier. The Stripe
                    // `subscribed` flag is true for trials too, so we can't
                    // rely on it alone.
                    const isPaying = tier !== 'Trial' && tier !== 'Free';
                    return (
                      <span className="inline-flex items-center gap-1">
                        {isPaying && <DollarSign className="h-3 w-3 text-emerald-600" />}
                        {tier}
                        {isPaying ? ' (paying)' : tier === 'Trial' ? ' (in trial)' : ''}
                      </span>
                    );
                  })() : null
                }
              />
              <Field
                label="Returned after creation"
                value={
                  lead.returned_after_creation === true ? 'yes'
                    : lead.returned_after_creation === false ? 'no'
                    : '—'
                }
              />
              <Field label="Last login" value={lead.last_login_at ? `${formatDateTime(lead.last_login_at)} (${formatRelative(lead.last_login_at)})` : '—'} />
              <Field label="Days since creation" value={lead.days_since_creation} />
              <Field
                label="Time on platform"
                value={
                  lead.total_minutes_on_platform != null
                    ? lead.total_minutes_on_platform <= 0
                      ? '0 (no recorded sessions)'
                      : lead.total_minutes_on_platform < 60
                        ? `${Math.round(lead.total_minutes_on_platform)} min`
                        : `${(lead.total_minutes_on_platform / 60).toFixed(1)} h (${lead.total_minutes_on_platform} min)`
                    : '—'
                }
              />
              <Field label="Meetings started" value={lead.meetings_started} />
            </Section>
          )}

          {/* Workspace IDs */}
          {(lead.company_id || lead.team_id || lead.workspace_failure_reason) && (
            <Section title="Workspace" icon={<MapPin className="h-3 w-3" />}>
              <Field label="Company ID" value={lead.company_id} mono />
              <Field label="Team ID" value={lead.team_id} mono />
              {lead.workspace_failure_reason && (
                <Field label="Failure reason" value={lead.workspace_failure_reason} />
              )}
            </Section>
          )}

          {/* Identity */}
          <Section title="Identity" icon={<Users className="h-3 w-3" />}>
            <Field label="Session ID" value={lead.session_id} mono />
            <Field label="User ID" value={lead.user_id} mono />
            <Field label="Email" value={lead.email} />
          </Section>

          {/* Event timeline */}
          <Section title={`Event timeline (${leadEvents.length})`} icon={<Activity className="h-3 w-3" />}>
            {leadEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No events for this session.</p>
            ) : (
              <ol className="space-y-2 relative pl-4 before:content-[''] before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-border">
                {leadEvents.map((ev, idx) => {
                  const offsetMs = new Date(ev.occurred_at).getTime() - firstSeenMs;
                  const meta = ev.metadata as Record<string, unknown>;
                  const metaPreview = Object.keys(meta).length > 0
                    ? Object.entries(meta).slice(0, 4).map(([k, v]) =>
                        `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`
                      ).join(' · ')
                    : null;
                  return (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-3 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                      <div className="flex items-baseline justify-between gap-2 text-[11px]">
                        <span className="font-medium text-foreground">
                          {idx + 1}. {ev.event_type}
                          {ev.step ? <span className="text-muted-foreground"> · {ev.step}</span> : null}
                        </span>
                        <span className="text-muted-foreground tabular-nums shrink-0">+{formatMs(offsetMs)}</span>
                      </div>
                      {metaPreview && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 break-all leading-snug">
                          {metaPreview}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LeadDetailSheet;
