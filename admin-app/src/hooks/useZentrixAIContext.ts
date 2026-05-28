import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { aggregateZentrixContext, formatZentrixContextForAI, formatZentrixContextForHuman, formatZentrixContextByCategoryForHuman, ZentrixAIContext } from '@/services/zentrixAIDataService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useZentrixAIContext = (
  viewContext: 'company' | 'team' | 'personal' = 'company',
  entityId?: string,
  impersonatedUserId?: string
) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  const [context, setContext] = useState<ZentrixAIContext | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchContext = useCallback(async () => {
    if (!user || !currentCompany) {
      logger.log('❌ No user or company for Zentrix AI context');
      return null;
    }

    const effectiveUserId = impersonatedUserId || user.id;

    logger.log('🔍 Fetching Zentrix AI context:', {
      actualUserId: user.id,
      impersonatedUserId: impersonatedUserId,
      effectiveUserId: effectiveUserId,
      companyId: currentCompany?.id,
      companyName: currentCompany?.name,
      viewContext,
      entityId
    });

    if (impersonatedUserId) {
      logger.log('🎭 Super admin impersonation active:', {
        actualUser: user.id,
        impersonatedUser: impersonatedUserId
      });
    }

    setLoading(true);
    try {
      const zentrixContext = await aggregateZentrixContext(
        effectiveUserId,
        currentCompany?.id,
        viewContext,
        entityId
      );

      logger.log('✅ Zentrix AI context loaded:', {
        company: zentrixContext.hierarchy.company.name,
        teamsCount: zentrixContext.hierarchy.teams.length,
        metricsCount: zentrixContext.hierarchy.teams.reduce((acc, t) => acc + t.metrics.length, 0),
        rocksCount: zentrixContext.hierarchy.teams.reduce((acc, t) => acc + t.quarterly_goals.length, 0),
        issuesCount: zentrixContext.hierarchy.teams.reduce((acc, t) => acc + t.issues.length, 0)
      });

      setContext(zentrixContext);
      return zentrixContext;
    } catch (error) {
      logger.error('❌ Error fetching Zentrix AI context:', error);
      toast({
        title: 'Error',
        description: 'Failed to load business context. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany, viewContext, entityId, impersonatedUserId]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    // Validate scope before fetching
    if (viewContext === 'team' && !entityId) {
      logger.warn('⚠️ Team context requires entityId');
    }
    
    logger.log('🎯 AI Context Scope:', {
      level: viewContext,
      entity: entityId,
      note: 'Data will be filtered to this scope only'
    });
    
    fetchContext();
  }, [fetchContext]);

  const formatted = context ? formatZentrixContextForAI(context) : '';
  const formattedForHuman = context ? formatZentrixContextForHuman(context) : '';
  const formattedByCategory = context ? formatZentrixContextByCategoryForHuman(context) : '';

  return {
    context,
    loading,
    refresh: fetchContext,
    formatted,
    formattedForHuman,
    formattedByCategory
  };
};
