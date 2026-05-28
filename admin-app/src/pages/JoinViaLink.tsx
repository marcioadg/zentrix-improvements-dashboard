import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowRight, Loader2, ShieldOff, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

type Phase = 'loading' | 'preview' | 'joining' | 'done' | 'invalid' | 'error';

interface PreviewData {
  valid: true;
  companyId: string;
  companyName: string;
  companyLogo: string | null;
  inviterName: string | null;
  defaultPermissionLevel: string;
}

interface InvalidPreview {
  valid: false;
  reason?: string;
}

const REASON_COPY: Record<string, string> = {
  not_found: "This invite link doesn't exist or has been removed.",
  revoked: 'This invite link has been revoked.',
  expired: 'This invite link has expired.',
  max_uses_reached: 'This invite link has reached its usage limit.',
  missing_token: 'No invite token was provided.',
  lookup_error: "We couldn't load this invite link. Please try again in a moment.",
};

export const JoinViaLink: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch preview once
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setPhase('invalid');
      setErrorMessage(REASON_COPY.missing_token);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('os-get-invite-link-preview', {
          body: { token },
        });
        if (cancelled) return;
        if (error) {
          logger.error('JoinViaLink: preview failed', error);
          setPhase('error');
          setErrorMessage(error.message || 'Could not load this invite link.');
          return;
        }
        if (data?.valid) {
          setPreview(data as PreviewData);
          setPhase('preview');
        } else {
          const reason = (data as InvalidPreview)?.reason;
          setPhase('invalid');
          setErrorMessage(REASON_COPY[reason || ''] || 'This invite link is no longer valid.');
        }
      } catch (err) {
        if (cancelled) return;
        logger.error('JoinViaLink: preview exception', err);
        setPhase('error');
        setErrorMessage('Network error. Please try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const performJoin = async () => {
    if (!token) return;
    setPhase('joining');
    try {
      const { data, error } = await supabase.functions.invoke('os-join-via-link', {
        body: { token },
      });
      if (error) {
        logger.error('JoinViaLink: join failed', error);
        setPhase('error');
        setErrorMessage(error.message || 'Could not join the workspace.');
        return;
      }
      if (!data?.success) {
        setPhase('error');
        setErrorMessage(data?.error || 'Could not join the workspace.');
        return;
      }
      setPhase('done');
      try {
        sessionStorage.removeItem('pendingJoinToken');
      } catch {}
      window.location.replace('/m/tasks');
    } catch (err) {
      logger.error('JoinViaLink: join exception', err);
      setPhase('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  // If user becomes authenticated while we're on the preview screen and we
  // stashed a token before bouncing to login, auto-join.
  useEffect(() => {
    if (phase !== 'preview' || !user || !token) return;
    let stashed: string | null = null;
    try {
      stashed = sessionStorage.getItem('pendingJoinToken');
    } catch {}
    if (stashed === token) {
      performJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, user, token]);

  const handleSignIn = () => {
    if (!token) return;
    try {
      sessionStorage.setItem('pendingJoinToken', token);
    } catch {}
    navigate(`/m/login?next=${encodeURIComponent(`/join/${token}`)}`);
  };

  const handleSignUp = () => {
    if (!token) return;
    try {
      sessionStorage.setItem('pendingJoinToken', token);
    } catch {}
    navigate('/signup');
  };

  const companyInitial = useMemo(
    () => (preview?.companyName ? preview.companyName.charAt(0).toUpperCase() : '?'),
    [preview?.companyName],
  );

  const isBusy = phase === 'loading' || phase === 'joining' || authLoading;

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{ background: 'linear-gradient(180deg, #0c0d12 0%, #1a1d2e 100%)' }}
    >
      <Helmet>
        <title>Join workspace · Zentrix OS</title>
        <meta name="theme-color" content="#0c0d12" />
      </Helmet>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {phase === 'loading' && (
            <div className="flex flex-col items-center gap-4 text-white/70">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Checking your invite…</p>
            </div>
          )}

          {phase === 'invalid' && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <ShieldOff className="h-5 w-5 text-white/70" />
              </div>
              <h1 className="text-[18px] font-semibold mb-1.5">Invite unavailable</h1>
              <p className="text-[13.5px] text-white/70">{errorMessage}</p>
              <Link
                to="/m/login"
                className="mt-6 inline-flex items-center justify-center w-full h-12 rounded-xl bg-white text-[#0c0d12] text-[14px] font-semibold"
              >
                Go to sign in
              </Link>
            </div>
          )}

          {phase === 'error' && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-300" />
              </div>
              <h1 className="text-[18px] font-semibold mb-1.5">Something went wrong</h1>
              <p className="text-[13.5px] text-white/70">{errorMessage}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex items-center justify-center w-full h-12 rounded-xl bg-white text-[#0c0d12] text-[14px] font-semibold"
              >
                Try again
              </button>
            </div>
          )}

          {(phase === 'preview' || phase === 'joining' || phase === 'done') && preview && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-[18px] font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #8b8ec5 0%, #6366f1 100%)',
                  }}
                >
                  {preview.companyLogo ? (
                    <img src={preview.companyLogo} alt="" className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    companyInitial
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] tracking-[0.18em] uppercase text-white/55"
                    style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                  >
                    You're invited
                  </div>
                  <div className="text-[17px] font-semibold truncate">{preview.companyName}</div>
                </div>
              </div>

              {preview.inviterName && (
                <p className="mt-4 text-[13px] text-white/70">
                  {preview.inviterName} invited you to join this workspace.
                </p>
              )}

              <p className="mt-2 text-[12px] text-white/45">
                You'll join as <span className="text-white/70">{preview.defaultPermissionLevel}</span>.
              </p>

              <div className="mt-6 space-y-2.5">
                {phase === 'done' ? (
                  <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[14px] font-medium">
                    <Check className="h-4 w-4" />
                    Joined — redirecting…
                  </div>
                ) : user ? (
                  <button
                    type="button"
                    onClick={performJoin}
                    disabled={isBusy}
                    className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-white text-[#0c0d12] text-[14px] font-semibold disabled:opacity-60"
                  >
                    {phase === 'joining' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Join {preview.companyName}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSignIn}
                      className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-white text-[#0c0d12] text-[14px] font-semibold"
                    >
                      Sign in to join
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSignUp}
                      className="inline-flex items-center justify-center w-full h-12 rounded-xl border border-white/15 text-white text-[14px] font-medium hover:bg-white/5"
                    >
                      Create an account
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default JoinViaLink;
