import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isMobilePlatform } from '@/utils/platformDetection';

export const useGlobalKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const isMobileApp = isMobilePlatform();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger on Cmd (Mac) or Ctrl (Windows/Linux)
      if (!event.metaKey && !event.ctrlKey) return;

      // Prevent default browser shortcuts and stop propagation
      const preventDefault = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      switch (event.key) {
        // Navigation shortcuts
        case ',':
          // On mobile platform, navigate to mobile settings (no billing access)
          preventDefault();
          navigate(isMobileApp ? '/m/settings' : '/settings');
          break;

        // Action shortcuts - these will trigger modals
        case 't':
          preventDefault();
          // Trigger create task modal
          if ((window as any).openCreateTaskModal) {
            (window as any).openCreateTaskModal();
          }
          break;
        case 'i':
          preventDefault();
          // Trigger create issue modal
          if ((window as any).openCreateIssueModal) {
            (window as any).openCreateIssueModal();
          }
          break;
        case 'g':
          preventDefault();
          // Trigger create goal modal
          if ((window as any).openCreateGoalModal) {
            (window as any).openCreateGoalModal();
          }
          break;
        case 'm':
          preventDefault();
          // Trigger create metric modal
          if ((window as any).openCreateMetricModal) {
            (window as any).openCreateMetricModal();
          }
          break;
        case 'h':
          preventDefault();
          // Trigger create headline modal
          if ((window as any).openCreateHeadlineModal) {
            (window as any).openCreateHeadlineModal();
          }
          break;

        // Interface shortcuts
        case 'd':
          preventDefault();
          // Toggle theme
          if ((window as any).toggleTheme) {
            (window as any).toggleTheme();
          }
          break;
        case 'b':
          preventDefault();
          // Toggle sidebar
          if ((window as any).toggleSidebar) {
            (window as any).toggleSidebar();
          }
          break;

        default:
          // Don't prevent default for unhandled shortcuts
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);
};

// Utility to expose modal triggers globally
export const exposeGlobalActions = (actions: {
  openCreateTaskModal?: () => void;
  openCreateIssueModal?: () => void;
  openCreateGoalModal?: () => void;
  openCreateMetricModal?: () => void;
  openCreateHeadlineModal?: () => void;
  toggleTheme?: () => void;
  toggleSidebar?: () => void;
}) => {
  // Expose to window object for global access
  Object.assign(window, {
    openCreateTaskModal: actions.openCreateTaskModal,
    openCreateIssueModal: actions.openCreateIssueModal,
    openCreateGoalModal: actions.openCreateGoalModal,
    openCreateMetricModal: actions.openCreateMetricModal,
    openCreateHeadlineModal: actions.openCreateHeadlineModal,
    toggleTheme: actions.toggleTheme,
    toggleSidebar: actions.toggleSidebar,
  });
};