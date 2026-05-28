
import { useEffect } from 'react';
import { logger } from '@/utils/logger';

export const useWrapUpData = (
  meetingId: string | null,
  refetchTasks: () => void,
  hasAutoRefreshed: boolean,
  setHasAutoRefreshed: (value: boolean) => void,
  setIsRefreshing: (value: boolean) => void
) => {
  // Auto-refresh tasks once when component mounts to ensure we have latest data
  useEffect(() => {
    if (meetingId && !hasAutoRefreshed) {
      logger.log('🔄 useWrapUpData: Auto-refreshing tasks for meeting:', meetingId);
      setIsRefreshing(true);
      
      // Immediate refetch without delay for faster loading
      refetchTasks();
      setHasAutoRefreshed(true);
      setIsRefreshing(false);
    }
  }, [meetingId, hasAutoRefreshed, refetchTasks, setHasAutoRefreshed, setIsRefreshing]);

  const handleManualRefresh = () => {
    if (!meetingId) return;
    
    logger.log('🔄 useWrapUpData: Manual refresh triggered for meeting:', meetingId);
    setIsRefreshing(true);
    
    setTimeout(() => {
      refetchTasks();
      setIsRefreshing(false);
    }, 300);
  };

  return {
    handleManualRefresh
  };
};
