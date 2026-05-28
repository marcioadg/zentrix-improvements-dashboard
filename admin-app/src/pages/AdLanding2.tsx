import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/utils/authCleanup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Phone, ArrowRight, ArrowLeft, Loader2, Crown, Briefcase, UsersRound, MoreHorizontal, Check, Sparkles, Trash2, Video, UserPlus, BarChart3, Building2, Target, CheckCircle2, MessageCircle } from 'lucide-react';
// Canonical Zentrix logo used by the main landing page (LandingNav) and
// the in-app Header — keeps /ad2 visually consistent with the rest of
// the site rather than the older Logo-Zentrix.png asset.
const ZENTRIX_LOGO_SRC = '/lovable-uploads/1a8bdcf2-1d95-4a87-8596-e81f8c8dc773.png';
const ZENTRIX_LOGO_WHITE_SRC = '/v2/assets/logo-zentrix-white.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import {
  getRecommendedMetrics,
  getRecommendedGoalTexts,
  getDefaultMetricTarget,
  getIndustryDisplayLabel,
  type RecMetric,
} from '@/data/onboardingRecommendations';
import { captureAttribution, getAttribution } from '@/utils/marketingAttribution';
import { isFBMQLQualified, trackFBPageView, trackFBCompleteRegistration, trackFBLead, trackFBMQL } from '@/utils/facebookTracking';
import { trackLinkedInLead } from '@/utils/linkedinTracking';
import { trackSignupStarted } from '@/lib/statsigAnalytics';
import { trackOnboardingEvent, trackOnboardingEventBeacon, resetOnboardingSession } from '@/services/onboardingEventService';
import { PhoneInput } from '@/components/signup/PhoneInput';
import { logger } from '@/utils/logger';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { createFirstCompany } from '@/services/onboardingService';
import { createTeamWithMembers } from '@/services/teamOperationsService';
import { createMetric } from '@/services/metricOperations';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';

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

const computeDisqualified = (role: string, eos: string, investment: string): boolean => {
  const isNonLeadership = role === 'director_manager' || role === 'other';
  const doesntKnowEOS = eos === 'what_is_eos';
  const wantsFree = investment === 'free';
  return isNonLeadership || doesntKnowEOS || wantsFree;
};

const INDUSTRY_OPTIONS = [
  'SaaS / Software',
  'E-commerce / Retail',
  'Marketplace',
  'Fintech / Financial Services',
  'Agency / Consulting',
  'Media / Content',
  'Education / EdTech',
  'Healthcare / HealthTech',
  'Manufacturing / Industrial',
  'Real Estate / PropTech',
  'Logistics / Supply Chain',
  'Hospitality / Food & Beverage',
  'Non-profit',
  'Other',
];

const COUNTRY_OPTIONS = [
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'OTHER', flag: '🌍', name: 'Other' },
];

const TEAM_SIZE_OPTIONS = ['1–10', '11–50', '51–200', '201–500', '500+'];

const HEAR_ABOUT_OPTIONS = [
  { value: 'google_search', label: 'Google Search' },
  { value: 'social_media', label: 'Social Media (LinkedIn, Facebook, Instagram)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'referral_friend', label: 'Referral from a friend or colleague' },
  { value: 'eos_community', label: 'EOS Community / Implementer' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'blog_article', label: 'Blog or article' },
  { value: 'other', label: 'Other' },
];

const FOUNDATION_STEPS = [
  { num: 1, label: 'Company' },
  { num: 2, label: 'Metrics' },
  { num: 3, label: 'Goals' },
  { num: 4, label: 'Create workspace' },
];

const UNIT_OPTIONS = [
  { value: '$',     label: '$ (currency)' },
  { value: '%',     label: '% (percent)' },
  { value: 'count', label: '# (count)' },
  { value: 'hours', label: 'hours' },
];

const CALCULATION_OPTIONS = [
  { value: 'total',   label: 'Sum' },
  { value: 'average', label: 'Average' },
];

const AD2_PRIMARY_GRADIENT = 'linear-gradient(90deg, #1e2235 0%, #8b8ec5 100%)';
const AD2_LEFT_PANEL_GRADIENT = 'linear-gradient(160deg, #0c0d12 0%, #1a1d2e 60%, #2a2e4a 100%)';
const AD2_HIGHLIGHT_GRADIENT = 'linear-gradient(90deg, #ffffff 0%, #8b8ec5 100%)';
const AD2_PROGRESS_GRADIENT = 'linear-gradient(90deg, #8b8ec5 0%, #ffffff 100%)';
const AD2_PANEL_BG = '#fafafa';
const AD2_SETUP_SHELL_CLASS = 'min-h-screen flex flex-col lg:flex-row bg-[#0c0d12] text-white overflow-hidden';
const AD2_LEFT_PANEL_CLASS = 'relative lg:w-[46%] lg:min-w-[480px] px-8 py-8 lg:px-12 flex flex-col text-white overflow-hidden';
const AD2_RIGHT_PANEL_CLASS = 'relative flex-1 px-6 py-10 lg:px-16 flex flex-col text-gray-900';
const AD2_RIGHT_BODY_CLASS = 'flex-1 flex flex-col justify-center max-w-[520px] mx-auto w-full';
const AD2_LEFT_H1_CLASS = 'text-4xl lg:text-[42px] font-semibold tracking-normal leading-[1.05] mb-6 max-w-[440px]';

const AD2_WHATSAPP_HELP_URL =
  'https://wa.me/5541988852536?text=Hey%2C%20I%27m%20setting%20up%20my%20Zentrix%20OS%20account%20and%20need%20some%20help.%20Can%20you%20assist%3F';

const Ad2NeedHelpButton: React.FC = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors shrink-0 mt-1"
      >
        Need help?
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-600">
          ?
        </span>
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-64 p-2">
      <a
        href={AD2_WHATSAPP_HELP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
          <MessageCircle className="h-4 w-4 text-white" />
        </div>
        <div className="text-left">
          <div className="text-[13px] font-medium text-gray-900">WhatsApp</div>
          <div className="text-[11px] text-gray-500">Message us directly</div>
        </div>
      </a>
    </PopoverContent>
  </Popover>
);

const Ad2LogoMark: React.FC = () => (
  <img
    src={ZENTRIX_LOGO_WHITE_SRC}
    alt="Zentrix OS"
    className="h-[21px] w-auto"
  />
);

const Ad2LeftGlow: React.FC = () => (
  <div
    aria-hidden
    className="absolute w-[420px] h-[420px] rounded-full left-[-120px] bottom-[-180px] pointer-events-none"
    style={{ background: 'radial-gradient(circle, rgba(139,142,197,0.45) 0%, transparent 70%)' }}
  />
);

// Returns last day of the current calendar quarter as YYYY-MM-DD.
const getEndOfQuarter = (): string => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3); // 0-3
  const endMonth = q * 3 + 2; // Mar, Jun, Sep, Dec → 2,5,8,11
  const endDate = new Date(now.getFullYear(), endMonth + 1, 0); // day 0 of next month = last day of endMonth
  const yyyy = endDate.getFullYear();
  const mm = String(endDate.getMonth() + 1).padStart(2, '0');
  const dd = String(endDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Returns a friendly label for the current quarter, e.g. "Q2 2026".
const getCurrentQuarterLabel = (): string => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `Q${q} ${now.getFullYear()}`;
};

const OnboardingProgressBar: React.FC<{ currentStep: number }> = ({ currentStep }) => (
  <div className="relative pt-10">
    <div className="flex items-start gap-2">
      {FOUNDATION_STEPS.map((step) => {
        const isActive = step.num === currentStep;
        const isCompleted = step.num < currentStep;
        return (
          <div key={step.num} className="relative flex-1">
            {isActive && (
              <div
                aria-hidden
                className="pointer-events-none absolute -top-2 left-0 right-0 h-12 rounded-full blur-xl"
                style={{
                  background:
                    'radial-gradient(ellipse at center top, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 40%, transparent 70%)',
                }}
              />
            )}
            <div
              className={`relative h-[2px] mb-3 rounded-full ${
                isActive
                  ? 'shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                  : isCompleted
                  ? ''
                  : 'bg-white/10'
              }`}
              style={isActive || isCompleted ? { background: AD2_PROGRESS_GRADIENT } : undefined}
            />
            <div className="relative flex items-center gap-2">
              <span
                className={`flex-shrink-0 w-[18px] h-[18px] rounded-full text-[10px] font-semibold flex items-center justify-center ${
                  isActive
                    ? 'bg-white text-black'
                    : isCompleted
                    ? 'bg-white/15 text-white/80 border border-white/30'
                    : 'bg-transparent text-white/45 border border-white/20'
                }`}
              >
                {isCompleted ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : step.num}
              </span>
              <span
                className={`text-xs ${
                  isActive ? 'text-white' : isCompleted ? 'text-white/60' : 'text-white/45'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

type CustomMetricInput = { id: string; name: string; target: string; unit: string; calculation: string };

const CustomMetricPopover: React.FC<{ onAdd: (m: CustomMetricInput) => void }> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('count');
  const [calculation, setCalculation] = useState('total');

  const reset = () => { setName(''); setTarget(''); setUnit('count'); setCalculation('total'); };
  const canSave = name.trim().length > 0 && target.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    onAdd({
      id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      target: target.trim(),
      unit,
      calculation,
    });
    reset();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full mt-4 py-4 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-white/60 hover:border-gray-400 transition-colors inline-flex items-center justify-center gap-2"
        >
          <span className="text-base">+</span> Add a custom metric
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="center">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-[13px] font-semibold text-gray-900">Add a custom metric</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Track any number that matters to your business</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-gray-600 font-medium">Metric name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Trial conversions"
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-600 font-medium">Target value</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-600 font-medium">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-gray-600 font-medium">Data calculation</Label>
            <Select value={calculation} onValueChange={setCalculation}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALCULATION_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { reset(); setOpen(false); }}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSave}
            onClick={submit}
            className="h-8 text-xs text-white"
            style={{ background: AD2_PRIMARY_GRADIENT }}
          >
            Add metric
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

type RockInput = { text: string; target_date: string };

const AddRockPopover: React.FC<{ onAdd: (r: RockInput) => void; defaultDate: string }> = ({ onAdd, defaultDate }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [date, setDate] = useState<Date | undefined>(() => new Date(defaultDate + 'T00:00:00'));

  const reset = () => {
    setText('');
    setDate(new Date(defaultDate + 'T00:00:00'));
  };
  const canSave = text.trim().length > 0 && !!date;

  const submit = () => {
    if (!canSave || !date) return;
    onAdd({ text: text.trim(), target_date: format(date, 'yyyy-MM-dd') });
    reset();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full mt-3 py-3.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-white/60 hover:border-gray-400 transition-colors inline-flex items-center justify-center gap-2"
        >
          <span className="text-base leading-none">+</span> Add another Goal
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[380px] p-0"
        align="center"
        onInteractOutside={(e) => {
          // Keep this popover open when the user clicks inside a nested
          // popper (the DatePicker's calendar lives in its own portal).
          const target = e.target as HTMLElement | null;
          if (target?.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-[13px] font-semibold text-gray-900">Add a Goal</div>
          <div className="text-[11px] text-gray-500 mt-0.5">A priority that defines this quarter</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-gray-600 font-medium">Goal title</Label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Hit $480k MRR"
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-gray-600 font-medium">Target date</Label>
            <DatePicker
              date={date}
              onSelect={setDate}
              placeholder="Pick a target date"
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-gray-400 leading-tight">Defaults to the end of the current quarter</p>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { reset(); setOpen(false); }}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSave}
            onClick={submit}
            className="h-8 text-xs text-white"
            style={{ background: AD2_PRIMARY_GRADIENT }}
          >
            Add Goal
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const AdLanding2: React.FC = () => {
  const { user, signUp, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // URL pre-fill so visitors arriving from the static /adv2b LP via
  // /ad2?from=adv2b&email=...&phone=... don't have to retype. Password is
  // handed off via sessionStorage (never in URL) so /adv2b can collect all
  // 4 fields on its single LP form and we auto-submit here without the
  // user ever seeing this signup form.
  const prefill = (() => {
    if (typeof window === 'undefined') return { email: '', phone: '', fullName: '', password: '' };
    const p = new URLSearchParams(window.location.search);
    let pw = '';
    try {
      pw = sessionStorage.getItem('adv2b_signup_password') || '';
      if (pw) sessionStorage.removeItem('adv2b_signup_password');
    } catch { /* ignore */ }
    return {
      email: (p.get('email') || '').trim(),
      phone: (p.get('phone') || '').trim(),
      fullName: (p.get('fullName') || p.get('name') || '').trim(),
      password: pw,
    };
  })();

  const [formData, setFormData] = React.useState({
    fullName: prefill.fullName,
    email: prefill.email,
    phone: prefill.phone,
    password: prefill.password,
  });

  // Onboarding phase state — use ref to survive auth-triggered re-renders.
  // Always start at 'signup' for fresh visitors. /adv2b traffic now arrives
  // here as plain unauthenticated visitors with ?from=adv2b just for
  // attribution + URL pre-fill — they sign up here like everyone else.
  const initialPhase = 'signup' as const;
  const [phase, setPhase] = useState<'signup' | 'foundation' | 'metrics' | 'goals' | 'review' | 'profiling'>(initialPhase);
  const phaseRef = useRef<'signup' | 'foundation' | 'metrics' | 'goals' | 'review' | 'profiling'>(initialPhase);
  const [profilingStep, setProfilingStep] = useState(1); // 1=role, 2=eos, 3=investment
  const [userRole, setUserRole] = useState('');
  const [eosUsage, setEosUsage] = useState('');
  const [investmentWillingness, setInvestmentWillingness] = useState('');
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const fbLeadTrackedRef = useRef(false);
  const leadTrackedRef = useRef(false);
  const handleSubmitRef = useRef<((e: React.FormEvent) => Promise<void>) | null>(null);
  const autoSubmittedRef = useRef(false);

  // Visitors from the static /adv2 or /adv2b LPs arrive here via the LP's
  // CTA-redirect script with ?from=adv2 or ?from=adv2b on the URL. We use
  // it for two things:
  //   - funnel attribution (pageSource below)
  //   - hide the /ad2 marketing chrome on the signup phase so they see
  //     only the form, since they already saw the LP marketing copy
  // They sign up here normally — no phase skipping, no pre-auth handoff.
  const fromParam = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const f = new URLSearchParams(window.location.search).get('from');
      if (f === 'adv2' || f === 'adv2b') return f;
    } catch { /* ignore */ }
    return null;
  }, []);
  const fromAdv2 = fromParam !== null;
  const fromAdv2b = fromParam === 'adv2b';
  const pageSource: 'ad2' | 'adv2' | 'adv2b' = fromParam || 'ad2';

  // Foundation step state (step 1 of 4 in the new onboarding)
  const [foundationCompanyName, setFoundationCompanyName] = useState('');
  const [foundationIndustry, setFoundationIndustry] = useState('');
  const [foundationCountry, setFoundationCountry] = useState('');
  const [foundationTeamSize, setFoundationTeamSize] = useState('11–50');
  const [foundationEos, setFoundationEos] = useState('');
  const [foundationHearAbout, setFoundationHearAbout] = useState('');

  // Metrics step state (step 2 of 4) — pre-selection happens on entry once we
  // know the user's industry (see effect below).
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(() => new Set());
  const metricsSeededRef = useRef(false);
  // Per-suggested-metric overrides (target / unit / calculation). Falls back to defaults if missing.
  type MetricOverrides = { target: string; unit: string; calculation: string };
  const [metricOverrides, setMetricOverrides] = useState<Record<string, MetricOverrides>>({});
  // Custom metrics added via the "Add a custom metric" popover.
  type CustomMetric = { id: string; name: string; target: string; unit: string; calculation: string };
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);

  // Goals step state (step 3 of 4). The sample goals are seeded on first
  // entry to the goals phase, based on the user's industry + team size.
  type Rock = { id: string; text: string; owner: string; target_date: string };
  const [rocks, setRocks] = useState<Rock[]>([]);
  const goalsSeededRef = useRef(false);

  useEffect(() => {
    // Force light theme like the landing page
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    root.setAttribute('data-theme', 'light');

    captureAttribution();
    trackFBPageView();
    trackOnboardingEvent({ source: pageSource, eventType: 'page_viewed', step: 'signup' });

    return () => {
      root.classList.remove('light');
      root.style.colorScheme = '';
      root.removeAttribute('data-theme');
    };
  }, []);

  // Fire one `step_viewed` event each time the user lands on a wizard step.
  // Re-entering an already-viewed step (via Back) re-fires intentionally —
  // it's still a view, and we want to know how often people backtrack.
  useEffect(() => {
    if (phase === 'profiling') return; // profiling phase is legacy, skip
    trackOnboardingEvent({
      source: pageSource,
      eventType: 'step_viewed',
      step: phase,
      userId: createdUserId || user?.id || null,
      email: formData.email || null,
    });
    // We intentionally only depend on `phase` so step_viewed isn't re-fired
    // every time formData updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-submit when arriving from /adv2b with all 4 fields pre-filled
  // (via URL + sessionStorage password handoff). The signup phase is
  // suppressed at render time, so the user only sees a spinner.
  useEffect(() => {
    if (autoSubmittedRef.current) return;
    if (authLoading || loading) return;
    if (user) return;
    if (pageSource !== 'adv2b') return;
    const fd = formData;
    if (!fd.email.trim() || !fd.fullName.trim() || !fd.phone.trim() || !fd.password.trim()) return;
    if (!handleSubmitRef.current) return;
    autoSubmittedRef.current = true;
    void handleSubmitRef.current({ preventDefault: () => {} } as React.FormEvent);
  }, [authLoading, loading, user, pageSource, formData]);

  // Pre-select the first recommended metric the first time the user arrives
  // on the metrics step, so they always have at least one chip ticked. We use
  // a ref so re-entering the step doesn't clobber their selection.
  useEffect(() => {
    if (phase !== 'metrics' || metricsSeededRef.current) return;
    const recs = getRecommendedMetrics(foundationIndustry);
    if (recs.length > 0) {
      setSelectedMetrics(new Set([recs[0].id]));
    }
    metricsSeededRef.current = true;
  }, [phase, foundationIndustry]);

  // Seed the goals list with industry-appropriate templates the first time
  // the user enters the goals step. Subsequent visits preserve any edits.
  useEffect(() => {
    if (phase !== 'goals' || goalsSeededRef.current) return;
    const ownerFirstName = (formData.fullName || '').trim().split(/\s+/)[0] || 'You';
    const seedTexts = getRecommendedGoalTexts(foundationIndustry, foundationTeamSize).slice(0, 2);
    if (seedTexts.length > 0) {
      const qEnd = getEndOfQuarter();
      setRocks(seedTexts.map((text, i) => ({
        id: `g${i + 1}`,
        text,
        owner: ownerFirstName,
        target_date: qEnd,
      })));
    }
    goalsSeededRef.current = true;
  }, [phase, foundationIndustry, foundationTeamSize, formData.fullName]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only redirect to dashboard when the user is signed in AND we are NOT
  // mid-onboarding (foundation or profiling). Use ref for instant check —
  // state may lag behind the auth listener.
  const inOnboarding = (p: string) => p === 'foundation' || p === 'metrics' || p === 'goals' || p === 'review' || p === 'profiling';
  if (user && !inOnboarding(phaseRef.current) && !inOnboarding(phase)) {
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
    if (!formData.email.trim() || !formData.fullName.trim() || !formData.password.trim() || !formData.phone.trim()) return;

    setLoading(true);

    if (!leadTrackedRef.current) {
      leadTrackedRef.current = true;
      try {
        trackFBLead({
          email: formData.email,
          firstName: formData.fullName.split(' ')[0] || formData.fullName,
          source: pageSource,
          status: 'first_step_submitted',
        });
      } catch { /* noop */ }
    }

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
      // causing the redirect guard above to send user to /dashboard
      phaseRef.current = 'foundation';

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
            toast({
              title: "Account previously deleted",
              description: "This email was associated with a deleted account. Please contact support.",
              variant: "destructive",
            });
            return;
          }
        } catch {}

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
        try {
          trackSignupStarted({ email: formData.email, signup_source: pageSource });
        } catch {}

        // Track LinkedIn Lead conversion after account creation. Meta
        // CompleteRegistration fires after the onboarding questions/workspace
        // setup finish so it matches the ad-platform conversion definition.
        trackLinkedInLead();

        toast({
          title: "Account created! ✅",
          description: "Welcome to Zentrix! Just a few more questions...",
        });

        // Persist marketing attribution to DB. We use fetch with `keepalive: true`
        // against PostgREST directly (rather than `supabase.rpc` fire-and-forget)
        // because the next thing this function does on mobile/tablet is
        // `window.location.replace('/onboardingmobile?...')` — a regular
        // fire-and-forget RPC's in-flight POST is aborted by the browser at
        // navigation, and the row never lands. keepalive tells the browser to
        // deliver the request even after the document is torn down.
        // Mirrors the same fix in Signup.tsx for the /signup organic flow.
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
              p_referral_source: 'not_specified',
            }),
            keepalive: true,
          }).catch((err: unknown) => logger.error('Failed to persist marketing attribution:', err));
        } catch (err) {
          logger.error('Failed to dispatch attribution beacon:', err);
        }

        // Use the beacon variant so this insert survives the imminent
        // mobile-divert navigation below (a plain fire-and-forget would be
        // aborted by window.location.replace before the request lands).
        trackOnboardingEventBeacon({
          source: pageSource,
          eventType: 'signup_completed',
          step: 'signup',
          userId: data.user.id,
          email: formData.email,
        });

        // After signup, enter the multi-step onboarding flow.
        // On mobile/tablet, hand the user off to the mobile-first wizard at
        // /onboardingmobile instead of the desktop foundation/metrics/goals/
        // review steps below. Desktop users continue in this page as before.
        setCreatedUserId(data.user.id);
        if (isMobileOrTabletDevice()) {
          window.location.replace(`/onboardingmobile?from=${encodeURIComponent(pageSource)}`);
          return;
        }
        setPhase('foundation');
      }
    } catch (error) {
      phaseRef.current = 'signup'; // Reset on failure so redirect guard works normally
      logger.error('❌ Ad2 signup error:', error);
      trackOnboardingEvent({
        source: pageSource,
        eventType: 'signup_failed',
        step: 'signup',
        email: formData.email,
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

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
  handleSubmitRef.current = handleSubmit;

  const handleProfilingComplete = async () => {
    const isDisqualified = computeDisqualified(userRole, eosUsage, investmentWillingness);
    const isMQL = !isDisqualified;
    const userId = createdUserId || user?.id;

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
            signup_flow: pageSource,
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

    // Redirect to dashboard
    window.location.replace('/dashboard');
  };

  const handleProfilingNext = () => {
    if (profilingStep < 3) {
      setProfilingStep(prev => prev + 1);
    } else {
      handleProfilingComplete();
    }
  };

  const isFormValid = formData.email.trim() && formData.fullName.trim() && formData.password.trim() && formData.phone.trim();

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

  // Foundation phase UI — step 1 of 4 in the new onboarding flow.
  // Design-only for now: no persistence, "Continue" is a no-op until wired up.
  if (phase === 'foundation') {
    const handleFoundationContinue = () => {
      logger.log('🧭 Foundation step submitted:', {
        companyName: foundationCompanyName,
        industry: foundationIndustry,
        country: foundationCountry,
        teamSize: foundationTeamSize,
        eosUsage: foundationEos,
        hearAbout: foundationHearAbout,
      });
      trackOnboardingEvent({
        source: pageSource,
        eventType: 'step_completed',
        step: 'foundation',
        userId: createdUserId || user?.id || null,
        email: formData.email,
        metadata: {
          has_company_name: !!foundationCompanyName.trim(),
          industry: foundationIndustry,
          country: foundationCountry,
          team_size: foundationTeamSize,
          eos_usage: foundationEos,
          hear_about: foundationHearAbout,
        },
      });

      // Persist the EOS answer to lead_profiling for canonical querying.
      // Mirrors what /ad does in handleProfilingComplete — same table, same
      // column name — so admin queries that slice by eos_usage work
      // identically across both onboarding flows. Non-blocking: a failure
      // here must not stop the user from advancing.
      const userId = createdUserId || user?.id;
      if (userId && foundationEos) {
        Promise.resolve(
          supabase.from('lead_profiling').upsert({
            user_id: userId,
            eos_usage: foundationEos,
          })
        ).catch(err => logger.error('Failed to persist /ad2 eos_usage:', err));
      }

      phaseRef.current = 'metrics';
      setPhase('metrics');
    };

    const handleFoundationBack = () => {
      phaseRef.current = 'signup';
      setPhase('signup');
    };

    const isFoundationValid = foundationCompanyName.trim().length > 0 && foundationEos.length > 0;

    return (
      <div className={AD2_SETUP_SHELL_CLASS}>
        {/* LEFT PANEL — dark with grid */}
        <aside
          className={AD2_LEFT_PANEL_CLASS}
          style={{ background: AD2_LEFT_PANEL_GRADIENT }}
        >
          {/* Subtle grid pattern */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
          <Ad2LeftGlow />

          <div className="relative flex items-center justify-between mb-14">
            <Ad2LogoMark />
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/45">
              Setup · 1/4
            </div>
          </div>

          {/* Header & body */}
          <div className="relative flex-1 flex flex-col">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45 mb-7">
              01 · Foundation
            </p>

            <h1 className={AD2_LEFT_H1_CLASS}>
              Tell us about
              <br />
              your{' '}
              <span
                style={{
                  background: AD2_HIGHLIGHT_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                company.
              </span>
            </h1>

            <p className="text-[15px] text-white/65 leading-relaxed max-w-md mb-10">
              One screen instead of six. We'll skip the survey, the team builder, and the
              workspace review — you can do all of that from inside Zentrix once your
              workspace is live.
            </p>
          </div>

          {/* Bottom progress steps */}
          <OnboardingProgressBar currentStep={1} />
        </aside>

        {/* RIGHT PANEL — light form */}
        <main className={AD2_RIGHT_PANEL_CLASS}
          style={{ background: AD2_PANEL_BG }}>
          {/* Form body */}
          <div className="flex-1 flex flex-col max-w-[520px] mx-auto w-full">
            <div className="flex items-start justify-between gap-4 mb-1.5">
              <h2 className="text-[26px] font-semibold tracking-tight text-gray-900">
                Your company details
              </h2>
              <Ad2NeedHelpButton />
            </div>
            <p className="text-sm text-gray-500 mb-9">
              The only thing we strictly need is your company name.
            </p>

            <div className="space-y-5">
              {/* Company name */}
              <div className="space-y-1.5">
                <Label htmlFor="foundationCompanyName" className="text-[13px] font-medium text-gray-700">
                  Company name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="foundationCompanyName"
                  value={foundationCompanyName}
                  onChange={(e) => setFoundationCompanyName(e.target.value)}
                  placeholder="Your company name"
                  className="h-12 bg-white border-gray-200 text-base focus-visible:ring-1 focus-visible:ring-gray-300"
                />
              </div>

              {/* Industry + Country */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-gray-700">Industry</Label>
                  <Select value={foundationIndustry} onValueChange={setFoundationIndustry}>
                    <SelectTrigger className="h-12 bg-white border-gray-200 text-base">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-gray-700">Country</Label>
                  <Select value={foundationCountry} onValueChange={setFoundationCountry}>
                    <SelectTrigger className="h-12 bg-white border-gray-200 text-base">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="mr-2">{c.flag}</span>{c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Team size pill buttons */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">Team size</Label>
                <div className="grid grid-cols-5 gap-2">
                  {TEAM_SIZE_OPTIONS.map((size) => {
                    const selected = foundationTeamSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setFoundationTeamSize(size)}
                        className={`h-12 rounded-lg text-sm font-medium transition-all ${
                          selected
                            ? 'bg-[#1e2235] text-white border border-transparent shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* EOS question — required. Same options as /ad's profiling Q2
                  so the answer slots into the same lead_profiling.eos_usage
                  column for unified querying. */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Does your company currently run on EOS? <span className="text-red-500">*</span>
                </Label>
                <Select value={foundationEos} onValueChange={setFoundationEos}>
                  <SelectTrigger className="h-12 bg-white border-gray-200 text-base">
                    <SelectValue placeholder="Select an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EOS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-200 pt-5" />

              {/* How did you hear about us */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[13px] font-medium text-gray-700">
                    How did you hear about us?{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-medium">
                    Helps us improve
                  </span>
                </div>
                <Select value={foundationHearAbout} onValueChange={setFoundationHearAbout}>
                  <SelectTrigger className="h-12 bg-white border-gray-200 text-base">
                    <SelectValue placeholder="Select an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {HEAR_ABOUT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Footer: Back / Continue */}
          <div className="flex items-center justify-between gap-4 pt-12 max-w-xl mx-auto w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleFoundationBack}
              className="h-12 px-10 text-sm font-medium bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={!isFoundationValid}
              onClick={handleFoundationContinue}
              className="h-12 flex-1 text-sm font-medium text-white gap-2 disabled:opacity-50"
              style={{
                background: AD2_PRIMARY_GRADIENT,
              }}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Metrics phase UI — step 2 of 4 (design-only).
  if (phase === 'metrics') {
    const toggleMetric = (id: string) => {
      setSelectedMetrics(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    const handleMetricsBack = () => {
      phaseRef.current = 'foundation';
      setPhase('foundation');
    };

    const handleMetricsContinue = () => {
      logger.log('🧭 Metrics step submitted (design-only):', Array.from(selectedMetrics));
      trackOnboardingEvent({
        source: pageSource,
        eventType: 'step_completed',
        step: 'metrics',
        userId: createdUserId || user?.id || null,
        email: formData.email,
        metadata: {
          selected_metric_ids: Array.from(selectedMetrics),
          selected_metrics_count: selectedMetrics.size,
          custom_metrics_count: customMetrics.length,
        },
      });
      phaseRef.current = 'goals';
      setPhase('goals');
    };

    const handleMetricsSkip = () => {
      logger.log('⏭️ Metrics step skipped (design-only)');
      trackOnboardingEvent({
        source: pageSource,
        eventType: 'step_skipped',
        step: 'metrics',
        userId: createdUserId || user?.id || null,
        email: formData.email,
      });
      phaseRef.current = 'goals';
      setPhase('goals');
    };

    const recommendedMetrics: RecMetric[] = getRecommendedMetrics(foundationIndustry);
    const selectedCount = selectedMetrics.size + customMetrics.length;
    const previewMetricId = Array.from(selectedMetrics)[0] || recommendedMetrics[0]?.id;
    const previewMetric = recommendedMetrics.find(m => m.id === previewMetricId) || recommendedMetrics[0];
    const industryLabel = getIndustryDisplayLabel(foundationIndustry);

    return (
      <div className={AD2_SETUP_SHELL_CLASS}>
        {/* LEFT PANEL — dark with grid + live preview */}
        <aside
          className={AD2_LEFT_PANEL_CLASS}
          style={{ background: AD2_LEFT_PANEL_GRADIENT }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
          <Ad2LeftGlow />

          <div className="relative flex items-center justify-between mb-14">
            <Ad2LogoMark />
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/45">
              Setup · 2/4
            </div>
          </div>

          {/* Header & body */}
          <div className="relative flex-1 flex flex-col">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45 mb-7">
              02 · Scorecard
            </p>

            <h1 className={AD2_LEFT_H1_CLASS}>
              Pick the numbers that{' '}
              <span
                style={{
                  background: AD2_HIGHLIGHT_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                matter.
              </span>
            </h1>

            <p className="text-[15px] text-white/65 leading-relaxed max-w-md mb-8">
              Your weekly scorecard is 5–15 numbers. Don't overthink it — start with
              2–3 and refine in your first meeting.
            </p>

            {/* Live preview card */}
            <div className="relative max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45 mb-3">
                Live Preview · Scorecard
              </div>

              {/* Inner white metric card */}
              <div className="rounded-xl bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                    {previewMetric.badge}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    on track
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold text-gray-900">$312k</span>
                  <span className="text-sm text-gray-400">/ $480k</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '65%',
                      background: 'linear-gradient(90deg, #6ba2ff 0%, #8b5cf6 100%)',
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                className="mt-3 w-full text-center text-xs text-white/45 py-2.5 border border-dashed border-white/15 rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                + add metrics →
              </button>
            </div>
          </div>

          <OnboardingProgressBar currentStep={2} />
        </aside>

        {/* RIGHT PANEL — suggestion grid */}
        <main className={AD2_RIGHT_PANEL_CLASS}
          style={{ background: AD2_PANEL_BG }}>
          <div className="flex-1 flex flex-col max-w-[520px] mx-auto w-full">
            <div className="flex items-start justify-between gap-4 mb-1.5">
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900">
                Suggested for {industryLabel} · click to add
              </h2>
              <Ad2NeedHelpButton />
            </div>
            <p className="text-sm text-gray-500 mb-8">
              Tap a card to include it. Custom metrics can be added below.
            </p>

            {/* 2x2 metric cards */}
            <div className="grid grid-cols-2 gap-4">
              {recommendedMetrics.map((metric) => {
                const selected = selectedMetrics.has(metric.id);
                const overrides = metricOverrides[metric.id] || {
                  target: getDefaultMetricTarget(metric, foundationTeamSize),
                  unit: metric.defaultUnit,
                  calculation: metric.defaultCalculation,
                };
                const updateOverride = (patch: Partial<MetricOverrides>) => {
                  setMetricOverrides(prev => ({
                    ...prev,
                    [metric.id]: { ...overrides, ...patch },
                  }));
                };
                return (
                  <div
                    key={metric.id}
                    className={`rounded-xl transition-all ${
                      selected
                        ? 'bg-white border-2 border-gray-900 shadow-sm'
                        : 'bg-white border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleMetric(metric.id)}
                      className="w-full text-left p-5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-900 text-white text-[10px] font-semibold uppercase tracking-wider">
                          {metric.badge}
                        </span>
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                            selected
                              ? 'bg-gray-900 border-2 border-gray-900'
                              : 'bg-white border-2 border-gray-300'
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>
                      </div>
                      <h3 className="text-[15px] font-semibold text-gray-900 mb-1 leading-tight">
                        {metric.title}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{metric.subtitle}</p>
                    </button>

                    {selected && (
                      <div
                        className="border-t border-gray-100 px-4 py-3 space-y-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            inputMode="decimal"
                            value={overrides.target}
                            onChange={(e) => updateOverride({ target: e.target.value })}
                            placeholder="Target"
                            className="h-8 text-xs flex-1 bg-white border-gray-200"
                          />
                          <Select value={overrides.unit} onValueChange={(v) => updateOverride({ unit: v })}>
                            <SelectTrigger className="h-8 text-xs w-[78px] bg-white border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Select value={overrides.calculation} onValueChange={(v) => updateOverride({ calculation: v })}>
                          <SelectTrigger className="h-8 text-xs w-full bg-white border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CALCULATION_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom metrics list */}
            {customMetrics.length > 0 && (
              <div className="mt-4 space-y-2">
                {customMetrics.map((cm) => (
                  <div
                    key={cm.id}
                    className="flex items-center gap-3 bg-white border-2 border-gray-900 rounded-xl px-4 py-3"
                  >
                    <span className="inline-block px-2 py-0.5 rounded bg-gray-900 text-white text-[10px] font-semibold uppercase tracking-wider">
                      Custom
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{cm.name}</div>
                      <div className="text-xs text-gray-500">
                        Target {cm.target} {cm.unit} · {CALCULATION_OPTIONS.find(o => o.value === cm.calculation)?.label}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomMetrics(prev => prev.filter(x => x.id !== cm.id))}
                      className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                      aria-label="Remove custom metric"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add custom — popover */}
            <CustomMetricPopover onAdd={(m) => setCustomMetrics(prev => [...prev, m])} />
          </div>

          {/* Footer: Back / Skip / Continue */}
          <div className="flex items-center justify-between gap-4 pt-12 max-w-xl mx-auto w-full">
            <div className="flex items-center gap-5">
              <Button
                type="button"
                variant="outline"
                onClick={handleMetricsBack}
                className="h-12 px-8 text-sm font-medium bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                Back
              </Button>
              <button
                type="button"
                onClick={handleMetricsSkip}
                className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                Skip — set up live
              </button>
            </div>
            <Button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleMetricsContinue}
              className="h-12 px-7 text-sm font-medium text-white gap-2 disabled:opacity-50"
              style={{
                background: AD2_PRIMARY_GRADIENT,
              }}
            >
              Continue · {selectedCount} selected
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Goals phase UI — step 3 of 4 (design-only).
  if (phase === 'goals') {
    const handleGoalsBack = () => {
      phaseRef.current = 'metrics';
      setPhase('metrics');
    };

    const handleGoalsContinue = () => {
      logger.log('🧭 Goals step submitted (design-only):', rocks);
      trackOnboardingEvent({
        source: pageSource,
        eventType: 'step_completed',
        step: 'goals',
        userId: createdUserId || user?.id || null,
        email: formData.email,
        metadata: {
          goals_count: rocks.length,
        },
      });
      phaseRef.current = 'review';
      setPhase('review');
    };

    // Display the first word of the user's full name as the Rock owner.
    // Falls back to 'You' if the signup name is empty (shouldn't happen post-signup).
    const ownerFirstName = (formData.fullName || '').trim().split(/\s+/)[0] || 'You';
    const ownerInitial = ownerFirstName.charAt(0).toUpperCase();

    const handleRemoveRock = (id: string) => {
      setRocks(rocks.filter(r => r.id !== id));
    };

    return (
      <div className={AD2_SETUP_SHELL_CLASS}>
        {/* LEFT PANEL */}
        <aside
          className={AD2_LEFT_PANEL_CLASS}
          style={{ background: AD2_LEFT_PANEL_GRADIENT }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
          <Ad2LeftGlow />

          <div className="relative flex items-center justify-between mb-14">
            <Ad2LogoMark />
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/45">
              Setup · 3/4
            </div>
          </div>

          <div className="relative flex-1 flex flex-col">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45 mb-7">
              03 · Goals
            </p>

            <h1 className={AD2_LEFT_H1_CLASS}>
              What will define this
              <br />
              <span
                style={{
                  background: AD2_HIGHLIGHT_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                quarter?
              </span>
            </h1>

            <p className="text-[15px] text-white/65 leading-relaxed max-w-md mb-8">
              Pick 3–7 quarterly priorities so important you'd be devastated to miss them.
              Aim for the end of {getCurrentQuarterLabel()}.
            </p>

            {/* AI context card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 max-w-md flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white/90">Zentrix AI is reading your context</div>
                <div className="text-xs text-white/45 mt-0.5">
                  Industry: {getIndustryDisplayLabel(foundationIndustry)} · {foundationTeamSize} team · suggestions ready
                </div>
              </div>
            </div>

            {/* AI suggested goals */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 max-w-md">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45 mb-2">
                AI · Suggested Goals
              </div>
              <div className="text-sm text-white/70 leading-relaxed">
                {getRecommendedGoalTexts(foundationIndustry, foundationTeamSize).join(' · ')}
              </div>
            </div>
          </div>

          <OnboardingProgressBar currentStep={3} />
        </aside>

        {/* RIGHT PANEL */}
        <main className={AD2_RIGHT_PANEL_CLASS}
          style={{ background: AD2_PANEL_BG }}>
          <div className="flex-1 flex flex-col max-w-[520px] mx-auto w-full">
            <div className="flex items-start justify-between gap-4 mb-1.5">
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900">
                Your {getCurrentQuarterLabel()} Goals
              </h2>
              <Ad2NeedHelpButton />
            </div>
            <p className="text-sm text-gray-500 mb-7">
              Add 3–7. You can edit them in your first L10 if your team disagrees.
            </p>

            {/* Goal rows */}
            <div className="space-y-3">
              {rocks.map((rock, idx) => {
                const dateLabel = rock.target_date
                  ? new Date(rock.target_date + 'T00:00:00').toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric',
                    })
                  : '';
                return (
                  <div
                    key={rock.id}
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5"
                  >
                    <span className="flex-shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-gray-900 text-white text-[11px] font-semibold">
                      G{idx + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-900 truncate">{rock.text}</span>
                    {dateLabel && (
                      <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-600 font-medium">
                        {dateLabel}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100">
                      <span className="w-4 h-4 rounded-full bg-gray-700 text-white text-[9px] font-semibold flex items-center justify-center">
                        {ownerInitial}
                      </span>
                      <span className="text-xs text-gray-700">{ownerFirstName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRock(rock.id)}
                      className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                      aria-label="Remove goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add another — popover */}
            <AddRockPopover
              defaultDate={getEndOfQuarter()}
              onAdd={({ text, target_date }) => {
                const nextNum = rocks.length + 1;
                setRocks(prev => [...prev, {
                  id: `r${nextNum}_${Date.now()}`,
                  text,
                  owner: ownerFirstName,
                  target_date,
                }]);
              }}
            />

          </div>

          <div className="flex items-center justify-between gap-4 pt-12 max-w-xl mx-auto w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoalsBack}
              className="h-12 px-10 text-sm font-medium bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleGoalsContinue}
              className="h-12 flex-1 text-sm font-medium text-white gap-2"
              style={{ background: AD2_PRIMARY_GRADIENT }}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Review phase UI — step 4 of 4 (design-only).
  if (phase === 'review') {
    const handleReviewBack = () => {
      phaseRef.current = 'goals';
      setPhase('goals');
    };

    const handleCreateWorkspace = async () => {
      setIsLoading(true);
      trackOnboardingEvent({
        source: pageSource,
        eventType: 'workspace_creation_started',
        step: 'review',
        userId: createdUserId || user?.id || null,
        email: formData.email,
      });
      try {
        // 0. Ensure we have an authenticated session. signUp() may return
        //    without a session when email confirmation is enabled on the
        //    project, in which case auth.uid() inside the RPC will be NULL
        //    and the profiles INSERT will fail with a not-null error.
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          if (!formData.email || !formData.password) {
            toast({
              title: 'Session expired',
              description: 'Please refresh and sign in again to finish setup.',
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }

          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password,
          });

          if (signInErr) {
            const msg = signInErr.message || '';
            const looksUnconfirmed = /not confirmed|email.*confirm/i.test(msg);
            toast({
              title: looksUnconfirmed ? 'Confirm your email first' : 'Could not sign you in',
              description: looksUnconfirmed
                ? 'Check your inbox for a confirmation email, click the link, then come back and try again.'
                : msg || 'Please try again.',
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }
        }

        // 1. Create the company (also handles profile, subscription, membership, etc.)
        const result = await createFirstCompany({
          companyName: foundationCompanyName.trim() || 'My Company',
        });

        if (!result.success || !result.company_id) {
          toast({ title: 'Could not create workspace', description: result.error || 'Please try again.', variant: 'destructive' });
          trackOnboardingEvent({
            source: pageSource,
            eventType: 'workspace_creation_failed',
            step: 'review',
            userId: createdUserId || user?.id || null,
            email: formData.email,
            metadata: { error: result.error || 'unknown' },
          });
          setIsLoading(false);
          return;
        }

        const companyId = result.company_id;
        const ownerUserId = createdUserId || user?.id;

        // Persist the foundation-step country answer onto the company row so
        // it's queryable as a first-class field (needed for Stripe billing /
        // tax once paid plans ship). Non-blocking — failures shouldn't stop
        // the user from reaching the dashboard.
        if (foundationCountry) {
          Promise.resolve(
            supabase.from('companies')
              .update({ country: foundationCountry })
              .eq('id', companyId)
          ).catch(err => logger.error('Failed to persist /ad2 country:', err));
        }

        // 2. Create the Leadership team. Required so metrics + rocks can attach.
        let teamId: string | null = null;
        if (ownerUserId) {
          try {
            const team = await createTeamWithMembers(
              'Leadership',
              companyId,
              ownerUserId,
              undefined,
              [],
              true,  // isLeadership
              false, // hasStrategicPlan
            );
            teamId = team.id;
          } catch (e) {
            logger.error('handleCreateWorkspace: team creation failed', e);
          }
        }

        // 3. Build the list of metrics to create from selected suggested + custom.
        if (teamId && ownerUserId) {
          const metricInserts: Array<{ name: string; target: number | undefined; unit: string; calculation: string }> = [];

          const recsForBuild = getRecommendedMetrics(foundationIndustry);
          selectedMetrics.forEach((id) => {
            const rec = recsForBuild.find(m => m.id === id);
            if (!rec) return;
            const overrides = metricOverrides[id];
            const targetStr = (overrides?.target ?? getDefaultMetricTarget(rec, foundationTeamSize) ?? '').trim();
            const target = targetStr === '' ? undefined : Number(targetStr);
            metricInserts.push({
              name: rec.defaultName,
              target: Number.isFinite(target as number) ? (target as number) : undefined,
              unit: overrides?.unit || rec.defaultUnit,
              calculation: overrides?.calculation || rec.defaultCalculation,
            });
          });

          customMetrics.forEach((cm) => {
            const target = cm.target.trim() === '' ? undefined : Number(cm.target);
            metricInserts.push({
              name: cm.name,
              target: Number.isFinite(target as number) ? (target as number) : undefined,
              unit: cm.unit,
              calculation: cm.calculation,
            });
          });

          // 4. Run metrics + rocks creation in parallel. Failures are logged but
          //    don't block the user from reaching the dashboard.
          const metricPromises = metricInserts.map((m) =>
            createMetric(
              m.name,
              m.unit,
              ownerUserId, // ownerId
              m.target,
              'greater_than_or_equal',
              ownerUserId, // userId
              teamId!,
              false,
              [],
              m.calculation,
            ).catch((e) => {
              logger.error('handleCreateWorkspace: metric creation failed', { name: m.name, error: e });
            }),
          );

          const rockInserts = rocks.map((r) => ({
            title: r.text,
            target_date: r.target_date || getEndOfQuarter(),
            team_id: teamId!,
            owner_id: ownerUserId,
            is_company_goal: true,
          }));

          const rocksPromise = rockInserts.length > 0
            ? supabase.from('team_goals').insert(rockInserts).then(({ error }) => {
                if (error) logger.error('handleCreateWorkspace: rocks insert failed', error);
              })
            : Promise.resolve();

          await Promise.all([...metricPromises, rocksPromise]);
        }

        // 5. Telemetry: workspace fully provisioned. Reset the onboarding
        //    session id so a future visit starts a fresh funnel.
        trackOnboardingEvent({
          source: pageSource,
          eventType: 'workspace_created',
          step: 'review',
          userId: ownerUserId || null,
          email: formData.email,
          metadata: {
            company_id: companyId,
            team_id: teamId,
            industry: foundationIndustry,
            team_size: foundationTeamSize,
            country: foundationCountry,
            selected_metrics_count: selectedMetrics.size,
            custom_metrics_count: customMetrics.length,
            goals_count: rocks.length,
          },
        });
        if (fromAdv2) {
          try {
            trackFBCompleteRegistration({
              email: formData.email,
              firstName: formData.fullName.split(' ')[0] || formData.fullName,
              userRole: 'not_specified',
              teamSize: foundationTeamSize,
              eosUsage: foundationEos,
              source: pageSource,
            });
            if (isFBMQLQualified({ teamSize: foundationTeamSize, eosUsage: foundationEos })) {
              trackFBMQL({
                email: formData.email,
                firstName: formData.fullName.split(' ')[0] || formData.fullName,
                source: pageSource,
                userRole: 'not_specified',
                teamSize: foundationTeamSize,
                eosUsage: foundationEos,
              });
            }
          } catch { /* noop */ }
        }
        // Note: don't reset the onboarding session id here — the post-creation
        // spotlight tour and FirstMeetingModal still need to fire telemetry
        // under the same session so a single visitor produces one lead row,
        // not two. The reset happens in Ad2SpotlightTour.handleModalChange
        // once the activation modal closes (the true end of /ad2 onboarding).

        try {
          trackFBCompleteRegistration({
            email: formData.email,
            firstName: formData.fullName.split(' ')[0] || formData.fullName,
            userRole: 'not_specified',
            teamSize: foundationTeamSize,
            eosUsage: foundationEos,
            source: pageSource,
          });
          if (isFBMQLQualified({ teamSize: foundationTeamSize, eosUsage: foundationEos })) {
            trackFBMQL({
              email: formData.email,
              firstName: formData.fullName.split(' ')[0] || formData.fullName,
              source: pageSource,
              userRole: 'not_specified',
              teamSize: foundationTeamSize,
              eosUsage: foundationEos,
            });
          }
        } catch { /* noop */ }

        // 6. Hand the user off. Mobile devices skip the desktop spotlight tour
        //    entirely (it targets /dashboard, /metrics, etc. which mobile users
        //    never see) and land directly on /m/tasks. Desktop users get the
        //    Metrics → Tasks → Goals → Meetings tour via onboarding_variant=d.
        if (isMobileOrTabletDevice()) {
          trackOnboardingEvent({
            source: pageSource,
            eventType: 'mobile_onboarding_completed',
            step: 'review',
            userId: ownerUserId || null,
            email: formData.email,
            metadata: { company_id: companyId, team_id: teamId },
          });
          // No FirstMeetingModal will close to do this for us on mobile, so
          // reset here — otherwise a future /ad or /ad2 visit in this tab
          // would append events to this completed lead.
          resetOnboardingSession();
          window.location.replace('/m/tasks');
        } else {
          try {
            sessionStorage.setItem('onboarding_variant', 'd');
            sessionStorage.removeItem('ad2_tour_step');
          } catch {
            // sessionStorage might be unavailable (private mode) — proceed anyway.
          }
          window.location.replace('/dashboard');
        }
      } catch (err) {
        logger.error('handleCreateWorkspace error', err);
        toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
        trackOnboardingEvent({
          source: pageSource,
          eventType: 'workspace_creation_failed',
          step: 'review',
          userId: createdUserId || user?.id || null,
          email: formData.email,
          metadata: { error: err instanceof Error ? err.message : String(err) },
        });
        setIsLoading(false);
      }
    };

    // Build display strings from prior step state, with sensible fallbacks
    const companyLine = [
      foundationCompanyName || 'Your company',
      foundationIndustry || 'SaaS / Software',
      foundationTeamSize,
    ].join(' · ');
    const totalMetrics = selectedMetrics.size + customMetrics.length;
    const metricsLine = totalMetrics === 0
      ? 'No metrics yet · you can add them later'
      : `${totalMetrics} ${totalMetrics === 1 ? 'metric' : 'metrics'} · ready to track`;
    const rocksLine = `${rocks.length} quarterly ${rocks.length === 1 ? 'Goal' : 'Goals'}`;

    const summaryRows = [
      { icon: Building2, primary: companyLine, label: 'Company' },
      { icon: BarChart3, primary: metricsLine, label: 'Scorecard' },
      { icon: Target, primary: rocksLine, label: 'Priorities' },
    ];

    const whatsNextItems = [
      { icon: Video, title: 'Run your first L10', subtitle: 'Solo or with your team — Zentrix AI captures everything live' },
      { icon: UserPlus, title: 'Invite your team', subtitle: "Once you've seen Zentrix work, bring them in" },
      { icon: BarChart3, title: 'Refine your scorecard', subtitle: 'Add more metrics or adjust targets anytime' },
    ];

    return (
      <div className={AD2_SETUP_SHELL_CLASS}>
        {/* LEFT PANEL */}
        <aside
          className={AD2_LEFT_PANEL_CLASS}
          style={{ background: AD2_LEFT_PANEL_GRADIENT }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
          <Ad2LeftGlow />

          <div className="relative flex items-center justify-between mb-14">
            <Ad2LogoMark />
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/45">
              Setup · 4/4
            </div>
          </div>

          <div className="relative flex-1 flex flex-col">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45 mb-7">
              04 · Workspace
            </p>

            <h1 className={AD2_LEFT_H1_CLASS}>
              Your workspace
              <br />
              is{' '}
              <span
                style={{
                  background: AD2_HIGHLIGHT_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                ready.
              </span>
            </h1>

            <p className="text-[15px] text-white/65 leading-relaxed max-w-md mb-8">
              Everything you set up will be waiting on your dashboard. From there you can run
              your first L10, invite your team, or refine your scorecard.
            </p>

            {/* What's next card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 max-w-md">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-medium">
                  What's next
                </span>
              </div>
              <div className="space-y-4">
                {whatsNextItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-white/70" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white/90">{item.title}</div>
                        <div className="text-xs text-white/45 mt-0.5">{item.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <OnboardingProgressBar currentStep={4} />
        </aside>

        {/* RIGHT PANEL */}
        <main className={AD2_RIGHT_PANEL_CLASS}
          style={{ background: AD2_PANEL_BG }}>
          <div className="flex-1 flex flex-col max-w-[520px] mx-auto w-full">
            <div className="flex items-start justify-between gap-4 mb-1.5">
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900">
                Review your workspace
              </h2>
              <Ad2NeedHelpButton />
            </div>
            <p className="text-sm text-gray-500 mb-7">One last look before we take you in.</p>

            {/* Summary rows */}
            <div className="space-y-3">
              {summaryRows.map((row) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.label}
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{row.primary}</div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mt-0.5">
                        {row.label}
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  </div>
                );
              })}
            </div>

            {/* Pro tip */}
            <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3.5 mt-4">
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed pt-1">
                <span className="font-semibold text-gray-900">Pro tip.</span> Run your first meeting right after this — Zentrix AI uses your scorecard and Goals as the agenda automatically.
              </p>
            </div>

            {/* Big create button */}
            <button
              type="button"
              onClick={handleCreateWorkspace}
              disabled={isLoading}
              className="w-full mt-6 py-5 rounded-xl text-white text-base font-semibold inline-flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: AD2_PRIMARY_GRADIENT }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" strokeWidth={3} />
              )}
              {isLoading ? 'Creating workspace…' : 'Create workspace'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleReviewBack}
              className="mx-auto mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to edit
            </button>
          </div>
        </main>
      </div>
    );
  }

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
            <img src={ZENTRIX_LOGO_SRC} alt="Zentrix" className="h-5 md:h-6" />
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

  // When arriving from /adv2b with all 4 fields pre-filled, auto-submit fires
  // immediately. Show a spinner instead of the signup form so the user never
  // sees a redundant second form.
  const adv2bHasFullPrefill =
    pageSource === 'adv2b' &&
    !!formData.email.trim() &&
    !!formData.fullName.trim() &&
    !!formData.phone.trim() &&
    !!formData.password.trim();

  const suppressForAutoSubmit = adv2bHasFullPrefill && phase === 'signup' && (!autoSubmittedRef.current || loading);

  if (suppressForAutoSubmit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-text-secondary">Creating your account…</p>
      </div>
    );
  }

  // Signup phase UI — mirrors /ad's centered hero + signup card layout, minus the
  // Company Name field (collected later in the Foundation step on /ad2).
  return (
    <div
      className="min-h-screen bg-white text-text-primary"
      style={{ colorScheme: 'light' }}
    >
      {/* Nav */}
      <nav className="w-full border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <Link to="/">
            <img src={ZENTRIX_LOGO_SRC} alt="Zentrix" className="h-7" />
          </Link>
        </div>
      </nav>

      {/* Hero section — hidden when arriving from /adv2 (the user already
          saw marketing copy on /adv2 and shouldn't see /ad2's hero again). */}
      {!fromAdv2 && (
      <section className="max-w-4xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 text-purple-700 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          Limited offer · Start free today
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary mb-6 leading-tight">
          Run your business
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            like a pro
          </span>
        </h1>

        <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
          The all-in-one operating system for modern businesses. Align your team, track progress, and achieve your goals faster.
        </p>

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
      )}

      {/* Signup card */}
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

      {/* Metrics bar — hidden when arriving from /adv2 */}
      {!fromAdv2 && (
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
      )}

      {/* Footer — hidden when arriving from /adv2 */}
      {!fromAdv2 && (
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>© 2024 Zentrix. All rights reserved.</div>
          <div className="flex gap-8">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
};

export default AdLanding2;
