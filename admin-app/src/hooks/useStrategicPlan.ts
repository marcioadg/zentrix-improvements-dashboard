
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { StrategyData, SwotData } from '@/contexts/StrategyContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface StrategicPlan {
  id: string;
  company_id: string;
  plan_data: StrategyData;
  swot_data?: any;
  created_by: string;
  updated_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StrategicPlanVersion {
  id: string;
  strategic_plan_id: string;
  plan_data: StrategyData;
  version_number: number;
  change_summary?: string;
  created_by: string;
  created_at: string;
}

export const useStrategicPlan = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'draft' | 'saving' | 'error'>('saved');
  
  // Improved debounced saving state
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');
  const saveAttemptsRef = useRef(0);
  const maxRetries = 3;

  logger.log('🔍 useStrategicPlan: User:', user?.id, 'Company:', currentCompany?.id);

  // Fetch active strategic plan
  const { data: strategicPlan, isLoading, error } = useQuery({
    queryKey: ['strategic-plan', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) {
        logger.log('⚠️ useStrategicPlan: No current company selected');
        return null;
      }
      
      logger.log('🔍 useStrategicPlan: Fetching strategic plan for company:', currentCompany?.id);
      
      const { data, error } = await supabase
        .from('strategic_plans')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('❌ useStrategicPlan: Error fetching strategic plan:', error);
        throw error;
      }
      
      if (!data) {
        logger.log('📝 useStrategicPlan: No strategic plan found for company');
        return null;
      }

      logger.log('✅ useStrategicPlan: Strategic plan found:', data.id);
      
      const planData = data.plan_data as unknown as StrategyData;
      
      let swotData: SwotData;
      if (data.swot_data && typeof data.swot_data === 'object') {
        const rawSwotData = data.swot_data as any;
        swotData = {
          strengths: Array.isArray(rawSwotData.strengths) ? rawSwotData.strengths : [],
          weaknesses: Array.isArray(rawSwotData.weaknesses) ? rawSwotData.weaknesses : [],
          opportunities: Array.isArray(rawSwotData.opportunities) ? rawSwotData.opportunities : [],
          threats: Array.isArray(rawSwotData.threats) ? rawSwotData.threats : [],
        };
      } else {
        swotData = {
          strengths: [],
          weaknesses: [],
          opportunities: [],
          threats: [],
        };
      }

      const result = {
        id: data.id,
        company_id: data.company_id,
        plan_data: {
          ...planData,
          swotData,
        },
        swot_data: data.swot_data,
        created_by: data.created_by,
        updated_by: data.updated_by,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as StrategicPlan;

      // Set initial saved data reference
      lastSavedDataRef.current = JSON.stringify(result.plan_data);
      
      return result;
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch versions
  const { data: versions } = useQuery({
    queryKey: ['strategic-plan-versions', strategicPlan?.id],
    queryFn: async () => {
      if (!strategicPlan?.id) return [];
      
      const { data, error } = await supabase
        .from('strategic_plan_versions')
        .select('*')
        .eq('strategic_plan_id', strategicPlan.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(version => ({
        ...version,
        plan_data: version.plan_data as unknown as StrategyData
      })) as StrategicPlanVersion[];
    },
    enabled: !!strategicPlan?.id,
  });

  // Data validation function
  const validatePlanData = (planData: StrategyData): boolean => {
    try {
      // Ensure all required fields exist
      if (typeof planData !== 'object' || planData === null) {
        logger.error('❌ Plan data is not an object');
        return false;
      }

      // Validate core structure
      if (!planData.hasOwnProperty('purpose') || 
          !planData.hasOwnProperty('coreValues') ||
          !planData.hasOwnProperty('swotData')) {
        logger.error('❌ Plan data missing required fields');
        return false;
      }

      // Validate arrays
      if (!Array.isArray(planData.coreValues) || 
          !Array.isArray(planData.quarterlyPriorities) ||
          !Array.isArray(planData.issues)) {
        logger.error('❌ Plan data arrays are invalid');
        return false;
      }

      // Validate SWOT data
      if (!planData.swotData || 
          !Array.isArray(planData.swotData.strengths) ||
          !Array.isArray(planData.swotData.weaknesses) ||
          !Array.isArray(planData.swotData.opportunities) ||
          !Array.isArray(planData.swotData.threats)) {
        logger.error('❌ SWOT data is invalid');
        return false;
      }

      logger.log('✅ Plan data validation passed');
      return true;
    } catch (error) {
      logger.error('❌ Plan data validation error:', error);
      return false;
    }
  };

  const retryLastSave = useCallback(() => {
    const draftData = localStorage.getItem('strategy-draft');
    if (draftData) {
      try {
        const parsedData = JSON.parse(draftData);
        logger.log('🔄 Retrying last save from draft');
        saveAttemptsRef.current = 0; // Reset attempts
        savePlanMutation.mutate(parsedData);
      } catch (error) {
        logger.error('Failed to parse draft data for retry:', error);
        toast({
          title: "Retry Failed",
          description: "Could not parse saved draft data.",
          variant: "destructive",
        });
      }
    }
  }, []);

  // Create or update strategic plan with retry logic
  const savePlanMutation = useMutation({
    mutationFn: async (planData: StrategyData) => {
      logger.log('💾 useStrategicPlan: Starting save operation, attempt:', saveAttemptsRef.current + 1);
      
      if (!currentCompany?.id || !user?.id) {
        const error = 'User not authenticated or no company selected';
        logger.error('❌ useStrategicPlan:', error);
        throw new Error(error);
      }

      // Validate data before saving
      if (!validatePlanData(planData)) {
        throw new Error('Invalid plan data structure');
      }

      // Create deep clone to avoid mutations
      const clonedPlanData = JSON.parse(JSON.stringify(planData));
      const { swotData, ...restPlanData } = clonedPlanData;
      
      // Ensure proper serialization
      const planDataJson = restPlanData;
      const swotDataJson = swotData;

      if (strategicPlan) {
        logger.log('🔄 useStrategicPlan: Updating existing plan:', strategicPlan.id);
        
        const { data, error } = await supabase
          .from('strategic_plans')
          .update({
            plan_data: planDataJson,
            swot_data: swotDataJson,
            updated_by: user.id,
          })
          .eq('id', strategicPlan.id)
          .select()
          .single();

        if (error) {
          logger.error('❌ useStrategicPlan: Error updating plan:', error);
          throw error;
        }
        
        logger.log('✅ useStrategicPlan: Plan updated successfully');
        
        const planDataResponse = data.plan_data as unknown as StrategyData;
        const swotDataResponse = data.swot_data as any;
        
        return {
          id: data.id,
          company_id: data.company_id,
          plan_data: {
            ...planDataResponse,
            swotData: swotDataResponse || swotData,
          },
          swot_data: data.swot_data,
          created_by: data.created_by,
          updated_by: data.updated_by,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at,
        } as StrategicPlan;
      } else {
        logger.log('📝 useStrategicPlan: Creating new plan for company:', currentCompany?.id);
        
        // Dispatch optimistic event for onboarding
        logger.log('🎯 useStrategicPlan: Dispatching optimistic strategy creation event for onboarding');
        window.dispatchEvent(new CustomEvent('optimistic-strategy-creation'));
        
        const { data, error } = await supabase
          .from('strategic_plans')
          .insert({
            company_id: currentCompany?.id,
            plan_data: planDataJson,
            swot_data: swotDataJson,
            created_by: user.id,
            updated_by: user.id,
          })
          .select()
          .single();

        if (error) {
          logger.error('❌ useStrategicPlan: Error creating plan:', error);
          throw error;
        }
        
        logger.log('✅ useStrategicPlan: Plan created successfully:', data.id);
        
        const planDataResponse = data.plan_data as unknown as StrategyData;
        const swotDataResponse = data.swot_data as any;
        
        return {
          id: data.id,
          company_id: data.company_id,
          plan_data: {
            ...planDataResponse,
            swotData: swotDataResponse || swotData,
          },
          swot_data: data.swot_data,
          created_by: data.created_by,
          updated_by: data.updated_by,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at,
        } as StrategicPlan;
      }
    },
    onMutate: () => {
      logger.log('🔄 useStrategicPlan: Save mutation started');
      setSaveStatus('saving');
      isSavingRef.current = true;
      saveAttemptsRef.current++;
    },
    onSuccess: (data) => {
      logger.log('✅ useStrategicPlan: Save completed successfully');
      setSaveStatus('saved');
      isSavingRef.current = false;
      saveAttemptsRef.current = 0;
      lastSavedDataRef.current = JSON.stringify(data.plan_data);
      queryClient.invalidateQueries({ queryKey: ['strategic-plan'] });
      queryClient.invalidateQueries({ queryKey: ['strategic-plan-versions'] });
    },
    onError: (error) => {
      logger.error('❌ useStrategicPlan: Save failed:', error);
      isSavingRef.current = false;
      
      // Retry logic
      if (saveAttemptsRef.current < maxRetries) {
        logger.log(`🔄 Retrying save (${saveAttemptsRef.current}/${maxRetries})`);
        setSaveStatus('draft');
        // Retry after a short delay
        setTimeout(() => {
          const lastData = localStorage.getItem('strategy-draft');
          if (lastData) {
            try {
              const parsedData = JSON.parse(lastData);
              savePlanMutation.mutate(parsedData);
            } catch (parseError) {
              logger.error('Failed to parse draft data:', parseError);
              setSaveStatus('error');
            }
          }
        }, 1000 * saveAttemptsRef.current); // Exponential backoff
      } else {
        setSaveStatus('error');
        saveAttemptsRef.current = 0;
        toast({
          title: "Save Error",
          description: error instanceof Error ? error.message : "Failed to save strategic plan. Your changes are stored locally.",
          variant: "destructive",
        });
      }
    },
  });

  // Improved debounced save function with better UX
  const debouncedSave = useCallback((planData: StrategyData) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Don't start new save if already saving
    if (isSavingRef.current) {
      logger.log('⏸️ useStrategicPlan: Save already in progress, queuing update');
      // Store data locally for retry
      localStorage.setItem('strategy-draft', JSON.stringify(planData));
      return;
    }

    // Check if data actually changed
    const currentDataString = JSON.stringify(planData);
    if (currentDataString === lastSavedDataRef.current) {
      logger.log('⏸️ useStrategicPlan: No changes detected, skipping save');
      setSaveStatus('saved');
      return;
    }

    logger.log('⏱️ useStrategicPlan: Debounced save timer started (800ms)');
    setSaveStatus('draft');
    
    // Store draft locally
    localStorage.setItem('strategy-draft', JSON.stringify(planData));
    
    saveTimeoutRef.current = setTimeout(() => {
      logger.log('🚀 useStrategicPlan: Debounced save triggered');
      savePlanMutation.mutate(planData);
    }, 800); // Reduced from 2000ms to 800ms for better UX
  }, [savePlanMutation]);

  const savePlan = useCallback((planData?: StrategyData) => {
    if (!planData) {
      logger.warn('⚠️ useStrategicPlan: No data to save');
      return;
    }
    
    logger.log('💾 useStrategicPlan: Manual save triggered');
    
    // Clear debounce timeout for immediate save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Clear local draft on manual save
    localStorage.removeItem('strategy-draft');
    
    savePlanMutation.mutate(planData);
  }, [savePlanMutation]);

  const updatePlanData = useCallback((planData: StrategyData) => {
    logger.log('📝 useStrategicPlan: Plan data updated, starting debounced save');
    debouncedSave(planData);
  }, [debouncedSave]);

  const restoreVersion = useCallback(async (versionId: string) => {
    const version = versions?.find(v => v.id === versionId);
    if (!version) return;

    try {
      logger.log('🔄 useStrategicPlan: Restoring version:', versionId);
      await savePlanMutation.mutateAsync(version.plan_data);
      toast({
        title: "Version Restored",
        description: `Successfully restored to version ${version.version_number}`,
      });
    } catch (error) {
      logger.error('❌ useStrategicPlan: Version restore failed:', error);
      toast({
        title: "Restore Error",
        description: "Failed to restore version. Please try again.",
        variant: "destructive"
      });
    }
  }, [versions, savePlanMutation, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcut for manual save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        const draftData = localStorage.getItem('strategy-draft');
        if (draftData) {
          try {
            const parsedData = JSON.parse(draftData);
            savePlan(parsedData);
          } catch (error) {
            logger.error('Failed to save via keyboard shortcut:', error);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [savePlan]);

  return {
    strategicPlan,
    versions: versions || [],
    isLoading,
    error,
    saveStatus,
    savePlan,
    updatePlanData,
    restoreVersion,
    retryLastSave,
  };
};
