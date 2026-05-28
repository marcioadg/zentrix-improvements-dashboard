import React from 'react';
import { useDemoOnboardingCompletion } from '@/hooks/useDemoOnboardingCompletion';

interface DemoOnboardingWrapperProps {
  children: React.ReactNode;
}

export const DemoOnboardingWrapper: React.FC<DemoOnboardingWrapperProps> = ({ children }) => {
  // Disabled demo hook to prevent infinite loops - using real data instead
  // useDemoOnboardingCompletion();
  
  return <>{children}</>;
};