import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  ArrowDownToLine,
  DollarSign,
  Video,
  UserPlus,
  Brain,
  Ban,
  HelpCircle,
} from 'lucide-react';
import { useOnboardingLeads, type OnboardingLead, type LeadStatus } from '@/hooks/useOnboardingLeads';
import { useOnboardingFunnel } from '@/hooks/useOnboardingFunnel';
import { OnboardingFunnelChart } from '@/components/admin/OnboardingFunnelChart';
import { LeadDetailSheet } from '@/components/admin/LeadDetailSheet';

const SOURCE_OPTIONS = [
  { value: 'ad2', label: '/ad2' },
  { value: 'ad',  label: '/ad' },
];

// Pretty labels for /ad profiling answer codes — keeps the table readable.
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

const WINDOW_OPTIONS = [
  { days: 7,   label: '7 days' },
  { days: 30,  label: '30 days' },
  { days: 90,  label: '90 days' },
  { days: 365, label: '1 year' },
];

const formatMs = (ms: number | null): string => {
  if (ms == null) return '—';
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(0)}s`;
  const min = sec / 60;
  if (min < 60) return `${min.toFixed(1)}m`;
  const hr = min / 60;
  return `${hr.toFixed(1)}h`;
};

// Total minutes on platform → "12.4h" / "47m" / "—". Distinct from the
// per-step formatMs which uses ms.
const formatMinutes = (mins: number | null): string => {
  if (mins == null) return '—';
  if (mins <= 0) return '0';
  if (mins < 60) return `${Math.round(mins)}m`;
  const hours = mins / 60;
  return hours < 10 ? `${hours.toFixed(1)}h` : `${Math.round(hours)}h`;
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

const STATUS_BADGE: Record<LeadStatus, { label: string; tone: 'default' | 'secondary' | 'destructive' | 'success' | 'warning'; icon: React.ReactNode }> = {
  browsed:       { label: 'Browsed',       tone: 'secondary',   icon: <Search className="h-3 w-3" /> },
  signup_failed: { label: 'Signup failed', tone: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  signed_up:     { label: 'Signed up',     tone: 'secondary',   icon: <Users className="h-3 w-3" /> },
  in_funnel:     { label: 'In funnel',     tone: 'default',     icon: <Clock className="h-3 w-3" /> },
  setup_failed:  { label: 'Setup failed',  tone: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
  converted:     { label: 'Converted',     tone: 'success',     icon: <CheckCircle2 className="h-3 w-3" /> },
  activated:     { label: 'Activated',     tone: 'success',     icon: <Sparkles className="h-3 w-3" /> },
  active:        { label: 'Active',        tone: 'success',     icon: <Sparkles className="h-3 w-3" /> },
  churned:       { label: 'Churned',       tone: 'warning',     icon: <RotateCcw className="h-3 w-3" /> },
  disqualified:  { label: 'Disqualified',  tone: 'destructive', icon: <Ban className="h-3 w-3" /> },
};

const ToneBadge: React.FC<{ tone: 'default' | 'secondary' | 'destructive' | 'success' | 'warning'; children: React.ReactNode; icon?: React.ReactNode }> = ({ tone, children, icon }) => {
  const cls = {
    default:     'bg-primary/10 text-primary border-primary/20',
    secondary:   'bg-muted text-muted-foreground border-border',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    success:     'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    warning:     'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${cls}`}>
      {icon}{children}
    </span>
  );
};

const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

interface KpiCardProps { label: string; value: string; sub?: string; trend?: 'up' | 'down' | null; icon?: React.ReactNode; }
const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, trend, icon }) => (
  <div className="rounded-lg border bg-card p-3">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon}{label}
    </div>
    <div className="mt-1 flex items-baseline gap-2">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
      {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
    </div>
    {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

export const OnboardingAnalyticsTab: React.FC = () => {
  const [source, setSource] = useState('ad2');
  const [windowDays, setWindowDays] = useState(30);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [selectedLead, setSelectedLead] = useState<OnboardingLead | null>(null);
  const { leads, events, loading, error } = useOnboardingLeads({ source, windowDays });
  const { funnel } = useOnboardingFunnel({ source, windowDays });

  // /ad and /ad2 have very different post-signup flows (3 profiling questions vs.
  // a 4-step wizard + tour + activation). Branch the table columns, step badges,
  // and step-time card on this flag rather than showing irrelevant '—' columns.
  const isAd = source === 'ad';

  // KPIs derived from the leads array
  const kpis = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter(l => l.workspace_created).length;
    const active = leads.filter(l => l.status === 'active').length;
    const churned = leads.filter(l => l.status === 'churned').length;
    const stillInFunnel = leads.filter(l => l.status === 'in_funnel' || l.status === 'signed_up').length;
    // "Paid" = upgraded to a non-trial, non-free tier. We can't use the
    // `subscribed` flag alone — it's true for every trial too, since trials
    // are active Stripe subscriptions just at $0.
    const isPayingTier = (tier: string | null) =>
      !!tier && tier !== 'Trial' && tier !== 'Free';
    const paid = leads.filter(l => isPayingTier(l.subscription_tier)).length;
    const trialing = leads.filter(l => l.subscription_tier === 'Trial').length;

    // "Avg onboarding time" — measures the full journey from landing-page
    // hit (first_seen_at) to onboarding completion (onboarding_completed_at,
    // which is workspace_created on /ad2 and Q3-done on /ad). Falls back
    // gracefully when no leads have completed onboarding yet.
    const onboardingCompletedLeads = leads.filter(l => l.onboarding_completed_at && l.first_seen_at);
    const avgOnboardingTime = onboardingCompletedLeads.length > 0
      ? onboardingCompletedLeads.reduce((sum, l) =>
          sum + (new Date(l.onboarding_completed_at!).getTime() - new Date(l.first_seen_at).getTime()), 0
        ) / onboardingCompletedLeads.length
      : null;

    return {
      total,
      converted,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      active,
      churned,
      stillInFunnel,
      activeRate: converted > 0 ? (active / converted) * 100 : 0,
      paid,
      trialing,
      paidRate: converted > 0 ? (paid / converted) * 100 : 0,
      avgOnboardingTime,
      onboardingCompleted: onboardingCompletedLeads.length,
    };
  }, [leads]);

  // Step-time aggregates
  const stepTimes = useMemo(() => {
    const avg = (key: keyof OnboardingLead): number | null => {
      const vals = leads.map(l => l[key]).filter((v): v is number => typeof v === 'number' && v > 0);
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    return {
      signup:     avg('time_in_signup_ms'),
      foundation: avg('time_in_foundation_ms'),
      metrics:    avg('time_in_metrics_ms'),
      goals:      avg('time_in_goals_ms'),
      review:     avg('time_in_review_ms'),
      q1:         avg('time_in_q1_ms'),
      q2:         avg('time_in_q2_ms'),
      q3:         avg('time_in_q3_ms'),
    };
  }, [leads]);

  // Filtered table rows
  const filteredLeads = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return leads.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (l.email ?? '').toLowerCase().includes(q) ||
        (l.industry ?? '').toLowerCase().includes(q) ||
        (l.team_size ?? '').toLowerCase().includes(q) ||
        (l.country ?? '').toLowerCase().includes(q) ||
        l.session_id.toLowerCase().includes(q)
      );
    });
  }, [leads, searchText, statusFilter]);

  const exportCsv = () => {
    const rows = filteredLeads.map(l => ({
      session_id: l.session_id,
      email: l.email,
      status: l.status,
      furthest_step: l.furthest_step,
      first_seen_at: l.first_seen_at,
      signup_completed_at: l.signup_completed_at,
      workspace_created_at: l.workspace_created_at,
      industry: l.industry,
      team_size: l.team_size,
      country: l.country,
      selected_metrics_count: l.selected_metrics_count,
      custom_metrics_count: l.custom_metrics_count,
      goals_count: l.goals_count,
      time_in_signup_s: l.time_in_signup_ms ? Math.round(l.time_in_signup_ms / 1000) : null,
      time_in_foundation_s: l.time_in_foundation_ms ? Math.round(l.time_in_foundation_ms / 1000) : null,
      time_in_metrics_s: l.time_in_metrics_ms ? Math.round(l.time_in_metrics_ms / 1000) : null,
      time_in_goals_s: l.time_in_goals_ms ? Math.round(l.time_in_goals_ms / 1000) : null,
      time_in_review_s: l.time_in_review_ms ? Math.round(l.time_in_review_ms / 1000) : null,
      time_in_q1_s: l.time_in_q1_ms ? Math.round(l.time_in_q1_ms / 1000) : null,
      time_in_q2_s: l.time_in_q2_ms ? Math.round(l.time_in_q2_ms / 1000) : null,
      time_in_q3_s: l.time_in_q3_ms ? Math.round(l.time_in_q3_ms / 1000) : null,
      profile_role: l.profile_role,
      profile_eos: l.profile_eos,
      profile_investment: l.profile_investment,
      is_mql: l.is_mql,
      is_disqualified: l.is_disqualified,
      total_time_s: Math.round(l.total_time_ms / 1000),
      tour_completed: l.tour_completed,
      tour_skipped: l.tour_skipped,
      activation_action: l.activation_action,
      subscription_tier: l.subscription_tier,
      subscribed: l.subscribed,
      workspace_failure_reason: l.workspace_failure_reason,
      meetings_started: l.meetings_started,
      total_minutes_on_platform: l.total_minutes_on_platform,
      total_hours_on_platform: l.total_minutes_on_platform != null
        ? Math.round((l.total_minutes_on_platform / 60) * 100) / 100
        : null,
      last_login_at: l.last_login_at,
      returned_after_creation: l.returned_after_creation,
      days_since_creation: l.days_since_creation,
      raw_event_count: l.raw_event_count,
    }));
    downloadCsv(`onboarding-${source}-${windowDays}d-${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  // Status filter chips (only show statuses that have at least one lead)
  const visibleStatuses = useMemo(() => {
    const counts: Partial<Record<LeadStatus, number>> = {};
    for (const l of leads) counts[l.status] = (counts[l.status] ?? 0) + 1;
    return Object.entries(counts) as Array<[LeadStatus, number]>;
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <Tabs value={source} onValueChange={setSource}>
            <TabsList>
              {SOURCE_OPTIONS.map(s => (
                <TabsTrigger key={s.value} value={s.value} className="text-xs">{s.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div>
          <Tabs value={String(windowDays)} onValueChange={v => setWindowDays(Number(v))}>
            <TabsList>
              {WINDOW_OPTIONS.map(w => (
                <TabsTrigger key={w.days} value={String(w.days)} className="text-xs">{w.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={filteredLeads.length === 0}
          className="ml-auto h-8 text-xs"
        >
          <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
          Export CSV ({filteredLeads.length})
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Total leads"
          value={kpis.total.toLocaleString()}
          sub={`${kpis.stillInFunnel} still in funnel`}
          icon={<Users className="h-3 w-3" />}
        />
        <KpiCard
          label="Onboarding conversion"
          value={`${kpis.conversionRate.toFixed(1)}%`}
          sub={
            kpis.total > 0
              ? `${kpis.converted} of ${kpis.total} visitors created a workspace`
              : '—'
          }
          icon={<CheckCircle2 className="h-3 w-3" />}
          trend={kpis.conversionRate >= 30 ? 'up' : 'down'}
        />
        <KpiCard
          label="Avg onboarding time"
          value={formatMs(kpis.avgOnboardingTime)}
          sub={
            kpis.onboardingCompleted > 0
              ? `across ${kpis.onboardingCompleted} completed onboarding${kpis.onboardingCompleted === 1 ? '' : 's'}`
              : '—'
          }
          icon={<Clock className="h-3 w-3" />}
        />
        <KpiCard
          label="Active after signup"
          value={`${kpis.activeRate.toFixed(0)}%`}
          sub={`${kpis.active} active · ${kpis.churned} churned`}
          icon={<Sparkles className="h-3 w-3" />}
          trend={kpis.activeRate >= 50 ? 'up' : 'down'}
        />
        <KpiCard
          label="Paid subscribers"
          value={`${kpis.paidRate.toFixed(0)}%`}
          sub={
            kpis.converted > 0
              ? `${kpis.paid} paid · ${kpis.trialing} on trial · of ${kpis.converted} converted`
              : '—'
          }
          icon={<DollarSign className="h-3 w-3" />}
          trend={kpis.paidRate > 0 ? 'up' : null}
        />
      </div>

      {/* Lead table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Leads ({filteredLeads.length})
              </CardTitle>
              <CardDescription>Each row = one visitor / signup attempt. Sorted newest first.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search email, industry, country…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Status filter chips */}
          {visibleStatuses.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                All ({leads.length})
              </button>
              {visibleStatuses.map(([s, count]) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                    statusFilter === s
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {STATUS_BADGE[s].label} ({count})
                </button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-y bg-muted/30">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Lead</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Subscription</th>
                  <th className="px-2 py-2 font-medium">First seen</th>
                  {!isAd && <th className="px-2 py-2 font-medium">Industry</th>}
                  {!isAd && <th className="px-2 py-2 font-medium">Team</th>}
                  <th className="px-2 py-2 font-medium text-right">Steps</th>
                  {!isAd && <th className="px-2 py-2 font-medium">Activation</th>}
                  {isAd && <th className="px-2 py-2 font-medium">Q1 · Role</th>}
                  {isAd && <th className="px-2 py-2 font-medium">Q2 · EOS</th>}
                  {isAd && <th className="px-2 py-2 font-medium">Q3 · Investment</th>}
                  {isAd && <th className="px-2 py-2 font-medium">Qualification</th>}
                  <th className="px-2 py-2 font-medium text-right">Time</th>
                  {!isAd && <th className="px-2 py-2 font-medium text-right">Metrics</th>}
                  {!isAd && <th className="px-2 py-2 font-medium text-right">Goals</th>}
                  <th className="px-2 py-2 font-medium text-right">Last login</th>
                  <th className="px-2 py-2 font-medium text-right" title="Total time the company has spent on the platform (all users, all-time)">Hours</th>
                  <th className="px-2 py-2 font-medium text-right">Meetings</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={isAd ? 13 : 14} className="px-4 py-8 text-center text-muted-foreground">
                      Loading leads…
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={isAd ? 13 : 14} className="px-4 py-6 text-center text-destructive">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={isAd ? 13 : 14} className="px-4 py-8 text-center text-muted-foreground">
                      {leads.length === 0
                        ? `No /${source} events recorded in the last ${windowDays} days yet.`
                        : 'No leads match your filters.'}
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredLeads.map(l => {
                  // Each step has a short code (used internally) and a
                  // full human-readable label that shows in the tooltip.
                  // /ad2 includes the post-creation Tour + Activation
                  // checkpoints so the strip mirrors the entire flow,
                  // not just the wizard.
                  type StepFlag = { code: string; label: string; done: boolean };
                  const stepFlags: StepFlag[] = isAd
                    ? [
                        { code: 'Sign', label: 'Signup',                done: !!l.signup_completed_at },
                        { code: 'WS',   label: 'Workspace created',     done: l.workspace_created },
                        { code: 'Q1',   label: 'Q1 · Role',             done: l.completed_q1_role },
                        { code: 'Q2',   label: 'Q2 · EOS',              done: l.completed_q2_eos },
                        { code: 'Q3',   label: 'Q3 · Investment',       done: l.completed_q3_investment },
                      ]
                    : [
                        { code: 'Sign', label: 'Signup',                    done: !!l.signup_completed_at },
                        { code: 'F',    label: 'Foundation',                done: l.completed_foundation },
                        { code: 'M',    label: 'Metrics (done or skipped)', done: l.completed_metrics || l.skipped_metrics },
                        { code: 'G',    label: 'Goals',                     done: l.completed_goals },
                        { code: 'R',    label: 'Review',                    done: l.reached_review },
                        { code: 'WS',   label: 'Workspace created',         done: l.workspace_created },
                        { code: 'T',    label: 'Tour completed or skipped', done: l.tour_completed || l.tour_skipped },
                        { code: 'A',    label: 'Activation action taken',   done: l.activation_action !== null },
                      ];
                  const stepsDone = stepFlags.filter(s => s.done).length;
                  const stepsTotal = stepFlags.length;
                  const stepsComplete = stepsDone === stepsTotal;
                  const status = STATUS_BADGE[l.status];
                  return (
                    <tr
                      key={l.session_id}
                      onClick={() => setSelectedLead(l)}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2">
                        <div className="font-medium text-foreground truncate max-w-[200px]">
                          {l.email || <span className="text-muted-foreground italic">anonymous</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={l.session_id}>
                          {l.session_id.slice(0, 18)}…
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <ToneBadge tone={status.tone} icon={status.icon}>{status.label}</ToneBadge>
                      </td>
                      <td className="px-2 py-2">
                        {(() => {
                          const tier = l.subscription_tier;
                          if (!tier) return <span className="text-muted-foreground text-[11px]">—</span>;
                          // Paying = non-trial, non-free tier. The Stripe
                          // `subscribed` flag isn't enough because it's true
                          // for trials too.
                          const isPaying = tier !== 'Trial' && tier !== 'Free';
                          return (
                            <ToneBadge
                              tone={isPaying ? 'success' : tier === 'Trial' ? 'default' : 'secondary'}
                              icon={isPaying ? <DollarSign className="h-3 w-3" /> : undefined}
                            >
                              {tier}
                            </ToneBadge>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground" title={l.first_seen_at}>
                        {formatRelative(l.first_seen_at)}
                      </td>
                      {!isAd && (
                        <td className="px-2 py-2 text-foreground">{l.industry || '—'}</td>
                      )}
                      {!isAd && (
                        <td className="px-2 py-2 text-muted-foreground">{l.team_size || '—'}</td>
                      )}
                      <td className="px-2 py-2">
                        <div
                          className={`inline-flex items-center justify-end gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums float-right ${
                            stepsComplete
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : stepsDone === 0
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-primary/10 text-primary'
                          }`}
                          title={
                            stepFlags.map(s => `${s.done ? '✓' : '·'} ${s.label}`).join('\n') +
                            '\n\nClick the row to see the full timeline.'
                          }
                        >
                          {stepsDone}/{stepsTotal}
                          {stepsComplete && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                      </td>
                      {!isAd && (
                        <td className="px-2 py-2">
                          {l.activation_action === 'meeting' && (
                            <ToneBadge tone="success" icon={<Video className="h-3 w-3" />}>Meeting</ToneBadge>
                          )}
                          {l.activation_action === 'invites' && (
                            <ToneBadge tone="success" icon={<UserPlus className="h-3 w-3" />}>Invites</ToneBadge>
                          )}
                          {!l.activation_action && l.workspace_created && (
                            <span className="text-[11px] text-muted-foreground">none</span>
                          )}
                          {!l.workspace_created && (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                      )}
                      {isAd && (
                        <td className="px-2 py-2 text-foreground text-[11px]" title={l.profile_role || ''}>
                          {labelOr(ROLE_LABEL, l.profile_role) || <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {isAd && (
                        <td className="px-2 py-2 text-foreground text-[11px]" title={l.profile_eos || ''}>
                          {labelOr(EOS_LABEL, l.profile_eos) || <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {isAd && (
                        <td className="px-2 py-2 text-foreground text-[11px]" title={l.profile_investment || ''}>
                          {labelOr(INVESTMENT_LABEL, l.profile_investment) || <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {isAd && (
                        <td className="px-2 py-2">
                          {l.is_disqualified ? (
                            <ToneBadge tone="destructive" icon={<Ban className="h-3 w-3" />}>Disqualified</ToneBadge>
                          ) : l.is_mql ? (
                            <ToneBadge tone="success" icon={<Brain className="h-3 w-3" />}>MQL</ToneBadge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                        {formatMs(l.total_time_ms)}
                      </td>
                      {!isAd && (
                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                          {l.selected_metrics_count != null
                            ? `${l.selected_metrics_count}${l.custom_metrics_count ? ` + ${l.custom_metrics_count}c` : ''}`
                            : '—'}
                        </td>
                      )}
                      {!isAd && (
                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                          {l.goals_count ?? '—'}
                        </td>
                      )}
                      <td className="px-2 py-2 text-right text-muted-foreground" title={l.last_login_at || ''}>
                        {l.last_login_at ? formatRelative(l.last_login_at) : '—'}
                      </td>
                      <td
                        className="px-2 py-2 text-right tabular-nums text-muted-foreground"
                        title={l.total_minutes_on_platform != null ? `${l.total_minutes_on_platform} minutes total` : 'No usage recorded'}
                      >
                        {formatMinutes(l.total_minutes_on_platform)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                        {l.meetings_started}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Step time breakdown — different steps per source */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            Average time per step
          </CardTitle>
          <CardDescription>How long leads spend on each step (averaged across {leads.length} leads)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-2 ${isAd ? 'md:grid-cols-4' : 'md:grid-cols-5'} gap-3`}>
            {(isAd
              ? [
                  { key: 'signup', label: 'Signup',         value: stepTimes.signup,     hint: 'Page view → account created' },
                  { key: 'q1',     label: 'Q1 · Role',      value: stepTimes.q1,         hint: 'Time on the role question' },
                  { key: 'q2',     label: 'Q2 · EOS',       value: stepTimes.q2,         hint: 'Time on the EOS question' },
                  { key: 'q3',     label: 'Q3 · Investment', value: stepTimes.q3,        hint: 'Time on the investment question' },
                ]
              : [
                  { key: 'signup',     label: 'Signup',     value: stepTimes.signup,     hint: 'Page view → account created' },
                  { key: 'foundation', label: 'Foundation', value: stepTimes.foundation, hint: 'Step 1 dwell time' },
                  { key: 'metrics',    label: 'Metrics',    value: stepTimes.metrics,    hint: 'Step 2 dwell time' },
                  { key: 'goals',      label: 'Goals',      value: stepTimes.goals,      hint: 'Step 3 dwell time' },
                  { key: 'review',     label: 'Review',     value: stepTimes.review,     hint: 'Step 4 → workspace' },
                ]
            ).map(s => (
              <div key={s.key} className="rounded-md border p-3">
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{formatMs(s.value)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.hint}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Funnel chart — bottom of the page so it acts as a visual summary
          rather than the first thing visible. */}
      <OnboardingFunnelChart />

      <LeadDetailSheet
        lead={selectedLead}
        events={events}
        source={source}
        open={selectedLead !== null}
        onOpenChange={(open) => { if (!open) setSelectedLead(null); }}
      />
    </div>
  );
};

export default OnboardingAnalyticsTab;
