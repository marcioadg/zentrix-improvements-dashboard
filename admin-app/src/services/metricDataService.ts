import { supabase } from '@/integrations/supabase/client';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { calculateFormula } from '@/services/formulaCalculationService';
import { fetchAllPages } from '@/utils/fetchAllPages';
import { logger } from '@/utils/logger';

// ============= RESULT CACHE FOR MEMOIZATION =============
// Hash-based cache to skip re-processing when data hasn't changed
interface CacheEntry {
  hash: string;
  result: WeeklyMetricWithOwner[];
  timestamp: number;
}

const resultCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache validity

// Simple hash function for data comparison
const hashData = (data: any): string => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};

// Performance tracking for metrics processing (silent in production)
const trackPerformance = (label: string, fn: () => any) => {
  return fn();
};

// Fetch archived metrics for a team
export const fetchArchivedMetricsData = async (
  userId: string,
  teamId?: string,
  timePeriod: string = 'last_13_weeks',
  customRange?: { start: Date; end: Date },
  getWeekStartDates?: () => string[]
): Promise<WeeklyMetricWithOwner[]> => {
  if (!teamId) {
    return [];
  }

  // Get weekStartDates if provided
  const weekStartDates = getWeekStartDates ? getWeekStartDates() : [];
  
  // If no weekStartDates, return metrics without weeklyValues (fallback behavior)

  try {
    // Fetch archived metric DEFINITIONS from the metrics table
    const { data: archivedMetrics, error: archivedError } = await supabase
      .from('metrics')
      .select(`
        id,
        metric_name,
        description,
        owner_id,
        assistant_id,
        target_value,
        target_logic,
        unit,
        is_formula,
        formula_components,
        aggregation_type,
        display_order,
        created_at,
        updated_at,
        archived_at
      `)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .not('archived_at', 'is', null) // Only archived metrics
      .order('archived_at', { ascending: false }); // Most recently archived first

    if (archivedError) {
      logger.error('❌ Error fetching archived metrics:', archivedError);
      throw archivedError;
    }

    if (!archivedMetrics || archivedMetrics.length === 0) {
      return [];
    }

    // Fetch owner and assistant profiles
    const ownerIds = [...new Set(archivedMetrics.map(m => m.owner_id).filter(Boolean))];
    const assistantIds = [...new Set(archivedMetrics.map(m => m.assistant_id).filter(Boolean))];
    const allProfileIds = [...new Set([...ownerIds, ...assistantIds])];
    let allProfiles: any[] = [];

    if (allProfileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allProfileIds);
      allProfiles = profiles || [];
    }

    // Join profile data
    const metricsWithOwners = archivedMetrics.map(metric => ({
      ...metric,
      owner: allProfiles.find(p => p.id === metric.owner_id),
      assistant: metric.assistant_id ? allProfiles.find(p => p.id === metric.assistant_id) : null
    }));

    // If no weekStartDates, return metrics without weeklyValues (backward compatibility)
    if (weekStartDates.length === 0) {
      return metricsWithOwners.map(metric => ({
        id: metric.id,
        user_id: userId,
        owner_id: metric.owner_id,
        owner: metric.owner?.full_name || 'Unknown',
        owner_avatar_url: metric.owner?.avatar_url,
        assistant_id: metric.assistant_id,
        assistant: metric.assistant?.full_name,
        assistant_avatar_url: metric.assistant?.avatar_url,
        team_id: teamId,
        metric_name: metric.metric_name,
        description: metric.description,
        metric_value: null,
        target_value: metric.target_value,
        target_logic: metric.target_logic,
        unit: metric.unit,
        week_start_date: '',
        created_at: metric.created_at,
        updated_at: metric.updated_at,
        archived: true,
        display_order: metric.display_order,
        weeklyValues: {},
        weeklyCustomTargets: {},
        is_formula: metric.is_formula,
        formula_components: metric.formula_components,
        aggregation_type: metric.aggregation_type,
      })) as WeeklyMetricWithOwner[];
    }

    // Get metric IDs for fetching weekly data
    const metricIds = metricsWithOwners.map(m => m.id).filter(Boolean);
    
    if (metricIds.length === 0) {
      return [];
    }

    // Create flexible week date range (same as fetchMetricsData)
    const flexibleWeekDates: string[] = [];
    weekStartDates.forEach(weekDate => {
      const baseDate = new Date(weekDate);
      // Add dates from -3 to +3 days around each requested week
      for (let offset = -3; offset <= 3; offset++) {
        const adjustedDate = new Date(baseDate);
        adjustedDate.setDate(adjustedDate.getDate() + offset);
        flexibleWeekDates.push(adjustedDate.toISOString().split('T')[0]);
      }
    });

    // Calculate date range boundaries
    const uniqueFlexibleDates = [...new Set(flexibleWeekDates)].sort();
    const minDate = uniqueFlexibleDates[0];
    const maxDate = uniqueFlexibleDates[uniqueFlexibleDates.length - 1];


    // Fetch weekly VALUES for archived metrics (paginated to avoid 1000-row limit)
    const weeklyData = await fetchAllPages(() =>
      supabase
        .from('weekly_metrics')
        .select(`
          id,
          metric_id,
          metric_name,
          owner_id,
          week_start_date,
          metric_value,
          custom_target_value,
          target_note,
          user_id,
          created_at,
          updated_at
        `)
        .in('metric_id', metricIds)
        .gte('week_start_date', minDate)
        .lte('week_start_date', maxDate)
        .is('deleted_at', null)
        .order('week_start_date', { ascending: true })
        .order('id', { ascending: true })
    );

    // Helper function to find the closest requested week for a stored week (same as fetchMetricsData)
    const findBestWeekMatch = (storedDate: string): string | null => {
      const stored = new Date(storedDate);
      let bestMatch: string | null = null;
      let minDiff = Infinity;

      weekStartDates.forEach(requestedDate => {
        const requested = new Date(requestedDate);
        const diff = Math.abs(stored.getTime() - requested.getTime());
        // Allow up to 6 days difference (covers full week with ±3 day flexibility)
        if (diff <= 6 * 24 * 60 * 60 * 1000 && diff < minDiff) {
          minDiff = diff;
          bestMatch = requestedDate;
        }
      });

      return bestMatch;
    };

    // Process and combine data (similar to fetchMetricsData)
    const groupedMetrics = new Map<string, WeeklyMetricWithOwner>();

    // Create base metric objects
    metricsWithOwners.forEach((metric) => {
      const ownerArray = Array.isArray(metric.owner) ? metric.owner : [metric.owner];
      const owner = ownerArray?.[0];
      const assistantArray = Array.isArray(metric.assistant) ? metric.assistant : [metric.assistant];
      const assistant = assistantArray?.[0];
      
      groupedMetrics.set(metric.id, {
        id: metric.id,
        user_id: userId,
        metric_name: metric.metric_name,
        description: metric.description,
        metric_value: null,
        owner: owner?.full_name || 'Unknown',
        owner_id: metric.owner_id,
        owner_avatar_url: owner?.avatar_url || null,
        assistant_id: metric.assistant_id || undefined,
        assistant: assistant?.full_name || undefined,
        assistant_avatar_url: assistant?.avatar_url || undefined,
        unit: metric.unit,
        target_value: metric.target_value,
        target_logic: metric.target_logic,
        week_start_date: weekStartDates[0] || '',
        created_at: metric.created_at,
        updated_at: metric.updated_at,
        weeklyValues: {}, // Will be populated below
        team_id: teamId,
        weeklyCustomTargets: {}, // Will be populated below
        is_formula: metric.is_formula || false,
        formula_components: metric.formula_components || undefined,
        aggregation_type: metric.aggregation_type || 'total',
        display_order: metric.display_order,
        archived: true,
      });
    });

    // Populate weekly values from the weekly data
    weeklyData?.forEach((weeklyMetric) => {
      const groupedMetric = groupedMetrics.get(weeklyMetric.metric_id);
      
      if (groupedMetric) {
        // Set user metadata from the first weekly record if not already set
        if (!groupedMetric.user_id) {
          groupedMetric.user_id = weeklyMetric.user_id;
          groupedMetric.created_at = weeklyMetric.created_at;
          groupedMetric.updated_at = weeklyMetric.updated_at;
        }

        // Map stored week date to requested week date for display
        const displayWeekDate = findBestWeekMatch(weeklyMetric.week_start_date) || weeklyMetric.week_start_date;
        
        // Store the weekly value using the display week date
        groupedMetric.weeklyValues[displayWeekDate] = weeklyMetric.metric_value;

        // Handle custom targets and notes if they exist
        if (weeklyMetric.custom_target_value !== null && weeklyMetric.custom_target_value !== undefined) {
          if (!groupedMetric.weeklyCustomTargets) {
            groupedMetric.weeklyCustomTargets = {};
          }
          groupedMetric.weeklyCustomTargets[displayWeekDate] = {
            custom_target_value: weeklyMetric.custom_target_value,
            target_note: weeklyMetric.target_note || null
          };
        } else if (weeklyMetric.target_note) {
          // Even if no custom_target_value, store the note if it exists
          if (!groupedMetric.weeklyCustomTargets) {
            groupedMetric.weeklyCustomTargets = {};
          }
          groupedMetric.weeklyCustomTargets[displayWeekDate] = {
            custom_target_value: null,
            target_note: weeklyMetric.target_note
          };
        }
      }
    });

    // Calculate formula values if needed (same as fetchMetricsData)
    const result = Array.from(groupedMetrics.values());
    const formulaCount = result.filter(m => m.is_formula).length;
    if (formulaCount > 0) {
      trackPerformance(`Formula calculations for archived metrics (${formulaCount} metrics)`, () => {
        result.forEach((metric) => {
          if (metric.is_formula && metric.formula_components) {
            weekStartDates.forEach((weekStart) => {
              const calculationResult = calculateFormula(
                metric.formula_components!,
                result,
                weekStart
              );
              
              if (!calculationResult.error) {
                metric.weeklyValues[weekStart] = calculationResult.value;
              } else if (calculationResult.errorType === 'METRIC_NOT_FOUND') {
                metric.formula_error = calculationResult.error;
                metric.formula_error_type = calculationResult.errorType;
              }
            });
          }
        });
      });
    }

    
    return result as WeeklyMetricWithOwner[];
  } catch (error) {
    logger.error('❌ Error in fetchArchivedMetricsData:', error);
    return [];
  }
};

export const fetchMetricsData = async (
  userId: string,
  teamId?: string,
  timePeriod: string = 'last_13_weeks',
  customRange?: { start: Date; end: Date },
  getWeekStartDates?: () => string[]
): Promise<WeeklyMetricWithOwner[]> => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!teamId) {
    return [];
  }

  const weekStartDates = getWeekStartDates ? getWeekStartDates() : [];
  
  if (weekStartDates.length === 0) {
    return [];
  }

  // ============= CACHE CHECK =============
  const cacheKey = `${teamId}-${timePeriod}-${weekStartDates.join(',')}`;
  const cached = resultCache.get(cacheKey);
  const now = Date.now();
  
  // Return cached result if still valid
  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    // ============= PARALLEL QUERIES - PHASE 1 =============
    // Run metric definitions, team data, and multi-team assignments in parallel
    const [metricsResult, teamResult, assignedMetricsResult] = await Promise.all([
      // Query 1: Fetch metric DEFINITIONS where this is the primary team
      supabase
        .from('metrics')
        .select(`
          id,
          metric_name,
          description,
          owner_id,
          assistant_id,
          target_value,
          target_logic,
          unit,
          is_formula,
          formula_components,
          aggregation_type,
          display_order,
          created_at,
          updated_at,
          team_id
        `)
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('metric_name', { ascending: true }),
      
      // Query 2: Fetch team's company_id
      supabase
        .from('teams')
        .select('company_id')
        .eq('id', teamId)
        .maybeSingle(),
      
      // Query 3: Fetch metrics assigned to this team via junction table (multi-team support)
      supabase
        .from('metric_team_assignments')
        .select(`
          metric_id,
          metrics!inner (
            id,
            metric_name,
            description,
            owner_id,
            assistant_id,
            target_value,
            target_logic,
            unit,
            is_formula,
            formula_components,
            aggregation_type,
            display_order,
            created_at,
            updated_at,
            team_id,
            deleted_at,
            archived_at
          )
        `)
        .eq('team_id', teamId)
    ]);

    const { data: primaryTeamMetrics, error: allMetricsError } = metricsResult;
    const { data: teamData, error: teamError } = teamResult;
    const { data: assignedMetricsData, error: assignedError } = assignedMetricsResult;

    if (allMetricsError) {
      logger.error('❌ Error fetching team metrics:', allMetricsError);
      throw allMetricsError;
    }

    if (teamError) {
      logger.error('❌ Error fetching team company:', teamError);
      throw teamError;
    }

    if (assignedError) {
      logger.error('⚠️ Error fetching assigned metrics (non-blocking):', assignedError);
      // Continue without assigned metrics - don't fail the whole query
    }

    // Combine primary team metrics with assigned metrics (from other teams)
    const assignedMetrics = (assignedMetricsData || [])
      .map((assignment: any) => assignment.metrics)
      .filter((m: any) => m && !m.deleted_at && !m.archived_at);

    // Merge and deduplicate metrics (primary takes precedence)
    const primaryIds = new Set((primaryTeamMetrics || []).map(m => m.id));
    const additionalMetrics = assignedMetrics.filter((m: any) => !primaryIds.has(m.id));
    const allTeamMetrics = [...(primaryTeamMetrics || []), ...additionalMetrics];

    // Handle case where team doesn't exist or user doesn't have access
    if (!teamData || allTeamMetrics.length === 0) {
      return [];
    }

    // Collect profile IDs for next parallel batch
    const ownerIds = [...new Set(allTeamMetrics.map(m => m.owner_id).filter(Boolean))];
    const assistantIds = [...new Set(allTeamMetrics.map(m => m.assistant_id).filter(Boolean))];
    const allProfileIds = [...new Set([...ownerIds, ...assistantIds])];
    const metricIds = allTeamMetrics.map(m => m.id).filter(Boolean);

    if (metricIds.length === 0) {
      return [];
    }

    // Calculate date range for weekly data query
    const flexibleWeekDates: string[] = [];
    weekStartDates.forEach(weekDate => {
      const baseDate = new Date(weekDate);
      for (let offset = -3; offset <= 3; offset++) {
        const adjustedDate = new Date(baseDate);
        adjustedDate.setDate(adjustedDate.getDate() + offset);
        flexibleWeekDates.push(adjustedDate.toISOString().split('T')[0]);
      }
    });
    const uniqueFlexibleDates = [...new Set(flexibleWeekDates)].sort();
    const minDate = uniqueFlexibleDates[0];
    const maxDate = uniqueFlexibleDates[uniqueFlexibleDates.length - 1];

    // ============= PARALLEL QUERIES - PHASE 2 =============
    // Run profiles, company members, and weekly data queries in parallel
    // Build queries that will run simultaneously
    const weeklyQueryPaginated = fetchAllPages(() =>
      supabase
        .from('weekly_metrics')
        .select(`
          id,
          metric_id,
          metric_name,
          owner_id,
          week_start_date,
          metric_value,
          custom_target_value,
          target_note,
          user_id,
          created_at,
          updated_at
        `)
        .in('metric_id', metricIds)
        .gte('week_start_date', minDate)
        .lte('week_start_date', maxDate)
        .is('deleted_at', null)
        .order('week_start_date', { ascending: true })
        .order('id', { ascending: true })
    );

    const profilesQuery = allProfileIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', allProfileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; avatar_url: string }[], error: null });

    const membersQuery = (ownerIds.length > 0 && teamData.company_id)
      ? supabase
          .from('company_members')
          .select('user_id, status')
          .eq('company_id', teamData.company_id)
          .in('user_id', ownerIds)
      : Promise.resolve({ data: [] as { user_id: string; status: string }[], error: null });

    const [weeklyData, profilesResult, membersResult] = await Promise.all([
      weeklyQueryPaginated,
      profilesQuery,
      membersQuery
    ]);

    const weeklyError = null; // Error is thrown by fetchAllPages
    const { data: allProfiles, error: profilesError } = profilesResult;
    const { data: companyMembers, error: membersError } = membersResult;

    if (weeklyError) {
      logger.error('❌ Error fetching weekly data:', weeklyError);
      throw weeklyError;
    }

    if (profilesError) {
      logger.error('⚠️ Error fetching profiles:', profilesError);
    }

    if (membersError) {
      logger.error('⚠️ Error fetching company members:', membersError);
    }

    // Build owner deactivation status map
    const ownerDeactivationStatuses = new Map<string, boolean>();
    (companyMembers || []).forEach((member) => {
      ownerDeactivationStatuses.set(member.user_id, member.status !== 'active');
    });

    // Join profile data into metrics with proper typing
    interface ProfileData {
      id: string;
      full_name: string;
      avatar_url: string | null;
    }
    const profileMap = new Map<string, ProfileData>(
      (allProfiles || []).map((p) => [p.id, p as ProfileData])
    );
    const metricsWithOwners = allTeamMetrics.map(metric => ({
      ...metric,
      owner: profileMap.get(metric.owner_id),
      assistant: metric.assistant_id ? profileMap.get(metric.assistant_id) : null
    }));

    // ============= DATA PROCESSING =============
    const result = trackPerformance('Data processing', () => {
      const groupedMetrics = new Map<string, WeeklyMetricWithOwner>();

      // Create base metric objects for ALL metrics
      metricsWithOwners.forEach((metric) => {
        const owner = metric.owner;
        const assistant = metric.assistant;
        
        groupedMetrics.set(metric.id, {
          id: metric.id,
          user_id: '',
          metric_name: metric.metric_name,
          description: metric.description,
          metric_value: null,
          owner: owner?.full_name || 'Unknown',
          owner_id: metric.owner_id,
          owner_avatar_url: owner?.avatar_url || null,
          owner_is_deactivated: ownerDeactivationStatuses.get(metric.owner_id) || false,
          assistant_id: metric.assistant_id || undefined,
          assistant: assistant?.full_name || undefined,
          assistant_avatar_url: assistant?.avatar_url || undefined,
          unit: metric.unit,
          target_value: metric.target_value,
          target_logic: metric.target_logic,
          week_start_date: weekStartDates[0] || '',
          created_at: '',
          updated_at: '',
          weeklyValues: {},
          team_id: metric.team_id || teamId, // Use metric's primary team, fallback to queried team
          weeklyCustomTargets: {},
          is_formula: metric.is_formula || false,
          formula_components: metric.formula_components || undefined,
          aggregation_type: metric.aggregation_type || 'total',
          display_order: metric.display_order
        });
      });

      

      // Helper function to find the closest requested week for a stored week
      const findBestWeekMatch = (storedDate: string): string | null => {
        const stored = new Date(storedDate);
        let bestMatch: string | null = null;
        let minDiff = Infinity;

        weekStartDates.forEach(requestedDate => {
          const requested = new Date(requestedDate);
          const diff = Math.abs(stored.getTime() - requested.getTime());
          // Allow up to 6 days difference (covers full week with ±3 day flexibility)
          if (diff <= 6 * 24 * 60 * 60 * 1000 && diff < minDiff) {
            minDiff = diff;
            bestMatch = requestedDate;
          }
        });

        return bestMatch;
      };

      // Populate weekly values from the weekly data (if any exists)
      // NOTE: Metrics without weekly data will simply have empty weeklyValues
      let populatedCount = 0;
      weeklyData?.forEach((weeklyMetric) => {
        // Use metric_id foreign key to link weekly values to metric definitions
        const groupedMetric = groupedMetrics.get(weeklyMetric.metric_id);
        
        if (groupedMetric) {
          populatedCount++;
          
          // Set user metadata from the first weekly record if not already set
          if (!groupedMetric.user_id) {
            groupedMetric.user_id = weeklyMetric.user_id;
            groupedMetric.created_at = weeklyMetric.created_at;
            groupedMetric.updated_at = weeklyMetric.updated_at;
          }

          // Map stored week date to requested week date for display
          const displayWeekDate = findBestWeekMatch(weeklyMetric.week_start_date) || weeklyMetric.week_start_date;
          
          // Store the weekly value using the display week date
          groupedMetric.weeklyValues[displayWeekDate] = weeklyMetric.metric_value;

          

          // Handle custom targets AND notes if either exist
          // ✅ FIX: Include notes-only cells (previously dropped if custom_target_value was null)
          if (weeklyMetric.custom_target_value != null || weeklyMetric.target_note) {
            if (!groupedMetric.weeklyCustomTargets) {
              groupedMetric.weeklyCustomTargets = {};
            }
            groupedMetric.weeklyCustomTargets[displayWeekDate] = {
              custom_target_value: weeklyMetric.custom_target_value ?? null,
              target_note: weeklyMetric.target_note ?? null
            };
          }
        }
      });

      // ✅ CRITICAL FIX: Initialize ALL weeks in weeklyCustomTargets to prevent per-cell fallback queries
      // Without this, hooks see `undefined` for empty weeks and trigger individual DB fetches (~160 queries)
      // With this, hooks see `{ custom_target_value: null, target_note: null }` and short-circuit
      groupedMetrics.forEach((metric) => {
        weekStartDates.forEach((weekDate) => {
          if (!metric.weeklyCustomTargets[weekDate]) {
            metric.weeklyCustomTargets[weekDate] = {
              custom_target_value: null,
              target_note: null
            };
          }
        });
      });

      const finalResult = Array.from(groupedMetrics.values());
      
      return finalResult;
    });
    
    // STEP 4: Calculate formula values efficiently
    const formulaCount = result.filter(m => m.is_formula).length;
    if (formulaCount > 0) {
      trackPerformance(`Formula calculations (${formulaCount} metrics)`, () => {
        result.forEach((metric) => {
          if (metric.is_formula && metric.formula_components) {
            weekStartDates.forEach((weekStart) => {
              const calculationResult = calculateFormula(
                metric.formula_components!,
                result,
                weekStart
              );
              
              if (!calculationResult.error) {
                metric.weeklyValues[weekStart] = calculationResult.value;
              } else if (calculationResult.errorType === 'METRIC_NOT_FOUND') {
                // Store the error for UI display - metric reference is broken
                metric.formula_error = calculationResult.error;
                metric.formula_error_type = calculationResult.errorType;
              }
            });
          }
        });
      });
    }
    
    // ============= CACHE RESULT =============
    const dataHash = hashData({ metrics: allTeamMetrics, weekly: weeklyData });
    resultCache.set(cacheKey, {
      hash: dataHash,
      result,
      timestamp: now
    });
    
    // Clean up old cache entries (keep last 10)
    if (resultCache.size > 10) {
      const entries = Array.from(resultCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, entries.length - 10);
      toDelete.forEach(([key]) => resultCache.delete(key));
    }
    
    return result;

  } catch (error) {
    logger.error('❌ Error in fetchMetricsData:', error);
    throw error;
  }
};

// Export cache clearing function for manual invalidation
export const clearMetricsCache = () => {
  resultCache.clear();
};