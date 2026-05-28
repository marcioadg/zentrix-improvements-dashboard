import React, { useState, useEffect } from 'react';
import { MeetingWizardOnboarding } from './MeetingWizardOnboarding';
import { SpotlightTourOnboarding } from './SpotlightTourOnboarding';
import { Ad2SpotlightTour } from './Ad2SpotlightTour';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Checks sessionStorage for an onboarding variant (set during signup from /variantB or /variantC)
 * and renders the appropriate onboarding experience.
 *
 * - variant 'b' → MeetingWizardOnboarding (modal wizard)
 * - variant 'c' → SpotlightTourOnboarding (guided tour overlay)
 * - variant 'd' → Ad2SpotlightTour (Metrics → Tasks → Goals → Meetings tour
 *                                   for /ad2 graduates)
 * - no variant  → nothing (default FloatingOnboardingWidget handles it)
 */
export const OnboardingVariantRouter: React.FC = () => {
  const { user } = useAuth();

  // Initialize variant synchronously from sessionStorage to avoid async gaps
  // during AppLayout remounts (each route has its own AppLayout instance)
  const [variant, setVariant] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('onboarding_variant');
    } catch {
      return null;
    }
  });
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(() => {
    // If we already have a variant from sessionStorage, skip loading
    try {
      return !sessionStorage.getItem('onboarding_variant');
    } catch {
      return true;
    }
  });

  useEffect(() => {
    // If variant is already set from sessionStorage, just verify it's not completed
    if (variant && user) {
      supabase
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.onboarding_completed_at) {
            sessionStorage.removeItem('onboarding_variant');
            setVariant(null);
            setDismissed(true);
          }
          setLoading(false);
        });
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    const checkVariant = async () => {
      // Fallback: check DB in case session was lost (e.g. page refresh)
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_variant, onboarding_completed_at')
        .eq('id', user.id)
        .single();

      if (data?.onboarding_variant && !data?.onboarding_completed_at) {
        setVariant(data.onboarding_variant);
      }

      setLoading(false);
    };

    checkVariant();
  }, [user, variant]);

  const handleComplete = () => {
    sessionStorage.removeItem('onboarding_variant');
    setDismissed(true);
    logger.log('OnboardingVariantRouter: Variant onboarding completed');
  };

  const handleDismiss = () => {
    sessionStorage.removeItem('onboarding_variant');
    setDismissed(true);
    logger.log('OnboardingVariantRouter: Variant onboarding dismissed');
  };

  // If we have a variant from sessionStorage, render immediately (don't wait for async check)
  // The useEffect will dismiss if onboarding_completed_at is already set
  if (dismissed || !variant) return null;
  if (loading && !variant) return null;

  if (variant === 'b') {
    return <MeetingWizardOnboarding onComplete={handleComplete} onDismiss={handleDismiss} />;
  }

  if (variant === 'c') {
    return <SpotlightTourOnboarding onComplete={handleComplete} onDismiss={handleDismiss} />;
  }

  if (variant === 'd') {
    return <Ad2SpotlightTour onComplete={handleComplete} onDismiss={handleDismiss} />;
  }

  return null;
};
