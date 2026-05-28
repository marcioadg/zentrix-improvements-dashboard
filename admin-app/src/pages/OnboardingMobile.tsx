import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MobileOnboardingProvider, useMobileOnboarding } from '@/components/mobile/onboarding/MobileOnboardingContext';
import StepCompany from '@/components/mobile/onboarding/StepCompany';
import StepMetrics from '@/components/mobile/onboarding/StepMetrics';
import StepGoals from '@/components/mobile/onboarding/StepGoals';
import StepWorkspace from '@/components/mobile/onboarding/StepWorkspace';
import { logger } from '@/utils/logger';
import { trackFBPageView, trackFBLead } from '@/utils/facebookTracking';
import { trackOnboardingEvent } from '@/services/onboardingEventService';

type Phase = 'initializing' | 'signing-up' | 'ready' | 'error';

interface Handoff {
  email: string;
  phone: string;
  fullName: string;
  companyName: string;
  password: string;
  source: string;
}

const readHandoff = (): Handoff => {
  if (typeof window === 'undefined') {
    return { email: '', phone: '', fullName: '', companyName: '', password: '', source: 'mobile' };
  }
  const p = new URLSearchParams(window.location.search);
  let password = '';
  try {
    // Read both keys so this works whether the user came from /adv2b (writes
    // `adv2b_signup_password`) or through the /ad2 mobile-divert (re-stashes
    // under `adv2_signup_password`).
    password = sessionStorage.getItem('adv2_signup_password')
            || sessionStorage.getItem('adv2b_signup_password')
            || '';
    if (password) {
      sessionStorage.removeItem('adv2_signup_password');
      sessionStorage.removeItem('adv2b_signup_password');
    }
  } catch {
    /* ignore */
  }
  const from = (p.get('from') || '').trim();
  return {
    email: (p.get('email') || '').trim(),
    phone: (p.get('phone') || '').trim(),
    fullName: (p.get('fullName') || p.get('name') || '').trim(),
    companyName: (p.get('companyName') || p.get('company') || '').trim(),
    password,
    source: from === 'adv2b' || from === 'adv2' || from === 'ad2' ? from : 'mobile',
  };
};

const StepRouter: React.FC<{ userId: string | null; source: string; onError: (m: string) => void }> = ({
  userId,
  source,
  onError,
}) => {
  const { step } = useMobileOnboarding();
  if (step === 1) return <StepCompany />;
  if (step === 2) return <StepMetrics />;
  if (step === 3) return <StepGoals />;
  return <StepWorkspace userId={userId} source={source} onError={onError} />;
};

const OnboardingMobile: React.FC = () => {
  const { user, signUp, loading: authLoading } = useAuth();
  const [phase, setPhase] = useState<Phase>('initializing');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const handoffRef = useRef<Handoff>(readHandoff());
  const signupTriedRef = useRef(false);
  const pageViewFiredRef = useRef(false);

  // Fire page-view telemetry once, but only for fresh visitors. Users
  // arriving via /ad2's post-signup mobile divert are already authenticated
  // (/ad2 fired its own page_viewed for them). Waits for AuthContext to
  // finish hydrating so we don't fire prematurely while user is still null.
  useEffect(() => {
    if (authLoading) return;
    if (pageViewFiredRef.current) return;
    pageViewFiredRef.current = true;
    if (user) return;
    try {
      trackFBPageView();
    } catch { /* noop */ }
    trackOnboardingEvent({
      source: handoffRef.current.source,
      eventType: 'page_viewed',
      step: 'signup',
      email: handoffRef.current.email || null,
    });
  }, [authLoading, user]);

  useEffect(() => {
    // Wait for AuthContext to finish hydrating the session from storage.
    // On the post-/ad2-signup divert, the user is authenticated but `user`
    // is briefly null on first mount until getSession() resolves — without
    // this guard we'd misroute them to /login.
    if (authLoading) return;

    const handoff = handoffRef.current;

    // Case 1: user already authenticated → straight to wizard.
    if (user) {
      setPhase('ready');
      return;
    }

    // Case 2: no auth, no handoff credentials → bounce to login.
    if (!handoff.email || !handoff.password) {
      window.location.replace('/login');
      return;
    }

    // Case 3: have credentials, not signed in → sign up once.
    if (signupTriedRef.current) return;
    signupTriedRef.current = true;
    setPhase('signing-up');

    // Fire the first-step Lead event up front (mirrors /ad2 behavior).
    try {
      trackFBLead({
        email: handoff.email,
        firstName: handoff.fullName.split(' ')[0] || handoff.fullName,
        source: handoff.source,
        status: 'first_step_submitted',
      });
    } catch { /* noop */ }
    trackOnboardingEvent({
      source: handoff.source,
      eventType: 'signup_started',
      step: 'signup',
      email: handoff.email,
    });

    (async () => {
      try {
        const { data, error } = await signUp(
          handoff.email,
          handoff.password,
          handoff.fullName || handoff.email.split('@')[0],
          undefined,
          undefined,
          undefined,
          undefined,
          false,
          true,
          handoff.phone || undefined,
        );

        if (error) {
          // Common: email already registered. Treat as soft failure → send to login.
          const msg = (error as any)?.message || 'Could not create your account.';
          if (/already.*registered|user.*exists|duplicate/i.test(msg)) {
            setErrorMsg('This email is already registered. Please sign in instead.');
          } else {
            setErrorMsg(msg);
          }
          setPhase('error');
          return;
        }

        // Some Supabase configs return a user with empty identities[] when the
        // email is already taken. Catch that explicitly.
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          setErrorMsg('This email is already registered. Please sign in instead.');
          setPhase('error');
          return;
        }

        // If session is now active, we're good. Otherwise, attempt signIn fallback
        // (in case email-confirm-disabled didn't auto-issue a session).
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: handoff.email,
            password: handoff.password,
          });
          if (signInErr) {
            // Likely email confirmation required.
            setErrorMsg(
              /not confirmed|email.*confirm/i.test(signInErr.message || '')
                ? 'Please confirm your email — check your inbox, click the link, then come back.'
                : signInErr.message || 'Could not sign you in.',
            );
            setPhase('error');
            return;
          }
        }

        trackOnboardingEvent({
          source: handoff.source,
          eventType: 'signup_completed',
          step: 'signup',
          userId: data?.user?.id || null,
          email: handoff.email,
        });

        setPhase('ready');
      } catch (err) {
        logger.error('OnboardingMobile signUp error', err);
        setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
        setPhase('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  if (phase === 'initializing' || phase === 'signing-up') {
    return <FullScreenLoader label={phase === 'signing-up' ? 'Creating your account…' : 'Loading…'} />;
  }

  if (phase === 'error') {
    return (
      <ErrorScreen
        message={errorMsg}
        onLogin={() => window.location.replace('/login')}
      />
    );
  }

  return (
    <MobileOnboardingProvider initialCompanyName={handoffRef.current.companyName}>
      <StepRouter
        userId={user?.id ?? null}
        source={handoffRef.current.source}
        onError={(msg) => {
          setErrorMsg(msg);
          setPhase('error');
        }}
      />
    </MobileOnboardingProvider>
  );
};

const FullScreenLoader: React.FC<{ label: string }> = ({ label }) => (
  <div
    className="min-h-[100dvh] flex flex-col items-center justify-center text-white px-6"
    style={{
      background: 'linear-gradient(160deg, #0c0d12 0%, #1a1d2e 60%, #2a2e4a 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    }}
  >
    <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    <div className="mt-4 text-[14px] text-white/80">{label}</div>
  </div>
);

const ErrorScreen: React.FC<{ message: string; onLogin: () => void }> = ({
  message,
  onLogin,
}) => (
  <div
    className="min-h-[100dvh] flex flex-col items-center justify-center text-center text-white px-6"
    style={{
      background: 'linear-gradient(160deg, #0c0d12 0%, #1a1d2e 60%, #2a2e4a 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    }}
  >
    <div className="max-w-[320px]">
      <div
        className="text-[10.5px] tracking-[0.22em] uppercase text-white/55"
        style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
      >
        SETUP · PAUSED
      </div>
      <h1 className="mt-3 text-[22px] font-semibold tracking-[-0.01em]">
        We hit a snag.
      </h1>
      <p className="mt-2 text-[14px] text-white/75 leading-[1.5]">{message}</p>
      <button
        type="button"
        onClick={onLogin}
        className="mt-6 h-12 px-6 rounded-xl text-[14px] font-semibold text-white w-full"
        style={{ background: 'linear-gradient(90deg, #1e2235 0%, #8b8ec5 100%)' }}
      >
        Go to sign in
      </button>
    </div>
  </div>
);

export default OnboardingMobile;
