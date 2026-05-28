import { useEffect, useRef } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

export const useOrgChartOnboarding = () => {
  const { optimisticallyCompleteOrgChart, steps } = useOnboarding();
  const { currentCompany } = useMultiCompany();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    const checkMeaningfulOrgChart = async () => {
      if (!currentCompany?.id || hasCheckedRef.current) return;

      // Check if org chart step is already completed
      const orgChartStep = steps.find(step => step.id === 'org-chart');
      if (orgChartStep?.completed) {
        hasCheckedRef.current = true;
        return;
      }

      try {
        // 🎯 Robust org chart completion criteria - check multiple indicators
        
        // 1. Get all org roles for the company
        const { data: orgRoles } = await supabase
          .from('org_roles')
          .select('id, title, reports_to_role_id')
          .eq('company_id', currentCompany?.id);

        if (!orgRoles || orgRoles.length === 0) {
          logger.log('🎯 useOrgChartOnboarding: No org roles found');
          return;
        }

        // 2. Check for role assignments (people actually using the org chart)
        const { data: roleAssignments } = await supabase
          .from('role_assignments')
          .select('role_id')
          .in('role_id', orgRoles.map(role => role.id));

        // 3. Check for hierarchical structure (parent-child relationships)
        const hasHierarchy = orgRoles.some(role => role.reports_to_role_id !== null);
        
        // Determine if we have a meaningful org chart
        const criteriaChecks = {
          multipleRoles: orgRoles.length >= 2,
          hasAssignments: roleAssignments && roleAssignments.length > 0,
          hasHierarchy: hasHierarchy,
          totalRoles: orgRoles.length
        };

        logger.log('🎯 useOrgChartOnboarding: Org chart analysis:', criteriaChecks);

        // Complete if we have meaningful structure:
        // - At least 2 roles (indicating organizational thinking), OR
        // - Roles with actual people assigned, OR  
        // - Hierarchical relationships established
        const shouldComplete = criteriaChecks.multipleRoles || 
                              criteriaChecks.hasAssignments || 
                              criteriaChecks.hasHierarchy;

        if (shouldComplete) {
          logger.log('🎯 useOrgChartOnboarding: Meaningful org chart detected, triggering completion');
          optimisticallyCompleteOrgChart();
          hasCheckedRef.current = true;
        } else {
          logger.log('🎯 useOrgChartOnboarding: Org chart exists but lacks meaningful structure');
        }
      } catch (error) {
        logger.error('Error analyzing org chart structure:', error);
      }
    };

    checkMeaningfulOrgChart();
  }, [currentCompany?.id, steps, optimisticallyCompleteOrgChart]);

  // Reset check flag when company changes
  useEffect(() => {
    hasCheckedRef.current = false;
  }, [currentCompany?.id]);

  return { optimisticallyCompleteOrgChart };
};