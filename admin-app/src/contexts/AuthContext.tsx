import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, dataClient } from '@/integrations/supabase/client';
import { getAttribution } from '@/utils/marketingAttribution';
import { cleanupAuthState, robustSignOut } from '@/utils/authCleanup';
import { setRecoveryFlag, clearRecoveryFlags } from '@/utils/recoveryUtils';
import { logger } from '@/lib/logger';
import { trackLogin, trackSignUp, trackLogout } from '@/lib/analytics';
import { trackUserAccountCreated } from '@/lib/statsigAnalytics';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, fullName: string, referralSource?: string, userRole?: string, eosUsage?: string, investmentWillingness?: string, isDisqualified?: boolean, isMQL?: boolean, phone?: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (password: string) => Promise<any>;
  getEffectiveUser: () => User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const ssoProcessingRef = useRef(false); // true while setSession() is in-flight
  const userIdRef = useRef<string | null>(null);

  // Stable user setter - only update state if user ID actually changed
  // Prevents re-renders when Supabase fires SIGNED_IN on tab visibility change
  const setUserStable = useCallback((newUser: User | null) => {
    const newId = newUser?.id ?? null;
    if (newId !== userIdRef.current) {
      userIdRef.current = newId;
      setUser(newUser);
    }
  }, []);

  // Function to get effective user (will be overridden by impersonation context)
  const getEffectiveUser = useCallback((): User | null => {
    return user;
  }, [user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug('Auth state changed', { event, hasSession: !!session });

        // During SSO setSession(), Supabase may fire SIGNED_OUT first (replacing old session).
        // Ignore SIGNED_OUT while SSO is in-flight to avoid briefly clearing user state
        // which would cause ProtectedRoute to redirect to /login.
        if (event === 'SIGNED_OUT' && ssoProcessingRef.current) {
          logger.debug('[AuthContext] Ignoring SIGNED_OUT during SSO processing');
          return;
        }

        setSession(session);
        setUserStable(session?.user ?? null);
        setLoading(false);
        if (session?.access_token) {
          (dataClient as any).rest.headers['Authorization'] = `Bearer ${session.access_token}`;
          dataClient.realtime.setAuth(session.access_token);
        } else {
          delete (dataClient as any).rest.headers['Authorization'];
        }


        // Defer user_settings upsert logic and invitation auto-accept
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
           try {
            // Track user_account_created ONCE per user (first login after email confirmation)
            try {
              const accountCreatedKey = `statsig_account_created_${session.user.id}`;
              if (!localStorage.getItem(accountCreatedKey)) {
                // Check if user came from an invitation
                const invitedByCompanyId = localStorage.getItem('pending_invite_company_id') || undefined;
                const signupType = invitedByCompanyId ? 'invited' : 'organic';

                trackUserAccountCreated({
                  user_id: session.user.id,
                  email: session.user.email || undefined,
                  signup_source: 'organic',
                  signup_type: signupType,
                  invited_by_company_id: invitedByCompanyId,
                });
                localStorage.setItem(accountCreatedKey, 'true');
              }
            } catch (e) {
              logger.warn('Failed to track account creation event:', e);
            }

            try {
              const { data: existingSettings, error: fetchError } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              if (fetchError && fetchError.code === 'PGRST116') {
                await supabase
                  .from('user_settings')
                  .insert({
                    user_id: session.user.id,
                    vote_limit: 25,
                    highlight_current_week: false,
                    show_current_week: false,
                    week_start_day: 'monday'
                  });
              }
            } catch (error) { logger.warn('Failed to upsert user_settings:', error); }

            // Auto-accept pending invitation via edge function first (token/company-based)
            // Only run when current URL indicates an invite context to avoid stale localStorage
            const url = new URL(window.location.href);
            const sp = url.searchParams;
            const path = url.pathname;
            const inviteContext = sp.get('invited') === '1' || !!sp.get('token') ||
              path.includes('/accept-invitation') || path.includes('/complete-invitation') ||
              ((path.includes('/login') || path.includes('/signup')) && sp.get('invited') === '1');

            if (inviteContext) {
              try {
                const pendingCompanyId = localStorage.getItem('pending_invite_company_id') || undefined;
                const pendingEmail = (localStorage.getItem('pending_invite_email') || session.user.email || '') as string;
                const pendingToken = localStorage.getItem('pending_invite_token') || undefined;
                if (pendingEmail && (pendingCompanyId || pendingToken)) {
                  logger.debug('Attempting auto-accept via edge function');
                  const { data: acceptEdgeData, error: acceptEdgeErr } = await supabase.functions.invoke('os-accept-invite', {
                    body: { companyId: pendingCompanyId, email: pendingEmail, token: pendingToken }
                  });
                  if (acceptEdgeErr) throw acceptEdgeErr;
                  logger.debug('Auto-accepted invitation via edge function');
                  localStorage.removeItem('pending_invite_company_id');
                  localStorage.removeItem('pending_invite_email');
                  localStorage.removeItem('pending_invite_token');
                }
              } catch (edgeErr) {
                logger.debug('Auto-accept via edge failed, attempting RPC fallback');
                try {
                  const pendingCompanyId = localStorage.getItem('pending_invite_company_id');
                  const pendingEmail = localStorage.getItem('pending_invite_email') || session.user.email || '';
                  if (pendingCompanyId && pendingEmail) {
                    const { data: acceptResult, error: acceptError } = await supabase.rpc('accept_company_invitation', {
                      p_company_id: pendingCompanyId,
                      p_email: pendingEmail,
                    });
                    if (acceptError) {
                      logger.error('Auto-accept invitation via RPC failed:', acceptError);
                    } else {
                      logger.debug('Auto-accepted invitation via RPC');
                      localStorage.removeItem('pending_invite_company_id');
                      localStorage.removeItem('pending_invite_email');
                    }
                  }
                } catch (err) {
                  logger.debug('Auto-accept invitation error (non-blocking)');
                }
              }
            } else {
              logger.debug('Skipping auto-accept: no invite context in URL');
            }
           } catch (error) {
             logger.error('Unexpected error in post-sign-in initialization:', error);
           }
          }, 0);
        }
      }
    );

    // Check for SSO company_name in URL hash (from app switcher)
    const ssoHash = window.location.hash;
    if (ssoHash && ssoHash.includes('company_name')) {
      const ssoParams = new URLSearchParams(ssoHash.substring(1));
      const ssoCompanyName = decodeURIComponent(ssoParams.get('company_name') || '');
      if (ssoCompanyName) {
        localStorage.setItem('zentrix_active_company_name', ssoCompanyName);
        logger.debug('[AuthContext] SSO company_name set:', ssoCompanyName);
      }
    }

    // Check for SSO hash token (from zentrix.one SSO redirect)
    // SKIP recovery flows — let ResetPassword page handle those directly
    const hash = window.location.hash;
    const isRecoveryHash = hash.includes('type=recovery');
    const hasSSOTokens = hash && hash.includes('access_token') && !isRecoveryHash;

    if (hasSSOTokens) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      // Clear hash before async work so it can't be re-processed
      window.history.replaceState(null, '', window.location.pathname);

      if (accessToken && refreshToken) {
        logger.debug('[AuthContext] SSO hash detected, calling setSession explicitly');
        ssoProcessingRef.current = true; // block SIGNED_OUT during setSession
        // Explicitly set the session. onAuthStateChange fires SIGNED_IN which sets
        // loading=false + user. We do NOT call getSession() in this path to avoid
        // a race where getSession() resolves before setSession() completes.
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(() => { ssoProcessingRef.current = false; })
          .catch((err) => {
            ssoProcessingRef.current = false;
            logger.error('[AuthContext] SSO setSession failed, falling back to getSession:', err);
            // Fallback: if setSession fails, try reading whatever session exists
            supabase.auth.getSession().then(({ data: { session } }) => {
              setSession(session);
              setUserStable(session?.user ?? null);
              setLoading(false);
            }).catch(() => {
              setSession(null);
              setUserStable(null);
              setLoading(false);
            });
          });
        // onAuthStateChange SIGNED_IN will call setLoading(false). Return early.
        return () => subscription.unsubscribe();
      }
    }

    // Normal flow (no SSO hash): read session from localStorage via getSession()
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        logger.debug('[AuthContext] Initial session check completed', { hasSession: !!session, hasError: !!error });
        setSession(session);
        setUserStable(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        logger.error('[AuthContext] getSession failed:', err);
        setSession(null);
        setUserStable(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    logger.debug('Starting sign in process');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        logger.error('Sign in failed:', error);
      } else if (data?.user) {
        logger.debug('Sign in successful, checking if account is deactivated');

        // CRITICAL: Check if account is deactivated (role='inactive')
        // This prevents deleted users from accessing the application
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            logger.warn('Could not fetch profile during sign in check:', profileError);
            // Continue - will be checked by ProtectedRoute
          } else if (profile?.role === 'inactive') {
            logger.warn('Account is deactivated, signing out immediately');

            // Sign out immediately to prevent access
            await supabase.auth.signOut({ scope: 'global' });

            // Return a specific error code to identify deleted accounts
            return {
              data: null,
              error: {
                message: 'This account has been deleted and is no longer accessible.',
                code: 'ACCOUNT_DELETED',
                status: 'deleted'
              } as any
            };
          }
        } catch (profileCheckError) {
          logger.error('Error checking profile status:', profileCheckError);
          // Continue - will be checked by ProtectedRoute
        }

        logger.debug('Account status check passed');
        trackLogin('email');
        logger.debug('Waiting for auth state update');
        const waitResult = await new Promise((resolve) => {
          let attemptCount = 0;
          const checkAuth = () => {
            attemptCount++;
            if (session || attemptCount >= 10) {
              resolve({ session, attemptCount });
            } else {
              setTimeout(checkAuth, 200);
            }
          };
          checkAuth();
        }) as { session: Session | null; attemptCount: number };
        logger.debug('Auth state update completed');
      }
      return { data, error };
    } catch (unexpectedError) {
      logger.error('Unexpected error during sign in:', unexpectedError);
      return {
        data: null,
        error: {
          message: 'An unexpected error occurred during sign in',
          originalError: unexpectedError
        }
      };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, referralSource?: string, userRole?: string, eosUsage?: string, investmentWillingness?: string, isDisqualified?: boolean, isMQL?: boolean, phone?: string) => {
    logger.debug('Starting sign up process');
    const isEmbeddedAdminApp = import.meta.env.BASE_URL === '/admin-bundle/';
    const redirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL
      || (isEmbeddedAdminApp
        ? `${window.location.origin}/auth/callback?app=os`
        : `https://zentrix.one/auth/callback?app=os`);
    try {
      const metadata: Record<string, any> = { full_name: fullName };
      if (phone) {
        metadata.phone = phone;
      }
      if (referralSource) {
        metadata.referral_source = referralSource;
      }
      if (userRole) {
        metadata.user_role = userRole;
      }
      if (eosUsage) {
        metadata.eos_usage = eosUsage;
      }
      if (investmentWillingness) {
        metadata.investment_willingness = investmentWillingness;
      }
      if (isDisqualified !== undefined) {
        metadata.is_disqualified = isDisqualified;
      }
      if (isMQL !== undefined) {
        metadata.is_mql = isMQL;
      }
      // Attach marketing attribution to user metadata
      const attribution = getAttribution();
      if (attribution) {
        metadata.marketing_attribution = {
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
        };
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl, data: metadata },
      });
      if (error) {
        logger.error('Sign up failed:', error);
      } else {
        logger.debug('Sign up successful');
        trackSignUp('email');
        // Wait 500ms to ensure GA4 receives the event before any redirect
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return { data, error };
    } catch (unexpectedError) {
      logger.error('Unexpected error during sign up:', unexpectedError);
      return {
        data: null,
        error: {
          message: 'An unexpected error occurred during sign up',
          originalError: unexpectedError
        }
      };
    }
  };

  const signOut = async () => {
    logger.debug('Starting sign out process');
    trackLogout();
    await robustSignOut();
    // Force navigation to login page
    window.location.href = '/login';
  };

  const resetPassword = async (email: string) => {
    logger.debug('Initiating password reset');
    const isEmbeddedAdminApp = import.meta.env.BASE_URL === '/admin-bundle/';
    const redirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL
      ? `${import.meta.env.VITE_AUTH_REDIRECT_URL.replace('/auth/callback', '/reset-password')}`
      : (isEmbeddedAdminApp
        ? `${window.location.origin}/reset-password`
        : `https://zentrixos.com/reset-password`);

    // Set flag to help AuthCallback detect this is a recovery flow
    setRecoveryFlag();

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      if (error) {
        logger.error('Reset password error:', error);
        // Clear flag on error
        clearRecoveryFlags();
      } else {
        logger.debug('Reset password email sent successfully');
      }
      return { data, error };
    } catch (error) {
      logger.error('Unexpected error in resetPassword:', error);
      // Clear flag on error
      clearRecoveryFlags();
      return { data: null, error: error as any };
    }
  };

  const updatePassword = async (password: string) => {
    logger.debug('Updating password');
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        logger.error('Update password error:', error);
      } else {
        logger.debug('Password updated successfully');
      }
      return { data, error };
    } catch (error) {
      logger.error('Unexpected error in updatePassword:', error);
      return { data: null, error: error as any };
    }
  };

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    getEffectiveUser,
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
