

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { aggregateBusinessData, formatDataForAI, ComprehensiveBusinessData } from '@/services/aiDataService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useBusinessData = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  const [data, setData] = useState<ComprehensiveBusinessData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBusinessData = useCallback(async () => {
    if (!user || !currentCompany) {
      logger.log('❌ No user or company found for business data fetch', { user: !!user, company: !!currentCompany });
      toast({
        title: "Authentication required",
        description: "Please sign in and select a company to access your business data.",
        variant: "destructive"
      });
      return null;
    }

logger.log('🔍 Fetching company-scoped business data for user:', user.id, 'company:', currentCompany?.name);
setLoading(true);
try {
  const businessData = await aggregateBusinessData(user.id, currentCompany?.id);
  logger.log('✅ Company-scoped business data with trends fetched successfully:', {
    companyId: businessData.company.id,
    companyName: businessData.company.name,
    metricsCount: businessData.metrics.current.length,
    metricsWithTrends: businessData.metrics.withTrends.length,
    decliningMetricsCount: businessData.summary.decliningMetricsCount,
    improvingMetricsCount: businessData.summary.improvingMetricsCount,
    metricsLikelyToMiss: businessData.summary.metricsLikelyToMiss,
    trendMomentum: businessData.summary.trendMomentum,
    redMetricsCount: businessData.summary.redMetricsCount,
    tasksCount: businessData.tasks.personal.length + businessData.tasks.team.length,
    issuesCount: businessData.issues.unresolved.length,
    healthScore: businessData.summary.teamHealthScore
  });
  setData(businessData);
  return businessData;
} catch (error) {
  logger.error('❌ Error fetching company-scoped business data with trends:', error);
  toast({
    title: "Error",
    description: "Failed to load your company's business data and trend analysis. Please try again.",
    variant: "destructive"
  });
  return null;
} finally {
  setLoading(false);
}
  }, [user, currentCompany, toast]);

  const getFormattedDataForAI = useCallback(() => {
    if (!data) {
      logger.log('⚠️ No business data available for AI formatting');
      return '';
    }
    const formatted = formatDataForAI(data);
    logger.log('📊 Formatted company-scoped data with trend analysis for AI:', {
      companyName: data.company.name,
      dataLength: formatted.length,
      metricsIncluded: data.metrics.current.length,
      trendsIncluded: data.metrics.withTrends.length,
      decliningMetrics: data.metrics.declining.length,
      improvingMetrics: data.metrics.improving.length,
      trendMomentum: data.summary.trendMomentum
    });
    return formatted;
  }, [data]);

  return {
    data,
    loading,
    fetchBusinessData,
    getFormattedDataForAI
  };
};

