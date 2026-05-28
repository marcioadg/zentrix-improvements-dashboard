import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Hook to manage Supabase subscription cleanup and prevent memory leaks
 */
export const useSubscriptionCleanup = () => {
  const channelsRef = useRef<Set<any>>(new Set());

  const addChannel = (channel: any) => {
    channelsRef.current.add(channel);
    logger.log('📡 Added channel to cleanup tracker. Total channels:', channelsRef.current.size);
  };

  const removeChannel = (channel: any) => {
    if (channelsRef.current.has(channel)) {
      channelsRef.current.delete(channel);
      supabase.removeChannel(channel);
      logger.log('🧹 Removed channel from tracker. Remaining channels:', channelsRef.current.size);
    }
  };

  const cleanupAllChannels = () => {
    logger.log('🧹 Cleaning up all tracked channels:', channelsRef.current.size);
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current.clear();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllChannels();
    };
  }, []);

  return {
    addChannel,
    removeChannel,
    cleanupAllChannels,
    getChannelCount: () => channelsRef.current.size
  };
};