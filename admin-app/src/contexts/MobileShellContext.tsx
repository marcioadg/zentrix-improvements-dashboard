import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface MobileShellContextValue {
  // FAB modal states
  showTaskModal: boolean;
  showIssueModal: boolean;
  showGoalModal: boolean;
  showMetricModal: boolean;
  showHeadlineModal: boolean;
  // Setters
  setShowTaskModal: (show: boolean) => void;
  setShowIssueModal: (show: boolean) => void;
  setShowGoalModal: (show: boolean) => void;
  setShowMetricModal: (show: boolean) => void;
  setShowHeadlineModal: (show: boolean) => void;
  // Openers
  openTaskModal: () => void;
  openIssueModal: () => void;
  openGoalModal: () => void;
  openMetricModal: () => void;
  openHeadlineModal: () => void;
  // Close all
  closeAll: () => void;
  // Shared team selection (persists across pages)
  selectedTeamId: string;
  setSelectedTeamId: (teamId: string) => void;
  // Company switcher visibility (hides bottom nav when open)
  isCompanySwitcherOpen: boolean;
  setIsCompanySwitcherOpen: (open: boolean) => void;
}

const MobileShellContext = createContext<MobileShellContextValue | null>(null);

export const useMobileShell = () => {
  const context = useContext(MobileShellContext);
  if (!context) {
    throw new Error('useMobileShell must be used within MobileShellProvider');
  }
  return context;
};

// Safe version that doesn't throw - returns null if outside provider
export const useMobileShellSafe = () => {
  return useContext(MobileShellContext);
};

interface MobileShellProviderProps {
  children: React.ReactNode;
}

export const MobileShellProvider: React.FC<MobileShellProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // FAB modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [showHeadlineModal, setShowHeadlineModal] = useState(false);

  // Company switcher visibility
  const [isCompanySwitcherOpen, setIsCompanySwitcherOpen] = useState(false);

  // Shared team selection
  const [selectedTeamId, setSelectedTeamIdState] = useState<string>('');

  // Load preferred team from user settings
  useEffect(() => {
    if (!user?.id) return;

    const loadPreferredTeam = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('preferred_tasks_team_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data?.preferred_tasks_team_id) {
          setSelectedTeamIdState(data.preferred_tasks_team_id);
        }
      } catch (err) {
        logger.error('Failed to load preferred team:', err);
      }
    };

    loadPreferredTeam();
  }, [user?.id]);

  // Persist team selection
  const setSelectedTeamId = useCallback(async (teamId: string) => {
    setSelectedTeamIdState(teamId);
    
    if (user?.id) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            preferred_tasks_team_id: teamId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      } catch (err) {
        logger.error('Failed to persist preferred team:', err);
      }
    }
  }, [user?.id]);

  const openTaskModal = useCallback(() => setShowTaskModal(true), []);
  const openIssueModal = useCallback(() => setShowIssueModal(true), []);
  const openGoalModal = useCallback(() => setShowGoalModal(true), []);
  const openMetricModal = useCallback(() => setShowMetricModal(true), []);
  const openHeadlineModal = useCallback(() => setShowHeadlineModal(true), []);

  const closeAll = useCallback(() => {
    setShowTaskModal(false);
    setShowIssueModal(false);
    setShowGoalModal(false);
    setShowMetricModal(false);
    setShowHeadlineModal(false);
  }, []);

  const value = useMemo(() => ({
    showTaskModal,
    showIssueModal,
    showGoalModal,
    showMetricModal,
    showHeadlineModal,
    setShowTaskModal,
    setShowIssueModal,
    setShowGoalModal,
    setShowMetricModal,
    setShowHeadlineModal,
    openTaskModal,
    openIssueModal,
    openGoalModal,
    openMetricModal,
    openHeadlineModal,
    closeAll,
    selectedTeamId,
    setSelectedTeamId,
    isCompanySwitcherOpen,
    setIsCompanySwitcherOpen,
  }), [
    showTaskModal,
    showIssueModal,
    showGoalModal,
    showMetricModal,
    showHeadlineModal,
    openTaskModal,
    openIssueModal,
    openGoalModal,
    openMetricModal,
    openHeadlineModal,
    closeAll,
    selectedTeamId,
    setSelectedTeamId,
    isCompanySwitcherOpen,
  ]);

  return (
    <MobileShellContext.Provider value={value}>
      {children}
    </MobileShellContext.Provider>
  );
};
