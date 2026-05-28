import React, { useEffect, useRef, useState } from 'react';
import { SpotlightTourOnboarding, type SpotlightTourStep } from './SpotlightTourOnboarding';
import { FirstMeetingModal } from '@/components/dashboard-home/FirstMeetingModal';
import { useAuth } from '@/contexts/AuthContext';
import { trackOnboardingEvent, resetOnboardingSession } from '@/services/onboardingEventService';
import { Loader2 } from 'lucide-react';

const ZENTRIX_LOGO_WHITE_SRC = '/v2/assets/logo-zentrix-white.png';

const FIRST_TARGET = 'dashboard-content';
const WARMUP_POLL_MS = 100;
const WARMUP_TIMEOUT_MS = 6000;

/**
 * Spotlight tour shown to users who finished the /ad2 onboarding flow.
 *
 * Five content-focused steps: Dashboard → Metrics → Tasks → Goals →
 * Meetings. The tour skips sidebar nav highlights and just navigates
 * directly to each section so the user always sees the actual page
 * content being explained, not a button that opens it.
 */
const AD2_TOUR_STEPS: SpotlightTourStep[] = [
  {
    target: 'dashboard-content',
    navigateTo: '/dashboard',
    tag: 'Step 1 of 5',
    title: 'Welcome to your dashboard',
    body: "This is your home base — Tasks, Goals, and Metrics are summarized side by side so you always know where things stand. Let's take a quick tour of each.",
    buttonText: 'Next',
    position: 'bottom',
  },
  {
    target: 'metrics-content',
    navigateTo: '/metrics',
    tag: 'Step 2 of 5',
    title: 'Your scorecard',
    body: 'These are the numbers you picked during signup. Update each one weekly so your team always knows where things stand.',
    buttonText: 'Next',
    position: 'bottom',
  },
  {
    target: 'task-section',
    navigateTo: '/tasks',
    tag: 'Step 3 of 5',
    title: 'One place for action items',
    body: "Every task created during meetings shows up here with its owner and due date. Nothing falls through the cracks.",
    buttonText: 'Next',
    position: 'bottom',
  },
  {
    target: 'goals-content',
    navigateTo: '/goals',
    tag: 'Step 4 of 5',
    title: 'Stay on track',
    body: "Your quarterly goals live here. Mark progress weekly — off-track goals automatically surface in your next meeting so the team can resolve blockers together.",
    buttonText: 'Next',
    position: 'bottom',
  },
  {
    target: 'meeting-grid',
    navigateTo: '/meetings',
    tag: 'Step 5 of 5',
    title: "You're set up",
    body: "These are the four meeting types you can run. Zentrix AI uses your scorecard and Goals as the agenda automatically — let's start your first one.",
    buttonText: 'Start my first meeting',
    position: 'bottom',
  },
];

interface Ad2SpotlightTourProps {
  onComplete: () => void;
  onDismiss: () => void;
}

export const Ad2SpotlightTour: React.FC<Ad2SpotlightTourProps> = ({ onComplete, onDismiss }) => {
  const { user } = useAuth();
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(
    () => typeof document !== 'undefined' && !!document.querySelector(`[data-tour="${FIRST_TARGET}"]`),
  );
  const startedRef = useRef(false);

  // Hold the tour behind a full-screen "Setting up your workspace…" loader
  // until the first step's anchor element actually exists in the DOM. The
  // dashboard widgets fetch on mount, so the spotlight card was previously
  // describing content the user couldn't see yet.
  useEffect(() => {
    if (dashboardReady) return;

    const interval = window.setInterval(() => {
      if (document.querySelector(`[data-tour="${FIRST_TARGET}"]`)) {
        setDashboardReady(true);
      }
    }, WARMUP_POLL_MS);

    const fallback = window.setTimeout(() => {
      setDashboardReady(true);
    }, WARMUP_TIMEOUT_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(fallback);
    };
  }, [dashboardReady]);

  // Fire tour_started once the dashboard is actually visible. Gating on
  // dashboardReady avoids the analytics noise we saw in production where
  // the tour mounted before the dashboard rendered.
  useEffect(() => {
    if (!dashboardReady) return;
    if (startedRef.current) return;
    startedRef.current = true;
    trackOnboardingEvent({
      source: 'ad2',
      eventType: 'tour_started',
      userId: user?.id,
      email: user?.email,
      metadata: { total_steps: AD2_TOUR_STEPS.length },
    });
  }, [dashboardReady, user?.id, user?.email]);

  // When the spotlight tour finishes, surface the same Run-your-first-meeting
  // modal that's available from the dashboard banner — gives the user a
  // direct on-ramp to either invite teammates or start solo, without
  // making them go hunt for the action.
  const handleTourFinish = () => {
    trackOnboardingEvent({
      source: 'ad2',
      eventType: 'tour_completed',
      userId: user?.id,
      email: user?.email,
    });
    setShowMeetingModal(true);
  };

  const handleTourSkip = () => {
    trackOnboardingEvent({
      source: 'ad2',
      eventType: 'tour_skipped',
      userId: user?.id,
      email: user?.email,
    });
    onDismiss();
  };

  const handleStepView = (stepIndex: number, step: SpotlightTourStep) => {
    trackOnboardingEvent({
      source: 'ad2',
      eventType: 'tour_step_viewed',
      userId: user?.id,
      email: user?.email,
      metadata: {
        step_index: stepIndex,
        target: step.target,
        title: step.title,
      },
    });
  };

  const handleModalChange = (open: boolean) => {
    if (!open) {
      // The FirstMeetingModal closing is the true end of the /ad2 onboarding
      // funnel — wizard, tour, and activation choice have all fired by now.
      // Wipe the per-tab session id so any future /ad or /ad2 visit in this
      // tab starts a fresh session and doesn't append to this completed lead.
      resetOnboardingSession();
      setShowMeetingModal(false);
      onComplete();
    }
  };

  if (showMeetingModal) {
    return <FirstMeetingModal open={true} onOpenChange={handleModalChange} source="ad2" />;
  }

  if (!dashboardReady) {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#0c0d12] text-white">
        <img src={ZENTRIX_LOGO_WHITE_SRC} alt="Zentrix OS" className="h-6 w-auto mb-8" />
        <Loader2 className="h-6 w-6 animate-spin text-white/70 mb-4" />
        <p className="text-sm text-white/70">Setting up your workspace…</p>
      </div>
    );
  }

  return (
    <SpotlightTourOnboarding
      steps={AD2_TOUR_STEPS}
      storageKey="ad2_tour_step"
      onComplete={handleTourFinish}
      onDismiss={handleTourSkip}
      onStepView={handleStepView}
    />
  );
};
