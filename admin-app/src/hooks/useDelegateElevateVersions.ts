import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCompanyScoped } from '@/hooks/useCompanyScoped';
import { logger } from '@/utils/logger';

interface DelegateElevateVersion {
  id: string;
  session_id: string;
  snapshot: any;
  created_at: string;
  created_by?: string;
}

export const useDelegateElevateVersions = (sessionId?: string) => {
  const [versions, setVersions] = useState<DelegateElevateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentCompany, loading: companyLoading } = useCompanyScoped();

  const fetchVersions = useCallback(async () => {
    if (!sessionId || !user || companyLoading || !currentCompany) {
      logger.log('⏭️ useDelegateElevateVersions: Skipping fetch - conditions not met', {
        hasSessionId: !!sessionId,
        hasUser: !!user,
        companyLoading,
        hasCurrentCompany: !!currentCompany
      });
      return;
    }

    setLoading(true);
    logger.log('🔍 useDelegateElevateVersions: Fetching versions for session:', sessionId);
    
    try {
      const { data, error } = await supabase
        .from('delegate_elevate_versions')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ useDelegateElevateVersions: Database error:', error);
        toast({
          title: "Error",
          description: "Failed to fetch versions",
          variant: "destructive",
        });
        setVersions([]);
        return;
      }

      logger.log('✅ useDelegateElevateVersions: Versions fetched successfully:', data?.length || 0);
      setVersions(data || []);
    } catch (error) {
      logger.error('❌ useDelegateElevateVersions: Error fetching versions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch versions",
        variant: "destructive",
      });
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, user, currentCompany, companyLoading]);

  const saveVersion = useCallback(async (snapshot: any) => {
    if (!sessionId || !user || !currentCompany) return null;

    try {
      const { data, error } = await supabase
        .from('delegate_elevate_versions')
        .insert({
          session_id: sessionId,
          snapshot,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setVersions(prev => [data, ...prev]);
      
      toast({
        title: "Success",
        description: "Version saved",
      });

      return data;
    } catch (error) {
      logger.error('Error saving version:', error);
      toast({
        title: "Error",
        description: "Failed to save version",
        variant: "destructive",
      });
      return null;
    }
  }, [sessionId, user, currentCompany]);

  useEffect(() => {
    if (!companyLoading) {
      fetchVersions();
    }
  }, [fetchVersions, companyLoading]);

  return {
    versions,
    loading: loading || companyLoading,
    saveVersion,
    refetchVersions: fetchVersions,
  };
};