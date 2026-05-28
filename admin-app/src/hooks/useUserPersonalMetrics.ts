import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { calculateFormula } from '@/services/formulaCalculationService';
import { useUserSettings } from '@/hooks/useUserSettings';
import { getCurrentWeekStart } from '@/lib/dateUtils';
import { logger } from '@/utils/logger';

export const useUserPersonalMetrics = () => {
  const [metrics, setMetrics] = useState<WeeklyMetricWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayedWeekStart, setDisplayedWeekStart] = useState<string>('');
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const { settings } = useUserSettings();

  // Function to update a specific metric optimistically
  const updateMetricValue = (metricId: string, newValue: number, weekStart: string) => {
    setMetrics(prevMetrics => 
      prevMetrics.map(metric => 
        metric.id === metricId 
          ? {
              ...metric,
              metric_value: newValue,
              weeklyValues: {
                ...metric.weeklyValues,
                [weekStart]: newValue
              }
            }
          : metric
      )
    );
  };

  useEffect(() => {
    if (!user || !currentCompany) {
      setLoading(false);
      return;
    }

    const fetchUserMetrics = async () => {
      try {
        // Use current week start based on settings
        const currentWeekStart = getCurrentWeekStart(settings?.week_start_day || 'monday');

        let targetWeekStart = currentWeekStart;
        
        // If show_current_week is false (default), target the previous week (most recent complete week)
        if (!settings?.show_current_week) {
          const currentWeekDate = new Date(currentWeekStart + 'T00:00:00');
          currentWeekDate.setDate(currentWeekDate.getDate() - 7);
          targetWeekStart = currentWeekDate.toISOString().split('T')[0];
        }

        // First, get user's metric DEFINITIONS from the metrics table (source of truth)
        // Include metrics where user is owner OR assistant
        const { data: metricTemplates, error: templatesError } = await supabase
          .from('metrics')
          .select(`
            id,
            metric_name,
            unit,
            target_value,
            target_logic,
            is_formula,
            formula_components,
            display_order,
            owner_id,
            assistant_id,
            team_id,
            teams!inner(
              id,
              name,
              company_id
            )
          `)
          .or(`owner_id.eq.${user.id},assistant_id.eq.${user.id}`)
          .eq('teams.company_id', currentCompany?.id)
          .is('deleted_at', null)
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('metric_name', { ascending: true });

        if (templatesError) {
          logger.error('useUserPersonalMetrics: Templates query error:', templatesError);
          throw templatesError;
        }

        // Fetch owner and assistant profiles separately (metrics table has no FK to profiles)
        const ownerIds = [...new Set(metricTemplates?.map(m => m.owner_id).filter(Boolean) || [])];
        const assistantIds = [...new Set(metricTemplates?.map(m => m.assistant_id).filter(Boolean) || [])];
        const allProfileIds = [...new Set([...ownerIds, ...assistantIds])];
        let ownerProfiles: any[] = [];

        if (allProfileIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', allProfileIds);
          
          if (profilesError) {
            logger.error('useUserPersonalMetrics: Error fetching owner profiles:', profilesError);
          }
          ownerProfiles = profiles || [];
        }

        // Join profile data into metrics
        const templatesWithOwners = metricTemplates?.map(metric => ({
          ...metric,
          profiles: ownerProfiles.find(p => p.id === metric.owner_id),
          assistant_profile: ownerProfiles.find(p => p.id === metric.assistant_id)
        })) || [];

        // Get metric IDs for querying weekly values
        const metricIds = templatesWithOwners?.map(m => m.id).filter(Boolean) || [];

        // Now get VALUES for the target week using metric_id foreign key
        const { data: weekData, error: weekError } = await supabase
          .from('weekly_metrics')
          .select(`
            id,
            metric_id,
            metric_name,
            metric_value,
            week_start_date,
            team_id,
            custom_target_value,
            target_note,
            created_at,
            updated_at
          `)
          .in('metric_id', metricIds)
          .eq('week_start_date', targetWeekStart)
          .is('deleted_at', null);

        if (weekError) {
          logger.error('useUserPersonalMetrics: Week data query error:', weekError);
          throw weekError;
        }

        // Create a map of week data by metric_id
        const weekDataMap = new Map();
        weekData?.forEach(data => {
          weekDataMap.set(data.metric_id, data);
        });

        // Combine metric definitions with week values
        const userMetrics = templatesWithOwners?.map(template => {
          const weekEntry = weekDataMap.get(template.id);
          
          return {
            // Use the metric definition id (from metrics table)
            id: template.id,
            metric_name: template.metric_name,
            unit: template.unit,
            target_value: template.target_value,
            target_logic: template.target_logic,
            metric_value: weekEntry?.metric_value ?? null,
            custom_target_value: weekEntry?.custom_target_value ?? null,
            target_note: weekEntry?.target_note ?? null,
            is_formula: template.is_formula,
            formula_components: template.formula_components,
            display_order: template.display_order,
            owner_id: template.owner_id,
            team_id: template.team_id,
            user_id: template.owner_id,
            created_at: weekEntry?.created_at || new Date().toISOString(),
            updated_at: weekEntry?.updated_at || new Date().toISOString(),
            week_start_date: targetWeekStart,
            teams: template.teams,
            profiles: template.profiles
          };
        });

        // Transform the data to include owner information and weekly values
        const transformedMetrics = (userMetrics || []).map((metric: any) => {
          // For formula metrics, we need to calculate the value
          let calculatedValue = metric.metric_value;
          
          if (metric.is_formula && metric.formula_components) {
            try {
              // Convert to WeeklyMetricWithOwner format for formula calculation
              const metricsForFormula = (userMetrics || []).map((m: any) => ({
                ...m,
                owner: m.profiles?.full_name || 'Unknown User',
                team_name: m.teams?.name || 'Unknown Team',
                weeklyValues: { [m.week_start_date]: m.metric_value }
              } as WeeklyMetricWithOwner));
              
              const calculationResult = calculateFormula(metric.formula_components, metricsForFormula, metric.week_start_date);
              calculatedValue = calculationResult.error ? 0 : (calculationResult.value ?? 0);
            } catch (error) {
              logger.error('useUserPersonalMetrics: Formula calculation failed:', error);
              calculatedValue = 0; // Default to 0 for formula metrics that fail to calculate
            }
          }

          // Build weeklyCustomTargets if custom target is set
          const weeklyCustomTargets = metric.custom_target_value !== null || metric.target_note
            ? {
                [metric.week_start_date]: {
                  custom_target_value: metric.custom_target_value,
                  target_note: metric.target_note
                }
              }
            : undefined;

          return {
            ...metric,
            owner: metric.profiles?.full_name || 'Unknown User',
            owner_avatar_url: metric.profiles?.avatar_url,
            team_name: metric.teams?.name || 'Unknown Team',
            metric_value: calculatedValue, // Use calculated value for formulas
            weeklyValues: {
              [metric.week_start_date]: calculatedValue
            },
            weeklyCustomTargets
          } as WeeklyMetricWithOwner;
        });

        setMetrics(transformedMetrics);
        setDisplayedWeekStart(targetWeekStart);
      } catch (error) {
        logger.error('useUserPersonalMetrics: Error fetching metrics:', error);
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserMetrics();
  }, [user, currentCompany, settings]);

  return { metrics, loading, updateMetricValue, displayedWeekStart };
};
