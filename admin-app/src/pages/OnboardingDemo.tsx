import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';
import {
  Wand2,
  Compass,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const VARIANTS = [
  {
    id: 'a',
    internalVariant: 'b', // maps to onboarding_variant 'b' (Meeting Wizard)
    title: 'Variant A — Meeting Wizard',
    description:
      'A guided 3-step wizard that walks the user through creating their first meeting. Choose between a standard L10 or a fully custom agenda, then invite your team.',
    icon: Wand2,
    color: 'from-purple-500 to-pink-500',
    border: 'border-purple-500/30',
    steps: [
      'Choose meeting type (L10 or Custom)',
      'Configure agenda sections',
      'Success — start meeting or invite team',
    ],
  },
  {
    id: 'b',
    internalVariant: 'c', // maps to onboarding_variant 'c' (Spotlight Tour)
    title: 'Variant B — Spotlight Tour',
    description:
      'A 5-step guided spotlight tour that highlights key areas of the app. An overlay dims the page and a tooltip explains each feature as the user navigates through.',
    icon: Compass,
    color: 'from-amber-500 to-orange-500',
    border: 'border-amber-500/30',
    steps: [
      'Meetings — sidebar navigation',
      'Meeting Types — grid overview',
      'Weekly Meeting — start your first L10',
      'Tasks — action items tracked automatically',
      'Invite Your Team — bring everyone in',
    ],
  },
];

export const OnboardingDemo: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [launching, setLaunching] = useState<string | null>(null);
  const autoLaunched = useRef(false);

  // Auto-launch if ?variant= is in the URL
  useEffect(() => {
    if (autoLaunched.current || !user) return;
    const params = new URLSearchParams(window.location.search);
    const variant = params.get('variant');
    if (variant && ['a', 'b'].includes(variant)) {
      autoLaunched.current = true;
      handleLaunch(variant);
    }
  }, [user]);

  const handleLaunch = async (variantId: string) => {
    if (!user) return;
    setLaunching(variantId);

    const v = VARIANTS.find((x) => x.id === variantId);
    if (!v) return;

    try {
      // Reset onboarding completion in DB
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: null })
        .eq('id', user.id);

      // Set internal variant in sessionStorage
      sessionStorage.setItem('onboarding_variant', v.internalVariant);
      sessionStorage.removeItem('spotlight_tour_step');

      // Small delay so state settles before redirect
      await new Promise((r) => setTimeout(r, 200));

      // Redirect to dashboard to trigger the onboarding
      window.location.href = '/dashboard';
    } catch (err) {
      logger.error('Failed to launch demo variant:', err);
      setLaunching(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Onboarding Variants
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Preview and test the onboarding experiences
            </p>
          </div>
          {user ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Logged in — click any variant to launch it live
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <a
                href="/login"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Log in
              </a>{' '}
              to test variants live
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid gap-8">
          {VARIANTS.map((v) => {
            const Icon = v.icon;
            const isLaunching = launching === v.id;

            return (
              <div
                key={v.id}
                className={`rounded-xl border ${v.border} bg-card p-6 md:p-8 transition-shadow hover:shadow-lg`}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  {/* Icon + Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${v.color} flex items-center justify-center`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {v.title}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {v.description}
                    </p>

                    {/* Steps preview */}
                    <div className="space-y-1.5">
                      {v.steps.map((step, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-foreground/80">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0 md:pt-2">
                    {user ? (
                      <Button
                        onClick={() => handleLaunch(v.id)}
                        disabled={!!launching}
                        className="gap-2"
                      >
                        {isLaunching ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Launching...
                          </>
                        ) : (
                          <>
                            Launch Demo
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => navigate('/login')}
                        className="gap-2"
                      >
                        Log in to try
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* URL shortcuts */}
        <div className="mt-10 p-5 rounded-xl bg-muted/40 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Quick links (requires login)
          </h3>
          <div className="grid gap-2 text-sm text-muted-foreground font-mono">
            <div>
              <span className="text-foreground">/dashboard?variant=a</span>{' '}
              — Meeting Wizard
            </div>
            <div>
              <span className="text-foreground">/dashboard?variant=b</span>{' '}
              — Spotlight Tour
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
