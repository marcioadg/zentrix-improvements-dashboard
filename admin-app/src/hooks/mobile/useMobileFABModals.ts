import { useState, useCallback } from 'react';

/**
 * Shared modal state for unified mobile FAB across all /m pages
 * Manages open/close state for all creation modals
 */
export const useMobileFABModals = () => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [showHeadlineModal, setShowHeadlineModal] = useState(false);

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

  return {
    // Modal states
    showTaskModal,
    showIssueModal,
    showGoalModal,
    showMetricModal,
    showHeadlineModal,
    // Setters
    setShowTaskModal,
    setShowIssueModal,
    setShowGoalModal,
    setShowMetricModal,
    setShowHeadlineModal,
    // Openers
    openTaskModal,
    openIssueModal,
    openGoalModal,
    openMetricModal,
    openHeadlineModal,
    // Close all
    closeAll,
  };
};
