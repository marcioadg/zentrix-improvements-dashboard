import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { robustSignOut } from '@/utils/authCleanup';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'pending_invitation';

const CompleteInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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
          source: 'complete-invitation'
        }));
      } catch {}

      // If already authenticated with matching email, let the unified flow handle it
      const { data: userResp } = await supabase.auth.getUser();
      const authedEmail = userResp.user?.email?.toLowerCase();
      if (userResp.user && authedEmail === emailLower) {
        navigate(`/invite?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailLower)}${companyIdParam ? `&company_id=${encodeURIComponent(companyIdParam)}` : ''}`, { replace: true });
        return;
      }

      // Otherwise, if logged in with a different email, sign out to allow account switch
      if (userResp.user && authedEmail !== emailLower) {
        logger.log('🔐 CompleteInvitation: Logged in as different email, signing out before redirect');
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
        logger.log('🚨 CompleteInvitation: Invalid or expired invitation token');
        window.location.assign(`${origin}/login?error=invalid_invitation&email=${encodeURIComponent(emailLower)}`);
        return;
      }

      const path = hasAccount ? 'login' : 'signup';
      window.location.assign(`${origin}/${path}?email=${encodeURIComponent(emailLower)}&invited=1&token=${encodeURIComponent(token)}${companyIdParam ? `&company_id=${encodeURIComponent(companyIdParam)}` : ''}`);
    };

    run();
  }, [navigate, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <section className="text-center px-6 py-16">
        <h1 className="text-2xl font-semibold mb-2">Completing Invitation…</h1>
        <p className="text-muted-foreground">Redirecting you to continue…</p>
      </section>
    </main>
  );
};

export default CompleteInvitation;
