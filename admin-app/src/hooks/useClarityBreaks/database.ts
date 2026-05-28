
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SELECT_FIELDS } from './constants';
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

// Timer state persistence functions
export const timerStatePersistence = {
  // Save current timer state to database
  async saveTimerState(
    breakId: string,
    elapsedSeconds: number,
    isPaused: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('clarity_breaks')
      .update({
        current_elapsed_seconds: elapsedSeconds,
        is_paused: isPaused,
        paused_at: isPaused ? new Date().toISOString() : null,
      })
      .eq('id', breakId);

    if (error) {
      throw new Error(`Failed to save timer state: ${error.message}`);
    }
  },

  // Restore timer state from database
  async restoreTimerState(breakId: string): Promise<{
    elapsedSeconds: number;
    isPaused: boolean;
    pausedAt: string | null;
  } | null> {
    const { data, error } = await supabase
      .from('clarity_breaks')
      .select('current_elapsed_seconds, is_paused, paused_at')
      .eq('id', breakId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      elapsedSeconds: data.current_elapsed_seconds || 0,
      isPaused: data.is_paused || false,
      pausedAt: data.paused_at,
    };
  },

  // Find active session for user
  async findActiveSession(userId: string, companyId: string): Promise<ClarityBreak | null> {
    const { data, error } = await supabase
      .from('clarity_breaks')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as ClarityBreak;
  },
};

export const clarityBreakQueries = {
  fetchHistory: async (userId: string, companyId: string): Promise<ClarityBreak[]> => {
    logger.log('🔍 Fetching clarity break history for user:', userId, 'company:', companyId);
    
    const { data, error } = await supabase
      .from('clarity_breaks')
      .select('*, session_prompts')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .order('started_at', { ascending: false });

    if (error) {
      logger.error('❌ Error fetching clarity break history:', error);
      throw error;
    }
    
    logger.log('✅ Fetched clarity break history:', data?.length || 0, 'sessions');
    data?.forEach((session, index) => {
      logger.log(`📋 Session ${index + 1}:`, {
        id: session.id,
        started_at: session.started_at,
        ended_at: session.ended_at,
        has_prompts: !!session.session_prompts,
        prompts_count: session.session_prompts?.length || 0
      });
    });
    
    return data || [];
  },

  createSession: async (userId: string, companyId: string, durationMinutes: number, sessionPrompts: string[]): Promise<ClarityBreak> => {
    logger.log('🆕 Creating new clarity break session with prompts:', sessionPrompts.length);
    
    // Ensure we always have exactly 10 prompts
    if (sessionPrompts.length !== 10) {
      logger.error('❌ Invalid prompt count for new session:', sessionPrompts.length);
      throw new Error('Session must have exactly 10 prompts');
    }
    
    const { data, error } = await supabase
      .from('clarity_breaks')
      .insert({
        user_id: userId,
        company_id: companyId,
        duration_minutes: durationMinutes,
        session_prompts: sessionPrompts,
        started_at: new Date().toISOString(),
      })
      .select('*, session_prompts')
      .single();

    if (error) {
      logger.error('❌ Error creating clarity break session:', error);
      throw error;
    }
    
    logger.log('✅ Created clarity break session:', data.id, 'with', data.session_prompts?.length || 0, 'prompts');
    
    // Validate that prompts were saved correctly
    if (!data.session_prompts || data.session_prompts.length !== 10) {
      logger.error('❌ Session prompts not saved correctly:', data.session_prompts?.length || 0);
      throw new Error('Failed to save session prompts');
    }
    
    return data;
  },

  completeSession: async (breakId: string, userId: string, companyId: string, insights?: string): Promise<void> => {
    logger.log('🏁 Completing clarity break session:', breakId);
    
    const { error } = await supabase
      .from('clarity_breaks')
      .update({
        ended_at: new Date().toISOString(),
        insights,
      })
      .eq('id', breakId)
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (error) {
      logger.error('❌ Error completing clarity break session:', error);
      throw error;
    }
    
    logger.log('✅ Completed clarity break session:', breakId);
  },

  abandonSession: async (sessionId: string, userId: string, companyId: string): Promise<void> => {
    logger.log('🚫 Abandoning clarity break session:', sessionId);
    
    const { error } = await supabase
      .from('clarity_breaks')
      .update({
        ended_at: new Date().toISOString(),
        insights: 'Session abandoned',
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (error) {
      logger.error('❌ Error abandoning clarity break session:', error);
      throw error;
    }
    
    logger.log('✅ Abandoned clarity break session:', sessionId);
  }
};

export const clarityBreakEntryQueries = {
  fetchEntries: async (breakId: string, userId: string, companyId: string): Promise<ClarityBreakEntry[]> => {
    logger.log('📄 Fetching clarity break entries for session:', breakId);
    
    const { data, error } = await supabase
      .from('clarity_break_entries')
      .select(DEFAULT_SELECT_FIELDS)
      .eq('break_id', breakId)
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('❌ Error fetching clarity break entries:', error);
      throw error;
    }
    
    logger.log('✅ Fetched', data?.length || 0, 'clarity break entries');
    return data || [];
  },

  upsertEntry: async (
    breakId: string, 
    userId: string, 
    companyId: string, 
    prompt: string, 
    response: string
  ): Promise<void> => {
    // First try to update existing entry
    const { data: existingEntry } = await supabase
      .from('clarity_break_entries')
      .select('id')
      .eq('break_id', breakId)
      .eq('prompt', prompt)
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (existingEntry) {
      const { error } = await supabase
        .from('clarity_break_entries')
        .update({ response })
        .eq('id', existingEntry.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('clarity_break_entries')
        .insert({
          break_id: breakId,
          user_id: userId,
          company_id: companyId,
          prompt,
          response,
        });

      if (error) throw error;
    }
  }
};
