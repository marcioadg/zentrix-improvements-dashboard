
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/multiCompany';
import { companyDataValidationService } from './companyDataValidationService';
import { logger } from '@/utils/logger';

// Helper function to fetch companies via teams (fallback method)
const fetchCompaniesViaTeams = async (userId: string): Promise<Company[]> => {
  try {
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select(`
        permission_level,
        joined_at,
        teams!inner (
          company_id,
          companies!inner (
            id,
            name,
            slug,
            auto_create_overdue_issues,
            default_vote_limit,
            require_task_before_solve,
            ai_meeting_transcription,
            ai_agent_enabled
          )
        )
      `)
      .eq('user_id', userId);

    if (membersError) throw membersError;

    // Check company membership status for each company found via teams
    const companyIds = Array.from(new Set(
      (teamMembers || [])
        .map(member => (member.teams as any)?.companies?.id)
        .filter(Boolean)
    ));

    if (companyIds.length === 0) return [];

    // Check which companies the user has active membership in
    const { data: membershipStatus, error: statusError } = await supabase
      .from('company_members')
      .select('company_id, status')
      .eq('user_id', userId)
      .in('company_id', companyIds);

    if (statusError) {
      logger.warn('⚠️ multiCompanyService: Error checking membership status:', statusError);
    }

    // Transform and deduplicate companies by ID, filtering for active status
    const companyMap = new Map();
    (teamMembers || []).forEach(member => {
      const team = member.teams as any;
      const company = team.companies as any;
      
      if (company && typeof company === 'object' && !Array.isArray(company) &&
          'id' in company && 'name' in company && 'slug' in company) {
        
        // Check if user has active membership in this company
        const membership = membershipStatus?.find(m => m.company_id === company.id);
        const isActive = membership ? membership.status === 'active' : false;
        
        if (isActive && !companyMap.has(company.id)) {
          companyMap.set(company.id, {
            id: company.id,
            name: company.name,
            slug: company.slug,
            auto_create_overdue_issues: company.auto_create_overdue_issues,
            default_vote_limit: company.default_vote_limit,
            require_task_before_solve: company.require_task_before_solve,
            ai_meeting_transcription: company.ai_meeting_transcription,
            ai_agent_enabled: company.ai_agent_enabled,
            role: member.permission_level || 'member',
            joined_at: member.joined_at
          });
        }
      }
    });

    return Array.from(companyMap.values());
  } catch (error) {
    logger.error('❌ multiCompanyService: Error in teams fallback:', error);
    return [];
  }
};

export const fetchUserAccessibleCompanies = async (userId: string): Promise<Company[]> => {
  try {
    // First, validate user data and fix any inconsistencies
    const validationResult = await companyDataValidationService.validateUserCompanyData(userId);
    
    if (!validationResult.isValid) {
      // Attempt to fix inconsistencies automatically
      await companyDataValidationService.fixDataInconsistencies(userId);
    }

    // FIXED: Direct query instead of RPC to avoid caching issues
    const { data: companies, error } = await supabase
      .from('company_members')
      .select('company_id, permission_level, joined_at, status')
      .eq('user_id', userId)
      .eq('status', 'active'); // CRITICAL: Only active memberships

    if (error) {
      logger.warn('⚠️ multiCompanyService: Error with company_members query, falling back to team-based lookup:', error);
      return await fetchCompaniesViaTeams(userId);
    }

    if (!companies || companies.length === 0) {
      return await fetchCompaniesViaTeams(userId);
    }

    const activeCompanies = companies;
    
    if (activeCompanies.length === 0) {
      return await fetchCompaniesViaTeams(userId);
    }

    // Transform to Company format and fetch company details using active companies
    const companyIds = activeCompanies.map((c: any) => c.company_id);
    let { data: companyDetails, error: detailsError } = await supabase
      .from('companies')
      .select('id, name, slug, logo_url, auto_create_overdue_issues, default_vote_limit, require_task_before_solve, ai_agent_enabled')
      .in('id', companyIds);

    // Fallback: some columns may not exist yet (e.g. after a migration not yet applied).
    // Retry with minimal safe columns so users are never blocked from the app.
    if (detailsError) {
      logger.warn('⚠️ multiCompanyService: Full company select failed, trying minimal fallback:', detailsError);
      const fallback = await supabase
        .from('companies')
        .select('id, name, slug')
        .in('id', companyIds);
      if (fallback.error) {
        logger.error('❌ multiCompanyService: Error fetching company details (fallback):', fallback.error);
        return [];
      }
      companyDetails = fallback.data;
      detailsError = null;
    }

    // Map companies with their permission levels from company_members (only active ones)
    const accessibleCompanies: Company[] = companyDetails?.map((company: any) => {
      const companyData = activeCompanies.find((c: any) => c.company_id === company.id);
      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo_url: company.logo_url || null,
        auto_create_overdue_issues: company.auto_create_overdue_issues,
        default_vote_limit: company.default_vote_limit,
        require_task_before_solve: company.require_task_before_solve,
        ai_agent_enabled: company.ai_agent_enabled,
        role: companyData?.permission_level || 'member',
        joined_at: companyData?.joined_at
      };
    }) || [];

    // Fallback: check profiles table for legacy company access
    if (accessibleCompanies.length === 0) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          company_id,
          role,
          companies!inner (
            id,
            name,
            slug,
            auto_create_overdue_issues,
            default_vote_limit,
            require_task_before_solve,
            ai_agent_enabled
          )
        `)
        .eq('id', userId)
        .maybeSingle();

      if (!profileError && profile && profile.companies && 
          typeof profile.companies === 'object' && 
          !Array.isArray(profile.companies) &&
          'id' in profile.companies &&
          'name' in profile.companies &&
          'slug' in profile.companies) {
        const company = profile.companies as unknown as { id: string; name: string; slug: string };
        accessibleCompanies.push({
          id: company.id,
          name: company.name,
          slug: company.slug,
          auto_create_overdue_issues: (company as any).auto_create_overdue_issues,
          default_vote_limit: (company as any).default_vote_limit,
          require_task_before_solve: (company as any).require_task_before_solve,
          ai_agent_enabled: (company as any).ai_agent_enabled,
          role: 'member',
          joined_at: null
        });
      }
    }

    return accessibleCompanies;
  } catch (error) {
    logger.error('❌ multiCompanyService: Error fetching companies:', error);
    throw error;
  }
};

export const getCurrentCompanyFromSettings = async (userId: string): Promise<string | null> => {
  try {
    // Use the validation service to get effective current company
    const effectiveCompany = await companyDataValidationService.getEffectiveCurrentCompany(userId);
    return effectiveCompany?.id || null;
  } catch (error) {
    logger.error('❌ multiCompanyService: Error with validation service:', error);
    
    // Fallback to direct database query
    try {
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('current_company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      return userSettings?.current_company_id || null;
    } catch (fallbackError) {
      logger.error('❌ multiCompanyService: Fallback query also failed:', fallbackError);
      return null;
    }
  }
};

export const updateUserCurrentCompany = async (userId: string, companyId: string): Promise<void> => {
  try {
    // Verify user has access to this company before setting it as current
    const accessibleCompanies = await fetchUserAccessibleCompanies(userId);
    const hasAccess = accessibleCompanies.some(company => company.id === companyId);
    
    if (!hasAccess) {
      logger.error('❌ multiCompanyService: User does not have access to company:', companyId);
      throw new Error('User does not have access to this company');
    }

    // Additional check: verify user has active status in the company
    const { data: membershipCheck, error: membershipError } = await supabase
      .from('company_members')
      .select('status')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (membershipError) {
      logger.warn('⚠️ multiCompanyService: Could not verify membership status:', membershipError);
    } else if (membershipCheck && membershipCheck.status !== 'active') {
      logger.error('❌ multiCompanyService: User membership is not active:', membershipCheck.status);
      throw new Error('Cannot switch to company - membership is not active');
    }

    // First get current settings
    const { data: currentSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      logger.error('❌ multiCompanyService: Error fetching user settings:', fetchError);
      throw new Error('Failed to fetch user settings');
    }

    // Prepare the settings object with all required fields
    const settingsToUpsert = {
      user_id: userId,
      current_company_id: companyId,
      vote_limit: currentSettings?.vote_limit || 25,
      highlight_current_week: currentSettings?.highlight_current_week || false,
      show_current_week: currentSettings?.show_current_week || false,
      week_start_day: currentSettings?.week_start_day || 'monday',
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert(settingsToUpsert, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      logger.error('❌ multiCompanyService: Database error during upsert:', upsertError);
      throw new Error(`Database error: ${upsertError.message}`);
    }

    // Validate the update was successful by reading it back
    const { data: updatedSettings, error: verifyError } = await supabase
      .from('user_settings')
      .select('current_company_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (verifyError) {
      logger.error('❌ multiCompanyService: Error verifying update:', verifyError);
      throw new Error('Failed to verify update');
    }

    if (!updatedSettings) {
      logger.error('❌ multiCompanyService: No user settings found after update');
      throw new Error('User settings not found after update');
    }

    if (updatedSettings?.current_company_id !== companyId) {
      logger.error('❌ multiCompanyService: Verification failed - company ID mismatch');
      throw new Error('Database update verification failed');
    }

    // Validate the update was successful
    const validationResult = await companyDataValidationService.validateUserCompanyData(userId);
    if (!validationResult.isValid) {
      logger.warn('⚠️ multiCompanyService: Company update created inconsistencies:', validationResult.inconsistencies);
    }
  } catch (error) {
    logger.error('❌ multiCompanyService: Error updating current company:', error);
    throw error;
  }
};
