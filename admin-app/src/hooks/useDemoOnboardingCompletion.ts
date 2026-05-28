import { useEffect, useState } from 'react';
import { useOnboardingTracker } from '@/hooks/useOnboardingTracker';

// Demo hook to simulate real app actions triggering onboarding completion
// In a real app, these would be connected to actual data/actions
export const useDemoOnboardingCompletion = () => {
  const [demoState, setDemoState] = useState({
    teamCreated: false,
    goalCreated: false,
    metricCreated: false,
    teamMemberInvited: false,
    meetingRun: false,
    orgChartCompleted: false,
    strategyDesigned: false,
  });

  // Use the tracker with current demo state
  useOnboardingTracker(demoState);

  // Demo function to simulate completing actions
  const simulateAction = (action: keyof typeof demoState) => {
    setDemoState(prev => ({
      ...prev,
      [action]: true
    }));
  };

  // Auto-complete steps for demo (you would remove this in real app)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Simulate creating a team after 3 seconds
      simulateAction('teamCreated');
      
      setTimeout(() => {
        // Simulate creating a goal after another 3 seconds
        simulateAction('goalCreated');
      }, 3000);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return {
    demoState,
    simulateAction,
  };
};