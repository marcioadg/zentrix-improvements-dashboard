import { supabase } from '@/integrations/supabase/client';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { getWeekStart, WeekStartDay } from '@/lib/weekUtils';
import { clearMetricsCache } from '@/services/metricDataService';
import { trackMetricCreated, trackMetricUpdated } from '@/lib/statsigAnalytics';
import { logger } from '@/utils/logger';

export const createMetric = async (
  metricName: string,
  unit: string,
  ownerId: string,
  targetValue: number | undefined = undefined,
  targetLogic: string = 'greater_than_or_equal',
  userId: string,
  teamId: string,
  isFormula: boolean = false,
  formulaComponents: any[] = [],
  aggregationType: string = 'total',
  weekStartDay: WeekStartDay = 'monday',
  assistantId: string | null = null
) => {
  logger.log('🔧 createMetric called:', { 
    metricName, 
    unit, 
    ownerId, 
    targetValue, 
    targetLogic, 
    userId, 
    teamId,
    isFormula,
    formulaComponents,
    aggregationType,
    weekStartDay
  });

  // Check for duplicate metric name in the same team with same owner
  const { data: existingMetric, error: checkError } = await supabase
    .from('metrics')
    .select('id, metric_name')
    .eq('metric_name', metricName)
    .eq('team_id', teamId)
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .is('archived_at', null)
    .maybeSingle();

  if (checkError) {
    logger.error('❌ Error checking for duplicate metric:', checkError);
    throw checkError;
  }

  if (existingMetric) {
    const error = new Error(`Cannot create metric: A metric named "${metricName}" already exists for this owner in this team. Please use a different name or edit the existing metric.`);
    logger.error('❌ Duplicate metric detected:', { metricName, teamId, ownerId, existingMetric });
    throw error;
  }

  logger.log('✅ No duplicate metric found, proceeding with creation');

  // Calculate proper week start date based on user settings
  // Use locale-safe formatting to prevent timezone shift issues (e.g., French midnight → UTC previous day)
  const weekStart = getWeekStart(new Date(), weekStartDay);
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');
  const weekStartDate = `${year}-${month}-${day}`;
  logger.log('🔧 Using week start date:', weekStartDate, 'for weekStartDay:', weekStartDay);

  // Use upsert_weekly_metric_value RPC to handle both metrics and weekly_metrics tables atomically
  // Note: For new metrics, we use the value RPC (same as updateMetricValue)
  const { data: weeklyMetricId, error } = await supabase
    .rpc('upsert_weekly_metric_value', {
      p_metric_name: metricName,
      p_owner_id: ownerId,
      p_team_id: teamId,
      p_week_start_date: weekStartDate,
      p_metric_value: null, // Don't pre-populate current week - let user enter when ready
      p_user_id: userId,
      p_unit: unit,
      p_target_value: targetValue,
      p_target_logic: targetLogic,
      p_is_formula: isFormula,
      p_formula_components: formulaComponents || null,
      p_aggregation_type: aggregationType
    });

  if (error) {
    logger.error('❌ createMetric error:', error);
    throw error;
  }

  // Fetch the created weekly_metrics record to return
  const { data, error: fetchError } = await supabase
    .from('weekly_metrics')
    .select()
    .eq('id', weeklyMetricId)
    .single();

  if (fetchError) {
    logger.error('❌ createMetric fetch error:', fetchError);
    throw fetchError;
  }

  logger.log('✅ createMetric success:', data);

  // upsert_weekly_metric_value RPC doesn't take assistant_id; persist it via a
  // follow-up UPDATE keyed on the composite (name, owner, team).
  if (assistantId) {
    const { error: assistantErr } = await supabase
      .from('metrics')
      .update({ assistant_id: assistantId, updated_at: new Date().toISOString() })
      .eq('metric_name', metricName)
      .eq('owner_id', ownerId)
      .eq('team_id', teamId)
      .is('deleted_at', null);
    if (assistantErr) {
      logger.error('⚠️ createMetric: failed to set assistant_id (metric was created):', assistantErr);
      // Non-fatal: the metric exists, just without an assistant.
    }
  }

  // ✅ CRITICAL FIX: Clear in-memory cache so navigation to /m/metrics (or any metrics page)
  // fetches fresh data from DB and shows the newly created metric immediately
  clearMetricsCache();
  
  // Track metric creation (non-blocking)
  try {
    // Get company_id from team
    const { data: teamData } = await supabase
      .from('teams')
      .select('company_id')
      .eq('id', teamId)
      .single();
    
    if (teamData?.company_id) {
      trackMetricCreated({
        user_id: userId,
        company_id: teamData.company_id,
        metric_id: data.id,
        metric_name: metricName,
        metric_type: 'weekly',
      });
    }
  } catch (e) {
    // Non-blocking
  }
  
  return data;
};

export const updateMetricValue = async (
  metricId: string,
  weekStart: string,
  value: number | null,
  metric: WeeklyMetricWithOwner,
  userId: string
) => {
  logger.log('🔧 updateMetricValue called:', { 
    metricId, 
    weekStart, 
    value, 
    userId,
    valueType: typeof value,
    isZero: value === 0,
    isNull: value === null,
    metricInfo: {
      name: metric.metric_name,
      owner: metric.owner_id,
      team: metric.team_id
    }
  });

  // ✅ Early validation: owner_id is required for weekly_metrics upsert
  if (!metric.owner_id) {
    throw new Error('This metric has no owner assigned. Please configure the metric and select an owner before entering values.');
  }

  try {
    // Always use upsert for consistency - handles both null and non-null values safely
    logger.log('🔧 Using database function for safe metric upsert:', {
      value,
      valueType: typeof value,
      isNull: value === null,
      weekStart,
      metricName: metric.metric_name
    });

    // Use the specialized RPC function that preserves custom_target_value and target_note
    const { data: upsertData, error } = await supabase
      .rpc('upsert_weekly_metric_value', {
        p_metric_name: metric.metric_name,
        p_owner_id: metric.owner_id,
        p_team_id: metric.team_id,
        p_week_start_date: weekStart,
        p_metric_value: value, // Can be null - function handles this correctly
        p_user_id: userId,
        p_unit: metric.unit,
        p_target_value: metric.target_value,
        p_target_logic: metric.target_logic,
        p_is_formula: metric.is_formula || false,
        p_formula_components: metric.formula_components || null,
        p_aggregation_type: metric.aggregation_type || 'total'
      });

    if (error) {
      logger.error('❌ Upsert operation failed:', error);
      
      // ✅ LAYER 3: Handle METRIC_RECENTLY_DELETED error gracefully
      // This prevents race conditions where User B tries to save to a metric User A just deleted
      if (error.message?.includes('METRIC_RECENTLY_DELETED')) {
        throw new Error('METRIC_RECENTLY_DELETED: This metric was deleted by another user. Please refresh the page.');
      }
      
      throw new Error(`Failed to save metric: ${error.message}`);
    }

    logger.log('✅ Upsert operation successful:', {
      resultId: upsertData,
      savedValue: value,
      isNullPreserved: value === null
    });

    // ✅ CRITICAL FIX: Clear in-memory cache so any subsequent refetch gets fresh DB data
    // This prevents stale cached data from overwriting the optimistic UI update
    clearMetricsCache();

    // Track metric value update (non-blocking)
    if (value !== null) {
      try {
        const { data: teamData } = await supabase
          .from('teams')
          .select('company_id')
          .eq('id', metric.team_id)
          .single();
        
        if (teamData?.company_id) {
          trackMetricUpdated({
            user_id: userId,
            company_id: teamData.company_id,
            metric_id: metricId,
            new_value: value,
          });
        }
      } catch (e) {
        // Non-blocking
      }
    }

    logger.log('✅ updateMetricValue completed successfully');
  } catch (error) {
    logger.error('❌ updateMetricValue error:', {
      error: error instanceof Error ? error.message : error,
      originalValue: value,
      metricInfo: {
        name: metric.metric_name,
        owner: metric.owner_id,
        team: metric.team_id,
        week: weekStart
      }
    });
    throw error;
  }
};

// ✅ NEW: Update custom target using specialized RPC (same pattern as updateMetricValue)
export const updateCustomTarget = async (
  metricId: string,
  weekStart: string,
  customTargetValue: number | null,
  targetNote: string | null,
  metric: WeeklyMetricWithOwner,
  userId: string
) => {
  logger.log('🔧 updateCustomTarget called:', { 
    metricId, 
    weekStart, 
    customTargetValue, 
    targetNote, 
    userId,
    metricInfo: {
      name: metric.metric_name,
      owner: metric.owner_id,
      team: metric.team_id
    }
  });

  try {
    // ✅ Early validation: owner_id is required for weekly_metrics upsert
    if (!metric.owner_id) {
      throw new Error('This metric has no owner assigned. Please configure the metric and select an owner before saving a custom target.');
    }

    // Use the specialized RPC function that preserves metric_value
    const { data: upsertData, error } = await supabase
      .rpc('upsert_weekly_metric_custom_target', {
        p_metric_name: metric.metric_name,
        p_owner_id: metric.owner_id,
        p_team_id: metric.team_id,
        p_week_start_date: weekStart,
        p_custom_target_value: customTargetValue, // Can be null - function handles this correctly
        p_target_note: targetNote, // Can be null - function handles this correctly
        p_user_id: userId,
        p_unit: metric.unit,
        p_target_value: metric.target_value,
        p_target_logic: metric.target_logic,
        p_is_formula: metric.is_formula || false,
        p_formula_components: metric.formula_components || null,
        p_aggregation_type: metric.aggregation_type || 'total'
      });

    if (error) {
      logger.error('❌ Upsert operation failed:', error);
      throw new Error(`Failed to save custom target: ${error.message}`);
    }

    logger.log('✅ Custom target updated successfully:', {
      resultId: upsertData,
      savedCustomTargetValue: customTargetValue,
      savedTargetNote: targetNote
    });

    // ✅ CRITICAL FIX: Clear cache to prevent stale data overwriting optimistic updates
    clearMetricsCache();
  } catch (error) {
    logger.error('❌ updateCustomTarget error:', {
      error: error instanceof Error ? error.message : error,
      originalCustomTargetValue: customTargetValue,
      originalTargetNote: targetNote,
      metricInfo: {
        name: metric.metric_name,
        owner: metric.owner_id,
        team: metric.team_id,
        week: weekStart
      }
    });
    throw error;
  }
};

// ✅ NEW: Update ONLY custom_target_value, preserving target_note (independent update)
export const updateCustomTargetOnly = async (
  metricId: string,
  weekStart: string,
  customTargetValue: number | null,
  metric: WeeklyMetricWithOwner,
  userId: string
) => {
  logger.log('🔧 updateCustomTargetOnly called:', { 
    metricId, 
    weekStart, 
    customTargetValue, 
    userId,
    metricInfo: {
      name: metric.metric_name,
      owner: metric.owner_id,
      team: metric.team_id
    }
  });

  try {
    // Use the specialized RPC function that preserves BOTH metric_value AND target_note
    const { data: upsertData, error } = await supabase
      .rpc('upsert_weekly_metric_custom_target_only', {
        p_metric_name: metric.metric_name,
        p_owner_id: metric.owner_id,
        p_team_id: metric.team_id,
        p_week_start_date: weekStart,
        p_custom_target_value: customTargetValue, // ONLY this field is updated
        p_user_id: userId,
        p_unit: metric.unit,
        p_target_value: metric.target_value,
        p_target_logic: metric.target_logic,
        p_is_formula: metric.is_formula || false,
        p_formula_components: metric.formula_components || null,
        p_aggregation_type: metric.aggregation_type || 'total'
      });

    if (error) {
      logger.error('❌ Upsert operation failed:', error);
      throw new Error(`Failed to save custom target: ${error.message}`);
    }

    logger.log('✅ Custom target (only) updated successfully:', {
      resultId: upsertData,
      savedCustomTargetValue: customTargetValue,
      notePreserved: true
    });

    // ✅ CRITICAL FIX: Clear cache to prevent stale data overwriting optimistic updates
    clearMetricsCache();
  } catch (error) {
    logger.error('❌ updateCustomTargetOnly error:', {
      error: error instanceof Error ? error.message : error,
      originalCustomTargetValue: customTargetValue,
      metricInfo: {
        name: metric.metric_name,
        owner: metric.owner_id,
        team: metric.team_id,
        week: weekStart
      }
    });
    throw error;
  }
};

// ✅ NEW: Update note using specialized RPC (same pattern as updateMetricValue)
export const updateNote = async (
  metricId: string,
  weekStart: string,
  note: string | null,
  metric: WeeklyMetricWithOwner,
  userId: string
) => {
  logger.log('🔧 updateNote called:', { 
    metricId, 
    weekStart, 
    note, 
    userId,
    metricInfo: {
      name: metric.metric_name,
      owner: metric.owner_id,
      team: metric.team_id
    }
  });

  try {
    // ✅ Early validation: owner_id is required for weekly_metrics upsert
    if (!metric.owner_id) {
      throw new Error('This metric has no owner assigned. Please configure the metric and select an owner before saving a note.');
    }

    // Use the specialized RPC function that preserves metric_value and custom_target_value
    const { data: upsertData, error } = await supabase
      .rpc('upsert_weekly_metric_note', {
        p_metric_name: metric.metric_name,
        p_owner_id: metric.owner_id,
        p_team_id: metric.team_id,
        p_week_start_date: weekStart,
        p_target_note: note, // Can be null - function handles this correctly
        p_user_id: userId,
        p_unit: metric.unit,
        p_target_value: metric.target_value,
        p_target_logic: metric.target_logic,
        p_is_formula: metric.is_formula || false,
        p_formula_components: metric.formula_components || null,
        p_aggregation_type: metric.aggregation_type || 'total'
      });

    if (error) {
      logger.error('❌ Upsert operation failed:', error);
      throw new Error(`Failed to save note: ${error.message}`);
    }

    logger.log('✅ Note updated successfully:', {
      resultId: upsertData,
      savedNote: note
    });

    // ✅ CRITICAL FIX: Clear cache to prevent stale data overwriting optimistic updates
    clearMetricsCache();
  } catch (error) {
    logger.error('❌ updateNote error:', {
      error: error instanceof Error ? error.message : error,
      originalNote: note,
      metricInfo: {
        name: metric.metric_name,
        owner: metric.owner_id,
        team: metric.team_id,
        week: weekStart
      }
    });
    throw error;
  }
};

export const updateMetricConfig = async (metricId: string, config: any) => {
  logger.log('🔧 updateMetricConfig called:', { metricId, config });

  // First, get the metric details to identify all related entries
  const { data: metricInfo, error: fetchError } = await supabase
    .from('metrics')
    .select('metric_name, owner_id, team_id')
    .eq('id', metricId)
    .is('deleted_at', null)
    .is('archived_at', null)
    .maybeSingle();

  if (fetchError) {
    logger.error('❌ updateMetricConfig fetch error:', fetchError);
    throw fetchError;
  }

  if (!metricInfo) {
    logger.error('❌ updateMetricConfig: Metric not found with ID:', metricId);
    throw new Error(`Metric with ID ${metricId} not found or has been deleted`);
  }

  logger.log('🔧 updateMetricConfig: Updating all entries for metric:', { 
    metricName: metricInfo.metric_name, 
    ownerId: metricInfo.owner_id,
    teamId: metricInfo.team_id,
    config
  });

  // Extract update config (remove id and other fields we don't want to update)
  const { id, ...updateConfig } = config;

  // Pre-flight duplicate check: if the dedupe key (name, owner, team) is changing,
  // make sure no other live metric already owns that combination. Without this, the
  // weekly_metrics UPDATE later fails on a unique-constraint violation with a cryptic
  // 23505 error and no clear toast in the rename modal.
  const effectiveName = updateConfig.metric_name ?? metricInfo.metric_name;
  const effectiveOwner = 'owner_id' in updateConfig ? updateConfig.owner_id : metricInfo.owner_id;
  const effectiveTeam = 'team_id' in updateConfig ? updateConfig.team_id : metricInfo.team_id;
  const keyChanged =
    effectiveName !== metricInfo.metric_name ||
    effectiveOwner !== metricInfo.owner_id ||
    effectiveTeam !== metricInfo.team_id;

  if (keyChanged) {
    const { data: conflict, error: conflictErr } = await supabase
      .from('metrics')
      .select('id')
      .eq('metric_name', effectiveName)
      .eq('owner_id', effectiveOwner)
      .eq('team_id', effectiveTeam)
      .neq('id', metricId)
      .is('deleted_at', null)
      .maybeSingle();

    if (conflictErr) {
      logger.error('❌ updateMetricConfig duplicate-check error:', conflictErr);
      throw conflictErr;
    }

    if (conflict) {
      const message = `A metric named "${effectiveName}" already exists for this owner in this team. Please choose a different name.`;
      logger.error('❌ updateMetricConfig: Duplicate metric detected:', {
        attemptedName: effectiveName,
        ownerId: effectiveOwner,
        teamId: effectiveTeam,
        conflictingId: conflict.id,
      });
      throw new Error(message);
    }
  }
  
  logger.log('🔧 updateMetricConfig: Processing config:', { 
    originalConfig: config, 
    updateConfig, 
    description: updateConfig.description,
    hasDescription: 'description' in updateConfig,
    aggregationType: updateConfig.aggregation_type,
    hasAggregationType: 'aggregation_type' in updateConfig
  });
  
  // STEP 1: Update parent metrics table with ALL fields including metric_name
  logger.log('🔧 Updating parent metrics table');
  const metricsUpdate: any = {
    metric_name: updateConfig.metric_name ?? metricInfo.metric_name,
    unit: updateConfig.unit,
    target_value: updateConfig.target_value,
    target_logic: updateConfig.target_logic,
    description: updateConfig.description,
    is_formula: updateConfig.is_formula,
    formula_components: updateConfig.formula_components,
    aggregation_type: updateConfig.aggregation_type,
    updated_at: new Date().toISOString()
  };
  
  // If owner_id is being changed, include it in the update
  if ('owner_id' in updateConfig) {
    metricsUpdate.owner_id = updateConfig.owner_id;
  }
  
  // If assistant_id is being changed, include it in the update
  if ('assistant_id' in updateConfig) {
    metricsUpdate.assistant_id = updateConfig.assistant_id;
  }
  
  // If team_id is being changed, include it in the update
  if ('team_id' in updateConfig) {
    metricsUpdate.team_id = updateConfig.team_id;
  }
  
  const { error: metricsUpdateError } = await supabase
    .from('metrics')
    .update(metricsUpdate)
    .eq('metric_name', metricInfo.metric_name)
    .eq('owner_id', metricInfo.owner_id)
    .eq('team_id', metricInfo.team_id)
    .is('deleted_at', null);
    
  if (metricsUpdateError) {
    logger.error('❌ Failed to update parent metrics table:', metricsUpdateError);
    throw metricsUpdateError;
  }
  
  logger.log('✅ Parent metrics table updated successfully');

  // STEP 2: Update all weekly_metrics entries with ALL fields including metric_name
  // Filter still uses the OLD metric_name because that's what weekly_metrics rows contain
  const { data, error } = await supabase
    .from('weekly_metrics')
    .update({
      metric_name: updateConfig.metric_name ?? metricInfo.metric_name,
      ...updateConfig,
      updated_at: new Date().toISOString()
    })
    .eq('metric_name', metricInfo.metric_name)
    .eq('owner_id', metricInfo.owner_id)
    .eq('team_id', metricInfo.team_id)
    .is('deleted_at', null)
    .select();

  if (error) {
    logger.error('❌ updateMetricConfig error on weekly_metrics:', error);
    // Attempt to roll back the metrics table update to restore consistency
    logger.log('⚠️ Attempting rollback of metrics table update');
    const rollbackUpdate: any = {
      metric_name: metricInfo.metric_name,
      unit: metricInfo.unit,
      target_value: metricInfo.target_value,
      target_logic: metricInfo.target_logic,
      description: metricInfo.description,
      is_formula: metricInfo.is_formula,
      formula_components: metricInfo.formula_components,
      aggregation_type: metricInfo.aggregation_type,
      updated_at: new Date().toISOString()
    };
    const { error: rollbackError } = await supabase
      .from('metrics')
      .update(rollbackUpdate)
      .eq('metric_name', metricsUpdate.metric_name)
      .eq('owner_id', metricInfo.owner_id)
      .eq('team_id', metricInfo.team_id)
      .is('deleted_at', null);
    if (rollbackError) {
      logger.error('❌ Rollback failed — metrics and weekly_metrics may be inconsistent:', rollbackError);
    } else {
      logger.log('✅ Rollback successful');
    }
    throw error;
  }

  logger.log('✅ updateMetricConfig success - updated', data?.length || 0, 'entries');
  logger.log('🔧 updateMetricConfig: Updated entries data:', data?.map(entry => ({
    id: entry.id,
    metric_name: entry.metric_name,
    aggregation_type: entry.aggregation_type,
    owner_id: entry.owner_id
  })));
  return data;
};

export const deleteMetric = async (metricName: string, ownerId: string, teamId: string) => {
  logger.log('🔧 deleteMetric called:', { metricName, ownerId, teamId });

  const deletedAt = new Date().toISOString();

  // Update parent metrics table
  const { error: metricsError } = await supabase
    .from('metrics')
    .update({ deleted_at: deletedAt })
    .eq('metric_name', metricName)
    .eq('owner_id', ownerId)
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .is('archived_at', null);

  if (metricsError) {
    logger.error('❌ deleteMetric metrics table error:', metricsError);
    throw metricsError;
  }

  // Update weekly_metrics table
  const { error } = await supabase
    .from('weekly_metrics')
    .update({ deleted_at: deletedAt })
    .eq('metric_name', metricName)
    .eq('owner_id', ownerId)
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .is('archived_at', null);

  if (error) {
    logger.error('❌ deleteMetric weekly_metrics error:', error);
    throw error;
  }

  logger.log('✅ deleteMetric success');
};

export const deleteMetricFromAllTeams = async (metricName: string, ownerId: string) => {
  logger.log('🔧 deleteMetricFromAllTeams called:', { metricName, ownerId });

  const deletedAt = new Date().toISOString();

  // Update parent metrics table (all teams)
  const { error: metricsError } = await supabase
    .from('metrics')
    .update({ deleted_at: deletedAt })
    .eq('metric_name', metricName)
    .eq('owner_id', ownerId)
    .is('deleted_at', null);

  if (metricsError) {
    logger.error('❌ deleteMetricFromAllTeams metrics table error:', metricsError);
    throw metricsError;
  }

  // Update weekly_metrics table (all teams)
  const { error } = await supabase
    .from('weekly_metrics')
    .update({ deleted_at: deletedAt })
    .eq('metric_name', metricName)
    .eq('owner_id', ownerId)
    .is('deleted_at', null);

  if (error) {
    logger.error('❌ deleteMetricFromAllTeams weekly_metrics error:', error);
    throw error;
  }

  logger.log('✅ deleteMetricFromAllTeams success');
};

export const bulkDeleteMetrics = async (metricsToDelete: Array<{
  metricName: string;
  ownerId: string;
  teamId: string;
}>) => {
  logger.log('🔧 bulkDeleteMetrics called:', { count: metricsToDelete.length });

  const promises = metricsToDelete.map(({ metricName, ownerId, teamId }) =>
    deleteMetric(metricName, ownerId, teamId)
  );

  const results = await Promise.allSettled(promises);

  const failures = results
    .map((result, index) => ({ result, metric: metricsToDelete[index] }))
    .filter(({ result }) => result.status === 'rejected');

  if (failures.length > 0) {
    const failedNames = failures.map(({ metric }) => metric.metricName).join(', ');
    logger.error(`❌ bulkDeleteMetrics: ${failures.length} of ${metricsToDelete.length} deletions failed:`, failedNames);
    throw new Error(`Failed to delete ${failures.length} metric(s): ${failedNames}`);
  }

  logger.log('✅ bulkDeleteMetrics success');
};

export const archiveMetric = async (metricId: string) => {
  logger.log('📦 archiveMetric called:', { metricId });

  const archivedAt = new Date().toISOString();

  // Update parent metrics table
  const { error: metricsError } = await supabase
    .from('metrics')
    .update({ archived_at: archivedAt })
    .eq('id', metricId)
    .is('deleted_at', null)
    .is('archived_at', null); // Only archive if not already archived

  if (metricsError) {
    logger.error('❌ archiveMetric metrics table error:', metricsError);
    throw metricsError;
  }

  logger.log('✅ archiveMetric success');
};

export const unarchiveMetric = async (metricId: string) => {
  logger.log('📤 unarchiveMetric called:', { metricId });

  // Update parent metrics table - set archived_at to NULL
  const { error: metricsError } = await supabase
    .from('metrics')
    .update({ archived_at: null })
    .eq('id', metricId)
    .is('deleted_at', null);

  if (metricsError) {
    logger.error('❌ unarchiveMetric metrics table error:', metricsError);
    throw metricsError;
  }

  logger.log('✅ unarchiveMetric success');
};

// ============= MULTI-TEAM METRIC ASSIGNMENTS =============

/**
 * Get all team assignments for a metric (including primary team)
 */
export const getMetricTeamAssignments = async (metricId: string): Promise<string[]> => {
  logger.log('🔧 getMetricTeamAssignments called:', { metricId });

  // Get primary team from metrics table
  const { data: metric, error: metricError } = await supabase
    .from('metrics')
    .select('team_id')
    .eq('id', metricId)
    .is('deleted_at', null)
    .single();

  if (metricError) {
    logger.error('❌ getMetricTeamAssignments metric error:', metricError);
    throw metricError;
  }

  // Get additional team assignments from junction table
  const { data: assignments, error: assignmentsError } = await supabase
    .from('metric_team_assignments')
    .select('team_id')
    .eq('metric_id', metricId);

  if (assignmentsError) {
    logger.error('❌ getMetricTeamAssignments assignments error:', assignmentsError);
    throw assignmentsError;
  }

  // Combine primary team with additional assignments
  const allTeamIds = [
    metric.team_id,
    ...(assignments || []).map(a => a.team_id)
  ];

  // Remove duplicates
  const uniqueTeamIds = [...new Set(allTeamIds)];
  logger.log('✅ getMetricTeamAssignments success:', uniqueTeamIds);
  
  return uniqueTeamIds;
};

/**
 * Update team assignments for a metric
 * @param metricId - The metric to update
 * @param teamIds - Array of ALL team IDs (first one becomes primary, rest go to junction table)
 */
export const updateMetricTeamAssignments = async (
  metricId: string,
  teamIds: string[]
): Promise<void> => {
  logger.log('🔧 updateMetricTeamAssignments called:', { metricId, teamIds });

  if (teamIds.length === 0) {
    throw new Error('Metric must be assigned to at least one team');
  }

  const primaryTeamId = teamIds[0];
  const additionalTeamIds = teamIds.slice(1);

  // Update primary team in metrics table
  const { error: updateError } = await supabase
    .from('metrics')
    .update({ team_id: primaryTeamId, updated_at: new Date().toISOString() })
    .eq('id', metricId)
    .is('deleted_at', null);

  if (updateError) {
    logger.error('❌ updateMetricTeamAssignments primary team error:', updateError);
    throw updateError;
  }

  // Get current assignments
  const { data: currentAssignments, error: fetchError } = await supabase
    .from('metric_team_assignments')
    .select('team_id')
    .eq('metric_id', metricId);

  if (fetchError) {
    logger.error('❌ updateMetricTeamAssignments fetch error:', fetchError);
    throw fetchError;
  }

  const currentAdditionalTeamIds = (currentAssignments || []).map(a => a.team_id);
  
  // Determine what to add and remove
  const toAdd = additionalTeamIds.filter(id => !currentAdditionalTeamIds.includes(id));
  const toRemove = currentAdditionalTeamIds.filter(id => !additionalTeamIds.includes(id));

  // Remove assignments that are no longer needed
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('metric_team_assignments')
      .delete()
      .eq('metric_id', metricId)
      .in('team_id', toRemove);

    if (deleteError) {
      logger.error('❌ updateMetricTeamAssignments delete error:', deleteError);
      throw deleteError;
    }
  }

  // Add new assignments
  if (toAdd.length > 0) {
    const insertData = toAdd.map(teamId => ({
      metric_id: metricId,
      team_id: teamId
    }));

    const { error: insertError } = await supabase
      .from('metric_team_assignments')
      .insert(insertData);

    if (insertError) {
      logger.error('❌ updateMetricTeamAssignments insert error:', insertError);
      throw insertError;
    }
  }

  // Clear cache to ensure fresh data
  clearMetricsCache();
  
  logger.log('✅ updateMetricTeamAssignments success:', {
    primaryTeam: primaryTeamId,
    additionalTeams: additionalTeamIds,
    added: toAdd,
    removed: toRemove
  });
};

/**
 * Add a single team assignment to a metric
 */
export const addMetricTeamAssignment = async (
  metricId: string,
  teamId: string
): Promise<void> => {
  logger.log('🔧 addMetricTeamAssignment called:', { metricId, teamId });

  const { error } = await supabase
    .from('metric_team_assignments')
    .insert({ metric_id: metricId, team_id: teamId });

  if (error) {
    // Ignore duplicate key errors (assignment already exists)
    if (error.code === '23505') {
      logger.log('⚠️ Assignment already exists, ignoring');
      return;
    }
    logger.error('❌ addMetricTeamAssignment error:', error);
    throw error;
  }

  clearMetricsCache();
  logger.log('✅ addMetricTeamAssignment success');
};

// ============= BULK MULTI-TEAM ASSIGN / COPY (Configure Metrics modal) =============

type MetricCompositeKey = {
  metric_name: string;
  owner_id: string;
  team_id: string;
};

type ParentMetricRow = {
  id: string;
  metric_name: string;
  owner_id: string;
  team_id: string;
  unit: string;
  target_value: number | null;
  target_logic: string | null;
  is_formula: boolean | null;
  formula_components: any;
  aggregation_type: string | null;
  description: string | null;
  assistant_id: string | null;
};

const keyOf = (k: MetricCompositeKey) => `${k.metric_name}|${k.owner_id}|${k.team_id}`;

/**
 * Resolve parent metric rows from composite (metric_name, owner_id, team_id) keys.
 * Modal sources from useCompanyMetrics expose only the composite key, not the parent metric id.
 */
const resolveParentMetrics = async (
  sources: MetricCompositeKey[]
): Promise<Map<string, ParentMetricRow>> => {
  const result = new Map<string, ParentMetricRow>();
  if (sources.length === 0) return result;

  // Small N (modal selection), parallel single lookups are simpler than building OR tuples.
  const lookups = sources.map(async (s) => {
    const { data, error } = await supabase
      .from('metrics')
      .select('id, metric_name, owner_id, team_id, unit, target_value, target_logic, is_formula, formula_components, aggregation_type, description, assistant_id')
      .eq('metric_name', s.metric_name)
      .eq('owner_id', s.owner_id)
      .eq('team_id', s.team_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      logger.error('❌ resolveParentMetrics lookup error:', error, s);
      return null;
    }
    return data as ParentMetricRow | null;
  });

  const rows = await Promise.all(lookups);
  rows.forEach((row, i) => {
    if (row) result.set(keyOf(sources[i]), row);
  });
  return result;
};

export type BulkAssignResult = {
  assigned: number;
  skipped: number;
  errors: Array<{ metricName: string; teamId: string; error: string }>;
};

/**
 * Assign existing metrics to additional teams via metric_team_assignments junction table.
 * Same metric row in `metrics` ends up linked to multiple teams (shared values).
 * Silently skips pairs that are already linked (primary team or existing junction row).
 */
export const bulkAssignMetricsToTeams = async (
  sources: MetricCompositeKey[],
  targetTeamIds: string[]
): Promise<BulkAssignResult> => {
  logger.log('🔧 bulkAssignMetricsToTeams called:', {
    sourceCount: sources.length,
    targetTeamIds,
  });

  const result: BulkAssignResult = { assigned: 0, skipped: 0, errors: [] };
  if (sources.length === 0 || targetTeamIds.length === 0) return result;

  const parents = await resolveParentMetrics(sources);

  // Fetch existing additional-team assignments for all involved metrics in one go.
  const parentIds = Array.from(parents.values()).map(p => p.id);
  const existingByMetric = new Map<string, Set<string>>();
  if (parentIds.length > 0) {
    const { data: existing, error: existingErr } = await supabase
      .from('metric_team_assignments')
      .select('metric_id, team_id')
      .in('metric_id', parentIds);
    if (existingErr) {
      logger.error('❌ bulkAssignMetricsToTeams existing-assignments fetch error:', existingErr);
      throw existingErr;
    }
    (existing || []).forEach(row => {
      const set = existingByMetric.get(row.metric_id) || new Set<string>();
      set.add(row.team_id);
      existingByMetric.set(row.metric_id, set);
    });
  }

  const inserts: Array<{ metric_id: string; team_id: string; metricName: string }> = [];

  for (const source of sources) {
    const parent = parents.get(keyOf(source));
    if (!parent) {
      result.errors.push({
        metricName: source.metric_name,
        teamId: '',
        error: 'Source metric not found',
      });
      continue;
    }
    for (const teamId of targetTeamIds) {
      // Already on its primary team — silent skip.
      if (teamId === parent.team_id) {
        result.skipped++;
        continue;
      }
      // Already in junction — silent skip.
      if (existingByMetric.get(parent.id)?.has(teamId)) {
        result.skipped++;
        continue;
      }
      inserts.push({ metric_id: parent.id, team_id: teamId, metricName: parent.metric_name });
    }
  }

  if (inserts.length > 0) {
    const { error } = await supabase
      .from('metric_team_assignments')
      .insert(inserts.map(({ metric_id, team_id }) => ({ metric_id, team_id })));
    if (error) {
      // 23505 means another path inserted the same row concurrently — count as skipped, not error.
      if (error.code === '23505') {
        result.skipped += inserts.length;
      } else {
        logger.error('❌ bulkAssignMetricsToTeams insert error:', error);
        inserts.forEach(i => result.errors.push({
          metricName: i.metricName,
          teamId: i.team_id,
          error: error.message,
        }));
      }
    } else {
      result.assigned = inserts.length;
    }
  }

  clearMetricsCache();
  logger.log('✅ bulkAssignMetricsToTeams done:', result);
  return result;
};

export type BulkCopyResult = {
  copied: number;
  skipped: Array<{ metricName: string; teamId: string; reason: string }>;
  errors: Array<{ metricName: string; teamId: string; error: string }>;
};

/**
 * Duplicate metrics into target teams as brand-new metric rows.
 * Copies definition fields (name, owner, unit, target, formula, description, assistant_id);
 * does NOT copy past weekly values — only a current-week placeholder row is created by the RPC.
 * Skips (source × target) pairs where a metric with the same name+owner already exists in target.
 */
export const bulkCopyMetricsToTeams = async (
  sources: MetricCompositeKey[],
  targetTeamIds: string[],
  userId: string,
  weekStartDay: WeekStartDay = 'monday'
): Promise<BulkCopyResult> => {
  logger.log('🔧 bulkCopyMetricsToTeams called:', {
    sourceCount: sources.length,
    targetTeamIds,
  });

  const result: BulkCopyResult = { copied: 0, skipped: [], errors: [] };
  if (sources.length === 0 || targetTeamIds.length === 0) return result;

  const parents = await resolveParentMetrics(sources);

  // Pre-check collisions: which (metric_name, owner_id, team_id) tuples already exist in target teams?
  const parentList = Array.from(parents.values());
  const names = Array.from(new Set(parentList.map(p => p.metric_name)));
  const owners = Array.from(new Set(parentList.map(p => p.owner_id)));

  const collisionSet = new Set<string>(); // key = `${metric_name}|${owner_id}|${team_id}`
  if (names.length > 0 && owners.length > 0) {
    const { data: collisions, error: collErr } = await supabase
      .from('metrics')
      .select('metric_name, owner_id, team_id')
      .in('metric_name', names)
      .in('owner_id', owners)
      .in('team_id', targetTeamIds)
      .is('deleted_at', null);
    if (collErr) {
      logger.error('❌ bulkCopyMetricsToTeams collision-check error:', collErr);
      throw collErr;
    }
    (collisions || []).forEach(row => {
      collisionSet.add(`${row.metric_name}|${row.owner_id}|${row.team_id}`);
    });
  }

  // Compute week start date once.
  const weekStart = getWeekStart(new Date(), weekStartDay);
  const yyyy = weekStart.getFullYear();
  const mm = String(weekStart.getMonth() + 1).padStart(2, '0');
  const dd = String(weekStart.getDate()).padStart(2, '0');
  const weekStartDate = `${yyyy}-${mm}-${dd}`;

  for (const source of sources) {
    const parent = parents.get(keyOf(source));
    if (!parent) {
      result.errors.push({
        metricName: source.metric_name,
        teamId: '',
        error: 'Source metric not found',
      });
      continue;
    }

    for (const teamId of targetTeamIds) {
      // Same-team copy doesn't make sense (would collide with itself).
      if (teamId === parent.team_id) {
        result.skipped.push({
          metricName: parent.metric_name,
          teamId,
          reason: 'Already in this team',
        });
        continue;
      }
      if (collisionSet.has(`${parent.metric_name}|${parent.owner_id}|${teamId}`)) {
        result.skipped.push({
          metricName: parent.metric_name,
          teamId,
          reason: 'Already exists in target team',
        });
        continue;
      }

      try {
        const { error: rpcError } = await supabase.rpc('upsert_weekly_metric_value', {
          p_metric_name: parent.metric_name,
          p_owner_id: parent.owner_id,
          p_team_id: teamId,
          p_week_start_date: weekStartDate,
          p_metric_value: null,
          p_user_id: userId,
          p_unit: parent.unit,
          p_target_value: parent.target_value,
          p_target_logic: parent.target_logic || 'greater_than_or_equal',
          p_is_formula: parent.is_formula || false,
          p_formula_components: parent.formula_components || null,
          p_aggregation_type: parent.aggregation_type || 'total',
        });

        if (rpcError) {
          logger.error('❌ bulkCopyMetricsToTeams RPC error:', rpcError, { parent: parent.metric_name, teamId });
          result.errors.push({
            metricName: parent.metric_name,
            teamId,
            error: rpcError.message?.includes('METRIC_RECENTLY_DELETED')
              ? 'Recently deleted in target team; please refresh and retry'
              : rpcError.message,
          });
          continue;
        }

        // Copy description and assistant_id (not parameters of the RPC).
        if (parent.description != null || parent.assistant_id != null) {
          const { error: updErr } = await supabase
            .from('metrics')
            .update({
              description: parent.description,
              assistant_id: parent.assistant_id,
              updated_at: new Date().toISOString(),
            })
            .eq('metric_name', parent.metric_name)
            .eq('owner_id', parent.owner_id)
            .eq('team_id', teamId)
            .is('deleted_at', null);
          if (updErr) {
            logger.error('⚠️ bulkCopyMetricsToTeams description/assistant_id copy error:', updErr, { parent: parent.metric_name, teamId });
            // Non-fatal: the metric was copied, just missing extra fields.
          }
        }

        result.copied++;
      } catch (err: any) {
        logger.error('❌ bulkCopyMetricsToTeams unexpected error:', err, { parent: parent.metric_name, teamId });
        result.errors.push({
          metricName: parent.metric_name,
          teamId,
          error: err?.message || String(err),
        });
      }
    }
  }

  clearMetricsCache();
  logger.log('✅ bulkCopyMetricsToTeams done:', result);
  return result;
};

/**
 * Remove a single team assignment from a metric
 */
export const removeMetricTeamAssignment = async (
  metricId: string,
  teamId: string
): Promise<void> => {
  logger.log('🔧 removeMetricTeamAssignment called:', { metricId, teamId });

  const { error } = await supabase
    .from('metric_team_assignments')
    .delete()
    .eq('metric_id', metricId)
    .eq('team_id', teamId);

  if (error) {
    logger.error('❌ removeMetricTeamAssignment error:', error);
    throw error;
  }

  clearMetricsCache();
  logger.log('✅ removeMetricTeamAssignment success');
};
