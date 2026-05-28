import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface GoalReorderPayload {
  sender: string;
  goalIds: string[];
  isCompanyGoals: boolean;
}

interface GoalOwnerChangePayload {
  sender: string;
  goalId: string;
  previousOwnerId: string | null;
  newOwnerId: string | null;
  isCompanyGoal: boolean;
  displayOrder?: number;
  goal?: any; // Full goal data for cross-section transfers (team↔company)
}

interface GoalCreatedPayload {
  sender: string;
  goal: {
    id: string;
    title: string;
    description?: string;
    status: string;
    target_date?: string;
    team_id: string;
    owner_id: string;
    is_company_goal: boolean;
    display_order: number;
    archived: boolean;
    created_at: string;
    updated_at: string;
  };
}

interface GoalArchivedPayload {
  sender: string;
  goalId: string;
  isCompanyGoal: boolean;
}

interface GoalUpdatedPayload {
  sender: string;
  goalId: string;
  updates: any; // Partial goal object with updated fields
  wasCompanyGoal: boolean;
  isCompanyGoal: boolean;
}

interface MilestoneChangedPayload {
  sender: string;
  goalId: string;
  action: 'created' | 'updated' | 'deleted';
  milestoneId?: string;
}

/**
 * Real-time sync of goal operations via Supabase broadcast channels.
 * Uses ref pattern for stable channel subscriptions.
 */
export function useGoalReorderBroadcast(
  teamId: string | null,
  onRemoteReorder: (goalIds: string[], isCompanyGoals: boolean) => void,
  onRemoteOwnerChange?: (payload: GoalOwnerChangePayload) => void,
  onRemoteGoalCreated?: (goal: GoalCreatedPayload['goal']) => void,
  onRemoteGoalArchived?: (goalId: string, isCompanyGoal: boolean) => void,
  onRemoteGoalUpdated?: (goalId: string, updates: any, wasCompanyGoal: boolean, isCompanyGoal: boolean) => void,
  onRemoteMilestoneChanged?: (goalId: string, action: 'created' | 'updated' | 'deleted', milestoneId?: string) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );

  // Store all callbacks in refs to prevent channel recreation
  const onRemoteReorderRef = useRef(onRemoteReorder);
  const onRemoteOwnerChangeRef = useRef(onRemoteOwnerChange);
  const onRemoteGoalCreatedRef = useRef(onRemoteGoalCreated);
  const onRemoteGoalArchivedRef = useRef(onRemoteGoalArchived);
  const onRemoteGoalUpdatedRef = useRef(onRemoteGoalUpdated);
  const onRemoteMilestoneChangedRef = useRef(onRemoteMilestoneChanged);

  // Keep callback refs updated without causing channel recreation
  useEffect(() => {
    onRemoteReorderRef.current = onRemoteReorder;
    onRemoteOwnerChangeRef.current = onRemoteOwnerChange;
    onRemoteGoalCreatedRef.current = onRemoteGoalCreated;
    onRemoteGoalArchivedRef.current = onRemoteGoalArchived;
    onRemoteGoalUpdatedRef.current = onRemoteGoalUpdated;
    onRemoteMilestoneChangedRef.current = onRemoteMilestoneChanged;
  }, [onRemoteReorder, onRemoteOwnerChange, onRemoteGoalCreated, onRemoteGoalArchived, onRemoteGoalUpdated, onRemoteMilestoneChanged]);

  useEffect(() => {
    if (!teamId) return;
    const channel = supabase.channel(`meeting:${teamId}:goal-reorder`);

    channel
      .on('broadcast', { event: 'goal_reorder' }, (payload: any) => {
        const { sender, goalIds, isCompanyGoals } = payload?.payload as GoalReorderPayload || {};
        if (sender === clientIdRef.current) return; // ignore our own broadcasts
        if (Array.isArray(goalIds)) {
          logger.log('📡 [BROADCAST] Received remote goal reorder:', { goalIds, isCompanyGoals, sender });
          onRemoteReorderRef.current(goalIds, isCompanyGoals);
        }
      })
      .on('broadcast', { event: 'goal_owner_change' }, (payload: any) => {
        const changePayload = payload?.payload as GoalOwnerChangePayload;
        if (changePayload?.sender === clientIdRef.current) return; // ignore our own broadcasts
        if (changePayload && onRemoteOwnerChangeRef.current) {
          logger.log('📡 [BROADCAST] Received remote goal owner change:', changePayload);
          onRemoteOwnerChangeRef.current(changePayload);
        }
      })
      .on('broadcast', { event: 'goal_created' }, (payload: any) => {
        const createdPayload = payload?.payload as GoalCreatedPayload;
        if (createdPayload?.sender === clientIdRef.current) return; // ignore our own broadcasts
        if (createdPayload?.goal && onRemoteGoalCreatedRef.current) {
          logger.log('📡 [BROADCAST] Received remote goal creation:', createdPayload.goal);
          onRemoteGoalCreatedRef.current(createdPayload.goal);
        }
      })
      .on('broadcast', { event: 'goal_archived' }, (payload: any) => {
        const archivedPayload = payload?.payload as GoalArchivedPayload;
        if (archivedPayload?.sender === clientIdRef.current) return; // ignore our own broadcasts
        if (archivedPayload && onRemoteGoalArchivedRef.current) {
          logger.log('📡 [BROADCAST] Received remote goal archive:', archivedPayload);
          onRemoteGoalArchivedRef.current(archivedPayload.goalId, archivedPayload.isCompanyGoal);
        }
      })
      .on('broadcast', { event: 'goal_updated' }, (payload: any) => {
        const updatedPayload = payload?.payload as GoalUpdatedPayload;
        if (updatedPayload?.sender === clientIdRef.current) return; // ignore our own broadcasts
        if (updatedPayload && onRemoteGoalUpdatedRef.current) {
          logger.log('📡 [BROADCAST] Received remote goal update:', updatedPayload);
          onRemoteGoalUpdatedRef.current(
            updatedPayload.goalId, 
            updatedPayload.updates, 
            updatedPayload.wasCompanyGoal, 
            updatedPayload.isCompanyGoal
          );
        }
      })
      .on('broadcast', { event: 'milestone_changed' }, (payload: any) => {
        const milestonePayload = payload?.payload as MilestoneChangedPayload;
        if (milestonePayload?.sender === clientIdRef.current) return; // ignore our own broadcasts
        if (milestonePayload && onRemoteMilestoneChangedRef.current) {
          logger.log('📡 [BROADCAST] Received remote milestone change:', milestonePayload);
          onRemoteMilestoneChangedRef.current(milestonePayload.goalId, milestonePayload.action, milestonePayload.milestoneId);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [teamId]); // Only teamId - all callbacks are in refs

  const publishReorder = useCallback((goalIds: string[], isCompanyGoals: boolean) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping goal reorder publish');
      return;
    }
    
    try {
      logger.log('📤 [BROADCAST] Publishing goal reorder:', { goalIds, isCompanyGoals });
      channelRef.current.send({
        type: 'broadcast',
        event: 'goal_reorder',
        payload: { sender: clientIdRef.current, goalIds, isCompanyGoals } as GoalReorderPayload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast goal reorder (operation was successful):', error);
    }
  }, []);

  const publishOwnerChange = useCallback((
    goalId: string,
    previousOwnerId: string | null,
    newOwnerId: string | null,
    isCompanyGoal: boolean,
    displayOrder?: number,
    goal?: any // Full goal data for cross-section transfers
  ) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping goal owner change publish');
      return;
    }
    
    try {
      const payload: GoalOwnerChangePayload = {
        sender: clientIdRef.current,
        goalId,
        previousOwnerId,
        newOwnerId,
        isCompanyGoal,
        displayOrder,
        goal
      };
      logger.log('📤 [BROADCAST] Publishing goal owner change:', payload);
      channelRef.current.send({
        type: 'broadcast',
        event: 'goal_owner_change',
        payload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast goal owner change (operation was successful):', error);
    }
  }, []);

  const publishGoalCreated = useCallback((goal: GoalCreatedPayload['goal']) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping goal creation publish');
      return;
    }
    
    try {
      const payload: GoalCreatedPayload = {
        sender: clientIdRef.current,
        goal
      };
      logger.log('📤 [BROADCAST] Publishing goal creation:', payload);
      channelRef.current.send({
        type: 'broadcast',
        event: 'goal_created',
        payload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast goal creation (operation was successful):', error);
    }
  }, []);

  const publishGoalArchived = useCallback((goalId: string, isCompanyGoal: boolean) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping goal archive publish');
      return;
    }
    
    try {
      const payload: GoalArchivedPayload = {
        sender: clientIdRef.current,
        goalId,
        isCompanyGoal
      };
      logger.log('📤 [BROADCAST] Publishing goal archive:', payload);
      channelRef.current.send({
        type: 'broadcast',
        event: 'goal_archived',
        payload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast goal archive (operation was successful):', error);
    }
  }, []);

  const publishGoalUpdated = useCallback((
    goalId: string, 
    updates: any, 
    wasCompanyGoal: boolean, 
    isCompanyGoal: boolean
  ) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping goal update publish');
      return;
    }
    
    try {
      const payload: GoalUpdatedPayload = {
        sender: clientIdRef.current,
        goalId,
        updates,
        wasCompanyGoal,
        isCompanyGoal
      };
      logger.log('📤 [BROADCAST] Publishing goal update:', payload);
      channelRef.current.send({
        type: 'broadcast',
        event: 'goal_updated',
        payload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast goal update (operation was successful):', error);
    }
  }, []);

  const publishMilestoneChanged = useCallback((
    goalId: string,
    action: 'created' | 'updated' | 'deleted',
    milestoneId?: string
  ) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping milestone change publish');
      return;
    }
    
    try {
      const payload: MilestoneChangedPayload = {
        sender: clientIdRef.current,
        goalId,
        action,
        milestoneId
      };
      logger.log('📤 [BROADCAST] Publishing milestone change:', payload);
      channelRef.current.send({
        type: 'broadcast',
        event: 'milestone_changed',
        payload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast milestone change (operation was successful):', error);
    }
  }, []);

  return { publishReorder, publishOwnerChange, publishGoalCreated, publishGoalArchived, publishGoalUpdated, publishMilestoneChanged };
}
