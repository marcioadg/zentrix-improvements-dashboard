import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/utils/authCleanup';
import { RetroGrid } from '@/components/ui/retro-grid';
import { getLoginRedirectDestination } from '@/utils/mobileDetection';
import { logger } from '@/utils/logger';
import { safeStorage } from '@/utils/safeStorage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const Login = () => {
  // Redirect plain login visits to zentrix.one SSO — skip if invite/special params present.
  // Do this synchronously before any render to avoid flashing the old login form.
  const _params = new URLSearchParams(window.location.search);
  const _isInvite = _params.get('invited') === '1' || _params.get('token') || _params.get('company_id') || _params.get('c');
  if (!_isInvite) {
    const _next = _params.get('next') || _params.get('redirect') || '';
    // Despia App Store users stay in-app: route to /m/login (the dedicated
    // mobile login page) instead of redirecting cross-origin to zentrix.one
    // SSO. Without this, the SSO bounce-and-back trip leaves users stuck on
    // / because the static gate's auth-callback branch uses
    // window.location.replace() which Despia's WKWebView silently blocks.
    // The /despia/i match is unique to the Despia native wrapper's UA
    // (e.g. "despia-iphone") — no browser, PWA, or iframe can produce it.
    if (/despia/i.test(navigator.userAgent || '')) {
      const _mTarget = _next ? `/m/login?next=${encodeURIComponent(_next)}` : '/m/login';
      return <Navigate to={_mTarget} replace />;
    }
    const _nextParam = _next ? `&next=${encodeURIComponent(_next)}` : '';
    const _isStaging = window.location.hostname.includes('staging') || window.location.hostname.includes('vercel.app');
    const _authBase = import.meta.env.VITE_AUTH_BASE_URL || (_isStaging ? 'https://staging.zentrix.one' : 'https://zentrix.one');
    window.location.replace(`${_authBase}/login?redirect=os${_nextParam}`);
    // Return null while the browser navigates away — no flash
    return null;
  }

  const { user, session, signIn, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptingInvitation, setAcceptingInvitation] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
});

// Prefill email and stash pending invite (including token in consolidated key)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const emailParam = params.get('email');
  const companyIdParam = params.get('company_id') || params.get('c');
  const invited = params.get('invited');
  const token = params.get('token');
  if (emailParam) {
    setFormData(prev => ({ ...prev, email: emailParam }));
  }
  if (invited === '1' && emailParam) {
    // Write consolidated pending_invitation key so AuthCallback can pick it up after login
    try {
      sessionStorage.setItem('pending_invitation', JSON.stringify({
        token: token || undefined,
        email: emailParam.toLowerCase(),
        company_id: companyIdParam || undefined,
        saved_at: Date.now(),
        source: 'login-page',
      }));
    } catch {}
    if (companyIdParam) safeStorage.setItem('pending_invite_company_id', companyIdParam);
    safeStorage.setItem('pending_invite_email', emailParam);
  }
}, []);

  useEffect(() => {
    if (user && session) {
      // Clear password recovery flag for normal login
      try {
        sessionStorage.removeItem('password_recovery_initiated');
      } catch {}
      setError('');
      setLoading(false);
    }
  }, [user, session]);

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

  // CRITICAL: Wait for profile to load and check if account is deactivated before redirecting
  // This prevents deleted users from accessing the dashboard even briefly
  if (user && !acceptingInvitation && !isPasswordRecovery()) {
    // If profile is still loading, show loading state (prevent premature redirect)
    if (profileLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    // If profile is loaded and account is deactivated, block access
    if (profile?.role === 'inactive') {
      // Don't redirect - let ProtectedRoute handle this if user somehow gets to dashboard
      // But prevent navigation here to avoid brief dashboard flash
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">This account has been deleted and is no longer accessible.</p>
          </div>
        </div>
      );
    }

    // Profile is loaded and active - safe to redirect
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    const redirectTo = getLoginRedirectDestination(redirectParam);
    return <Navigate to={redirectTo} replace />;
  }

  const getErrorMessage = (error: any) => {
    if (!error) return '';
    
    // Check for deleted account error code (highest priority)
    if (error.code === 'ACCOUNT_DELETED' || error.status === 'deleted' || 
        (error.message && (
          error.message.includes('account has been deleted') ||
          error.message.includes('no longer accessible') ||
          error.message.toLowerCase().includes('deleted') && error.message.toLowerCase().includes('account')
        ))) {
      return 'This account has been deleted and is no longer accessible.';
    }
    
    if (error.message) {
      const message = error.message.toLowerCase();
      
      if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
        return 'Invalid email or password. Please check your credentials and try again.';
      }
      
      if (message.includes('email not confirmed')) {
        return 'Please check your email and click the confirmation link before signing in.';
      }
      
      if (message.includes('too many requests')) {
        return 'Too many login attempts. Please wait a few minutes before trying again.';
      }
      
      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your internet connection and try again.';
      }
      
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if this is an invitation flow BEFORE signIn — block Navigate redirect during async accept
      const params = new URLSearchParams(window.location.search);
      const isInvitedFlow = params.get('invited') === '1' || !!params.get('token');
      if (isInvitedFlow) {
        setAcceptingInvitation(true);
      }

      // Clean limbo state before signing in
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}

      const { data, error: signInError } = await signIn(formData.email, formData.password);

      // Check if we have a successful authentication
      if (!signInError && data?.user) {
        // If this is an invitation flow, call accept-invite NOW (with auth session active)
        if (isInvitedFlow) {
          try {
            // Read from URL params (most reliable) with localStorage as fallback
            const inviteToken = params.get('token') || undefined;
            const inviteEmail = params.get('email') || undefined;
            const inviteCompanyId = params.get('company_id') || params.get('c') || undefined;

            let lsToken: string | undefined, lsEmail: string | undefined, lsCompanyId: string | undefined;
            try {
              const raw = sessionStorage.getItem('pending_invitation');
              if (raw) {
                const parsed = JSON.parse(raw);
                // Discard if older than 15 minutes
                if (parsed.saved_at && (Date.now() - parsed.saved_at) > 900000) {
                  sessionStorage.removeItem('pending_invitation');
                } else {
                  lsToken = parsed.token;
                  lsEmail = parsed.email;
                  lsCompanyId = parsed.company_id;
                }
              }
            } catch (e) {
              logger.warn('Login: Failed to parse pending_invitation from sessionStorage', e);
            }

            const finalToken = inviteToken || lsToken;
            const finalEmail = (inviteEmail || lsEmail || data.user.email || '').toLowerCase();
            const finalCompanyId = inviteCompanyId || lsCompanyId || safeStorage.getItem('pending_invite_company_id') || undefined;

            if (finalEmail && (finalToken || finalCompanyId)) {
              logger.log('🎫 Login: Calling accept-invite after successful login', { email: finalEmail, hasToken: !!finalToken, hasCompanyId: !!finalCompanyId });
              const { data: acceptData, error: acceptError } = await supabase.functions.invoke('os-accept-invite', {
                body: { token: finalToken, email: finalEmail, companyId: finalCompanyId }
              });
              if (!acceptError && acceptData?.success) {
                try { sessionStorage.removeItem('pending_invitation'); } catch {}
                safeStorage.removeItem('pending_invite_company_id');
                safeStorage.removeItem('pending_invite_email');
                toast({ title: 'Invitation accepted! ✅', description: 'Welcome to the team!' });
                window.location.replace('/dashboard');
                return;
              } else {
                logger.warn('⚠️ Login: accept-invite failed after login', { acceptError, acceptData });
                setAcceptingInvitation(false);
              }
            } else {
              setAcceptingInvitation(false);
            }
          } catch (invErr) {
            logger.warn('⚠️ Login: exception during post-login accept-invite', invErr);
            setAcceptingInvitation(false);
          }
        }

        toast({
          title: "Welcome back!",
          description: "You have been successfully signed in.",
        });
        
        // Don't show error - let the useEffect handle the redirect
        setLoading(false);
        return;
      }
      
      // Only show error if there's actually an authentication failure
      if (signInError) {
        logger.error('❌ Login: Authentication failed:', signInError);
        const errorMessage = getErrorMessage(signInError);
        setError(errorMessage);
        
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
    } catch (error) {
      logger.error('❌ Login: Unexpected error during login:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Only set loading to false if we're not successfully authenticated
      if (!user || !session) {
        setLoading(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <Helmet>
        <title>Sign In | Zentrix OS</title>
        <meta name="description" content="Sign in to your Zentrix OS account to manage your business operating system." />
        <link rel="canonical" href="https://zentrixos.com/login" />
      </Helmet>
      
      {/* Background positioned properly with better visibility */}
      <RetroGrid className="absolute inset-0 opacity-50" />
      
      <div className="relative z-10 w-full max-w-sm bg-background/50 backdrop-blur-sm rounded-lg p-6 border border-border/50">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Link 
                to="/forgot-password" 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="h-10 border-input bg-background text-sm"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            disabled={loading || !formData.email.trim() || !formData.password.trim()}
          >
            {loading ? (
              <>
                <div className="mr-2 h-3 w-3 animate-spin rounded-full border border-b-transparent border-current" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-foreground hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
