
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface ValidationResult {
  isValid: boolean;
  inconsistencies: string[];
}

export interface FixResult {
  success: boolean;
  message: string;
  details?: any;
}

class CompanyDataValidationService {
  async validateUserCompanyData(userId: string): Promise<ValidationResult> {
    const inconsistencies: string[] = [];

    try {
      // Get user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        inconsistencies.push('Profile not found or error accessing profile');
        return { isValid: false, inconsistencies };
      }

      // Get user's current company setting
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('current_company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        inconsistencies.push(`Settings error: ${settingsError.message}`);
      }

      // Get user's accessible companies (both via company_members and team_members)
      const [companyMembershipsResult, teamMembershipsResult] = await Promise.all([
        supabase.from('company_members').select('company_id').eq('user_id', userId).eq('status', 'active'),
        supabase.from('team_members').select(`
          teams!inner (
            company_id,
            companies!inner (id, name)
          )
        `).eq('user_id', userId)
      ]);

      if (companyMembershipsResult.error) {
        inconsistencies.push(`Company memberships error: ${companyMembershipsResult.error.message}`);
      }
      if (teamMembershipsResult.error) {
        inconsistencies.push(`Team memberships error: ${teamMembershipsResult.error.message}`);
      }

      // Extract unique company IDs from both sources
      const companySet = new Set();
      
      // Add companies from direct company membership
      (companyMembershipsResult.data || []).forEach(cm => {
        if (cm.company_id) {
          companySet.add(cm.company_id);
        }
      });
      
      // Add companies from team memberships
      (teamMembershipsResult.data || []).forEach(tm => {
        const team = tm.teams as any;
        if (team?.company_id) {
          companySet.add(team.company_id);
        }
      });
      
      const membershipCompanyIds = Array.from(companySet) as string[];

      if (settings?.current_company_id && !membershipCompanyIds.includes(settings.current_company_id)) {
        inconsistencies.push('Current company setting points to inaccessible company');
      }

      if (!settings?.current_company_id && membershipCompanyIds.length > 0) {
        inconsistencies.push('No current company set despite having company access');
      }

      return {
        isValid: inconsistencies.length === 0,
        inconsistencies
      };
    } catch (error) {
      logger.error('❌ Validation error:', error);
      return {
        isValid: false,
        inconsistencies: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async fixDataInconsistencies(userId: string): Promise<FixResult> {
    try {
      // Get user's profile, company memberships, and team memberships
      const [profileResult, companyMembershipsResult, teamMembershipsResult] = await Promise.all([
        supabase.from('profiles').select('email, full_name').eq('id', userId).maybeSingle(),
        supabase.from('company_members').select('company_id').eq('user_id', userId).eq('status', 'active'),
        supabase.from('team_members').select(`
          teams!inner (
            company_id,
            companies!inner (id, name)
          )
        `).eq('user_id', userId)
      ]);

      if (profileResult.error) {
        return { success: false, message: 'Failed to fetch user profile' };
      }

      const companyMemberships = companyMembershipsResult.data || [];
      const teamMemberships = teamMembershipsResult.data || [];
      
      // Extract unique company IDs from both sources
      const companySet = new Set();
      
      // Add companies from direct company membership
      companyMemberships.forEach(cm => {
        if (cm.company_id) {
          companySet.add(cm.company_id);
        }
      });
      
      // Add companies from team memberships
      teamMemberships.forEach(tm => {
        const team = tm.teams as any;
        if (team?.company_id) {
          companySet.add(team.company_id);
        }
      });
      
      const membershipCompanyIds = Array.from(companySet) as string[];

      // Fix: Set current company if none is set
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('current_company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!currentSettings?.current_company_id && membershipCompanyIds.length > 0) {
        const preferredCompanyId = membershipCompanyIds[0];
        
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            current_company_id: preferredCompanyId,
            vote_limit: 25,
            highlight_current_week: false,
            show_current_week: false,
            week_start_day: 'monday',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (settingsError) {
          logger.error('❌ Failed to set current company:', settingsError);
          return { success: false, message: 'Failed to set current company' };
        }
      }

      return { 
        success: true, 
        message: 'Data inconsistencies fixed successfully',
        details: { membershipCompanyIds }
      };
    } catch (error) {
      logger.error('❌ Fix error:', error);
      return { 
        success: false, 
        message: `Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async getEffectiveCurrentCompany(userId: string): Promise<{ id: string; name: string } | null> {
    try {
      // First try to get from user settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('current_company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!settingsError && settings?.current_company_id) {
        // Verify user has access to this company through company membership or team membership
        const [companyMembershipResult, teamMembershipResult] = await Promise.all([
          supabase.from('company_members')
            .select('company_id, companies!inner(id, name)')
            .eq('user_id', userId)
            .eq('company_id', settings.current_company_id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle(),
          supabase.from('team_members')
            .select(`
              teams!inner (
                company_id,
                companies!inner (id, name)
              )
            `)
            .eq('user_id', userId)
            .eq('teams.company_id', settings.current_company_id)
            .limit(1)
            .maybeSingle()
        ]);

        // Check company membership first
        if (companyMembershipResult.data?.companies) {
          const company = companyMembershipResult.data.companies as any;
          if (company && !Array.isArray(company)) {
            return company;
          }
        }

        // Fallback to team membership
        if (teamMembershipResult.data?.teams) {
          const team = teamMembershipResult.data.teams as any;
          const company = team.companies as any;
          if (company && !Array.isArray(company)) {
            return company;
          }
        }
      }

      // Fallback: get first accessible company from company memberships or team memberships
      const [firstCompanyMembershipResult, firstTeamMembershipResult] = await Promise.all([
        supabase.from('company_members')
          .select('company_id, companies!inner(id, name)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle(),
        supabase.from('team_members')
          .select(`
            teams!inner (
              company_id,
              companies!inner (id, name)
            )
          `)
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()
      ]);

      // Prefer company membership over team membership
      if (firstCompanyMembershipResult.data?.companies) {
        const company = firstCompanyMembershipResult.data.companies as any;
        if (company && !Array.isArray(company)) {
          return company;
        }
      }

      if (firstTeamMembershipResult.data?.teams) {
        const team = firstTeamMembershipResult.data.teams as any;
        const company = team.companies as any;
        if (company && !Array.isArray(company)) {
          return company;
        }
      }

      return null;
    } catch (error) {
      logger.error('❌ Error getting effective current company:', error);
      return null;
    }
  }
}

export const companyDataValidationService = new CompanyDataValidationService();
