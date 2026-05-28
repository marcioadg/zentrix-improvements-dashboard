import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCompanyScoped } from '@/hooks/useCompanyScoped';
import { logger } from '@/utils/logger';

interface DelegateElevateSession {
  id: string;
  user_id: string;
  team_id?: string;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export const useDelegateElevateSessions = () => {
  const [sessions, setSessions] = useState<DelegateElevateSession[]>([]);
  const [currentSession, setCurrentSession] = useState<DelegateElevateSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentCompany, loading: companyLoading } = useCompanyScoped();

  const fetchSessions = useCallback(async () => {
    if (!user || companyLoading || !currentCompany) {
      logger.log('⏭️ useDelegateElevateSessions: Skipping fetch - conditions not met', {
        hasUser: !!user,
        userEmail: user?.email,
        companyLoading,
        hasCurrentCompany: !!currentCompany,
        currentCompanyId: currentCompany?.id,
        currentCompanyName: currentCompany?.name
      });
      return;
    }

    setLoading(true);
    logger.log('🔍 useDelegateElevateSessions: Fetching sessions for user:', user.id, 'company:', currentCompany?.id);
    
    try {
      const { data, error } = await supabase
        .from('delegate_elevate_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', currentCompany?.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ useDelegateElevateSessions: Database error:', error);
        toast({
          title: "Error",
          description: "Failed to fetch sessions",
          variant: "destructive",
        });
        setSessions([]);
        return;
      }

      logger.log('✅ useDelegateElevateSessions: Sessions fetched successfully:', data?.length || 0);
      setSessions(data || []);
      
      // Set current session to the most recent one if none exists
      setCurrentSession(prev => {
        if (!prev && data && data.length > 0) {
          return data[0];
        }
        return prev;
      });
    } catch (error) {
      logger.error('❌ useDelegateElevateSessions: Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sessions",
        variant: "destructive",
      });
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany, companyLoading]);

  const createSession = useCallback(async () => {
    if (!user || !currentCompany) return null;

    try {
      const { data, error } = await supabase
        .from('delegate_elevate_sessions')
        .insert({
          user_id: user.id,
          company_id: currentCompany?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => [data, ...prev]);
      setCurrentSession(data);
      
      toast({
        title: "Success",
        description: "New session created",
      });

      return data;
    } catch (error) {
      logger.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
      return null;
    }
  }, [user, currentCompany]);

  const switchSession = useCallback((session: DelegateElevateSession) => {
    setCurrentSession(session);
  }, []);

  useEffect(() => {
    if (!companyLoading) {
      fetchSessions();
    }
  }, [fetchSessions, companyLoading]);

  // Auto-create session if user has none and company is loaded
  useEffect(() => {
    logger.log('🔄 useDelegateElevateSessions: Auto-create session check', {
      loading,
      companyLoading,
      hasUser: !!user,
      userEmail: user?.email,
      hasCompany: !!currentCompany,
      companyId: currentCompany?.id,
      companyName: currentCompany?.name,
      sessionsCount: sessions.length
    });

    if (!loading && !companyLoading && user && currentCompany && sessions.length === 0) {
      logger.log('🔄 useDelegateElevateSessions: Creating new session automatically for user:', user.email);
      createSession().then(session => {
        if (!session) {
          logger.error('❌ Failed to create session for user:', user.email, 'company:', currentCompany?.name);
        }
      });
    }
  }, [loading, companyLoading, user?.id, currentCompany?.id, sessions.length]);

  return {
    sessions,
    currentSession,
    loading: loading || companyLoading,
    createSession,
    switchSession,
    refetchSessions: fetchSessions,
  };
};