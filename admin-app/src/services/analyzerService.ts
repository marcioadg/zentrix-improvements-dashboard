
import { supabase } from '@/integrations/supabase/client';
import { AnalyzerScore, AnalyzerBar, ScoreValue } from '@/types/analyzer';
import { logger } from '@/utils/logger';

export class AnalyzerService {
  static async getScores(
    companyId: string, 
    evaluationDate?: string // Optional: filter by specific date (YYYY-MM-DD)
  ): Promise<AnalyzerScore[]> {
    let query = supabase
      .from('people_analyzer_scores')
      .select('*')
      .eq('company_id', companyId);

    // If evaluationDate is provided, filter by it
    if (evaluationDate) {
      query = query.eq('evaluation_date', evaluationDate);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      score_type: item.score_type as AnalyzerScore['score_type'],
      score_value: item.score_value as ScoreValue,
      evaluation_date: item.evaluation_date || new Date(item.updated_at).toISOString().split('T')[0], // Fallback for safety
    }));
  }

  static async getBars(companyId: string): Promise<AnalyzerBar[]> {
    const { data, error } = await supabase
      .from('people_analyzer_bars')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false }); // Order by most recent first

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      score_type: item.score_type as AnalyzerBar['score_type'],
      required_score: item.required_score as ScoreValue,
    }));
  }

  static async updateScore(
    userId: string,
    companyId: string,
    scoreType: string,
    coreValueName: string | null,
    scoreValue: ScoreValue,
    evaluatedBy: string
  ): Promise<AnalyzerScore> {
    logger.log('🔄 AnalyzerService.updateScore:', {
      userId: userId.substring(0, 8),
      companyId: companyId.substring(0, 8),
      scoreType,
      coreValueName,
      scoreValue,
      evaluatedBy: evaluatedBy.substring(0, 8)
    });

    // Get today's date in YYYY-MM-DD format (timezone-aware)
    const today = new Date().toISOString().split('T')[0];

    // Check if record exists for TODAY (same day = overwrite)
    // FIX: Use .is() for null values, .eq() for non-null values
    let existingQuery = supabase
      .from('people_analyzer_scores')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('score_type', scoreType);
    
    // Handle core_value_name correctly: use .is() for null, .eq() for strings
    if (coreValueName === null || coreValueName === undefined) {
      existingQuery = existingQuery.is('core_value_name', null);
    } else {
      existingQuery = existingQuery.eq('core_value_name', coreValueName);
    }
    
    // Add evaluation_date check (if migration was applied)
    existingQuery = existingQuery.eq('evaluation_date', today);
    
    const { data: existingData, error: selectError } = await existingQuery.maybeSingle();

    if (selectError) {
      logger.error('❌ Error checking existing score:', selectError);
      throw new Error(`Failed to check existing score: ${selectError.message}`);
    }

    let data;
    let error;

    if (existingData) {
      // UPDATE: Same day, same score type = overwrite existing record
      const updateResult = await supabase
        .from('people_analyzer_scores')
        .update({
          score_value: scoreValue,
          evaluated_by: evaluatedBy,
          updated_at: new Date().toISOString(),
          // evaluation_date stays the same (today)
        })
        .eq('id', existingData.id)
        .select()
        .single();
      
      data = updateResult.data;
      error = updateResult.error;
      logger.log('✅ Updated existing score record for today');
    } else {
      // INSERT: Different day OR new score type = create new historical record
      const insertResult = await supabase
        .from('people_analyzer_scores')
        .insert({
          user_id: userId,
          company_id: companyId,
          core_value_name: coreValueName,
          score_type: scoreType,
          score_value: scoreValue,
          evaluated_by: evaluatedBy,
          evaluation_date: today, // Set to today's date
        })
        .select()
        .single();
      
      data = insertResult.data;
      error = insertResult.error;
      logger.log('✅ Inserted new score record for today');
    }

    if (error) {
      logger.error('❌ Database error in updateScore:', error);
      throw new Error(`Failed to save score: ${error.message}`);
    }
    
    logger.log('✅ Score updated successfully:', {
      scoreId: data.id.substring(0, 8),
      scoreType: data.score_type,
      coreValueName: data.core_value_name,
      scoreValue: data.score_value,
      evaluationDate: data.evaluation_date
    });
    
    return {
      ...data,
      score_type: data.score_type as AnalyzerScore['score_type'],
      score_value: data.score_value as ScoreValue,
      evaluation_date: data.evaluation_date || today, // Ensure evaluation_date is always present
    };
  }

  // NEW: Get all unique evaluation dates for a specific user
  static async getEvaluationDatesForUser(
    userId: string,
    companyId: string
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from('people_analyzer_scores')
      .select('evaluation_date')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .order('evaluation_date', { ascending: false });

    if (error) throw error;

    // Extract unique dates - keep as strings (YYYY-MM-DD format)
    // Sort as strings (YYYY-MM-DD sorts correctly lexicographically)
    // This avoids timezone issues when converting to Date objects
    const uniqueDates = Array.from(
      new Set((data || []).map(item => item.evaluation_date))
    ).sort((a, b) => {
      // Sort as strings in descending order (most recent first)
      // YYYY-MM-DD format sorts correctly as strings
      return b.localeCompare(a);
    });

    return uniqueDates;
  }

  // OPTIMIZED: Batch fetch evaluation dates for multiple users in a single query
  static async getEvaluationDatesForUsers(
    userIds: string[],
    companyId: string
  ): Promise<Record<string, string[]>> {
    if (userIds.length === 0) return {};

    const { data, error } = await supabase
      .from('people_analyzer_scores')
      .select('user_id, evaluation_date')
      .in('user_id', userIds)
      .eq('company_id', companyId)
      .order('evaluation_date', { ascending: false });

    if (error) throw error;

    // Group dates by user_id and deduplicate
    const result: Record<string, string[]> = {};
    
    // Initialize empty arrays for all users
    for (const userId of userIds) {
      result[userId] = [];
    }
    
    // Group and deduplicate dates
    for (const item of data || []) {
      if (!result[item.user_id].includes(item.evaluation_date)) {
        result[item.user_id].push(item.evaluation_date);
      }
    }
    
    // Sort each user's dates in descending order
    for (const userId of Object.keys(result)) {
      result[userId].sort((a, b) => b.localeCompare(a));
    }
    
    return result;
  }

  static async updateBar(
    companyId: string,
    scoreType: string,
    coreValueName: string | null,
    requiredScore: ScoreValue
  ): Promise<AnalyzerBar> {
    logger.log('🔄 AnalyzerService.updateBar:', {
      companyId: companyId.substring(0, 8),
      scoreType,
      coreValueName,
      requiredScore
    });

    // First, try to update existing record
    // FIX: Use .is() for null values, .eq() for non-null values
    let existingBarQuery = supabase
      .from('people_analyzer_bars')
      .select('id')
      .eq('company_id', companyId)
      .eq('score_type', scoreType);
    
    // Handle core_value_name correctly: use .is() for null, .eq() for strings
    if (coreValueName === null || coreValueName === undefined) {
      existingBarQuery = existingBarQuery.is('core_value_name', null);
    } else {
      existingBarQuery = existingBarQuery.eq('core_value_name', coreValueName);
    }
    
    const { data: existingData, error: selectError } = await existingBarQuery.maybeSingle();

    if (selectError) {
      logger.error('❌ Error checking existing bar:', selectError);
      throw new Error(`Failed to check existing bar: ${selectError.message}`);
    }

    let data;
    let error;

    if (existingData) {
      // Update existing record
      const updateResult = await supabase
        .from('people_analyzer_bars')
        .update({
          required_score: requiredScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingData.id)
        .select()
        .single();
      
      data = updateResult.data;
      error = updateResult.error;
      logger.log('✅ Updated existing bar record');
    } else {
      // Insert new record
      const insertResult = await supabase
        .from('people_analyzer_bars')
        .insert({
          company_id: companyId,
          score_type: scoreType,
          core_value_name: coreValueName,
          required_score: requiredScore,
        })
        .select()
        .single();
      
      data = insertResult.data;
      error = insertResult.error;
      logger.log('✅ Inserted new bar record');
    }

    if (error) {
      logger.error('❌ Database error in updateBar:', error);
      throw new Error(`Failed to save bar requirement: ${error.message}`);
    }
    
    logger.log('✅ Bar updated successfully:', {
      barId: data.id.substring(0, 8),
      scoreType: data.score_type,
      coreValueName: data.core_value_name,
      requiredScore: data.required_score
    });
    
    return {
      ...data,
      score_type: data.score_type as AnalyzerBar['score_type'],
      required_score: data.required_score as ScoreValue,
    };
  }

  static async deleteScore(scoreId: string): Promise<void> {
    const { error } = await supabase
      .from('people_analyzer_scores')
      .delete()
      .eq('id', scoreId);

    if (error) throw error;
  }

  // Get all strategic plans for a company (for company-wide core values)
  static async getCompanyStrategicPlans(companyId: string): Promise<{ data: any[] | null; error: any }> {
    logger.log('🏢 AnalyzerService - Fetching company strategic plans for:', companyId);
    
    try {
      const { data, error } = await supabase
        .from('strategic_plans')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('❌ AnalyzerService - Error fetching company strategic plans:', error);
        return { data: null, error };
      }

      logger.log('✅ AnalyzerService - Successfully fetched strategic plans:', data?.length || 0);
      return { data, error: null };
    } catch (err) {
      logger.error('❌ AnalyzerService - Exception in getCompanyStrategicPlans:', err);
      return { data: null, error: err };
    }
  }

  static getScorePoints(score: ScoreValue): number {
    switch (score) {
      case '+': return 1;
      case '+/-': return 0.5;
      case '-': return 0;
      default: return 0;
    }
  }

  static meetsRequirement(score: ScoreValue, requirement: ScoreValue): boolean {
    return this.getScorePoints(score) >= this.getScorePoints(requirement);
  }
}
