import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface MetricReorderPayload {
  sender: string;
  metricIds: string[];
  displayOrders: number[];
}

/**
 * Real-time sync of metric reordering via Supabase broadcast channels.
 * Follows the exact same proven pattern as useGoalReorderBroadcast.
 */
export function useMetricReorderBroadcast(
  teamId: string | null,
  onRemoteReorder: (metricIds: string[], displayOrders: number[]) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );

  useEffect(() => {
    if (!teamId) return;
    
    const channel = supabase.channel(`meeting:${teamId}:metric-reorder`);

    channel
      .on('broadcast', { event: 'metric_reorder' }, (payload: any) => {
        const { sender, metricIds, displayOrders } = payload?.payload as MetricReorderPayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        if (Array.isArray(metricIds) && Array.isArray(displayOrders)) {
          logger.log('📡 [BROADCAST] Received remote metric reorder:', { metricIds, displayOrders, sender });
          onRemoteReorder(metricIds, displayOrders);
        }
      })
      .subscribe((status) => {
        logger.log('📡 [BROADCAST] Metric reorder channel status:', status);
      });

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        logger.log('📡 [BROADCAST] Cleaning up metric reorder channel for team:', teamId);
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [teamId, onRemoteReorder]);

  const publishReorder = useCallback((metricIds: string[], displayOrders: number[]) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping publish');
      return;
    }
    
    logger.log('📤 [BROADCAST] Publishing metric reorder:', { metricIds, displayOrders });
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'metric_reorder',
      payload: { 
        sender: clientIdRef.current, 
        metricIds, 
        displayOrders 
      } as MetricReorderPayload
    });
  }, []);

  return { publishReorder };
}
