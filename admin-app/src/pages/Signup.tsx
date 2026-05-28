
import React, { useState } from 'react';
import zentrixLogo from '@/assets/Logo-Zentrix.png';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { createFirstCompany } from '@/services/onboardingService';
import { cleanupAuthState } from '@/utils/authCleanup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RetroGrid } from '@/components/ui/retro-grid';
import { Clock, Users, Zap, Shield, ArrowLeft, Briefcase, UsersRound, Crown, MoreHorizontal, Phone } from 'lucide-react';
import { trackSignupStarted } from '@/lib/statsigAnalytics';
import { getAttribution } from '@/utils/marketingAttribution';
import { trackFBViewContent, trackFBCompleteRegistration } from '@/utils/facebookTracking';
import { trackLinkedInLead } from '@/utils/linkedinTracking';
import { PhoneInput } from '@/components/signup/PhoneInput';
import { logger } from '@/utils/logger';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const ROLE_OPTIONS = [
  { value: 'ceo_founder', label: 'CEO / Founder', icon: <Crown className="h-4 w-4" /> },
  { value: 'c_level_vp', label: 'C-Level / VP', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'director_manager', label: 'Director / Manager', icon: <UsersRound className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> },
];

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

const REFERRAL_OPTIONS = [
  { value: 'google_search', label: 'Google Search' },
  { value: 'social_media', label: 'Social Media (LinkedIn, Facebook, Instagram)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'referral_friend', label: 'Referral from a friend or colleague' },
  { value: 'eos_community', label: 'EOS Community / Implementer' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'blog_article', label: 'Blog or article' },
  { value: 'other', label: 'Other' },
];

const AD_LANDING_STORAGE_KEY = 'ad_signup_data';
const PARTNER_REFERRAL_STORAGE_KEY = 'partner_referral_code';

export const Signup = () => {
  const { user, signUp, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailInUse, setEmailInUse] = useState(false);
  const [isDeletedAccount, setIsDeletedAccount] = useState(false);
  const [signupStep, setSignupStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isOrganicFlow, setIsOrganicFlow] = useState(false);
  const [acceptingInvitation, setAcceptingInvitation] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
  });
  const [userRole, setUserRole] = useState('');
  const [eosUsage, setEosUsage] = useState('');
  const [investmentWillingness, setInvestmentWillingness] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [adCompanyName, setAdCompanyName] = useState('');

  const computeDisqualified = (): boolean => {
    const isNonLeadership = userRole === 'director_manager' || userRole === 'other';
    const doesntKnowEOS = eosUsage === 'what_is_eos';
    const wantsFree = investmentWillingness === 'free';
    return isNonLeadership || doesntKnowEOS || wantsFree;
  };

  // Ad flow: 3 profiling steps
  const totalProfilingSteps = 3;
  const getProfilingIndex = (step: number): number => {
    // step 2 → 1, step 3 → 2, step 4 → 3
    return step - 1;
  };

  // Prefill from URL and stash pending invite for auto-accept after signup
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const companyIdParam = params.get('company_id') || params.get('c');
    const tokenParam = params.get('token');
    const invited = params.get('invited');
    const partnerCode = params.get('partner');

    if (partnerCode) {
      const normalizedPartnerCode = partnerCode.trim();
      if (normalizedPartnerCode) {
        sessionStorage.setItem(PARTNER_REFERRAL_STORAGE_KEY, normalizedPartnerCode);
        localStorage.setItem(PARTNER_REFERRAL_STORAGE_KEY, normalizedPartnerCode);
      }
    }

    // Check for data passed from AdLanding via sessionStorage
    try {
      const adData = sessionStorage.getItem(AD_LANDING_STORAGE_KEY);
      if (adData) {
        const parsed = JSON.parse(adData);
        setFormData(prev => ({
          ...prev,
          email: parsed.email || prev.email,
          fullName: parsed.fullName || prev.fullName,
          phone: parsed.phone || prev.phone,
          password: parsed.password || prev.password,
        }));
        if (parsed.companyName) {
          setAdCompanyName(parsed.companyName);
        }
        sessionStorage.removeItem(AD_LANDING_STORAGE_KEY);
      }
    } catch {}

    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }));
    }
    if (invited) {
      if (companyIdParam && emailParam) {
        sessionStorage.setItem('pending_invite_company_id', companyIdParam);
        sessionStorage.setItem('pending_invite_email', emailParam);
      }
      if (tokenParam) {
        sessionStorage.setItem('pending_invitation', JSON.stringify({
          token: tokenParam,
          email: emailParam?.toLowerCase(),
          company_id: companyIdParam || undefined,
          saved_at: Date.now(),
          source: 'signup-page',
        }));
      }
    }

    // Store onboarding variant for A/B test (from /variantB or /variantC landing pages)
    const variantParam = params.get('variant');
    if (variantParam === 'b' || variantParam === 'c') {
      sessionStorage.setItem('onboarding_variant', variantParam);
      sessionStorage.removeItem('spotlight_tour_step'); // Clear stale tour progress from previous tests
    }

    // Auto-advance for users coming from /ad with email pre-filled
    const hasAdParams = params.get('gclid') || params.get('fbclid') || params.get('utm_source') || params.get('utm_campaign');
    if (emailParam && hasAdParams && !invited) {
      setIsOrganicFlow(false);
      setSignupStep(2);
    }

    // Track FB ViewContent when signup form is viewed
    trackFBViewContent();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check if user is in a password recovery flow
  const isPasswordRecovery = () => {
    try {
      return sessionStorage.getItem('password_recovery_initiated') === 'true' ||
             window.location.pathname === '/reset-password' ||
             window.location.hash.includes('type=recovery') ||
             window.location.search.includes('type=recovery');
    } catch {
      return false;
    }
  };

  if (user && !acceptingInvitation && !window.location.pathname.includes('/onboarding') && !isPasswordRecovery()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    const isDisqualified = computeDisqualified();
    const isMQL = !isDisqualified;

    // Determine signup flow based on ad params
    const params = new URLSearchParams(window.location.search);
    const hasAdParams = params.get('gclid') || params.get('fbclid') || params.get('utm_source') || params.get('utm_campaign');
    const partnerCode = params.get('partner') || sessionStorage.getItem(PARTNER_REFERRAL_STORAGE_KEY) || localStorage.getItem(PARTNER_REFERRAL_STORAGE_KEY);
    const signupFlow = hasAdParams ? 'ad' : (isOrganicFlow ? 'organic' : 'organic');

    try {
      // If this is NOT an invited flow, clear any stale pending invite keys
      const isInvitedFlow = params.get('invited') === '1';
      if (!isInvitedFlow) {
        localStorage.removeItem('pending_invite_company_id');
        localStorage.removeItem('pending_invite_email');
        localStorage.removeItem('pending_invite_token');
      }

      // Check if this is an invitation flow — prevent Navigate redirect during async accept
      const hasPendingInvitation = !!localStorage.getItem('pending_invitation');
      const hasUrlInvitation = isInvitedFlow || !!params.get('token');
      if (hasPendingInvitation || hasUrlInvitation) {
        setAcceptingInvitation(true);
      }

      // Clean limbo state before signing up
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}

      const { data, error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        undefined, // referralSource removed
        userRole || undefined,
        eosUsage || undefined,
        investmentWillingness || undefined,
        isDisqualified,
        isMQL,
        formData.phone || undefined
      );
      
      logger.log('🔍 Signup: Response from signUp:', { 
        hasData: !!data, 
        hasError: !!error, 
        errorMessage: error?.message,
        hasUser: !!data?.user,
        identitiesLength: data?.user?.identities?.length 
      });
      
      if (error) {
        logger.log('🔍 Signup: Error detected, throwing:', error);
        throw error;
      }
      
      // Check if email is already registered (identities array will be empty)
      if (data?.user && (!data?.user?.identities || data?.user?.identities?.length === 0)) {
        logger.log("🔍 Signup: User exists but no identities, checking if it's a deleted account...");
        try {
          const emailToCheck = formData.email.trim();
          const { data: isDeleted, error: rpcError } = await supabase
            .rpc('check_if_email_is_deleted_account', { p_email: emailToCheck });
          
          if (rpcError) {
            logger.error('❌ Signup: Error calling RPC function:', rpcError);
          } else if (isDeleted === true) {
            setIsDeletedAccount(true);
            setEmailInUse(true);
            return;
          }
        } catch (rpcError) {
          logger.error('❌ Signup: Error checking if email is deleted account:', rpcError);
        }
        
        setEmailInUse(true);
        setIsDeletedAccount(false);
        return;
      }
      
      // Build shared event data for webhooks
      const buildEventData = (attribution: any) => ({
        email: formData.email,
        full_name: formData.fullName,
        phone: formData.phone || 'not_specified',
        signup_method: 'direct',
        signup_flow: signupFlow,
        referral_source: partnerCode ? `partner:${partnerCode}` : (referralSource || 'not_specified'),
        user_role: userRole || 'not_specified',
        eos_usage: eosUsage || 'not_specified',
        investment_willingness: investmentWillingness || 'not_specified',
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
      });

      // Account created successfully — handle both session and no-session cases identically
      if (data?.user) {
        // Check for pending invitation FIRST — before React re-renders and redirects via Navigate
        // Read from URL params (most reliable) OR localStorage (fallback)
        try {
          const inviteToken = params.get('token') || undefined;
          const inviteCompanyId = params.get('company_id') || params.get('c') || undefined;
          const inviteEmail = params.get('email') || undefined;
          const isInvited = params.get('invited') === '1';

          // Also check localStorage as fallback
          let lsToken: string | undefined;
          let lsCompanyId: string | undefined;
          let lsEmail: string | undefined;
          try {
            const raw = localStorage.getItem('pending_invitation');
            if (raw) {
              const parsed = JSON.parse(raw);
              lsToken = parsed.token;
              lsCompanyId = parsed.company_id;
              lsEmail = parsed.email;
            }
          } catch (e) {
            logger.warn('Signup: Failed to parse pending_invitation from localStorage', e);
          }

          const finalToken = inviteToken || lsToken;
          const finalCompanyId = inviteCompanyId || lsCompanyId;
          const finalEmail = inviteEmail || lsEmail || formData.email.toLowerCase();

          if (isInvited || finalToken || lsToken) {
            logger.log('🎫 Signup: Invitation detected, attempting auto-accept', { hasUrlToken: !!inviteToken, hasLsToken: !!lsToken });
            const { data: acceptData, error: acceptError } = await supabase.functions.invoke('os-accept-invite', {
              body: { token: finalToken, email: finalEmail, companyId: finalCompanyId }
            });

            if (!acceptError && acceptData?.success) {
              try { localStorage.removeItem('pending_invitation'); } catch {}
              toast({ title: 'Invitation accepted! ✅', description: 'Welcome to the team!' });
              window.location.replace('/dashboard');
              return;
            } else {
              logger.warn('⚠️ Signup: Auto-accept failed, continuing to onboarding', { acceptError, acceptData });
              setAcceptingInvitation(false);
            }
          }
        } catch (invErr) {
          logger.warn('⚠️ Signup: Error checking pending invitation', invErr);
          setAcceptingInvitation(false);
        }

        try {
          trackSignupStarted({
            email: formData.email,
            signup_source: signupFlow,
          });
        } catch (e) {}

        // Track FB CompleteRegistration + lead qualification
        trackFBCompleteRegistration({
          email: formData.email,
          firstName: formData.fullName.split(' ')[0] || formData.fullName,
          userRole: userRole || 'not_specified',
          companySize: 'not_specified',
        });

        // Track LinkedIn Lead conversion
        trackLinkedInLead();

        toast({
          title: "Account created! ✅",
          description: "Welcome to Zentrix! Redirecting...",
        });

        // Persist marketing attribution to DB. We use fetch with `keepalive: true`
        // against PostgREST directly (rather than `supabase.rpc` fire-and-forget)
        // because the next thing this function does is `window.location.replace`
        // — a regular fire-and-forget RPC's in-flight POST is aborted by the
        // browser at navigation, and the row never lands. keepalive tells the
        // browser to deliver the request even after the document is torn down.
        // Diagnosed: most `/signup` organic-flow users (including new founder
        // accounts) were getting their referral_source dropped to this race.
        const attribution = getAttribution();
        try {
          const projectRef = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
          let authToken: string = SUPABASE_PUBLISHABLE_KEY;
          try {
            const sessionRaw = localStorage.getItem(`sb-${projectRef}-auth-token`);
            if (sessionRaw) {
              const parsed = JSON.parse(sessionRaw);
              const token = parsed?.access_token || parsed?.currentSession?.access_token;
              if (typeof token === 'string' && token) authToken = token;
            }
          } catch { /* fall back to anon key */ }
          fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_user_attribution`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${authToken}`,
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
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
              p_referral_source: partnerCode ? `partner:${partnerCode}` : (referralSource || 'not_specified'),
            }),
            keepalive: true,
          }).catch((err: unknown) => logger.error('Failed to persist marketing attribution:', err));
        } catch (err) {
          logger.error('Failed to dispatch attribution beacon:', err);
        }

        // Send signup webhook (non-blocking)
        supabase.functions.invoke('send-webhook-event', {
          body: {
            event_type: 'user_signed_up',
            user_id: data.user.id,
            event_data: buildEventData(attribution),
          },
        }).catch((err: any) => logger.error('Failed to send signup webhook:', err));

        // Save profiling data to lead_profiling table (non-blocking)
        if (userRole || eosUsage || investmentWillingness) {
          supabase
            .from('lead_profiling')
            .upsert({
              user_id: data.user.id,
              user_role: userRole || null,
              eos_usage: eosUsage || null,
              investment_willingness: investmentWillingness || null,
              is_disqualified: isDisqualified,
              is_mql: isMQL,
            })
            .then(({ error: profErr }) => {
              if (profErr) logger.error('Failed to save lead profiling:', profErr);
            });
        }

        // Auto-create company if companyName was provided from /ad page
        if (adCompanyName) {
          try {
            logger.log('🏢 Auto-creating company for ad user:', adCompanyName);
            const companyResult = await createFirstCompany({ companyName: adCompanyName });
            if (companyResult.success) {
              logger.log('✅ Company auto-created, redirecting to dashboard');
              window.location.replace('/dashboard');
              return;
            } else {
              logger.warn('⚠️ Company auto-creation failed, falling back to onboarding:', companyResult.error);
            }
          } catch (err) {
            logger.error('❌ Company auto-creation error, falling back to onboarding:', err);
          }
        }

        // Redirect to onboarding (default or fallback)
        window.location.replace('/onboarding');
        return;
      }
    } catch (error) {
      logger.error('❌ Signup: Caught error:', error);
      
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      const errorCode = (error as any)?.code || (error as any)?.status;
      
      const isEmailAlreadyRegistered = 
        errorMessage.includes('User already registered') || 
        errorMessage.includes('already been registered') ||
        errorMessage.includes('email already registered') ||
        errorMessage.includes('user_already_exists') ||
        errorMessage.includes('User already exists') ||
        errorCode === 'user_already_exists' ||
        errorMessage.toLowerCase().includes('already exists');
      
      if (isEmailAlreadyRegistered) {
        try {
          const emailToCheck = formData.email.trim();
          const { data: isDeleted, error: rpcError } = await supabase
            .rpc('check_if_email_is_deleted_account', { p_email: emailToCheck });
          
          if (rpcError) {
            logger.error('❌ Signup: Error calling RPC function:', rpcError);
          } else if (isDeleted === true) {
            setIsDeletedAccount(true);
            setEmailInUse(true);
            // removed setEmailSent
            return;
          }
        } catch (rpcError) {
          logger.error('❌ Signup: Error checking if email is deleted account:', rpcError);
        }
        
        setEmailInUse(true);
        setIsDeletedAccount(false);
        return;
      }
      
      let friendlyMessage = errorMessage;
      if (errorMessage.includes('invalid email')) {
        friendlyMessage = "Invalid email. Please check the email format.";
      } else if (errorMessage.includes('Email rate limit exceeded')) {
        friendlyMessage = "Too many signup attempts. Please wait a few minutes before trying again.";
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (emailInUse) {
      setEmailInUse(false);
      setIsDeletedAccount(false);
    }
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.fullName.trim() || !formData.password.trim()) return;

    // Check if user comes from an ad (has UTM params, gclid, fbclid, etc.)
    const params = new URLSearchParams(window.location.search);
    const hasAdParams = params.get('gclid') || params.get('fbclid') || params.get('utm_source') || params.get('utm_campaign');
    
    if (hasAdParams) {
      // Ad flow: go through profiling steps
      setIsOrganicFlow(false);
      setSignupStep(2);
    } else {
      // Organic flow: show "How did you hear about us?" before creating account
      setIsOrganicFlow(true);
      setSignupStep(5);
    }
  };

  // Progress bar: thin segmented bar + "Step X of Y"
  const StepHeader = ({ step, title, subtitle }: { step: number; title: string; subtitle: string }) => {
    const profilingIndex = getProfilingIndex(step);
    return (
      <div className="mb-8">
        {/* Thin progress bar at top */}
        <div className="w-full flex gap-1.5 mb-6">
          {Array.from({ length: totalProfilingSteps }).map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  i < profilingIndex ? 'bg-primary w-full' : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-2">Step {profilingIndex} of {totalProfilingSteps}</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-2">{title}</h2>
        <p className="text-base text-muted-foreground">{subtitle}</p>
      </div>
    );
  };

  // Radio-style list selector matching the screenshot design
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
          className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left text-base font-medium transition-all duration-200 ${
            value === option.value
              ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/30'
              : 'border-border bg-background text-foreground hover:border-primary/40'
          }`}
        >
          {/* Radio circle */}
          <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            value === option.value ? 'border-primary bg-primary' : 'border-muted-foreground/40'
          }`}>
            {value === option.value && (
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
            )}
          </div>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors mt-6"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );

  // Feedback states (emailInUse) shown on step 1
  const renderFeedback = () => {
    if (emailInUse) {
      return isDeletedAccount ? (
        <div className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center mt-4">
          <div className="flex items-center justify-center space-x-2 text-destructive font-medium mb-2">
            <Shield className="w-4 h-4" />
            <span>Account Deleted</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            This email belongs to a deleted account. Please choose a different email or contact support if you believe this is an error.
          </p>
        </div>
      ) : (
        <div className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center mt-4">
          <div className="flex items-center justify-center space-x-2 text-destructive font-medium mb-2">
            <Shield className="w-4 h-4" />
            <span>Email already registered</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            This email is already registered. Please sign in instead.
          </p>
          <Link 
            to="/login" 
            className="inline-flex items-center justify-center w-full h-8 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-colors"
          >
            Sign in instead
          </Link>
        </div>
      );
    }

    return null;
  };

  const renderStepContent = () => {
    switch (signupStep) {
      case 1:
        return (
          <form onSubmit={handleStep1Next} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
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
                className="h-10 border-input bg-background text-sm"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
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
                className="h-10 border-input bg-background text-sm"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Phone Number
              </Label>
              <PhoneInput
                value={formData.phone}
                onChange={(val) => setFormData(prev => ({ ...prev, phone: val }))}
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
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
                className="h-10 border-input bg-background text-sm"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              disabled={!formData.email.trim() || !formData.fullName.trim() || !formData.password.trim() || loading}
            >
              {loading ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border border-b-transparent border-current" />
                  Creating account...
                </>
              ) : (
                "Get started"
              )}
            </Button>
            {renderFeedback()}
          </form>
        );

      case 2:
        return (
          <div>
            <StepHeader step={2} title="What is your role?" subtitle="This helps us personalize your experience." />
            <RadioListSelector
              options={ROLE_OPTIONS}
              value={userRole}
              onChange={(val) => { setUserRole(val); setTimeout(() => setSignupStep(3), 300); }}
            />
            <BackButton onClick={() => setSignupStep(1)} />
          </div>
        );

      case 3:
        return (
          <div>
            <StepHeader step={3} title="Does your company currently run on EOS?" subtitle="Entrepreneurial Operating System." />
            <RadioListSelector
              options={EOS_OPTIONS}
              value={eosUsage}
              onChange={(val) => { setEosUsage(val); setTimeout(() => setSignupStep(4), 300); }}
            />
            <BackButton onClick={() => setSignupStep(2)} />
          </div>
        );

      case 4:
        return (
          <div>
            <StepHeader step={4} title="How much would you invest per team member/month in an AI-powered tool to run your business?" subtitle="Select the range that fits best." />
            <RadioListSelector
              options={INVESTMENT_OPTIONS}
              value={investmentWillingness}
              onChange={(val) => setInvestmentWillingness(val)}
            />
            <div className="mt-6">
              <Button
                type="button"
                className="w-full h-11 text-sm font-medium"
                disabled={!investmentWillingness || loading}
                onClick={() => handleSubmit()}
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-3 w-3 animate-spin rounded-full border border-b-transparent border-current" />
                    Creating account...
                  </>
                ) : (
                  "Create free account"
                )}
              </Button>
            </div>
            {renderFeedback()}
            <BackButton onClick={() => setSignupStep(3)} />
          </div>
         );

      case 5:
        return (
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-2">How did you hear about us?</h2>
            <p className="text-base text-muted-foreground mb-8">This helps us improve how we reach people like you.</p>
            <RadioListSelector
              options={REFERRAL_OPTIONS}
              value={referralSource}
              onChange={(val) => setReferralSource(val)}
            />
            <div className="mt-6">
              <Button
                type="button"
                className="w-full h-11 text-sm font-medium"
                disabled={!referralSource || loading}
                onClick={() => handleSubmit()}
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-3 w-3 animate-spin rounded-full border border-b-transparent border-current" />
                    Creating account...
                  </>
                ) : (
                  "Create free account"
                )}
              </Button>
            </div>
            {renderFeedback()}
            <BackButton onClick={() => setSignupStep(1)} />
          </div>
        );
    }
  };

  // Steps 2-4: full-page clean layout
  if (signupStep > 1) {
    return (
      <div className="relative min-h-screen bg-background">
        <RetroGrid className="absolute inset-0 opacity-50" />
        {/* Top bar: logo left, back to overview right */}
        <div className="relative z-10 w-full px-6 py-5 flex items-center justify-between">
          <Link to="/">
            <img src={zentrixLogo} alt="Zentrix OS" className="h-6 w-auto" />
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </Link>
        </div>
        
        <div className="relative z-10 w-full max-w-lg mx-auto px-6 py-8 md:py-14">
          {renderStepContent()}
          
          <div className="mt-10 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-foreground hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: original split layout with value proposition
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <RetroGrid className="absolute inset-0 opacity-50" />
      
      <div className="relative z-10 w-full max-w-6xl flex items-center">
        {/* Left side - Value proposition */}
        <div className="hidden lg:flex lg:w-1/2 lg:pr-16">
          <div className="max-w-lg">
            <div className="mb-8">
              <h1 className="text-5xl font-semibold tracking-tight text-foreground mb-6 leading-tight">
                Build high-performing teams
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Transform your meetings from time-wasters into power sessions. Join thousands of teams achieving 40% faster decisions.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Save 5+ hours per week</h3>
                  <p className="text-sm text-muted-foreground">Automated meeting summaries and action tracking</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Keep everyone aligned</h3>
                  <p className="text-sm text-muted-foreground">Real-time collaboration and shared accountability</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Launch in 2 minutes</h3>
                  <p className="text-sm text-muted-foreground">No complex setup. Start your first meeting today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Sign up form */}
        <div className="w-full lg:w-1/2 lg:pl-16">
          <div className="w-full max-w-sm bg-background/60 backdrop-blur-sm rounded-lg p-8 border border-border/50 mx-auto">
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
                Join thousands of teams
              </h1>
              <p className="text-sm text-muted-foreground">
                Start building high-performing teams today
              </p>
            </div>
            
            <div className="hidden lg:block text-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
                Start your free account
              </h2>
              <p className="text-sm text-muted-foreground">
                No credit card required
              </p>
            </div>

            {renderStepContent()}
            
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-foreground hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
            
            <div className="mt-6 pt-6 border-t border-border/50">
              <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>SOC 2 compliant</span>
                </div>
                <div className="w-1 h-1 bg-muted-foreground/50 rounded-full"></div>
                <span>256-bit encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
