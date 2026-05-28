import { useLoginTracking } from '@/hooks/useLoginTracking';

export const LoginTracker = () => {
  useLoginTracking();
  return null; // This component doesn't render anything
};