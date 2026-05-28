import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCompanyScoped } from '@/hooks/useCompanyScoped';
import { supabase } from '@/integrations/supabase/client';
import { clarityBreakQueries, clarityBreakEntryQueries } from './useClarityBreaks/database';
import { createErrorHandler, createSuccessHandler } from './useClarityBreaks/errorHandling';
import { createValidationGuard } from './useClarityBreaks/validation';
import { sessionUtils } from './useClarityBreaks/sessionManagement';
import { CLARITY_BREAK_SUCCESS } from './useClarityBreaks/constants';
import { logger } from '@/utils/logger';

interface ClarityBreak {
  id: string;
  user_id: string;
  company_id?: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  insights?: string;
  session_prompts?: string[];
  created_at: string;
}

interface ClarityBreakEntry {
  id: string;
  break_id: string;
  user_id: string;
  company_id?: string;
  prompt: string;
  response?: string;
  created_at: string;
}

export const useClarityBreaks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentCompany, loading: companyLoading } = useCompanyScoped();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ClarityBreak[]>([]);
  const [incompleteSession, setIncompleteSession] = useState<ClarityBreak | null>(null);

  // Create utility functions
  const handleError = createErrorHandler(toast);
  const handleSuccess = createSuccessHandler(toast);
  const validateContext = createValidationGuard({ user, currentCompany });

  const fetchHistory = async () => {
    if (!user || !currentCompany) {
      logger.log('👤 No user or company context, clearing history');
      setHistory([]);
      setIncompleteSession(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      validateContext();
      
      logger.log('📥 Fetching clarity break history...');
      const sessions = await clarityBreakQueries.fetchHistory(user.id, currentCompany?.id);
      setHistory(sessions);
      
      const incomplete = sessionUtils.findIncompleteSession(sessions);
      logger.log('🔍 Incomplete session found:', !!incomplete);
      if (incomplete) {
        logger.log('📋 Incomplete session prompts:', incomplete.session_prompts?.length || 0);
      }
      setIncompleteSession(incomplete);
    } catch (error) {
      handleError(error, 'FETCH_HISTORY');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (durationMinutes: number, sessionPrompts: string[]) => {
    if (!user || !currentCompany) return null;

    try {
      validateContext();
      logger.log('🆕 Creating new session with', sessionPrompts.length, 'prompts');
      
      // Validate prompt count before creating session
      if (sessionPrompts.length !== 10) {
        logger.error('❌ Invalid prompt count:', sessionPrompts.length);
        handleError(new Error('Session must have exactly 10 prompts'), 'CREATE_SESSION');
        return null;
      }
      
      const data = await clarityBreakQueries.createSession(
        user.id, 
        currentCompany?.id, 
        durationMinutes, 
        sessionPrompts
      );
      
      setIncompleteSession(data);
      logger.log('✅ Session created successfully:', data.id, 'with prompts saved:', !!data.session_prompts);
      return data;
    } catch (error) {
      handleError(error, 'CREATE_SESSION');
      return null;
    }
  };

  const resumeSession = async (session: ClarityBreak) => {
    try {
      validateContext();
      logger.log('🔄 Resuming session:', session.id);
      logger.log('📋 Session prompts available in DB:', session.session_prompts?.length || 0);
      
      const entries = await clarityBreakEntryQueries.fetchEntries(
        session.id, 
        user!.id, 
        currentCompany!.id
      );
      
      const resumeData = sessionUtils.prepareResumeData(session, entries);
      logger.log('✅ Resume data prepared successfully with', resumeData.sessionPrompts.length, 'consistent prompts');
      return resumeData;
    } catch (error) {
      handleError(error, 'RESUME_SESSION');
      return null;
    }
  };

  const abandonSession = async (sessionId: string) => {
    if (!user || !currentCompany) return;

    try {
      validateContext();
      await clarityBreakQueries.abandonSession(sessionId, user.id, currentCompany?.id);
      
      setIncompleteSession(null);
      
      // Immediately refresh the history list
      await fetchHistory();
      
      handleSuccess(
        CLARITY_BREAK_SUCCESS.SESSION_ABANDONED,
        CLARITY_BREAK_SUCCESS.SESSION_ABANDONED_DESC
      );
    } catch (error) {
      handleError(error, 'ABANDON_SESSION');
    }
  };

  const saveEntry = async (breakId: string, prompt: string, response: string) => {
    if (!user || !currentCompany) return;

    try {
      validateContext();
      await clarityBreakEntryQueries.upsertEntry(
        breakId, 
        user.id, 
        currentCompany?.id, 
        prompt, 
        response
      );
    } catch (error) {
      handleError(error, 'SAVE_ENTRY', false); // Don't show toast for auto-save errors
    }
  };

  const completeSession = async (breakId: string, insights?: string) => {
    if (!user || !currentCompany) return;

    try {
      validateContext();
      await clarityBreakQueries.completeSession(breakId, user.id, currentCompany?.id, insights);
      
      setIncompleteSession(null);
      
      // Immediately refresh the history list
      await fetchHistory();
      
      handleSuccess(
        CLARITY_BREAK_SUCCESS.SESSION_COMPLETED,
        CLARITY_BREAK_SUCCESS.SESSION_COMPLETED_DESC
      );
    } catch (error) {
      handleError(error, 'COMPLETE_SESSION');
    }
  };

  const getBreakEntries = async (breakId: string): Promise<ClarityBreakEntry[]> => {
    if (!user || !currentCompany) return [];

    try {
      validateContext();
      return await clarityBreakEntryQueries.fetchEntries(breakId, user.id, currentCompany?.id);
    } catch (error) {
      handleError(error, 'FETCH_ENTRIES', false);
      return [];
    }
  };

  useEffect(() => {
    if (!companyLoading && user && currentCompany) {
      logger.log('🚀 Initializing clarity breaks for user:', user.id, 'company:', currentCompany?.id);
      fetchHistory();
    }
  }, [user, currentCompany, companyLoading]);

  return {
    history,
    incompleteSession,
    loading: loading || companyLoading,
    createSession,
    resumeSession,
    abandonSession,
    saveEntry,
    completeSession,
    getBreakEntries,
    refetchHistory: fetchHistory,
  };
};
