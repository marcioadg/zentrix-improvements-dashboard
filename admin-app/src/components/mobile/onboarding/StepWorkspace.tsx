import React, { useMemo, useState } from 'react';
import {
  Check,
  Building2,
  LineChart,
  Target,
  Monitor,
} from 'lucide-react';
import { MobileOnboardingShell } from './MobileOnboardingShell';
import { useMobileOnboarding } from './MobileOnboardingContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getRecommendedMetrics,
  getDefaultMetricTarget,
  getIndustryDisplayLabel,
} from '@/data/onboardingRecommendations';
import { createFirstCompany } from '@/services/onboardingService';
import { createTeamWithMembers } from '@/services/teamOperationsService';
import { createMetric } from '@/services/metricOperations';
import { logger } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import {
  trackFBCompleteRegistration,
  trackFBMQL,
  isFBMQLQualified,
} from '@/utils/facebookTracking';
import {
  trackOnboardingEvent,
  trackOnboardingEventBeacon,
  resetOnboardingSession,
} from '@/services/onboardingEventService';

const getEndOfQuarter = (): string => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const endMonth = q * 3 + 2;
  const endDate = new Date(now.getFullYear(), endMonth + 1, 0);
  const yyyy = endDate.getFullYear();
  const mm = String(endDate.getMonth() + 1).padStart(2, '0');
  const dd = String(endDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatTargetForSummary = (
  target: number | undefined,
  unit: string,
): string => {
  if (target === undefined || !Number.isFinite(target)) return '';
  if (unit === '$') {
    if (target >= 1_000_000) {
      const m = target / 1_000_000;
      return `$${m.toFixed(m >= 10 ? 0 : 1)}M`.replace('.0', '');
    }
    if (target >= 1_000) return `$${Math.round(target / 1_000)}k`;
    return `$${target}`;
  }
  if (unit === '%') return `${target}%`;
  return String(target);
};

interface StepWorkspaceProps {
  userId: string | null;
  source: string;
  onError: (msg: string) => void;
}

const StepWorkspace: React.FC<StepWorkspaceProps> = ({ userId, source, onError }) => {
  const {
    companyName,
    industry,
    country,
    teamSize,
    eosUsage,
    selectedMetricIds,
    customMetrics,
    goals,
    back,
  } = useMobileOnboarding();
  const { user } = useAuth();

  const recs = useMemo(() => getRecommendedMetrics(industry), [industry]);
  const industryLabel = getIndustryDisplayLabel(industry);

  // Build the list of metrics that will actually be persisted.
  const metricsToPersist = useMemo(() => {
    const list: Array<{ name: string; unit: string; calculation: string; target: number | undefined }> = [];
    selectedMetricIds.forEach((id) => {
      const rec = recs.find((r) => r.id === id);
      if (!rec) return;
      const rawTarget = getDefaultMetricTarget(rec, teamSize);
      const t = rawTarget.trim() === '' ? undefined : Number(rawTarget);
      list.push({
        name: rec.defaultName,
        unit: rec.defaultUnit,
        calculation: rec.defaultCalculation,
        target: Number.isFinite(t as number) ? (t as number) : undefined,
      });
    });
    customMetrics.forEach((m) => {
      const t = m.target.trim() === '' ? undefined : Number(m.target);
      list.push({
        name: m.name,
        unit: m.unit,
        calculation: m.calculation,
        target: Number.isFinite(t as number) ? (t as number) : undefined,
      });
    });
    return list;
  }, [selectedMetricIds, recs, customMetrics, teamSize]);

  const metricSummary = useMemo(() => {
    if (metricsToPersist.length === 0) return '0 metrics';
    const first = metricsToPersist[0];
    const targetStr = formatTargetForSummary(first.target, first.unit);
    const head = `${metricsToPersist.length} metric${metricsToPersist.length === 1 ? '' : 's'}`;
    if (targetStr) {
      return `${head} · ${first.name.split(' ')[0]} target ${targetStr}`;
    }
    return `${head} · ${first.name}`;
  }, [metricsToPersist]);

  const goalsSummary = `${goals.length} quarterly goal${goals.length === 1 ? '' : 's'}`;

  const companySummary = `${companyName.trim() || 'Untitled'} · ${industryLabel} · ${teamSize}`;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting) return;
    if (!userId) {
      onError('You must be signed in to create a workspace. Please refresh.');
      return;
    }
    setIsSubmitting(true);

    const email = user?.email ?? '';
    const fullName = ((user?.user_metadata as { full_name?: string } | null)?.full_name) ?? '';
    const firstName = fullName.split(' ')[0] || fullName || email.split('@')[0];

    trackOnboardingEvent({
      source,
      eventType: 'workspace_creation_started',
      step: 'review',
      userId,
      email: email || null,
    });

    try {
      // 1. Create the company (this also creates profile/subscription/membership rows).
      const result = await createFirstCompany({
        companyName: companyName.trim() || 'My Company',
      });
      if (!result.success || !result.company_id) {
        trackOnboardingEvent({
          source,
          eventType: 'workspace_creation_failed',
          step: 'review',
          userId,
          email: email || null,
          metadata: { error: result.error ?? 'unknown' },
        });
        onError(result.error || 'Could not create workspace. Please try again.');
        setIsSubmitting(false);
        return;
      }
      const companyId = result.company_id;

      // 2. Persist country (non-blocking).
      if (country) {
        Promise.resolve(
          supabase.from('companies').update({ country }).eq('id', companyId),
        ).catch((err) =>
          logger.error('mobile onboarding: country persist failed', err),
        );
      }

      // 3. Create Leadership team (metrics + goals need a team).
      let teamId: string | null = null;
      try {
        const team = await createTeamWithMembers(
          'Leadership',
          companyId,
          userId,
          undefined,
          [],
          true,
          false,
        );
        teamId = team.id;
      } catch (e) {
        logger.error('mobile onboarding: team creation failed', e);
      }

      // 4. Metrics + goals in parallel. Failures logged, not blocking.
      if (teamId) {
        const metricPromises = metricsToPersist.map((m) =>
          createMetric(
            m.name,
            m.unit,
            userId,
            m.target,
            'greater_than_or_equal',
            userId,
            teamId!,
            false,
            [],
            m.calculation,
          ).catch((e) =>
            logger.error('mobile onboarding: metric create failed', {
              name: m.name,
              error: e,
            }),
          ),
        );

        const goalRows = goals.map((g) => ({
          title: g.text,
          target_date: getEndOfQuarter(),
          team_id: teamId!,
          owner_id: userId,
          is_company_goal: true,
        }));
        const goalsPromise =
          goalRows.length > 0
            ? supabase
                .from('team_goals')
                .insert(goalRows)
                .then(({ error }) => {
                  if (error)
                    logger.error('mobile onboarding: goals insert failed', error);
                })
            : Promise.resolve();

        await Promise.all([...metricPromises, goalsPromise]);
      }

      // 5. Fire end-of-funnel telemetry (FB CompleteRegistration + MQL +
      //    internal `workspace_created` + `mobile_onboarding_completed`).
      //    Mirrors the desktop /ad2 post-creation block at AdLanding2.tsx
      //    so mobile signups appear in FB ad attribution + the onboarding funnel.
      try {
        trackFBCompleteRegistration({
          email,
          firstName,
          userRole: 'not_specified',
          teamSize,
          eosUsage,
          source,
        });
        if (isFBMQLQualified({ teamSize, eosUsage })) {
          trackFBMQL({
            email,
            firstName,
            source,
            userRole: 'not_specified',
            teamSize,
            eosUsage,
          });
        }
      } catch { /* noop */ }

      // Beacon variant — these two fire immediately before the navigation to
      // /m/tasks below, so a regular fire-and-forget insert would be aborted
      // mid-flight and the events would never reach Postgres.
      trackOnboardingEventBeacon({
        source,
        eventType: 'workspace_created',
        step: 'review',
        userId,
        email: email || null,
        metadata: { company_id: companyId, team_id: teamId },
      });
      trackOnboardingEventBeacon({
        source,
        eventType: 'mobile_onboarding_completed',
        step: 'review',
        userId,
        email: email || null,
        metadata: { company_id: companyId, team_id: teamId },
      });
      resetOnboardingSession();

      // 6. Land on the mobile home.
      window.location.replace('/m/tasks');
    } catch (err) {
      logger.error('mobile onboarding: create workspace error', err);
      trackOnboardingEvent({
        source,
        eventType: 'workspace_creation_failed',
        step: 'review',
        userId,
        email: user?.email || null,
        metadata: { error: err instanceof Error ? err.message : String(err) },
      });
      onError(err instanceof Error ? err.message : 'Something went wrong.');
      setIsSubmitting(false);
    }
  };

  return (
    <MobileOnboardingShell
      step={4}
      eyebrow="04 · WORKSPACE"
      title={
        <>
          Your workspace is{' '}
          <span style={{ fontStyle: 'italic', fontWeight: 500 }}>ready.</span>
        </>
      }
      subtitle="Everything you set up will be waiting on your dashboard."
      onBack={back}
      backLabel="Back to edit"
      primaryLabel="Create workspace"
      primaryLoading={isSubmitting}
      onPrimary={handleCreate}
    >
      <section>
        <h2 className="text-[17px] font-semibold text-[#0c0d12] tracking-[-0.01em]">
          Review your workspace
        </h2>
        <p className="mt-1 text-[13px] text-[#71717a]">
          One last look before we take you in.
        </p>

        <div className="mt-4 space-y-2.5">
          <SummaryRow
            icon={<Building2 size={16} className="text-[#16a34a]" />}
            label={companySummary}
            kind="COMPANY"
          />
          <SummaryRow
            icon={<LineChart size={16} className="text-[#16a34a]" />}
            label={metricSummary}
            kind="METRICS"
          />
          <SummaryRow
            icon={<Target size={16} className="text-[#16a34a]" />}
            label={goalsSummary}
            kind="GOALS"
          />
        </div>

        {/* Desktop hint banner */}
        <div
          className="mt-5 rounded-2xl p-4 text-white"
          style={{
            background:
              'linear-gradient(160deg, #0c0d12 0%, #1a1d2e 60%, #2a2e4a 100%)',
          }}
        >
          <div className="flex items-start gap-3">
            <Monitor size={18} className="mt-0.5 shrink-0 text-white/80" />
            <div className="min-w-0">
              <div
                className="text-[9.5px] tracking-[0.22em] uppercase text-white/55"
                style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
              >
                BEST EXPERIENCE ON DESKTOP
              </div>
              <div className="mt-1 text-[13px] leading-[1.45] text-white/85">
                Meetings, dashboards and the L10 agenda are built for a bigger
                screen.
              </div>
            </div>
          </div>
        </div>
      </section>
    </MobileOnboardingShell>
  );
};

const SummaryRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  kind: string;
}> = ({ icon, label, kind }) => (
  <div className="w-full flex items-center gap-3 p-3 rounded-2xl border border-[#dcf3df] bg-[#f3faf4]">
    <span className="shrink-0 h-9 w-9 rounded-lg bg-white border border-[#cdebd3] flex items-center justify-center">
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <div className="text-[14.5px] font-medium text-[#0c0d12] truncate">
        {label}
      </div>
      <div
        className="text-[10px] tracking-[0.16em] uppercase text-[#52525b]"
        style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
      >
        {kind}
      </div>
    </div>
    <span className="shrink-0 h-6 w-6 rounded-full bg-[#16a34a] flex items-center justify-center">
      <Check size={14} className="text-white" strokeWidth={3} />
    </span>
  </div>
);

export default StepWorkspace;
