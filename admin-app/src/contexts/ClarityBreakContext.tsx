import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface ClarityBreakTimerState {
  sessionId: string | null;
  isRunning: boolean;
  elapsedSeconds: number;
  isPaused: boolean;
  promptIndex: number;
  notes: Record<string, string>;
  insights: string;
  sessionPrompts: string[];
}

interface ClarityBreakContextType {
  timerState: ClarityBreakTimerState;
  updateTimerState: (updates: Partial<ClarityBreakTimerState>) => void;
  clearTimerState: () => void;
  syncToDatabase: () => Promise<void>;
}

const defaultState: ClarityBreakTimerState = {
  sessionId: null,
  isRunning: false,
  elapsedSeconds: 0,
  isPaused: false,
  promptIndex: 0,
  notes: {},
  insights: '',
  sessionPrompts: [],
};

const ClarityBreakContext = createContext<ClarityBreakContextType | undefined>(undefined);

export const ClarityBreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const [timerState, setTimerState] = useState<ClarityBreakTimerState>(defaultState);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  // Keep a ref to always have the latest timerState in callbacks without re-creating them
  const timerStateRef = useRef<ClarityBreakTimerState>(timerState);
  timerStateRef.current = timerState;

  // Sync timer state to database
  const syncToDatabase = useCallback(async () => {
    const state = timerStateRef.current;
    if (!state.sessionId || !state.isRunning) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase
        .from('clarity_breaks')
        .update({
          current_elapsed_seconds: state.elapsedSeconds,
          is_paused: state.isPaused,
          paused_at: state.isPaused ? new Date().toISOString() : null,
        })
        .eq('id', state.sessionId);

      lastSyncRef.current = Date.now();
    } catch (error) {
      logger.error('Failed to sync timer state to database:', error);
    }
  }, []);

  // Update timer state in memory
  const updateTimerState = useCallback((updates: Partial<ClarityBreakTimerState>) => {
    setTimerState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear timer state
  const clearTimerState = useCallback(() => {
    setTimerState(defaultState);
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  // Auto-sync to database every 5 seconds when timer is running
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      syncIntervalRef.current = setInterval(() => {
        syncToDatabase();
      }, 5000);
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.isPaused, syncToDatabase]);

  // Immediate sync on pause/unpause
  useEffect(() => {
    if (timerState.sessionId && timerState.isRunning) {
      const now = Date.now();
      // Avoid duplicate syncs within 1 second
      if (now - lastSyncRef.current > 1000) {
        syncToDatabase();
      }
    }
  // syncToDatabase is now stable (no deps), so omitting it here is safe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState.isPaused, timerState.sessionId, timerState.isRunning]);

  // Load active session from database on mount
  useEffect(() => {
    if (!user || !currentCompany) return;

    const loadActiveSession = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('clarity_breaks')
          .select('*')
          .eq('user_id', user.id)
          .eq('company_id', currentCompany?.id)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setTimerState({
            sessionId: data.id,
            isRunning: true,
            elapsedSeconds: data.current_elapsed_seconds || 0,
            isPaused: data.is_paused || false,
            promptIndex: 0, // Will be set by component
            notes: {}, // Will be loaded by component
            insights: data.insights || '',
            sessionPrompts: data.session_prompts || [],
          });
        }
      } catch (error) {
        logger.error('Failed to load active session:', error);
      }
    };

    loadActiveSession();
  }, [user, currentCompany]);

  return (
    <ClarityBreakContext.Provider value={{ timerState, updateTimerState, clearTimerState, syncToDatabase }}>
      {children}
    </ClarityBreakContext.Provider>
  );
};

export const useClarityBreakTimer = () => {
  const context = useContext(ClarityBreakContext);
  if (!context) {
    throw new Error('useClarityBreakTimer must be used within a ClarityBreakProvider');
  }
  return context;
};
