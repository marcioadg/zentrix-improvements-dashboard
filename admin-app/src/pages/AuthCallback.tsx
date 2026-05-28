import React, { useEffect, useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackTeamMemberJoined } from '@/lib/statsigAnalytics';
import { logger } from '@/utils/logger';
import { checkUserNeedsOnboarding } from '@/services/onboardingService';

// Centralized, fragment-safe Supabase email verification handler
// All users (web and mobile browser) go through the same web onboarding flow
const AuthCallback: React.FC = () => {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const hash = (window.location.hash || '').replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(window.location.search);

        // Persist a copy to survive any re-mounts
        const keys = [
          'code',
          'access_token',
          'refresh_token',
          'token_type',
          'expires_in',
          'provider_token',
          'provider_refresh_token',
          'type'
        ];
        const merged = new URLSearchParams();
        let foundAny = false;
        for (const k of keys) {
          const v = hashParams.get(k) || searchParams.get(k);
          if (v) { merged.set(k, v); foundAny = true; }
        }
        try { if (foundAny) sessionStorage.setItem('auth_callback_params', merged.toString()); } catch {}

        const code = merged.get('code');
        const accessToken = merged.get('access_token');
        const refreshToken = merged.get('refresh_token');
        
        // Enhanced recovery detection - only check explicit recovery indicators
        const type = merged.get('type');
        const isPasswordRecovery = type === 'recovery' || 
                                  hash.includes('type=recovery') || 
                                  searchParams.get('type') === 'recovery' ||
                                  sessionStorage.getItem('password_recovery_initiated') === 'true';
        
        logger.log('🔐 AuthCallback: Recovery detection:', {
          type,
          hasAccessToken: !!accessToken,
          hasCode: !!code,
          isPasswordRecovery,
        });

        // recovery_sent_at is unreliable as a recovery signal (field persists after recovery is complete)
        // Only use explicit type=recovery or sessionStorage flag set during password reset initiation
        const finalIsRecovery = isPasswordRecovery;

        // Helper: attempt to auto-accept invitation if pending markers exist
        const attemptAcceptInvite = async (): Promise<boolean> => {
          try {
            // Read from consolidated key first
            let token: string | undefined;
            let email: string | undefined;
            let companyId: string | undefined;

            try {
              const raw = sessionStorage.getItem('pending_invitation');
              if (raw) {
                const parsed = JSON.parse(raw || '{}') as { token?: string; email?: string; company_id?: string; saved_at?: number };
                // Discard if older than 15 minutes
                if (parsed.saved_at && (Date.now() - parsed.saved_at) > 900000) {
                  sessionStorage.removeItem('pending_invitation');
                } else {
                  token = parsed.token || token;
                  email = parsed.email || email;
                  companyId = parsed.company_id || companyId;
                }
              }
            } catch (e) {
              logger.warn('AuthCallback: Failed to parse pending_invitation from sessionStorage', e);
            }

            // Fallback to individual keys
            token = token || sessionStorage.getItem('pending_invite_token') || undefined;
            email = (email || sessionStorage.getItem('pending_invite_email') || undefined)?.toLowerCase();
            companyId = companyId || sessionStorage.getItem('pending_invite_company_id') || undefined;

            // If nothing indicates an invitation flow, do nothing
            if (!email && !token && !companyId) return false;

            // Ensure we have a user email
            if (!email) {
              const { data: u } = await supabase.auth.getUser();
              email = u.user?.email?.toLowerCase();
            }
            if (!email) return false;

            const { data, error } = await supabase.functions.invoke('os-accept-invite', {
              body: { token, email, companyId }
            });

            if (error || !data?.success) {
              logger.warn('AuthCallback: accept-invite failed, trying RPC fallback', { error, data });
              
              // Fallback to RPC function
              try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('accept_company_invitation', {
                  p_company_id: companyId,
                  p_email: email
                });
                
                if (rpcError || !rpcData?.success) {
                  logger.warn('AuthCallback: RPC fallback also failed', { rpcError, rpcData });
                  return false;
                }
              } catch (rpcException) {
                logger.warn('AuthCallback: RPC fallback exception', rpcException);
                return false;
              }
            }

            // Cleanup markers so normal flow resumes next time
            try {
              sessionStorage.removeItem('pending_invitation');
              sessionStorage.removeItem('pending_invite_company_id');
              sessionStorage.removeItem('pending_invite_email');
              sessionStorage.removeItem('pending_invite_token');
            } catch {}

            // Track team member joined (non-blocking)
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user && companyId) {
                trackTeamMemberJoined({
                  user_id: user.id,
                  company_id: companyId,
                });
              }
            } catch (e) {
              logger.warn('Failed to track team member joined:', e);
            }

            // Success
            toast({ title: 'Invitation accepted! ✅', description: 'Redirecting to dashboard...' });
            window.location.replace('/dashboard');
            return true;
          } catch (e) {
            logger.warn('AuthCallback: exception while accepting invite', e);
            return false;
          }
        };

        // Handle PKCE code first
        if (code) {
          // CRITICAL: Sign out any existing user before processing email confirmation
          // This prevents cross-user contamination where User A's cached company data
          // could be loaded for User B after email confirmation
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession?.user) {
            logger.log('🔐 AuthCallback: Current user logged in:', currentSession.user.email);
            logger.log('🔐 AuthCallback: Signing out before processing email confirmation to prevent cross-user contamination');

            // Preserve pending invitation data before clearing storage
            let savedInvitation: string | null = null;
            try {
              savedInvitation = sessionStorage.getItem('pending_invitation');
            } catch {}

            await supabase.auth.signOut();

            // Clear any cached company data to ensure clean state
            try {
              localStorage.removeItem('current_company_id');
              sessionStorage.removeItem('pending_invite_company_id');
              sessionStorage.removeItem('pending_invite_email');
              sessionStorage.removeItem('pending_invite_token');
              sessionStorage.removeItem('pending_invitation');
            } catch (e) {
              logger.warn('AuthCallback: Could not clear storage:', e);
            }

            // Restore pending invitation so attemptAcceptInvite() can use it
            if (savedInvitation) {
              try {
                sessionStorage.setItem('pending_invitation', savedInvitation);
              } catch {}
            }
            
            // Small delay to ensure sign-out completes
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // If this is a password recovery, redirect to reset password page
          if (finalIsRecovery) {
            logger.log('🔐 AuthCallback: Password recovery flow detected, redirecting to reset-password');
            // Clear the flag since we're now handling the recovery
            try { sessionStorage.removeItem('password_recovery_initiated'); } catch {}
            window.location.replace('/reset-password');
            return;
          }

          // If this came from an invitation flow, accept invite and go to dashboard
          const accepted = await attemptAcceptInvite();
          if (accepted) return;

          toast({ title: 'Email confirmed! ✅', description: 'Your account has been verified successfully.' });
          const needsOnboarding1 = await checkUserNeedsOnboarding();
          window.location.replace(needsOnboarding1 ? '/onboarding' : '/dashboard');
          return;
        }

        // Handle implicit tokens
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;

          // If this is a password recovery, redirect to reset password page
          if (finalIsRecovery) {
            logger.log('🔐 AuthCallback: Password recovery flow detected, redirecting to reset-password');
            // Clear the flag since we're now handling the recovery
            try { sessionStorage.removeItem('password_recovery_initiated'); } catch {}
            window.location.replace('/reset-password');
            return;
          }

          const accepted = await attemptAcceptInvite();
          if (accepted) return;

          toast({ title: 'Email confirmed! ✅', description: 'Your account has been verified successfully.' });
          const needsOnboarding2 = await checkUserNeedsOnboarding();
          window.location.replace(needsOnboarding2 ? '/onboarding' : '/dashboard');
          return;
        }

        // No params? If already authenticated, check for recovery context
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session?.user) {
          // Check if this might be a recovery session
          if (finalIsRecovery) {
            logger.log('🔐 AuthCallback: Existing session with recovery context, redirecting to reset-password');
            try { sessionStorage.removeItem('password_recovery_initiated'); } catch {}
            window.location.replace('/reset-password');
            return;
          }

          // If session exists and this is an invited flow, accept invite
          const accepted = await attemptAcceptInvite();
          if (accepted) return;

          const needsOnboarding3 = await checkUserNeedsOnboarding();
          window.location.replace(needsOnboarding3 ? '/onboarding' : '/dashboard');
          return;
        }

        throw new Error('Missing confirmation parameters');
      } catch (e: any) {
        logger.error('AuthCallback error:', e);
        setError('Invalid or expired confirmation link.');
      }
    };
    run();
  }, [toast]);

  if (!error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-8">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <div className="text-sm text-muted-foreground">Confirming your account...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8">
      <div className="text-center space-y-4">
        <XCircle className="h-10 w-10 mx-auto text-destructive" />
        <div className="text-lg font-medium">Confirmation Error</div>
        <div className="text-sm text-muted-foreground">{error}</div>
      </div>
    </div>
  );
};

export default AuthCallback;
