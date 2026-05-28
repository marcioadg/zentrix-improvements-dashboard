/**
 * MobileLogin - Dedicated mobile-app login screen (/m/login).
 *
 * Users running as an installed PWA (Add-to-Home-Screen / standalone display
 * mode) or in the native Capacitor app are routed here by:
 *   1. The v2 static landing's auth-gate when they hit `/` while not signed in.
 *   2. A safety-net redirect inside the regular /login page (in case they land
 *      there via a deep link or stale magic link).
 *
 * Unlike `/login`, this page does NOT bounce to the zentrix.one SSO domain.
 * iOS standalone PWAs treat any nav to a different origin as "leaving the app"
 * and open it in Safari, which is the exact failure mode we want to avoid.
 * Instead we sign in directly against Supabase via useAuth().signIn().
 */
import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';
import { logger } from '@/utils/logger';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const getFriendlyError = (raw: unknown): string => {
  const message = raw instanceof Error ? raw.message.toLowerCase() : '';
  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox.';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return 'Something went wrong. Please try again.';
};

export const MobileLogin: React.FC = () => {
  const { user, signIn, loading: authLoading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0d12]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    const next = new URLSearchParams(location.search).get('next');
    const dest = next || (isMobileOrTabletDevice() ? '/m/tasks' : '/dashboard');
    return <Navigate to={dest} replace />;
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        const friendly = getFriendlyError(signInError);
        setError(friendly);
        toast({ title: 'Sign in failed', description: friendly, variant: 'destructive' });
        return;
      }
      // useAuth side-effects + the Navigate above (re-renders with user) handle redirect.
    } catch (err) {
      logger.error('MobileLogin: unexpected signIn error', err);
      const friendly = getFriendlyError(err);
      setError(friendly);
      toast({ title: 'Sign in failed', description: friendly, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{ background: 'linear-gradient(180deg, #0c0d12 0%, #1a1d2e 100%)' }}
    >
      <Helmet>
        <title>Sign in · Zentrix OS</title>
        <meta name="theme-color" content="#0c0d12" />
      </Helmet>

      <main
        className="flex-1 flex flex-col px-6"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 32px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
        }}
      >
        <div className="mb-10 mt-6">
          <div
            className="text-[11px] tracking-[0.18em] uppercase text-white/55 mb-3"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
          >
            Zentrix OS
          </div>
          <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.025em]">
            Welcome back.
          </h1>
          <p className="text-[15px] text-white/60 mt-2 leading-snug">
            Sign in to pick up where you left off.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4" noValidate>
          <label className="block">
            <span className="block text-[12.5px] font-medium text-white/70 mb-1.5 tracking-wide uppercase">
              Email
            </span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full h-12 px-4 rounded-xl bg-white border border-white/15 text-[16px] text-[#0c0d12] placeholder-[#a1a1aa] focus:outline-none focus:border-[#6366f1] focus:bg-white transition-colors"
            />
          </label>

          <label className="block">
            <span className="block text-[12.5px] font-medium text-white/70 mb-1.5 tracking-wide uppercase">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 px-4 rounded-xl bg-white border border-white/15 text-[16px] text-[#0c0d12] placeholder-[#a1a1aa] focus:outline-none focus:border-[#6366f1] focus:bg-white transition-colors"
            />
          </label>

          <Link
            to="/forgot-password"
            className="self-end text-[13px] text-white/70 underline-offset-2 hover:underline mt-1"
          >
            Forgot password?
          </Link>

          {error && (
            <div className="rounded-xl px-4 py-3 bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[13.5px] text-[#ffb4b4]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-auto h-14 rounded-2xl text-[16px] font-semibold flex items-center justify-center gap-2 transition-opacity active:opacity-90 disabled:opacity-50"
            style={{ background: '#ffffff', color: '#0c0d12' }}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign in <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </>
            )}
          </button>

          <p className="text-center text-[13.5px] text-white/60 mt-2">
            New to Zentrix OS?{' '}
            <Link to="/signup" className="text-white underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
};

export default MobileLogin;
