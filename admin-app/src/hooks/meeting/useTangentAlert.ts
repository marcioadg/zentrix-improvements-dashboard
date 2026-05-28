import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Real-time tangent alert system for meetings
export function useTangentAlert(
  teamId: string | null,
  onTangentAlert: () => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  const lastAlertTimeRef = useRef<number>(0);
  const COOLDOWN_MS = 15000; // 15 second cooldown
  
  // Use ref for callback to prevent effect re-runs
  const onTangentAlertRef = useRef(onTangentAlert);
  useEffect(() => {
    onTangentAlertRef.current = onTangentAlert;
  }, [onTangentAlert]);

  useEffect(() => {
    if (!teamId) return;
    
    logger.debug('🚨 TANGENT ALERT: Setting up channel for team:', teamId);
    const channel = supabase.channel(`tangent-alert:${teamId}`);

    channel
      .on('broadcast', { event: 'tangent_alert' }, (payload: any) => {
        const { sender, timestamp } = payload?.payload || {};
        logger.debug('🚨 TANGENT ALERT: Received broadcast:', { sender, timestamp });
        
        // Ignore our own alerts
        if (sender === clientIdRef.current) {
          logger.debug('🚨 TANGENT ALERT: Ignoring own alert');
          return;
        }
        
        // Trigger the alert animation
        onTangentAlertRef.current();
      })
      .subscribe((status) => {
        logger.debug('🚨 TANGENT ALERT: Channel subscription status:', status);
      });

    channelRef.current = channel;
    return () => {
      logger.debug('🚨 TANGENT ALERT: Cleaning up channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [teamId]); // Removed onTangentAlert from deps - using ref instead

  const triggerTangentAlert = useCallback(() => {
    const now = Date.now();
    
    // Check cooldown
    if (now - lastAlertTimeRef.current < COOLDOWN_MS) {
      logger.debug('🚨 TANGENT ALERT: Still in cooldown period');
      return false;
    }

    if (!channelRef.current) {
      logger.debug('🚨 TANGENT ALERT: No channel available');
      return false;
    }

    logger.debug('🚨 TANGENT ALERT: Broadcasting alert');
    lastAlertTimeRef.current = now;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'tangent_alert',
      payload: { 
        sender: clientIdRef.current, 
        timestamp: now 
      }
    });
    
    // Also trigger for ourselves
    onTangentAlertRef.current();
    return true;
  }, []);

  const isInCooldown = useCallback(() => {
    const now = Date.now();
    return now - lastAlertTimeRef.current < COOLDOWN_MS;
  }, []);

  return { 
    triggerTangentAlert, 
    isInCooldown,
    cooldownMs: COOLDOWN_MS 
  };
}