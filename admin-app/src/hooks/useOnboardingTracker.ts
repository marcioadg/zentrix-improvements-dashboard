import { useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { trackOnboardingStep } from '@/lib/analytics';

interface OnboardingTrackerConfig {
  // Define what actions trigger step completion
  teamCreated?: boolean;
  goalCreated?: boolean;
  metricCreated?: boolean;
  teamMemberInvited?: boolean;
  meetingRun?: boolean;
  orgChartCompleted?: boolean;
  strategyDesigned?: boolean;
}

export const useOnboardingTracker = (config: OnboardingTrackerConfig) => {
  const { completeStep } = useOnboarding();

  useEffect(() => {
    if (config.teamCreated) {
      completeStep('create-team');
      trackOnboardingStep('create-team');
    }
  }, [config.teamCreated, completeStep]);

  useEffect(() => {
    if (config.goalCreated) {
      completeStep('create-goal');
      trackOnboardingStep('create-goal');
    }
  }, [config.goalCreated, completeStep]);

  useEffect(() => {
    if (config.metricCreated) {
      completeStep('create-metric');
      trackOnboardingStep('create-metric');
    }
  }, [config.metricCreated, completeStep]);

  useEffect(() => {
    if (config.teamMemberInvited) {
      completeStep('invite-team');
      trackOnboardingStep('invite-team');
    }
  }, [config.teamMemberInvited, completeStep]);

  useEffect(() => {
    if (config.meetingRun) {
      completeStep('run-meeting');
      trackOnboardingStep('run-meeting');
    }
  }, [config.meetingRun, completeStep]);

  useEffect(() => {
    if (config.orgChartCompleted) {
      completeStep('org-chart');
    }
  }, [config.orgChartCompleted, completeStep]);

  useEffect(() => {
    if (config.strategyDesigned) {
      completeStep('strategy');
    }
  }, [config.strategyDesigned, completeStep]);
};

// Helper function to manually complete a step from anywhere in the app
export const useCompleteOnboardingStep = () => {
  const { completeStep } = useOnboarding();
  return completeStep;
};