
import { useState } from 'react';

export const useMeetingState = () => {
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [liveSectionDuration, setLiveSectionDuration] = useState(0);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [showHeadlineModal, setShowHeadlineModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [prefilledTaskData, setPrefilledTaskData] = useState<{
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
  } | undefined>(undefined);

  return {
    teamInfo,
    setTeamInfo,
    liveSectionDuration,
    setLiveSectionDuration,
    showTaskModal,
    setShowTaskModal,
    showGoalModal,
    setShowGoalModal,
    showMetricModal,
    setShowMetricModal,
    showHeadlineModal,
    setShowHeadlineModal,
    showIssueModal,
    setShowIssueModal,
    prefilledTaskData,
    setPrefilledTaskData,
  };
};
