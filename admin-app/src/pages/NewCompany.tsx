import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { LogOut, ArrowLeft } from 'lucide-react';
import { useReliableNavigation } from '@/utils/navigationUtils';
import { InvitationButton } from '@/components/invitations/InvitationButton';
import OnboardingWizardV2 from '@/components/onboarding/OnboardingWizardV2';
import { OnboardingDraftProvider } from '@/contexts/OnboardingDraftContext';
import { createAdditionalCompany } from '@/services/onboardingService';
import { VersionBanner } from '@/components/ui/VersionBanner';
import { logger } from '@/utils/logger';

const NewCompany: React.FC = () => {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const { refreshCompanies } = useMultiCompany();
  const navigate = useNavigate();
  const safeNavigate = useReliableNavigation(navigate);

  const handleGoBack = () => {
    // Go back to previous page, fallback to metrics dashboard
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      safeNavigate('/dashboard');
    }
  };

  const handleOnboardingComplete = async () => {
    logger.log('✅ NewCompany: Onboarding completed, redirecting to dashboard');
    // Refresh companies data and redirect to dashboard
    await refreshCompanies();
    navigate('/dashboard', { replace: true });
  };

  const handleInvitationAccepted = async () => {
    logger.log('✅ NewCompany: Invitation accepted, redirecting to dashboard');
    // Refresh companies data and redirect to dashboard
    await refreshCompanies();
    navigate('/dashboard', { replace: true });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      logger.error('❌ Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <OnboardingDraftProvider>
      <div className="relative">
        <VersionBanner />

        {/* Back button - positioned in top left */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Main Onboarding Wizard - starts from step 2 for new companies */}
        <OnboardingWizardV2 
          onComplete={handleOnboardingComplete} 
          excludeWelcomeStep={true} 
          createCompanyFn={createAdditionalCompany}
        />
      </div>
    </OnboardingDraftProvider>
  );
};

export default NewCompany;