import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { LogOut, RefreshCw } from 'lucide-react';
import OnboardingWizardV2 from '@/components/onboarding/OnboardingWizardV2';
import { OnboardingDraftProvider } from '@/contexts/OnboardingDraftContext';
import { createFirstCompany } from '@/services/onboardingService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const Onboarding: React.FC = () => {
  const [showVersionBanner, setShowVersionBanner] = useState(false);
  const {
    toast
  } = useToast();
  const {
    signOut
  } = useAuth();
  const {
    currentCompany,
    loading: companyLoading,
    refreshCompanies
  } = useMultiCompany();
  const navigate = useNavigate();

  // SAFETY NET: If an existing user lands on /onboarding (e.g. due to SSO redirect race condition),
  // detect their company once it loads and redirect them to /dashboard automatically.
  // This prevents users from being stuck on the onboarding page when they already have a company.
  useEffect(() => {
    if (!companyLoading && currentCompany) {
      logger.debug('Onboarding: Existing user detected (has company), redirecting to /dashboard', {
        companyId: currentCompany.id,
        companyName: currentCompany.name,
      });
      navigate('/dashboard', { replace: true });
    }
  }, [currentCompany, companyLoading, navigate]);

  const handleOnboardingComplete = async () => {
    // Save onboarding variant to profile if set (A/B test tracking)
    try {
      const variant = sessionStorage.getItem('onboarding_variant');
      if (variant && user) {
        await supabase.from('profiles').update({ onboarding_variant: variant }).eq('id', user.id);
        // Keep in sessionStorage — the dashboard needs it to show the right experience
      }
    } catch (err) {
      logger.warn('Failed to save onboarding variant to profile:', err);
    }

    // Refresh companies data and redirect to dashboard
    await refreshCompanies();
    navigate('/dashboard', {
      replace: true
    });
  };
  const handleInvitationAccepted = async () => {
    // Refresh companies data and redirect to dashboard
    await refreshCompanies();
    navigate('/dashboard', {
      replace: true
    });
  };
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', {
        replace: true
      });
    } catch (error) {
      logger.error('❌ Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleSkipOnboarding = () => {
    navigate('/dashboard', {
      replace: true
    });
  };
  return (
    <OnboardingDraftProvider>
      <div className="relative">
        {/* Version Banner - Small Popup */}
        {showVersionBanner && (
          <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  New version available
                </p>
                <p className="text-xs text-muted-foreground">
                  Please refresh to get the latest updates.
                </p>
                <Button 
                  onClick={() => window.location.reload()}
                  size="sm"
                  className="w-full"
                >
                  Refresh Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sign out button in top left */}
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>

        {/* Skip Onboarding - top right */}
        
        {/* Main Onboarding Wizard */}
        <OnboardingWizardV2 onComplete={handleOnboardingComplete} onInvitationAccepted={handleInvitationAccepted} createCompanyFn={createFirstCompany} initialStep={1} />
      </div>
    </OnboardingDraftProvider>
  );
};
export default Onboarding;