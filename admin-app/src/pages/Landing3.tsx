import React, { useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Shield, Gauge } from 'lucide-react';
import dashboardMockup from '@/assets/dashboard-mockup.png';
import { SchemaMarkup } from '@/components/seo/SchemaMarkup';
import { allSchemas } from '@/lib/schemaData';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { isActualMobileDevice, isMobileOrTabletDevice } from '@/utils/mobileDetection';
import { WhatsAppFloat } from '@/components/landing/WhatsAppFloat';
import { logger } from '@/utils/logger';
import { applyThemeColor } from '@/lib/themeColors';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
interface Landing3Props {
  variant?: 'b' | 'c';
}

const Landing3: React.FC<Landing3Props> = ({ variant }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const { currentCompany, loading: companyLoading } = useMultiCompany();

  // SYNCHRONOUS mobile check for initial render (prevents landing page flash)
  // Uses hardware detection (UA, touch) - NOT viewport width
  const isMobileSynchronous = isActualMobileDevice();
  
  // Apple compliance: Hide pricing on native mobile apps AND mobile-sized viewports (iPads, tablets)
  const isNativeMobileApp = isMobileOrTabletDevice();

  // PRIORITY 1: Password recovery (must happen before any auth checks)
  const hash = window.location.hash;
  const searchParams = window.location.search;
  const isRecoveryFlow = hash.includes("type=recovery") || searchParams.includes("type=recovery");

  if (isRecoveryFlow) {
    return <Navigate to={`/reset-password${hash}`} replace />;
  }

  // PRIORITY 1.2: Native app users (the iOS / Android build is a Despia wrapper
  // — confirmed via the literal `despia-iphone` User-Agent string that appears
  // in 30+ user_activity_sessions rows on prod). Despia sets a fixed UA suffix
  // that NO browser can ever produce, so this is a zero-false-positive signal.
  // We also keep a Capacitor probe in case a future build switches to that
  // (the bridge object is also impossible to spoof from a web page).
  // Signed-in users are handled by the existing PRIORITY 2 redirect below.
  if (!authLoading && !user) {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const _isDespiaApp = /despia/i.test(ua);
    const _capacitor = (window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor;
    const _isCapacitorApp = !!_capacitor?.isNativePlatform?.();
    if (_isDespiaApp || _isCapacitorApp) {
      return <Navigate to="/m/login" replace />;
    }
  }

  // PRIORITY 1.5: Ad traffic redirect — send users with ad params to /ad
  const urlParams = new URLSearchParams(window.location.search);
  const hasAdParams = urlParams.has('gclid') || urlParams.has('fbclid') || urlParams.has('utm_source') || urlParams.has('utm_campaign');
  if (hasAdParams && !user) {
    return <Navigate to={`/ad${window.location.search}`} replace />;
  }

  const signupPath = variant ? `/signup?variant=${variant}` : '/signup';

  // Always force Ocean Deep on the homepage regardless of user settings
  useEffect(() => {
    applyThemeColor('∿ Ocean Deep');
  }, []);

  // PRIORITY 2: Immediate mobile redirect for authenticated users
  // Uses user from AuthContext - no need for separate session check
  useEffect(() => {
    if (!authLoading && user && isMobileSynchronous) {
      logger.log('🚀 Landing3: Immediate mobile redirect for authenticated user');
      navigate('/m/tasks', { replace: true });
    }
  }, [authLoading, user, isMobileSynchronous, navigate]);

  // PRIORITY 3: Show loading while:
  // - Auth is still loading, OR
  // - Mobile device with authenticated user (waiting for redirect to complete)
  if (authLoading || (isMobileSynchronous && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // PRIORITY 4: Desktop/Web - Authenticated user
  if (user && !isMobile) {
    // Wait for company data to load
    if (companyLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    // User has no company → onboarding
    if (!currentCompany) {
      return <Navigate to="/onboarding" replace />;
    }

    // User has company → dashboard
    return <Navigate to="/dashboard" replace />;
  }
  const valueProps = [{
    icon: Zap,
    title: "Lightning Fast",
    description: "Deploy in minutes, not weeks"
  }, {
    icon: Shield,
    title: "AI That Understands Your Business",
    description: "Built for scale from day one"
  }, {
    icon: Gauge,
    title: "Real-Time Sync",
    description: "Everyone stays aligned"
  }];
  const metrics = [{
    value: "120hrs",
    label: "Monthly Time Saved"
  }, {
    value: "6",
    label: "Meetings Eliminated Weekly"
  }, {
    value: "67%",
    label: "Team Efficiency Increase"
  }];
  const testimonials = [{
    quote: "Clarity and alignment we were missing. Saving over 120 hours a month.",
    author: "Amanda Colaco",
    role: "General Manager at Wisenetix"
  }, {
    quote: "Entire team in alignment. Eliminated six unnecessary meetings every week.",
    author: "Iana Ferreira",
    role: "Head of Marketing at Wise Scale"
  }, {
    quote: "Chaos to clarity in 30 days. Team efficiency increased 67%.",
    author: "Marcio Gonçalves",
    role: "Founder & CEO at WiseVAs"
  }];
  return (
    <>
      <SchemaMarkup schemas={allSchemas} />
      <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Nav */}
      <nav className="border-b border-gray-100 relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
          <div className="text-xl md:text-2xl font-bold text-foreground">Zentrix OS</div>
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-secondary-foreground text-sm md:text-base">Sign in</Button>
            </Link>
            <Link to={signupPath}>
              <Button className="bg-popover hover:bg-card text-white text-sm md:text-base">
                {isNativeMobileApp ? 'Get Started' : 'Start Free'}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-12 md:pt-20 pb-12 md:pb-16 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-4xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight leading-[0.95]">
              The <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">operating system</span> for ambitious companies
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-secondary-foreground mb-8 md:mb-10 max-w-2xl">
              Set goals. Track progress. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 font-semibold">Achieve more.</span>
            </p>
            <Link to={signupPath}>
              <Button size="lg" className="bg-popover hover:bg-card text-white text-base md:text-lg px-6 md:px-10 h-12 md:h-16 gap-2">
                {isNativeMobileApp ? 'Get Started' : 'Get Started Free'}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            {!isNativeMobileApp && (
              <p className="text-sm text-muted-foreground mt-6">
                14-day free trial • No credit card required
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Product Mockup */}
      <section className="pb-16 md:pb-32 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 via-pink-100/20 to-orange-100/20 blur-3xl" />
            <img src={dashboardMockup} alt="Zentrix Dashboard" className="relative w-full rounded-xl shadow-2xl border border-border" loading="lazy" decoding="async" />
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-32 px-8 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-16">
            {valueProps.map((prop, index) => {
            const Icon = prop.icon;
            return <div key={index}>
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">
                    {index === 0 ? <>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">Lightning</span> Fast
                      </> : index === 1 ? <>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">AI</span> That Understands Your Business
                      </> : <>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Real-Time</span> <span className="text-foreground">Sync</span>
                      </>}
                  </h3>
                  <p className="text-lg text-secondary-foreground leading-relaxed">
                    {prop.description}
                  </p>
                </div>;
          })}
          </div>
        </div>
      </section>

      {/* Traction */}
      <section className="py-32 px-8 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-16">
            {metrics.map((metric, index) => <div key={index}>
                <div className={`text-6xl font-bold mb-3 ${index === 0 ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600' : 'text-foreground'}`}>
                  {metric.value}
                </div>
                <div className="text-lg text-secondary-foreground">
                  {metric.label}
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-8 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {testimonials.map((testimonial, index) => <div key={index} className="border-l-2 border-border pl-6">
                <p className="text-xl text-foreground mb-6 font-medium">
                  "{testimonial.quote}"
                </p>
                <div className="text-sm text-secondary-foreground">
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div>{testimonial.role}</div>
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Pricing - Hidden on native mobile apps for Apple compliance */}
      {!isNativeMobileApp && (
        <section className="py-32 px-8 border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-foreground mb-6">
                Simple pricing
              </h2>
              <p className="text-xl text-secondary-foreground">
                One plan. Everything included.
              </p>
            </div>
            
            <div className="border border-border rounded-2xl p-12 text-center">
              <div className="mb-8">
                <div className="text-6xl font-bold text-foreground mb-2">
                  $5
                  <span className="text-2xl text-secondary-foreground font-normal">/user</span>
                </div>
                <div className="text-secondary-foreground">per month</div>
              </div>
              
              <Link to={signupPath}>
                <Button size="lg" className="w-full max-w-xs bg-popover hover:bg-card text-white h-14 text-lg mb-6">
                  Start Free Trial
                </Button>
              </Link>
              
              <p className="text-sm text-muted-foreground">
                14-day free trial • No credit card required
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-40 px-8 border-t border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl md:text-7xl font-bold text-foreground mb-12 tracking-tight">
            Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">transform</span> your business?
          </h2>
          <Link to={signupPath}>
            <Button size="lg" className="bg-popover hover:bg-card text-white text-lg px-10 h-16 gap-2">
              {isNativeMobileApp ? 'Get Started' : 'Get Started Free'}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>© 2025 Zentrix</div>
          <div className="flex gap-8">
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link to="/science" className="hover:text-foreground transition-colors">The Science</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <a href="mailto:rodrigo@zentrixventures.com" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            <div>v1.0.3</div>
          </div>
        </div>
      </footer>
      <WhatsAppFloat />
    </div>
    </>
  );
};
export default Landing3;