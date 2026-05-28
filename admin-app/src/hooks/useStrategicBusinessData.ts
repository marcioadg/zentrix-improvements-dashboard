
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyScoped } from '@/hooks/useCompanyScoped';
import { 
  aggregateStrategicBusinessData, 
  formatStrategicDataForAI, 
  StrategicBusinessData 
} from '@/services/aiStrategicDataService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useStrategicBusinessData = () => {
  const { user } = useAuth();
  const { currentCompany, userRole, accessibleTeams, loading: companyScopedLoading } = useCompanyScoped();
  const { toast } = useToast();
  const [data, setData] = useState<StrategicBusinessData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const fetchStrategicData = useCallback(async (forceRefresh: boolean = false) => {
    if (!user || !currentCompany || !userRole || companyScopedLoading) {
      logger.log('Missing requirements for strategic data fetch:', {
        hasUser: !!user,
        hasCompany: !!currentCompany,
        hasRole: !!userRole,
        companyScopedLoading
      });
      return null;
    }

    // Check if we have recent data (within 5 minutes) and not forcing refresh
    if (!forceRefresh && data && lastFetchTime) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (lastFetchTime > fiveMinutesAgo) {
        logger.log('Using cached company-scoped strategic data (< 5 minutes old)');
        return data;
      }
    }

    logger.log('🔍 Fetching company-scoped strategic business data:', {
      userId: user.id,
      companyId: currentCompany?.id,
      companyName: currentCompany?.name,
      userLevel: userRole.level,
      accessibleTeamsCount: accessibleTeams.length
    });
    
    setLoading(true);
    
    try {
      const strategicData = await aggregateStrategicBusinessData(
        user.id,
        currentCompany?.id,
        userRole,
        accessibleTeams
      );
      
      if (strategicData) {
        logger.log('✅ Company-scoped strategic data fetched successfully:', {
          company: strategicData.company.name,
          userLevel: strategicData.userContext.level,
          metricsAnalyzed: strategicData.metrics.trends.length,
          constraintsIdentified: strategicData.insights.topConstraints.length,
          healthScore: strategicData.metrics.healthScore
        });
        
        setData(strategicData);
        setLastFetchTime(new Date());
        return strategicData;
      } else {
        logger.log('❌ No strategic data available for current company/role');
        toast({
          title: "Limited Data Available",
          description: "Some business data may not be available for your current role level.",
          variant: "default"
        });
        return null;
      }
    } catch (error) {
      logger.error('❌ Error fetching company-scoped strategic business data:', error);
      toast({
        title: "Error",
        description: "Failed to load your business intelligence data. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany, userRole, accessibleTeams, companyScopedLoading, toast, data, lastFetchTime]);

  const getFormattedDataForAI = useCallback((data?: StrategicBusinessData) => {
    const dataToFormat = data || data;
    if (!dataToFormat || !userRole) {
      logger.log('No strategic data or user role available for AI formatting');
      return '';
    }
    
    const formatted = formatStrategicDataForAI(dataToFormat, userRole);
    logger.log('📊 Formatted company-scoped strategic data for AI, length:', formatted.length);
    return formatted;
  }, [data, userRole]);

  const refreshData = useCallback(async () => {
    return await fetchStrategicData(true);
  }, [fetchStrategicData]);

  return {
    data,
    loading: loading || companyScopedLoading,
    lastFetchTime,
    fetchStrategicData,
    refreshData,
    getFormattedDataForAI,
    currentCompany,
    userRole
  };
};
