import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { createFirstCompany } from '@/services/onboardingService';
import { cleanupAuthState } from '@/utils/authCleanup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Phone, ArrowRight, CheckCircle2, Loader2, Crown, Briefcase, UsersRound, MoreHorizontal } from 'lucide-react';
import zentrixLogo from '@/assets/Logo-Zentrix.png';
import { captureAttribution, getAttribution } from '@/utils/marketingAttribution';
import { trackFBPageView, trackFBCompleteRegistration } from '@/utils/facebookTracking';
import { trackLinkedInLead } from '@/utils/linkedinTracking';
import { trackSignupStarted } from '@/lib/statsigAnalytics';
import { PhoneInput } from '@/components/signup/PhoneInput';
import { logger } from '@/utils/logger';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { trackOnboardingEvent, resetOnboardingSession } from '@/services/onboardingEventService';

const ROLE_OPTIONS = [
  { value: 'ceo_founder', label: 'CEO / Founder', icon: <Crown className="h-4 w-4" /> },
  { value: 'c_level_vp', label: 'C-Level / VP', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'director_manager', label: 'Director / Manager', icon: <UsersRound className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> },
];

// Strict round-robin A/B split between /ad and /ad2. Visitor 1 → /ad,
// visitor 2 → /ad2, visitor 3 → /ad, etc. Decided by an atomic Postgres
// counter via the pick_ad_variant() RPC.
//
// Sticky per browser tab via sessionStorage so a refresh doesn't re-spend
// a counter slot. A `?ab=ad` / `?ab=ad2` query param wins over both cache
// and RPC for QA / forced-flow testing.
const AD_VARIANT_STORAGE_KEY = 'ad_landing_variant';

type AdVariant = 'ad' | 'ad2';

// Synchronous probe — returns the variant if we already know it (URL
// override or sessionStorage cache), otherwise null so the caller knows
// to fall back to the async RPC.
const decideAdVariantSync = (): AdVariant | null => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('ab');
    if (forced === 'ad' || forced === 'ad2') return forced;
  } catch { /* ignore */ }
  try {
    const cached = sessionStorage.getItem(AD_VARIANT_STORAGE_KEY);
    if (cached === 'ad' || cached === 'ad2') return cached;
  } catch { /* ignore */ }
  return null;
};

// Async path — calls the atomic counter RPC and caches the result. Falls
// back to a coin flip if Supabase is unreachable so we never block a
// visitor from seeing the page.
const fetchAdVariant = async (): Promise<AdVariant> => {
  try {
    const { data, error } = await supabase.rpc('pick_ad_variant');
    if (!error && (data === 'ad' || data === 'ad2')) {
      try { sessionStorage.setItem(AD_VARIANT_STORAGE_KEY, data); } catch { /* ignore */ }
      return data;
    }
    if (error) logger.warn('pick_ad_variant RPC error, falling back to random', error);
  } catch (err) {
    logger.warn('pick_ad_variant RPC threw, falling back to random', err);
  }
  const fallback: AdVariant = Math.random() < 0.5 ? 'ad' : 'ad2';
  try { sessionStorage.setItem(AD_VARIANT_STORAGE_KEY, fallback); } catch { /* ignore */ }
  return fallback;
};

const EOS_OPTIONS = [
  { value: 'eos_with_software', label: 'Yes, we run on EOS and use a software' },
  { value: 'eos_no_software', label: "Yes, we run on EOS and don't use specific software (use excel, etc)" },
  { value: 'familiar', label: "No, but I'm familiar with it" },
  { value: 'what_is_eos', label: 'What is EOS?' },
];

const INVESTMENT_OPTIONS = [
  { value: 'free', label: "I'm looking for a free solution" },
  { value: '5_10', label: '$5 – $10' },
  { value: '10_20', label: '$10 – $20' },
  { value: '20_plus', label: '$20+' },
];

const computeDisqualified = (role: string, eos: string, investment: string): boolean => {
  const isNonLeadership = role === 'director_manager' || role === 'other';
  const doesntKnowEOS = eos === 'what_is_eos';
  const wantsFree = investment === 'free';
  return isNonLeadership || doesntKnowEOS || wantsFree;
};

const AdLanding: React.FC = () => {
  const { user, signUp, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Source attribution + URL pre-fill. Visitors arriving from the static
  // /adv2 LP have ?from=adv2 (and optionally email / phone) on the URL so
  // we tag funnel events as 'adv2' and skip retyping. Default 'ad' for
  // direct /ad traffic.
  const fromParam = (typeof window !== 'undefined')
    ? new URLSearchParams(window.location.search).get('from')
    : null;
  const pageSource: 'ad' | 'adv2' = fromParam === 'adv2' ? 'adv2' : 'ad';
  const prefill = (() => {
    if (typeof window === 'undefined') return { email: '', phone: '', fullName: '', companyName: '', password: '' };
    const p = new URLSearchParams(window.location.search);
    // /adv2's LP form collects the password and stashes it in sessionStorage
    // (not URL) for security. Read once and clear so it can't leak on refresh.
    let password = '';
    try {
      password = sessionStorage.getItem('adv2_signup_password') || '';
      if (password) sessionStorage.removeItem('adv2_signup_password');
    } catch { /* ignore */ }
    return {
      email: (p.get('email') || '').trim(),
      phone: (p.get('phone') || '').trim(),
      fullName: (p.get('fullName') || p.get('name') || '').trim(),
      companyName: (p.get('companyName') || p.get('company') || '').trim(),
      password,
    };
  })();

  const [formData, setFormData] = React.useState({
    fullName: prefill.fullName,
    email: prefill.email,
    phone: prefill.phone,
    password: prefill.password,
    companyName: prefill.companyName,
  });

  // Profiling state — use ref to survive auth-triggered re-renders
  const [phase, setPhase] = useState<'signup' | 'profiling'>('signup');
  const phaseRef = useRef<'signup' | 'profiling'>('signup');
  const [profilingStep, setProfilingStep] = useState(1); // 1=role, 2=eos, 3=investment
  const [userRole, setUserRole] = useState('');
  const [eosUsage, setEosUsage] = useState('');
  const [investmentWillingness, setInvestmentWillingness] = useState('');
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  // Lock the A/B variant on first render when we can decide synchronously
  // (URL override or sessionStorage cache). Otherwise mark it 'pending'
  // and the effect below resolves it via the atomic RPC.
  const [abVariant, setAbVariant] = useState<AdVariant | 'pending'>(() =>
    decideAdVariantSync() ?? 'pending'
  );
  const handledRef = useRef(false);
  const rpcStartedRef = useRef(false);

  // /adv2 hands off to /ad with all 5 fields (Name + Email + Phone + Company
  // in URL, Password in sessionStorage). When all 5 are present we auto-fire
  // the signup so the visitor doesn't see a redundant form. handleSubmitRef
  // is populated below, after handleSubmit is declared.
  const handleSubmitRef = useRef<((e: React.FormEvent) => Promise<void>) | null>(null);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    // Force light theme like the landing page
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    root.setAttribute('data-theme', 'light');

    // Capture attribution + FB pageview happen for every /ad hit, including
    // the ones we'll bounce to /ad2 in a moment. captureAttribution is
    // idempotent and preserves the original landing_page_url ('/ad?...') even
    // when /ad2 calls it again after the redirect, so attribution stays
    // correct on the /ad2 side.
    captureAttribution();
    trackFBPageView();

    return () => {
      root.classList.remove('light');
      root.style.colorScheme = '';
      root.removeAttribute('data-theme');
    };
  }, []);

  // Resolve a 'pending' variant by calling the atomic counter RPC. Skips
  // entirely when we already have a decision (sync path) or when an
  // existing user is going to redirect to /dashboard anyway.
  useEffect(() => {
    if (rpcStartedRef.current) return;
    if (abVariant !== 'pending') return;
    if (authLoading) return;
    if (user) return;
    rpcStartedRef.current = true;
    let cancelled = false;
    fetchAdVariant().then(v => { if (!cancelled) setAbVariant(v); });
    return () => { cancelled = true; };
  }, [abVariant, authLoading, user]);

  // A/B split decision: redirect to /ad2 OR fire /ad's page_viewed. We wait
  // for auth to load so the existing logged-in → /dashboard guard wins for
  // existing users (we don't want to bounce them to /ad2). The handledRef
  // guard makes this a one-shot regardless of dependency churn.
  useEffect(() => {
    if (handledRef.current) return;
    if (authLoading) return;
    if (user) return;
    if (abVariant === 'pending') return;
    handledRef.current = true;

    if (abVariant === 'ad2') {
      // Preserve UTM + fbclid by carrying the entire query string across.
      const search = window.location.search;
      window.location.replace(`/ad2${search}`);
      return;
    }

    trackOnboardingEvent({
      source: pageSource,
      eventType: 'page_viewed',
      step: 'signup',
      metadata: { ab_variant: 'ad' },
    });
  }, [authLoading, user, abVariant]);

  // Auto-submit when arriving from /adv2 with all fields prefilled. Fires
  // exactly once after auth is ready, the A/B variant is locked to 'ad', and
  // no user is logged in. Failures (e.g. duplicate email) leave the prefilled
  // form visible so the user can correct and resubmit manually.
  useEffect(() => {
    if (autoSubmittedRef.current) return;
    if (authLoading) return;
    if (user) return;
    if (abVariant !== 'ad') return;
    if (pageSource !== 'adv2') return;
    const fd = formData;
    if (!fd.email.trim() || !fd.fullName.trim() || !fd.phone.trim() || !fd.companyName.trim() || !fd.password.trim()) return;
    if (!handleSubmitRef.current) return;
    autoSubmittedRef.current = true;
    void handleSubmitRef.current({ preventDefault: () => {} } as React.FormEvent);
  }, [authLoading, user, abVariant, pageSource, formData]);

  // Fire step_viewed each time we land on a profiling question. MUST be
  // declared above the early returns below — React enforces a consistent
  // hook order across renders and the early-return paths would otherwise
  // skip this hook on some renders (React error #310).
  useEffect(() => {
    if (phase !== 'profiling') return;
    const question = profilingStep === 1 ? 'role' : profilingStep === 2 ? 'eos' : 'investment';
    trackOnboardingEvent({
      source: pageSource,
      eventType: 'step_viewed',
      step: 'profiling',
      userId: createdUserId || user?.id,
      email: formData.email || user?.email,
      metadata: { question, step_index: profilingStep },
    });
  }, [phase, profilingStep, createdUserId, user?.id, user?.email, formData.email, pageSource]);

  // Spin while auth is resolving OR the A/B counter RPC is in flight for
  // a brand-new (non-cached) visitor. Existing users skip the RPC, so we
  // only spin on `pending` for !user.
  if (authLoading || (!user && abVariant === 'pending')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Suppress paint while the A/B split is bouncing this visitor to /ad2.
  // The redirect runs from the useEffect above; rendering null avoids a
  // flash of /ad's marketing hero before the navigation kicks in.
  if (!user && abVariant === 'ad2') {
    return null;
  }

  // Only redirect if user exists and we're not in profiling phase
  // Use ref for instant check — state may lag behind auth listener
  if (user && phaseRef.current !== 'profiling' && phase !== 'profiling') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.fullName.trim() || !formData.password.trim() || !formData.phone.trim() || !formData.companyName.trim()) return;

    setLoading(true);

    trackOnboardingEvent({
      source: pageSource,
      eventType: 'signup_started',
      step: 'signup',
      email: formData.email,
    });

    try {
      // Clean limbo state before signing up
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}

      // Preemptively block redirect during async signUp
      // The auth listener may fire SIGNED_IN before signUp returns,
      // causing the redirect guard at line 96 to send user to /dashboard
      phaseRef.current = 'profiling';

      const { data, error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        undefined, // referralSource
        undefined, // userRole - will be set after profiling
        undefined, // eosUsage
        undefined, // investmentWillingness
        false,     // isDisqualified - will be updated after profiling
        true,      // isMQL - will be updated after profiling
        formData.phone || undefined
      );

      if (error) {
        phaseRef.current = 'signup'; // Reset on failure
        throw error;
      }

      // Check if email is already registered
      if (data?.user && (!data?.user?.identities || data?.user?.identities?.length === 0)) {
        try {
          const { data: isDeleted } = await supabase
            .rpc('check_if_email_is_deleted_account', { p_email: formData.email.trim() });
          if (isDeleted === true) {
            trackOnboardingEvent({
              source: pageSource,
              eventType: 'signup_failed',
              step: 'signup',
              email: formData.email,
              metadata: { reason: 'previously_deleted_account' },
            });
            toast({
              title: "Account previously deleted",
              description: "This email was associated with a deleted account. Please contact support.",
              variant: "destructive",
            });
            return;
          }
        } catch {}

        trackOnboardingEvent({
          source: pageSource,
          eventType: 'signup_failed',
          step: 'signup',
          email: formData.email,
          metadata: { reason: 'email_already_registered' },
        });
        toast({
          title: "Email already registered",
          description: "This email is already in use. Try signing in instead.",
          variant: "destructive",
        });
        return;
      }

      // Account created successfully — proceed with profiling setup
      // (phaseRef already set to 'profiling' before signUp call)
      if (data?.user) {
        trackOnboardingEvent({
          source: pageSource,
          eventType: 'signup_completed',
          step: 'signup',
          userId: data.user.id,
          email: formData.email,
        });

        try {
          trackSignupStarted({ email: formData.email, signup_source: pageSource });
        } catch {}

        trackFBCompleteRegistration({
          email: formData.email,
          firstName: formData.fullName.split(' ')[0] || formData.fullName,
          userRole: 'not_specified',
          companySize: 'not_specified',
        });

        // Track LinkedIn Lead conversion
        trackLinkedInLead();

        toast({
          title: "Account created! ✅",
          description: "Welcome to Zentrix! Just a few more questions...",
        });

        // Persist marketing attribution to DB (non-blocking)
        const attribution = getAttribution();
        Promise.resolve(supabase.rpc('insert_user_attribution', {
          p_user_id: data.user.id,
          p_gclid: attribution?.gclid || null,
          p_fbclid: attribution?.fbclid || null,
          p_li_fat_id: attribution?.li_fat_id || null,
          p_utm_source: attribution?.utm_source || 'direct',
          p_utm_medium: attribution?.utm_medium || 'none',
          p_utm_campaign: attribution?.utm_campaign || null,
          p_utm_content: attribution?.utm_content || null,
          p_utm_term: attribution?.utm_term || null,
          p_utm_adset: attribution?.utm_adset || null,
          p_utm_ad: attribution?.utm_ad || null,
          p_landing_page_url: attribution?.landing_page_url || null,
          p_first_seen_at: attribution?.first_seen_at || new Date().toISOString(),
          p_referral_source: 'not_specified',
        } as any)).catch((err: any) => logger.error('Failed to persist marketing attribution:', err));

        // Auto-create company
        trackOnboardingEvent({
          source: pageSource,
          eventType: 'workspace_creation_started',
          step: 'signup',
          userId: data.user.id,
          email: formData.email,
        });
        try {
          logger.log('🏢 Auto-creating company for ad user:', formData.companyName);
          const companyResult = await createFirstCompany({ companyName: formData.companyName.trim() });
          if (companyResult.success) {
            logger.log('✅ Company auto-created, showing profiling questions');
            trackOnboardingEvent({
              source: pageSource,
              eventType: 'workspace_created',
              step: 'signup',
              userId: data.user.id,
              email: formData.email,
              metadata: {
                company_id: companyResult.company_id,
                team_id: companyResult.team_id,
                company_name: formData.companyName.trim(),
              },
            });
          } else {
            logger.warn('⚠️ Company auto-creation failed:', companyResult.error);
            trackOnboardingEvent({
              source: pageSource,
              eventType: 'workspace_creation_failed',
              step: 'signup',
              userId: data.user.id,
              email: formData.email,
              metadata: { error: String(companyResult.error ?? 'unknown') },
            });
          }
        } catch (err) {
          logger.error('❌ Company auto-creation error:', err);
          trackOnboardingEvent({
            source: pageSource,
            eventType: 'workspace_creation_failed',
            step: 'signup',
            userId: data.user.id,
            email: formData.email,
            metadata: { error: err instanceof Error ? err.message : String(err) },
          });
        }

        // Store user ID and transition to profiling phase
        setCreatedUserId(data.user.id);
        setPhase('profiling');
        setProfilingStep(1);
      }
    } catch (error) {
      phaseRef.current = 'signup'; // Reset on failure so redirect guard works normally
      logger.error('❌ Ad signup error:', error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      trackOnboardingEvent({
        source: pageSource,
        eventType: 'signup_failed',
        step: 'signup',
        email: formData.email,
        metadata: { error: errorMessage },
      });

      let friendlyMessage = errorMessage;
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists') || errorMessage.includes('user_already_exists')) {
        friendlyMessage = "This email is already registered. Try signing in instead.";
      } else if (errorMessage.includes('invalid email')) {
        friendlyMessage = "Invalid email. Please check the email format.";
      } else if (errorMessage.includes('password')) {
        friendlyMessage = "Password too weak. Use at least 8 characters.";
      } else if (errorMessage.includes('Email rate limit exceeded')) {
        friendlyMessage = "Too many signup attempts. Please wait a few minutes.";
      }

      toast({
        title: "Cannot create account",
        description: friendlyMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Expose handleSubmit to the auto-submit effect declared above. The effect
  // can't reference handleSubmit directly because of declaration order.
  handleSubmitRef.current = handleSubmit;

  const handleProfilingComplete = async () => {
    const isDisqualified = computeDisqualified(userRole, eosUsage, investmentWillingness);
    const isMQL = !isDisqualified;
    const userId = createdUserId || user?.id;

    // Final profiling question (Q3 — investment) is completing right now.
    trackOnboardingEvent({
      source: pageSource,
      eventType: 'step_completed',
      step: 'profiling',
      userId,
      email: formData.email || user?.email,
      metadata: {
        question: 'investment',
        answer: investmentWillingness,
        is_disqualified: isDisqualified,
        is_mql: isMQL,
      },
    });

    if (userId) {
      // Save profiling answers to dedicated lead_profiling table
      try {
        await supabase
          .from('lead_profiling')
          .upsert({
            user_id: userId,
            user_role: userRole,
            eos_usage: eosUsage,
            investment_willingness: investmentWillingness,
            is_disqualified: isDisqualified,
            is_mql: isMQL,
          });
      } catch (err) {
        logger.error('Failed to save lead profiling data:', err);
      }

      // Send signup webhook with full profiling data (non-blocking)
      const attribution = getAttribution();
      supabase.functions.invoke('send-webhook-event', {
        body: {
          event_type: 'user_signed_up',
          user_id: userId,
          event_data: {
            email: formData.email,
            full_name: formData.fullName,
            phone: formData.phone || 'not_specified',
            signup_method: 'direct',
            signup_flow: 'ad',
            referral_source: 'not_specified',
            user_role: userRole,
            eos_usage: eosUsage,
            investment_willingness: investmentWillingness,
            is_disqualified: isDisqualified,
            is_mql: isMQL,
            ...(attribution ? {
              marketing_attribution: {
                gclid: attribution.gclid,
                fbclid: attribution.fbclid,
                li_fat_id: attribution.li_fat_id,
                utm_source: attribution.utm_source,
                utm_medium: attribution.utm_medium,
                utm_campaign: attribution.utm_campaign,
                utm_adset: attribution.utm_adset,
                utm_ad: attribution.utm_ad,
                landing_page_url: attribution.landing_page_url,
                first_seen_at: attribution.first_seen_at,
              }
            } : {}),
          },
        },
      }).catch((err: any) => logger.error('Failed to send signup webhook:', err));
    }

    // Wipe the per-tab onboarding session id so the next visit (if any)
    // gets a fresh one rather than appending to this completed funnel.
    resetOnboardingSession();

    // Redirect to dashboard
    window.location.replace('/dashboard');
  };

  const handleProfilingNext = () => {
    if (profilingStep < 3) {
      // Q1 (role) and Q2 (eos) — record the answer, then advance.
      const question = profilingStep === 1 ? 'role' : 'eos';
      const answer = profilingStep === 1 ? userRole : eosUsage;
      trackOnboardingEvent({
        source: pageSource,
        eventType: 'step_completed',
        step: 'profiling',
        userId: createdUserId || user?.id,
        email: formData.email || user?.email,
        metadata: { question, answer },
      });
      setProfilingStep(prev => prev + 1);
    } else {
      handleProfilingComplete();
    }
  };

  const isFormValid = formData.email.trim() && formData.fullName.trim() && formData.password.trim() && formData.phone.trim() && formData.companyName.trim();

  // Radio-style list selector
  const RadioListSelector = ({ options, value, onChange }: {
    options: { value: string; label: string; icon?: React.ReactNode }[];
    value: string;
    onChange: (val: string) => void;
  }) => (
    <div className="space-y-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left text-sm
            ${value === option.value
              ? 'border-gray-900 bg-muted/50 text-text-primary font-medium'
              : 'border-border bg-white text-text-secondary hover:border-border hover:bg-muted/50'
            }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
            ${value === option.value ? 'border-gray-900 bg-popover' : 'border-border'}`}>
            {value === option.value && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>
          {option.icon && <span className={value === option.value ? 'text-text-primary' : 'text-text-muted'}>{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );

  // Profiling phase UI
  if (phase === 'profiling') {
    const stepConfig = [
      {
        title: 'What is your role?',
        subtitle: 'This helps us personalize your experience.',
        options: ROLE_OPTIONS,
        value: userRole,
        onChange: setUserRole,
      },
      {
        title: 'Does your company currently run on EOS?',
        subtitle: 'We tailor features based on your operating system.',
        options: EOS_OPTIONS,
        value: eosUsage,
        onChange: setEosUsage,
      },
      {
        title: 'How much would you invest per team member/month in an AI-powered tool to automate your entire EOS operation?',
        subtitle: 'This helps us understand your needs better.',
        options: INVESTMENT_OPTIONS,
        value: investmentWillingness,
        onChange: setInvestmentWillingness,
      },
    ];

    const current = stepConfig[profilingStep - 1];

    return (
      <div
        className="min-h-screen bg-white text-text-primary flex flex-col"
        style={{ colorScheme: 'light' }}
      >
        {/* Nav */}
        <nav className="w-full border-b border-gray-100 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <img src={zentrixLogo} alt="Zentrix" className="h-7" />
          </div>
        </nav>

        {/* Profiling content */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Progress bar */}
            <div className="mb-8">
              <div className="w-full flex gap-1.5 mb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        i <= profilingStep ? 'bg-popover w-full' : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-text-muted mb-2">Step {profilingStep} of 3</p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-primary mb-2">{current.title}</h2>
              <p className="text-base text-text-secondary">{current.subtitle}</p>
            </div>

            {/* Options */}
            <RadioListSelector
              options={current.options}
              value={current.value}
              onChange={current.onChange}
            />

            {/* Continue button */}
            <Button
              onClick={handleProfilingNext}
              disabled={!current.value}
              size="lg"
              className="w-full h-12 text-sm font-semibold mt-8 bg-popover hover:bg-card text-white gap-2"
            >
              {profilingStep === 3 ? 'Get Started' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // When coming from /adv2 with all 5 fields pre-filled, auto-submit fires immediately.
  // Show a spinner instead of the signup form while that flight is in progress so the
  // user never sees a redundant second form.
  const adv2HasFullPrefill =
    pageSource === 'adv2' &&
    !!formData.email.trim() &&
    !!formData.fullName.trim() &&
    !!formData.phone.trim() &&
    !!formData.companyName.trim() &&
    !!formData.password.trim();

  const suppressForAutoSubmit =
    adv2HasFullPrefill && phase === 'signup' && (!autoSubmittedRef.current || loading);

  if (suppressForAutoSubmit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-text-secondary">Creating your account…</p>
      </div>
    );
  }

  // Signup phase UI (unchanged)
  return (
    <div
      className="min-h-screen bg-white text-text-primary"
      style={{ colorScheme: 'light' }}
    >
      {/* Nav — matching landing page */}
      <nav className="w-full border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <Link to="/">
            <img src={zentrixLogo} alt="Zentrix" className="h-7" />
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 text-purple-700 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          Limited offer · Start free today
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary mb-6 leading-tight">
          Run your business
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            like a pro
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
          The all-in-one operating system for modern businesses. Align your team, track progress, and achieve your goals faster.
        </p>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-text-secondary mb-16">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Free 14-day trial
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success" />
            No credit card required
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Cancel anytime
          </div>
        </div>
      </section>

      {/* Signup card — centered */}
      <section className="max-w-md mx-auto px-4 md:px-6 pb-20">
        <div className="w-full bg-white rounded-2xl p-8 border border-border shadow-xl">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-text-primary mb-1">
              Start your free account
            </h2>
            <p className="text-sm text-text-secondary">
              No credit card required
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="fullName" className="text-sm font-medium text-text-primary">
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                disabled={loading}
                className="h-10 border-border bg-white text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-text-primary">
                Work Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                autoComplete="email"
                inputMode="email"
                required
                disabled={loading}
                className="h-10 border-border bg-white text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Phone Number
              </Label>
              <PhoneInput
                value={formData.phone}
                onChange={(val) => setFormData(prev => ({ ...prev, phone: val }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="companyName" className="text-sm font-medium text-text-primary">
                Company Name
              </Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Your company name"
                required
                disabled={loading}
                className="h-10 border-border bg-white text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm font-medium text-text-primary">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a secure password"
                required
                disabled={loading}
                className="h-10 border-border bg-white text-sm"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-sm font-semibold mt-2 bg-popover hover:bg-card text-white gap-2"
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating your account...
                </>
              ) : (
                <>
                  Get started — it's free
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-text-muted">
              Already have an account?{" "}
              <Link to="/login" className="text-text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-center space-x-4 text-xs text-text-muted">
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>SOC 2 compliant</span>
              </div>
              <div className="w-1 h-1 bg-muted rounded-full"></div>
              <span>256-bit encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics bar — matching landing page */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 px-4 md:px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {[
            { value: '10,000+', label: 'Active companies' },
            { value: '98%', label: 'Customer satisfaction' },
            { value: '2.5M+', label: 'Goals achieved' },
            { value: '50K+', label: 'Teams aligned' },
          ].map((m, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-text-primary mb-1">{m.value}</div>
              <div className="text-xs sm:text-sm text-text-secondary">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>© 2024 Zentrix. All rights reserved.</div>
          <div className="flex gap-8">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdLanding;
