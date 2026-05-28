import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { robustSignOut } from '@/utils/authCleanup';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';
const STORAGE_KEY = 'pending_invitation';

const AcceptInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshCompanies } = useMultiCompanyAccess();

  useEffect(() => {
    const run = async () => {
      const token = (searchParams.get('token') || '').trim();
      const emailParam = (searchParams.get('email') || '').trim();
      const companyIdParam = (searchParams.get('company_id') || '').trim();

      const origin = window.location.origin;

      if (!token || !emailParam) {
        navigate('/login', { replace: true });
        return;
      }

      const emailLower = emailParam.toLowerCase();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          token,
          email: emailLower,
          company_id: companyIdParam || null,
          saved_at: Date.now(),
          source: 'accept-invitation'
        }));
      } catch {}

      const { data: userResp } = await supabase.auth.getUser();
      const authedEmail = userResp.user?.email?.toLowerCase();

      if (userResp.user && authedEmail === emailLower) {
        try {
          const { data, error } = await supabase.functions.invoke('os-accept-invite', { body: { token, email: emailLower, companyId: companyIdParam || undefined } });
          if (error || !data?.success) {
            logger.warn('AcceptInvitation: accept-invite failed, trying RPC fallback', { error, data });
            
            // Fallback to RPC function
            try {
              const { data: rpcData, error: rpcError } = await supabase.rpc('accept_company_invitation', {
                p_company_id: companyIdParam,
                p_email: emailLower
              });
              
              if (rpcError || !rpcData?.success) {
                logger.warn('AcceptInvitation: RPC fallback also failed', { rpcError, rpcData });
                toast({ title: 'Could not accept invitation.', variant: 'destructive' });
                return;
              }
            } catch (rpcException) {
              logger.warn('AcceptInvitation: RPC fallback exception', rpcException);
              toast({ title: 'Failed to accept invitation.', variant: 'destructive' });
              return;
            }
          }
          
          try {
            await Promise.all([
              refreshCompanies(),
              queryClient.invalidateQueries({ queryKey: ['profiles'] }),
            ]);
          } catch (e) {
            logger.warn('AcceptInvitation: post-accept refresh failed (non-blocking)', e);
          }
          navigate('/dashboard', { replace: true });
          return;
        } catch (e) {
          logger.warn('AcceptInvitation: accept-invite exception', e);
          toast({ title: 'Failed to accept invitation.', variant: 'destructive' });
          return;
        }
      }

      // Not authenticated or different email: send to appropriate auth flow
      if (userResp.user && authedEmail !== emailLower) {
        logger.log('🔐 AcceptInvitation: Logged in as different email, signing out before redirect');
        try { await robustSignOut(); } catch {}
      }
      // Use secure RPC to check if user exists for invitation
      const { data: inviteInfo } = await supabase.rpc('user_exists_for_invite', { 
        p_invitation_token: token, 
        p_user_email: emailLower 
      });
      
      // Default to signup if token is invalid or user doesn't exist
      const hasAccount = inviteInfo && inviteInfo.length > 0 ? inviteInfo[0].user_exists : false;
      const tokenValid = inviteInfo && inviteInfo.length > 0 ? inviteInfo[0].token_valid : false;
      
      // If token is invalid, redirect to login with error
      if (!tokenValid) {
        logger.log('🚨 AcceptInvitation: Invalid or expired invitation token');
        window.location.assign(`${origin}/login?error=invalid_invitation&email=${encodeURIComponent(emailLower)}`);
        return;
      }

      if (hasAccount) {
        window.location.assign(`${origin}/login?email=${encodeURIComponent(emailLower)}&invited=1&token=${encodeURIComponent(token)}${companyIdParam ? `&company_id=${encodeURIComponent(companyIdParam)}` : ''}`);
      } else {
        window.location.assign(`${origin}/signup?email=${encodeURIComponent(emailLower)}&invited=1&token=${encodeURIComponent(token)}${companyIdParam ? `&company_id=${encodeURIComponent(companyIdParam)}` : ''}`);
      }
    };

    run();
  }, [navigate, searchParams, refreshCompanies]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <section className="text-center px-6 py-16">
        <h1 className="text-2xl font-semibold mb-2">Accepting Invitation…</h1>
        <p className="text-muted-foreground">Redirecting you to continue…</p>
      </section>
    </main>
  );
};

export default AcceptInvitation;
