
import { useState } from 'react';

export interface MeetingModalsState {
  showTaskModal: boolean;
  showGoalModal: boolean;
  showMetricModal: boolean;
  showHeadlineModal: boolean;
  showIssueModal: boolean;
}

export interface MeetingModalsActions {
  setShowTaskModal: (show: boolean) => void;
  setShowGoalModal: (show: boolean) => void;
  setShowMetricModal: (show: boolean) => void;
  setShowHeadlineModal: (show: boolean) => void;
  setShowIssueModal: (show: boolean) => void;
  openTaskModal: () => void;
  openGoalModal: () => void;
  openMetricModal: () => void;
  openHeadlineModal: () => void;
  openIssueModal: () => void;
  closeAllModals: () => void;
}

export const useMeetingModalsState = (): MeetingModalsState & MeetingModalsActions => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [showHeadlineModal, setShowHeadlineModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  const openTaskModal = () => setShowTaskModal(true);
  const openGoalModal = () => setShowGoalModal(true);
  const openMetricModal = () => setShowMetricModal(true);
  const openHeadlineModal = () => setShowHeadlineModal(true);
  const openIssueModal = () => setShowIssueModal(true);

  const closeAllModals = () => {
    setShowTaskModal(false);
    setShowGoalModal(false);
    setShowMetricModal(false);
    setShowHeadlineModal(false);
    setShowIssueModal(false);
  };

  return {
    showTaskModal,
    showGoalModal,
    showMetricModal,
    showHeadlineModal,
    showIssueModal,
    setShowTaskModal,
    setShowGoalModal,
    setShowMetricModal,
    setShowHeadlineModal,
    setShowIssueModal,
    openTaskModal,
    openGoalModal,
    openMetricModal,
    openHeadlineModal,
    openIssueModal,
    closeAllModals,
  };
};
