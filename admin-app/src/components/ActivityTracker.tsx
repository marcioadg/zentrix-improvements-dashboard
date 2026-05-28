import { useActivityTracking } from '@/hooks/useActivityTracking';

export const ActivityTracker = () => {
  useActivityTracking();
  return null; // This component doesn't render anything
};
