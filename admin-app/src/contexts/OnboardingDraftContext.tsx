import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { logger } from '@/utils/logger';

interface TeamData {
  id?: string;
  name: string;
  isLeadership?: boolean;
}

interface MemberData {
  email: string;
  permissionLevel: string;
  teamIds: string[];
}

interface OnboardingDraft {
  companyName: string;
  teams: TeamData[];
  members: MemberData[];
  currentStep: number;
  leadershipDismissed: boolean;
}

interface OnboardingDraftContextType {
  draft: OnboardingDraft;
  updateCompanyName: (name: string) => void;
  updateTeams: (teams: TeamData[]) => void;
  updateMembers: (members: MemberData[]) => void;
  updateCurrentStep: (step: number) => void;
  setLeadershipDismissed: (dismissed: boolean) => void;
  clearDraft: () => void;
  hasDraft: boolean;
}

const STORAGE_KEY = 'onboarding_draft';

const defaultDraft: OnboardingDraft = {
  companyName: '',
  teams: [],
  members: [],
  currentStep: 1,
  leadershipDismissed: false,
};

const OnboardingDraftContext = createContext<OnboardingDraftContextType | undefined>(undefined);

interface OnboardingDraftProviderProps {
  children: ReactNode;
}

export const OnboardingDraftProvider: React.FC<OnboardingDraftProviderProps> = ({ children }) => {
  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    // Load from sessionStorage on initialization
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        logger.error('Error loading draft from storage:', error);
      }
    }
    return defaultDraft;
  });

  // Save to sessionStorage whenever draft changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch (error) {
        logger.error('Error saving draft to storage:', error);
      }
    }
  }, [draft]);

  const updateCompanyName = (name: string) => {
    setDraft(prev => ({ ...prev, companyName: name }));
  };

  const updateTeams = (teams: TeamData[]) => {
    setDraft(prev => ({ ...prev, teams }));
  };

  const updateMembers = (members: MemberData[]) => {
    setDraft(prev => ({ ...prev, members }));
  };

  const updateCurrentStep = (step: number) => {
    setDraft(prev => ({ ...prev, currentStep: step }));
  };

  const setLeadershipDismissed = (dismissed: boolean) => {
    setDraft(prev => ({ ...prev, leadershipDismissed: dismissed }));
  };

  const clearDraft = () => {
    setDraft(defaultDraft);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const hasDraft = draft.companyName.trim() !== '' || draft.teams.length > 0 || draft.members.length > 0;

  const value: OnboardingDraftContextType = {
    draft,
    updateCompanyName,
    updateTeams,
    updateMembers,
    updateCurrentStep,
    setLeadershipDismissed,
    clearDraft,
    hasDraft,
  };

  return (
    <OnboardingDraftContext.Provider value={value}>
      {children}
    </OnboardingDraftContext.Provider>
  );
};

export const useOnboardingDraft = () => {
  const context = useContext(OnboardingDraftContext);
  if (context === undefined) {
    throw new Error('useOnboardingDraft must be used within an OnboardingDraftProvider');
  }
  return context;
};
