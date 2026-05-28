
import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { StrategyData } from '@/contexts/StrategyContext';
import { logger } from '@/utils/logger';

// Extract the strategic plan query function for reuse in prefetching
export const fetchStrategicPlan = async (companyId: string | undefined, teamId: string | null, userId: string | undefined) => {
  if (!companyId || !teamId || !userId) {
    logger.log('⚠️ Missing required parameters for strategic plan fetch');
    return null;
  }
  
  logger.log('🔍 Fetching strategic plan for team:', teamId, 'in company:', companyId);
  
  // First, check if the current team is a leadership team
  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .select('is_leadership')
    .eq('id', teamId)
    .single();

  if (teamError) {
    logger.error('❌ Error checking team leadership:', teamError);
    throw teamError;
  }

  const isLeadershipTeam = teamData?.is_leadership || false;
  logger.log('🎯 Team leadership status:', { teamId, isLeadershipTeam });

  if (isLeadershipTeam) {
    // For leadership teams, fetch their own strategic plan
    const { data, error } = await supabase
      .from('strategic_plans')
      .select('*')
      .eq('company_id', companyId)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('❌ Error fetching leadership strategic plan:', error);
      throw error;
    }
    
    logger.log('✅ Leadership strategic plan result:', { found: !!data, id: data?.id });
    return data ? { ...data, team_is_leadership: true } : null;
  } else {
    // For non-leadership teams, get the leadership team's strategic plan as base
    logger.log('🔍 Fetching leadership team strategic plan for non-leadership team');
    
    // Find the leadership team in the same company
    const { data: leadershipTeam, error: leadershipError } = await supabase
      .from('teams')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_leadership', true)
      .single();

    if (leadershipError || !leadershipTeam) {
      logger.log('⚠️ No leadership team found in company');
      return null;
    }

    logger.log('🎯 Found leadership team:', leadershipTeam.id);

    // Get the leadership team's strategic plan
    const { data: leadershipPlan, error: leadershipPlanError } = await supabase
      .from('strategic_plans')
      .select('*')
      .eq('company_id', companyId)
      .eq('team_id', leadershipTeam.id)
      .eq('is_active', true)
      .single();

    if (leadershipPlanError && leadershipPlanError.code !== 'PGRST116') {
      logger.error('❌ Error fetching leadership strategic plan:', leadershipPlanError);
      throw leadershipPlanError;
    }

    if (!leadershipPlan) {
      logger.log('⚠️ No leadership strategic plan found');
      return null;
    }

    // Check if this non-leadership team has its own partial plan (for marketing/milestones)
    const { data: teamPlan, error: teamPlanError } = await supabase
      .from('strategic_plans')
      .select('*')
      .eq('company_id', companyId)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .single();

    if (teamPlanError && teamPlanError.code !== 'PGRST116') {
      logger.error('❌ Error fetching team strategic plan:', teamPlanError);
      // Continue with just leadership data
    }

    // Merge leadership plan with team-specific overrides
    const shareOn = leadershipPlan.company_shared === true;
    
    // ✅ CRITICAL FIX: Build quarterlyGoals explicitly FIRST to prevent incorrect values from being copied
    // This ensures quarterlyGoals is ALWAYS constructed from teamQuarterlyGoals and leadershipQuarterlyGoals,
    // never inherited from a spread that might contain corrupted data
    const buildQuarterlyGoals = () => {
      const teamQuarterlyGoals = teamPlan?.plan_data?.quarterlyGoals || {};
      const leadershipQuarterlyGoals = leadershipPlan.plan_data?.quarterlyGoals || {};
      
      if (!shareOn) return teamQuarterlyGoals;
      
      return {
        ...teamQuarterlyGoals,
        revenue: teamQuarterlyGoals.revenue || leadershipQuarterlyGoals.revenue || '',
        profit: teamQuarterlyGoals.profit || leadershipQuarterlyGoals.profit || '',
        // metricTargets remain team-owned (no fallback to leadership)
        metricTargets: teamQuarterlyGoals.metricTargets || [],
        targetDate: teamQuarterlyGoals.targetDate || leadershipQuarterlyGoals.targetDate || undefined,
      };
    };
    
    const mergedPlan = {
      ...leadershipPlan,
      id: teamPlan?.id, // Use team plan ID if exists, otherwise undefined (will create new)
      team_id: teamId, // Always use current team ID
      team_is_leadership: false, // Expose leadership flag for normal teams
      // Keep leadership data as base, but override with team-specific data if exists
      plan_data: teamPlan?.plan_data || leadershipPlan.plan_data ? {
        // ✅ CRITICAL FIX: Build plan_data explicitly, ensuring quarterlyGoals is constructed correctly
        // Spread leadership plan_data but IMMEDIATELY override quarterlyGoals with explicitly constructed value
        ...leadershipPlan.plan_data,
        // ✅ OVERRIDE quarterlyGoals FIRST to prevent any incorrect values from being used
        quarterlyGoals: buildQuarterlyGoals(),
        // Preserve team-specific hidden leadership arrays
        hiddenLeadershipAnnualMetricIds: teamPlan?.plan_data?.hiddenLeadershipAnnualMetricIds || [],
        hiddenLeadershipQuarterlyMetricIds: teamPlan?.plan_data?.hiddenLeadershipQuarterlyMetricIds || [],
        // Merge oneYearGoals with fallback when sharing is ON (but keep metricTargets team-owned)
        oneYearGoals: (() => {
          const teamOneYearGoals = teamPlan?.plan_data?.oneYearGoals || {};
          const leadershipOneYearGoals = leadershipPlan.plan_data?.oneYearGoals || {};
          
          if (!shareOn) return teamOneYearGoals;
          
          return {
            ...teamOneYearGoals,
            revenue: teamOneYearGoals.revenue || leadershipOneYearGoals.revenue || '',
            profit: teamOneYearGoals.profit || leadershipOneYearGoals.profit || '',
            // metricTargets remain team-owned (no fallback to leadership)
            metricTargets: teamOneYearGoals.metricTargets || [],
            targetDate: teamOneYearGoals.targetDate || leadershipOneYearGoals.targetDate || undefined,
          };
        })(),
        // Only merge marketing and milestones from team plan
        marketing: (() => {
          const teamMarketing = teamPlan?.plan_data?.marketing;
          const leadershipMarketing = leadershipPlan.plan_data?.marketing;
          
          // If no team marketing, use leadership marketing
          if (!teamMarketing) {
            return leadershipMarketing;
          }
          
          // If leadership sharing is enabled, use fallback logic like revenue/profit
          if (leadershipPlan.company_shared && leadershipMarketing) {
            return {
              ...teamMarketing,
              // All fields use fallback logic: team value first, then leadership value (like revenue/profit)
              niche: teamMarketing.niche || leadershipMarketing.niche,
              targetMarket: teamMarketing.targetMarket || leadershipMarketing.targetMarket,
              process: teamMarketing.process || leadershipMarketing.process,
              guarantee: teamMarketing.guarantee || leadershipMarketing.guarantee,
              // Competitive advantages always shared from leadership (deep copy arrays)
              competitiveAdvantages: leadershipMarketing.competitiveAdvantages ? 
                (Array.isArray(leadershipMarketing.competitiveAdvantages) ?
                  leadershipMarketing.competitiveAdvantages.map(item => ({ ...item })) :
                  leadershipMarketing.competitiveAdvantages) : [],
            };
          }
          
          // Otherwise use team marketing as-is
          return teamMarketing;
        })(),
        threeYearMilestones: (() => {
          const teamMilestones = teamPlan?.plan_data?.threeYearMilestones;
          const leadershipMilestones = leadershipPlan.plan_data?.threeYearMilestones;
          
          // If no team milestones, use leadership milestones
          if (!teamMilestones) {
            return leadershipMilestones;
          }
          
          // If leadership sharing is enabled, share values and always override keyDescriptors and whatItLooksLike
          if (leadershipPlan.company_shared && leadershipMilestones) {
            return {
              ...teamMilestones,
              // Revenue/profit: only use leadership values if team values are empty (existing fallback logic)
              revenue: teamMilestones.revenue || leadershipMilestones.revenue,
              profit: teamMilestones.profit || leadershipMilestones.profit,
              // Key Metrics and What It Looks Like: always use leadership values when sharing is enabled (deep copy arrays)
              keyDescriptors: leadershipMilestones.keyDescriptors,
              whatItLooksLike: leadershipMilestones.whatItLooksLike ? 
                leadershipMilestones.whatItLooksLike.map(item => ({ ...item })) : []
            };
          }
          
          // Otherwise use team milestones as-is
          return teamMilestones;
        })()
      } : leadershipPlan.plan_data,
      swot_data: teamPlan?.swot_data || leadershipPlan.swot_data,
      // Add leadership reference for filtering
      leadership_reference: {
        threeYearMilestones: leadershipPlan.plan_data?.threeYearMilestones,
        oneYearGoals: leadershipPlan.plan_data?.oneYearGoals,
        quarterlyGoals: leadershipPlan.plan_data?.quarterlyGoals,
        yearlyGoals: leadershipPlan.plan_data?.yearlyGoals,
        marketing: {
          ...leadershipPlan.plan_data?.marketing,
          // Ensure niche compatibility - use marketing.niche or fallback to top-level niche
          niche: leadershipPlan.plan_data?.marketing?.niche ?? leadershipPlan.plan_data?.niche ?? ''
        }
      }
    };

    logger.log('✅ Merged strategic plan result:', { 
      leadershipPlanId: leadershipPlan.id,
      teamPlanId: teamPlan?.id,
      mergedId: mergedPlan.id
    });

    return mergedPlan;
  }
};

export const useSimpleStrategyPersistence = (teamId?: string | null) => {
  const { user, session } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  logger.log('🔍 useSimpleStrategyPersistence: Auth State:', {
    userId: user?.id,
    companyId: currentCompany?.id,
    teamId: teamId,
    hasSession: !!session,
    sessionAccessToken: session?.access_token ? 'present' : 'missing'
  });

  // Fetch strategic plan using the extracted function
  const { data: strategicPlan, isLoading, isFetching, error } = useQuery({
    queryKey: ['simple-strategic-plan', currentCompany?.id, teamId],
    queryFn: () => fetchStrategicPlan(currentCompany?.id, teamId, user?.id),
    enabled: !!currentCompany?.id && !!user?.id && !!teamId,
    staleTime: 30000, // 30 seconds - reasonable freshness without over-fetching
    refetchOnMount: false, // Don't automatically refetch on mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
    placeholderData: keepPreviousData, // Keep previous data while fetching new data
  });

  // Fetch versions for current strategic plan (only manual snapshots)
  const { data: versions = [] } = useQuery({
    queryKey: ['simple-strategic-plan-versions', strategicPlan?.id],
    queryFn: async () => {
      if (!strategicPlan?.id) return [];
      
      logger.log('🔍 Fetching manual versions for plan:', strategicPlan.id);
      
      const { data, error } = await supabase
        .from('strategic_plan_versions')
        .select('*')
        .eq('strategic_plan_id', strategicPlan.id)
        .neq('change_summary', 'Auto-saved version')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ Error fetching versions:', error);
        throw error;
      }
      
      logger.log('✅ Fetched', data?.length || 0, 'manual versions');
      return data || [];
    },
    enabled: !!strategicPlan?.id,
  });

  // Save mutation with enhanced error handling (no toasts, no query invalidation for optimistic updates)
  const saveMutation = useMutation({
    mutationFn: async (planData: StrategyData) => {
      logger.log('💾 Starting strategic plan save operation');
      
      // Validate authentication state
      if (!user?.id) {
        logger.error('❌ No authenticated user for save operation');
        throw new Error('User not authenticated');
      }

      if (!session?.access_token) {
        logger.error('❌ No valid session token for save operation');
        throw new Error('No valid session token');
      }

      if (!currentCompany?.id) {
        logger.error('❌ No company selected for save operation');
        throw new Error('No company selected');
      }

      if (!teamId) {
        logger.error('❌ No team selected for save operation');
        throw new Error('No team selected');
      }

      logger.log('✅ Authentication validated:', {
        userId: user.id,
        companyId: currentCompany?.id,
        hasToken: !!session.access_token
      });

      // Check if this is a leadership team before saving
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('is_leadership')
        .eq('id', teamId)
        .single();

      if (teamError) {
        logger.error('❌ Error checking team leadership:', teamError);
        throw teamError;
      }

      const isLeadershipTeam = teamData?.is_leadership || false;
      
      // Store old targets for propagation if this is a leadership team
      let oldRevenueTarget = '';
      let oldProfitTarget = '';
      // Store old oneYearGoals values for propagation
      let oldOneYearRevenue = '';
      let oldOneYearProfit = '';
      // Store old quarterlyGoals values for propagation
      let oldQuarterlyRevenue = '';
      let oldQuarterlyProfit = '';
      // Store old marketing shared fields for propagation
      let oldTargetMarket = '';
      let oldProcess = '';
      let oldGuarantee = '';
      // Store old dates for propagation
      let oldOneYearDate = null;
      let oldQuarterlyDate = null;
      
      if (isLeadershipTeam && strategicPlan) {
        const currentMilestones = strategicPlan.plan_data?.threeYearMilestones;
        const currentMarketing = strategicPlan.plan_data?.marketing;
        const currentOneYearGoals = strategicPlan.plan_data?.oneYearGoals;
        const currentQuarterlyGoals = strategicPlan.plan_data?.quarterlyGoals;
        
        oldRevenueTarget = currentMilestones?.revenue || '';
        oldProfitTarget = currentMilestones?.profit || '';
        oldOneYearRevenue = currentOneYearGoals?.revenue || '';
        oldOneYearProfit = currentOneYearGoals?.profit || '';
        oldQuarterlyRevenue = currentQuarterlyGoals?.revenue || '';
        oldQuarterlyProfit = currentQuarterlyGoals?.profit || '';
        oldTargetMarket = currentMarketing?.targetMarket || '';
        oldProcess = currentMarketing?.process || '';
        oldGuarantee = currentMarketing?.guarantee || '';
        oldOneYearDate = currentOneYearGoals?.targetDate || null;
        oldQuarterlyDate = currentQuarterlyGoals?.targetDate || null;
        
        logger.log('💼 Leadership team save - capturing old targets/marketing/dates/oneYearGoals/quarterlyGoals:', { 
          oldRevenueTarget, 
          oldProfitTarget,
          oldOneYearRevenue,
          oldOneYearProfit,
          oldQuarterlyRevenue,
          oldQuarterlyProfit,
          oldTargetMarket,
          oldProcess,
          oldGuarantee,
          oldOneYearDate,
          oldQuarterlyDate,
        });
      }

      // Separate SWOT data from plan data and cast to Json
      const { swotData, ...restPlanData } = planData;
      const planDataJson = restPlanData as any;
      const swotDataJson = swotData as any;
      
      let savedPlan;

      if (strategicPlan?.id) {
        logger.log('🔄 Updating existing plan:', strategicPlan.id);
        
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
          logger.error('❌ Error updating plan:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw new Error(`Failed to update strategic plan: ${error.message}`);
        }
        
        savedPlan = data;
        logger.log('✅ Plan updated successfully');
      } else {
        logger.log('📝 Creating new plan for company:', currentCompany?.id, 'team:', teamId);
        
        const { data, error } = await supabase
          .from('strategic_plans')
          .insert({
            company_id: currentCompany?.id,
            team_id: teamId,
            plan_data: planDataJson,
            swot_data: swotDataJson,
            created_by: user.id,
            updated_by: user.id,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          logger.error('❌ Error creating plan:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw new Error(`Failed to create strategic plan: ${error.message}`);
        }
        
        savedPlan = data;
        logger.log('✅ Plan created successfully:', data.id);
        
        // Dispatch optimistic event for onboarding
        window.dispatchEvent(new CustomEvent('optimistic-strategy-creation'));
      }

      // If this is a leadership team and sharing is enabled, propagate targets to other teams
      if (isLeadershipTeam && savedPlan?.company_shared) {
        const newMilestones = savedPlan.plan_data?.threeYearMilestones;
        const newOneYearGoals = savedPlan.plan_data?.oneYearGoals;
        const newRevenueTarget = newMilestones?.revenue || '';
        const newProfitTarget = newMilestones?.profit || '';
        const newOneYearRevenue = newOneYearGoals?.revenue || '';
        const newOneYearProfit = newOneYearGoals?.profit || '';
        
        // Only propagate if targets actually changed
        if (oldRevenueTarget !== newRevenueTarget || oldProfitTarget !== newProfitTarget) {
          logger.log('🔄 Propagating leadership 3-year targets to other teams:', {
            oldRevenueTarget,
            newRevenueTarget,
            oldProfitTarget,
            newProfitTarget
          });
          
          try {
            const { data: propagationResult, error: propagationError } = await supabase
              .rpc('propagate_leadership_targets', {
                p_company_id: currentCompany?.id,
                p_old_revenue_target: oldRevenueTarget,
                p_new_revenue_target: newRevenueTarget,
                p_old_profit_target: oldProfitTarget,
                p_new_profit_target: newProfitTarget
              });

            if (propagationError) {
              logger.error('❌ Error propagating leadership 3-year targets:', propagationError);
              // Don't throw here - the main save succeeded, this is just a bonus feature
            } else {
              logger.log('✅ Leadership 3-year targets propagated successfully:', propagationResult);
            }
          } catch (error) {
            logger.error('❌ Exception during 3-year target propagation:', error);
            // Don't throw - main save succeeded
          }
        }

        // Propagate quarterly goals (revenue and profit) to other teams
        const newQuarterlyGoals = savedPlan.plan_data?.quarterlyGoals;
        const newQuarterlyRevenue = newQuarterlyGoals?.revenue || '';
        const newQuarterlyProfit = newQuarterlyGoals?.profit || '';
        
        if (oldQuarterlyRevenue !== newQuarterlyRevenue || oldQuarterlyProfit !== newQuarterlyProfit) {
          logger.log('🔄 Propagating leadership quarterly goals to other teams:', {
            oldQuarterlyRevenue,
            newQuarterlyRevenue,
            oldQuarterlyProfit,
            newQuarterlyProfit
          });
          
          try {
            // Get all non-leadership team plans in the company
            const { data: teamPlans, error: teamPlansError } = await supabase
              .from('strategic_plans')
              .select('id, plan_data, teams!inner(name, is_leadership)')
              .eq('teams.company_id', currentCompany?.id)
              .eq('is_active', true)
              .neq('teams.is_leadership', true);

            if (teamPlansError) {
              logger.error('❌ Error fetching team plans for quarterly goal propagation:', teamPlansError);
            } else if (teamPlans && teamPlans.length) {
              for (const plan of teamPlans as any[]) {
                const planData = (plan as any).plan_data || {};
                const quarterlyGoals = planData.quarterlyGoals || {};
                let needsUpdate = false;
                const updatedQuarterlyGoals = { ...quarterlyGoals };

                // Update revenue if it matches old leadership value or is empty
                if (!quarterlyGoals.revenue || quarterlyGoals.revenue === oldQuarterlyRevenue) {
                  updatedQuarterlyGoals.revenue = newQuarterlyRevenue;
                  needsUpdate = true;
                  logger.log(`📈 Updating team ${(plan as any).teams?.name} quarterlyGoals.revenue: "${quarterlyGoals.revenue}" -> "${newQuarterlyRevenue}"`);
                }

                // Update profit if it matches old leadership value or is empty
                if (!quarterlyGoals.profit || quarterlyGoals.profit === oldQuarterlyProfit) {
                  updatedQuarterlyGoals.profit = newQuarterlyProfit;
                  needsUpdate = true;
                  logger.log(`📊 Updating team ${(plan as any).teams?.name} quarterlyGoals.profit: "${quarterlyGoals.profit}" -> "${newQuarterlyProfit}"`);
                }

                if (needsUpdate) {
                  const updatedPlanData = { ...planData, quarterlyGoals: updatedQuarterlyGoals } as any;
                  try {
                    const { error: updError } = await supabase
                      .from('strategic_plans')
                      .update({ plan_data: updatedPlanData, updated_by: user.id })
                      .eq('id', plan.id);
                    
                    if (updError) {
                      logger.error('❌ Error updating team plan during quarterly goal propagation:', { planId: plan.id, updError });
                    } else {
                      logger.log('✅ Updated team plan quarterly goals during propagation:', { planId: plan.id });
                    }
                  } catch (e) {
                    logger.error('❌ Exception updating team plan during quarterly goal propagation:', { planId: plan.id, e });
                  }
                }
              }
            }
          } catch (error) {
            logger.error('❌ Exception during quarterly goal propagation:', error);
            // Don't throw - main save succeeded
          }
        }

        // Propagate one-year goals (revenue and profit) to other teams
        if (oldOneYearRevenue !== newOneYearRevenue || oldOneYearProfit !== newOneYearProfit) {
          logger.log('🔄 Propagating leadership 1-year goals to other teams:', {
            oldOneYearRevenue,
            newOneYearRevenue,
            oldOneYearProfit,
            newOneYearProfit
          });
          
          try {
            // Get all non-leadership team plans in the company
            const { data: teamPlans, error: teamPlansError } = await supabase
              .from('strategic_plans')
              .select('id, plan_data, teams!inner(name, is_leadership)')
              .eq('teams.company_id', currentCompany?.id)
              .eq('is_active', true)
              .neq('teams.is_leadership', true);

            if (teamPlansError) {
              logger.error('❌ Error fetching team plans for 1-year goal propagation:', teamPlansError);
            } else if (teamPlans && teamPlans.length) {
              for (const plan of teamPlans as any[]) {
                const planData = (plan as any).plan_data || {};
                const oneYearGoals = planData.oneYearGoals || {};
                let needsUpdate = false;
                const updatedOneYearGoals = { ...oneYearGoals };

                // Update revenue if it matches old leadership value or is empty
                if (!oneYearGoals.revenue || oneYearGoals.revenue === oldOneYearRevenue) {
                  updatedOneYearGoals.revenue = newOneYearRevenue;
                  needsUpdate = true;
                  logger.log(`📈 Updating team ${(plan as any).teams?.name} oneYearGoals.revenue: "${oneYearGoals.revenue}" -> "${newOneYearRevenue}"`);
                }

                // Update profit if it matches old leadership value or is empty
                if (!oneYearGoals.profit || oneYearGoals.profit === oldOneYearProfit) {
                  updatedOneYearGoals.profit = newOneYearProfit;
                  needsUpdate = true;
                  logger.log(`📊 Updating team ${(plan as any).teams?.name} oneYearGoals.profit: "${oneYearGoals.profit}" -> "${newOneYearProfit}"`);
                }

                if (needsUpdate) {
                  const updatedPlanData = { ...planData, oneYearGoals: updatedOneYearGoals } as any;
                  try {
                    const { error: updError } = await supabase
                      .from('strategic_plans')
                      .update({ plan_data: updatedPlanData, updated_by: user.id })
                      .eq('id', plan.id);
                    
                    if (updError) {
                      logger.error('❌ Error updating team plan during 1-year goal propagation:', { planId: plan.id, updError });
                    } else {
                      logger.log('✅ Updated team plan 1-year goals during propagation:', { planId: plan.id });
                    }
                  } catch (e) {
                    logger.error('❌ Exception updating team plan during 1-year goal propagation:', { planId: plan.id, e });
                  }
                }
              }
            }
          } catch (error) {
            logger.error('❌ Exception during 1-year goal propagation:', error);
            // Don't throw - main save succeeded
          }
        }
      }

      // Propagate leadership marketing fields to teams that were using the old leadership values
      if (isLeadershipTeam && savedPlan?.company_shared) {
        const newMarketing = savedPlan.plan_data?.marketing || {};
        const newTargetMarket = newMarketing.targetMarket || '';
        const newProcess = newMarketing.process || '';
        const newGuarantee = newMarketing.guarantee || '';

        const marketingChanged = (oldTargetMarket !== newTargetMarket) || (oldProcess !== newProcess) || (oldGuarantee !== newGuarantee);
        if (marketingChanged) {
          logger.log('🔄 Propagating leadership marketing to other teams:', {
            oldTargetMarket, newTargetMarket, oldProcess, newProcess, oldGuarantee, newGuarantee
          });
          try {
            const { data: teamPlans, error: teamPlansError } = await supabase
              .from('strategic_plans')
              .select('id, plan_data, team_id')
              .eq('company_id', currentCompany?.id)
              .eq('is_active', true)
              .neq('team_id', teamId);

            if (teamPlansError) {
              logger.error('❌ Error fetching team plans for marketing propagation:', teamPlansError);
            } else if (teamPlans && teamPlans.length) {
              for (const plan of teamPlans as any[]) {
                const planData = (plan as any).plan_data || {};
                const marketing = planData.marketing || {};
                let needsUpdate = false;
                const updatedMarketing = { ...marketing };

                if (oldTargetMarket && marketing.targetMarket === oldTargetMarket) {
                  updatedMarketing.targetMarket = newTargetMarket;
                  needsUpdate = true;
                }
                if (oldProcess && marketing.process === oldProcess) {
                  updatedMarketing.process = newProcess;
                  needsUpdate = true;
                }
                if (oldGuarantee && marketing.guarantee === oldGuarantee) {
                  updatedMarketing.guarantee = newGuarantee;
                  needsUpdate = true;
                }

                if (needsUpdate) {
                  const updatedPlanData = { ...planData, marketing: updatedMarketing } as any;
                  try {
                    const { error: updError } = await supabase
                      .from('strategic_plans')
                      .update({ plan_data: updatedPlanData, updated_by: user.id })
                      .eq('id', plan.id);
                    if (updError) {
                      logger.error('❌ Error updating team plan during marketing propagation:', { planId: plan.id, updError });
                    } else {
                      logger.log('✅ Updated team plan marketing during propagation:', { planId: plan.id });
                    }
                  } catch (e) {
                    logger.error('❌ Exception updating team plan during marketing propagation:', { planId: plan.id, e });
                  }
                }
              }
            }
          } catch (err) {
            logger.error('❌ Exception during marketing propagation:', err);
          }
        }
      }

      // Propagate leadership dates to teams that were using the old leadership dates
      if (isLeadershipTeam && savedPlan?.company_shared) {
        const newOneYearGoals = savedPlan.plan_data?.oneYearGoals;
        const newQuarterlyGoals = savedPlan.plan_data?.quarterlyGoals;
        const newOneYearDate = newOneYearGoals?.targetDate || null;
        const newQuarterlyDate = newQuarterlyGoals?.targetDate || null;
        
        // Only propagate if dates actually changed
        const oneYearChanged = oldOneYearDate !== newOneYearDate;
        const quarterlyChanged = oldQuarterlyDate !== newQuarterlyDate;
        
        if (oneYearChanged || quarterlyChanged) {
          logger.log('🔄 Propagating leadership dates to other teams:', {
            oldOneYearDate,
            newOneYearDate,
            oldQuarterlyDate,
            newQuarterlyDate
          });
          
          try {
            // Try RPC function first for atomic updates
            const { data: rpcResult, error: rpcError } = await supabase.rpc('propagate_leadership_dates', {
              p_company_id: currentCompany?.id,
              p_old_one_year_date: oldOneYearDate,
              p_new_one_year_date: newOneYearDate,
              p_old_quarterly_date: oldQuarterlyDate,
              p_new_quarterly_date: newQuarterlyDate
            });
            
            if (rpcError) {
              logger.warn('❌ RPC date propagation failed, falling back to client-side:', rpcError);
              
              // Fallback to client-side propagation - update ALL non-leadership teams (no company_shared filter)
              const { data: teamPlans, error: teamPlansError } = await supabase
                .from('strategic_plans')
                .select('id, plan_data, teams!inner(name, is_leadership)')
                .eq('teams.company_id', currentCompany?.id)
                .eq('is_active', true)
                .neq('teams.is_leadership', true);

              if (!teamPlansError && teamPlans && teamPlans.length) {
                for (const plan of teamPlans as any[]) {
                  const planData = (plan as any).plan_data || {};
                  const oneYearGoals = planData.oneYearGoals || {};
                  const quarterlyGoals = planData.quarterlyGoals || {};
                  let needsUpdate = false;
                  const updatedPlanData = { ...planData };
                  
                  // Normalize dates for comparison (YYYY-MM-DD format)
                  const normalizeDate = (date: any) => {
                    if (!date || date === '') return '';
                    const dateStr = String(date);
                    return dateStr.substring(0, 10);
                  };
                  
                  const normalizedOldOneYear = normalizeDate(oldOneYearDate);
                  const normalizedNewOneYear = normalizeDate(newOneYearDate);
                  const normalizedOldQuarterly = normalizeDate(oldQuarterlyDate);
                  const normalizedNewQuarterly = normalizeDate(newQuarterlyDate);
                  const normalizedCurrentOneYear = normalizeDate(oneYearGoals.targetDate);
                  const normalizedCurrentQuarterly = normalizeDate(quarterlyGoals.targetDate);
                  
                  // Update one year date if it matches old or is empty
                  if (oneYearChanged && 
                      (normalizedCurrentOneYear === '' || 
                       normalizedCurrentOneYear === normalizedOldOneYear)) {
                    updatedPlanData.oneYearGoals = {
                      ...oneYearGoals,
                      targetDate: newOneYearDate
                    };
                    needsUpdate = true;
                  }
                  
                  // Update quarterly date if it matches old or is empty
                  if (quarterlyChanged && 
                      (normalizedCurrentQuarterly === '' || 
                       normalizedCurrentQuarterly === normalizedOldQuarterly)) {
                    updatedPlanData.quarterlyGoals = {
                      ...quarterlyGoals,
                      targetDate: newQuarterlyDate
                    };
                    needsUpdate = true;
                  }

                  if (needsUpdate) {
                    try {
                      const { error: updError } = await supabase
                        .from('strategic_plans')
                        .update({ 
                          plan_data: updatedPlanData, 
                          updated_by: user.id,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', plan.id);
                        
                      if (updError) {
                        logger.error('❌ Error updating team plan during date propagation:', { planId: plan.id, updError });
                      } else {
                        logger.log('✅ Updated team plan dates during propagation:', { planId: plan.id });
                      }
                    } catch (e) {
                      logger.error('❌ Exception updating team plan during date propagation:', { planId: plan.id, e });
                    }
                  }
                }
              }
            } else if (rpcResult?.success) {
              logger.log('✅ RPC date propagation successful:', rpcResult.message);
            }
          } catch (propagationError) {
            logger.error('❌ Date propagation failed:', propagationError);
            // Don't throw - the main save succeeded, propagation is supplementary
          }
        }
      }

      return savedPlan;
    },
    onMutate: () => {
      logger.log('🔄 Save started');
      setSaveStatus('saving');
    },
    onSuccess: (data) => {
      logger.log('✅ Save completed successfully');
      setSaveStatus('saved');
      
      // Get the current team info to determine cache strategy
      const isLeadershipTeam = strategicPlan?.team_is_leadership;
      const queryKey = ['simple-strategic-plan', currentCompany?.id, teamId];
      
      if (isLeadershipTeam) {
        // For leadership teams, safe to do direct cache update since they save/display the same data
        const previousData = queryClient.getQueryData(queryKey);
        
        if (previousData && typeof previousData === 'object' && previousData !== null) {
          const mergedData = {
            ...(previousData as any),
            ...data,
            // Preserve computed fields
            leadership_reference: (previousData as any).leadership_reference,
            team_is_leadership: (previousData as any).team_is_leadership,
          };
          queryClient.setQueryData(queryKey, mergedData);
          logger.log('✅ Leadership team cache updated with merged data');
        } else {
          queryClient.invalidateQueries({ queryKey });
          logger.log('⚠️ No previous cache for leadership team, invalidating');
        }
        
        // CRITICAL FIX: If leadership plan has sharing enabled, invalidate cache for ALL other teams
        // This ensures that when switching teams, they immediately refetch and show updated leadership values
        if (data?.company_shared && currentCompany?.id) {
          logger.log('🔄 Leadership plan sharing enabled - invalidating cache for all other teams');
          
          // Invalidate all "simple-strategic-plan" queries for this company EXCEPT the current team
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const [type, companyId, otherTeamId] = query.queryKey;
              return type === 'simple-strategic-plan' && 
                     companyId === currentCompany?.id && 
                     otherTeamId !== teamId && 
                     !!otherTeamId; // Ensure it's a valid team ID and return boolean
            }
          });
          
          logger.log('✅ Cache invalidated for all other teams - they will refetch on switch');
        }
      } else {
        // For normal teams, patch the cached query data in-place instead of invalidating.
        // invalidateQueries triggers a refetch → isFetching flips → useEffect re-runs
        // mergePlanDataIntoState, which can overwrite in-progress edits and cause focus loss.
        // We only update plan_data and swot_data on the existing cached object, preserving
        // the leadership_reference and merged structure from the original fetch.
        const previousData = queryClient.getQueryData(queryKey);

        if (previousData && typeof previousData === 'object' && previousData !== null) {
          const mergedData = {
            ...(previousData as any),
            id: data.id ?? (previousData as any).id,
            plan_data: data.plan_data,
            swot_data: data.swot_data,
            updated_by: data.updated_by,
            updated_at: data.updated_at,
            // Preserve the merged leadership fields from the original fetch
            leadership_reference: (previousData as any).leadership_reference,
            team_is_leadership: (previousData as any).team_is_leadership,
          };
          queryClient.setQueryData(queryKey, mergedData);
          logger.log('✅ Normal team cache patched (no refetch) to preserve typing focus');
        } else {
          // No cached data yet — must invalidate to trigger initial fetch
          queryClient.invalidateQueries({ queryKey });
          logger.log('⚠️ No previous cache for normal team, invalidating');
        }
      }
    },
    onError: (error) => {
      logger.error('❌ Save failed:', error);
      setSaveStatus('error');
      // Only invalidate on error to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['simple-strategic-plan', currentCompany?.id, teamId] });
    },
  });

  // Debounced auto-save
  const autoSave = useCallback((planData: StrategyData) => {
    // Don't auto-save if we don't have proper authentication
    if (!user?.id || !session?.access_token || !currentCompany?.id) {
      logger.log('⏸️ Auto-save skipped - missing authentication or company');
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    logger.log('⏱️ Auto-save scheduled (500ms)');
    
    saveTimeoutRef.current = setTimeout(() => {
      logger.log('🚀 Auto-save triggered');
      saveMutation.mutate(planData);
    }, 500);
  }, [saveMutation, user?.id, session?.access_token, currentCompany?.id]);

  // Manual save
  const manualSave = useCallback((planData: StrategyData) => {
    logger.log('💾 Manual save triggered');
    
    // Clear debounce timeout for immediate save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveMutation.mutate(planData);
  }, [saveMutation]);

  // Create manual version function
  const createManualVersion = useCallback(async (changeSummary: string = 'Manual snapshot') => {
    if (!strategicPlan?.id) {
      logger.error('❌ No strategic plan to save version of');
      return { success: false, error: 'No strategic plan available' };
    }

    logger.log('📸 Creating manual version for plan:', strategicPlan.id);
    
    try {
      const { data, error } = await supabase.rpc('create_manual_strategic_plan_version', {
        p_strategic_plan_id: strategicPlan.id,
        p_change_summary: changeSummary
      });

      if (error) {
        logger.error('❌ Error creating manual version:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        logger.error('❌ Manual version creation failed:', data?.error);
        return { success: false, error: data?.error || 'Unknown error' };
      }

      // Invalidate versions query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['simple-strategic-plan-versions', strategicPlan.id] 
      });

      logger.log('✅ Manual version created successfully:', data.version_number);
      return { success: true, version_number: data.version_number };
    } catch (error) {
      logger.error('❌ Unexpected error creating manual version:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }, [strategicPlan?.id, queryClient]);

  // Restore version function
  const restoreVersion = useCallback(async (versionId: string) => {
    if (!strategicPlan?.id) {
      logger.error('❌ No strategic plan to restore version to');
      return;
    }

    const version = versions.find(v => v.id === versionId);
    if (!version) {
      logger.error('❌ Version not found:', versionId);
      return;
    }

    logger.log('🔄 Restoring version:', versionId);
    
    try {
      setSaveStatus('saving');
      
      // Update the plan with the version data
      const { error } = await supabase
        .from('strategic_plans')
        .update({
          plan_data: version.plan_data,
          updated_by: user?.id,
        })
        .eq('id', strategicPlan.id);

      if (error) {
        logger.error('❌ Error restoring version:', error);
        setSaveStatus('error');
        return;
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['simple-strategic-plan', currentCompany?.id, teamId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['simple-strategic-plan-versions', strategicPlan.id] 
      });

      setSaveStatus('saved');
      logger.log('✅ Version restored successfully');
    } catch (error) {
      logger.error('❌ Unexpected error during version restore:', error);
      setSaveStatus('error');
    }
  }, [strategicPlan?.id, versions, user?.id, queryClient, currentCompany?.id, teamId]);

  // Cleanup function to clear pending auto-save
  const clearPendingAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      logger.log('🧹 Clearing pending auto-save timeout');
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
  }, []);

  return {
    strategicPlan,
    isLoading,
    isFetching,
    error,
    saveStatus,
    autoSave,
    manualSave,
    clearPendingAutoSave,
    versions,
    restoreVersion,
    createManualVersion,
    leadershipReference: strategicPlan?.leadership_reference || null,
  };
};
