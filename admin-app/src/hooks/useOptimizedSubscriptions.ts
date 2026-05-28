/**
 * 🎯 PHASE 4: Optimized Subscription Management
 * Reduces subscription overhead with connection pooling and batching
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface SubscriptionManager {
  channels: Map<string, any>;
  callbacks: Map<string, Set<(payload: any) => void>>;
  connectionPool: number;
  maxConnections: number;
}

class OptimizedSubscriptionManager {
  private static instance: OptimizedSubscriptionManager;
  private manager: SubscriptionManager = {
    channels: new Map(),
    callbacks: new Map(),
    connectionPool: 0,
    maxConnections: 10 // Limit concurrent connections
  };

  static getInstance(): OptimizedSubscriptionManager {
    if (!OptimizedSubscriptionManager.instance) {
      OptimizedSubscriptionManager.instance = new OptimizedSubscriptionManager();
    }
    return OptimizedSubscriptionManager.instance;
  }

  /**
   * Subscribe to changes with connection pooling
   */
  subscribe(
    channelName: string,
    table: string,
    filter: string,
    callback: (payload: any) => void
  ): () => void {
    const subscriptionKey = `${table}-${filter}`;
    
    // Add callback to the set
    if (!this.manager.callbacks.has(subscriptionKey)) {
      this.manager.callbacks.set(subscriptionKey, new Set());
    }
    this.manager.callbacks.get(subscriptionKey)!.add(callback);

    // Create channel if it doesn't exist and we haven't hit the connection limit
    if (!this.manager.channels.has(subscriptionKey) && 
        this.manager.connectionPool < this.manager.maxConnections) {
      
      const channel = supabase
        .channel(`optimized-${channelName}-${subscriptionKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter
          },
          (payload) => {
            // Batch notify all callbacks
            const callbacks = this.manager.callbacks.get(subscriptionKey);
            if (callbacks) {
              // Use requestAnimationFrame to batch updates
              requestAnimationFrame(() => {
                callbacks.forEach(cb => {
                  try {
                    cb(payload);
                  } catch (error) {
                    logger.error(`❌ Subscription callback error for ${subscriptionKey}:`, error);
                  }
                });
              });
            }
          }
        )
        .subscribe();

      this.manager.channels.set(subscriptionKey, channel);
      this.manager.connectionPool++;
      
      logger.debug(`📡 OptimizedSubscriptions: Created channel for ${subscriptionKey}. Pool: ${this.manager.connectionPool}`);
    } else if (this.manager.connectionPool >= this.manager.maxConnections) {
      logger.warn(`⚠️ OptimizedSubscriptions: Connection limit reached (${this.manager.maxConnections}). Reusing existing channels.`);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.manager.callbacks.get(subscriptionKey);
      if (callbacks) {
        callbacks.delete(callback);
        
        // If no more callbacks, remove the channel
        if (callbacks.size === 0) {
          const channel = this.manager.channels.get(subscriptionKey);
          if (channel) {
            supabase.removeChannel(channel);
            this.manager.channels.delete(subscriptionKey);
            this.manager.callbacks.delete(subscriptionKey);
            this.manager.connectionPool--;
            
            logger.debug(`🧹 OptimizedSubscriptions: Removed channel for ${subscriptionKey}. Pool: ${this.manager.connectionPool}`);
          }
        }
      }
    };
  }

  /**
   * Get subscription statistics
   */
  getStats() {
    return {
      activeChannels: this.manager.channels.size,
      totalCallbacks: Array.from(this.manager.callbacks.values())
        .reduce((sum, set) => sum + set.size, 0),
      connectionPoolUsage: this.manager.connectionPool,
      maxConnections: this.manager.maxConnections
    };
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    this.manager.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.manager.channels.clear();
    this.manager.callbacks.clear();
    this.manager.connectionPool = 0;
    
    logger.debug('🧹 OptimizedSubscriptions: Cleaned up all subscriptions');
  }
}

export const useOptimizedSubscriptions = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const subscriptionManager = useRef(OptimizedSubscriptionManager.getInstance());
  const activeSubscriptions = useRef<Set<() => void>>(new Set());

  // 🎯 PHASE 4: Optimized subscription setup
  const subscribeToTable = useCallback((
    table: string,
    callback: (payload: any) => void,
    customFilter?: string
  ) => {
    if (!user?.id || !currentCompany?.id) return () => {};

    const filter = customFilter || `user_id=eq.${user.id}`;
    const channelName = `${table}-${currentCompany?.id}`;
    
    const unsubscribe = subscriptionManager.current.subscribe(
      channelName,
      table,
      filter,
      callback
    );

    activeSubscriptions.current.add(unsubscribe);
    return unsubscribe;
  }, [user?.id, currentCompany?.id]);

  // 🎯 PHASE 4: Batched subscription setup for common tables
  const setupBatchedSubscriptions = useCallback((callbacks: {
    onTeamChange?: (payload: any) => void;
    onCompanyMemberChange?: (payload: any) => void;
    onUserSettingsChange?: (payload: any) => void;
  }) => {
    if (!user?.id || !currentCompany?.id) return;

    const unsubscribers: (() => void)[] = [];

    // Team changes
    if (callbacks.onTeamChange) {
      unsubscribers.push(
        subscribeToTable('teams', callbacks.onTeamChange, `company_id=eq.${currentCompany?.id}`)
      );
    }

    // Company member changes
    if (callbacks.onCompanyMemberChange) {
      unsubscribers.push(
        subscribeToTable('company_members', callbacks.onCompanyMemberChange, `company_id=eq.${currentCompany?.id}`)
      );
    }


    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user?.id, currentCompany?.id, subscribeToTable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeSubscriptions.current.forEach(unsub => unsub());
      activeSubscriptions.current.clear();
    };
  }, []);

  return {
    subscribeToTable,
    setupBatchedSubscriptions,
    getStats: () => subscriptionManager.current.getStats(),
    cleanup: () => subscriptionManager.current.cleanup()
  };
};