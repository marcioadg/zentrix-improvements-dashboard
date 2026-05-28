import { supabase } from '@/integrations/supabase/client';
import { sendCompanyCreatedWebhook } from './companyCreatedWebhook';
import { logger } from '@/utils/logger';

const PARTNER_REFERRAL_STORAGE_KEY = 'partner_referral_code';

export interface CreateCompanyRequest {
  companyName: string;
  companySlug?: string;
}

export interface CreateCompanyResponse {
  success: boolean;
  error?: string;
  company_id?: string;
  company_name?: string;
  company_slug?: string;
  team_id?: string;
  message?: string;
}

// Helper function to generate slug from company name
const generateSlug = (companyName: string): string => {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

const getPendingPartnerReferralCode = (): string | null => {
  if (typeof window === 'undefined') return null;

  return (
    window.sessionStorage.getItem(PARTNER_REFERRAL_STORAGE_KEY) ||
    window.localStorage.getItem(PARTNER_REFERRAL_STORAGE_KEY)
  );
};

const clearPendingPartnerReferralCode = () => {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(PARTNER_REFERRAL_STORAGE_KEY);
  window.localStorage.removeItem(PARTNER_REFERRAL_STORAGE_KEY);
};

const trackPartnerReferralSignup = async (company: CreateCompanyResponse) => {
  if (!company.success || !company.company_id) return;

  const referralCode = getPendingPartnerReferralCode();
  if (!referralCode) return;

  try {
    const { data, error } = await supabase.rpc('track_partner_referral_signup' as any, {
      p_link_code: referralCode,
      p_referred_company_id: company.company_id,
    });

    if (error) {
      logger.warn('⚠️ Partner referral attribution failed:', error);
      return;
    }

    if ((data as any)?.success) {
      clearPendingPartnerReferralCode();
      logger.log('✅ Partner referral attribution recorded:', {
        referralCode,
        referredCompanyId: company.company_id,
      });
    } else {
      logger.warn('⚠️ Partner referral attribution skipped:', data);
    }
  } catch (error) {
    logger.warn('⚠️ Partner referral attribution error:', error);
  }
};

export const createFirstCompany = async (request: CreateCompanyRequest): Promise<CreateCompanyResponse> => {
  logger.log('🏢 Creating first company:', request);
  
  try {
    // Auto-generate slug if not provided
    const companySlug = request.companySlug || generateSlug(request.companyName);
    
    const { data, error } = await supabase.rpc('create_user_first_company', {
      company_name: request.companyName,
      company_slug: companySlug
    });

    if (error) {
      logger.error('❌ Error creating company:', error);
      throw error;
    }

    logger.log('✅ Company creation response:', data);


    // Fire-and-forget webhook for company creation
    const response = data as CreateCompanyResponse;
    if (response.success && response.company_id) {
      sendCompanyCreatedWebhook(
        response.company_id,
        response.company_name || request.companyName,
        response.company_slug || companySlug
      );

      // Trigger instant drip welcome email (non-blocking)
      supabase.functions.invoke('drip-email-scheduler', {
        body: { company_id: response.company_id },
      }).catch((err: any) => logger.error('Failed to trigger drip welcome:', err));

      await trackPartnerReferralSignup(response);
    }

    return response;
  } catch (error: any) {
    logger.error('❌ Failed to create company:', error);
    return {
      success: false,
      error: error.message || 'Failed to create company'
    };
  }
};

export const createAdditionalCompany = async (request: CreateCompanyRequest): Promise<CreateCompanyResponse> => {
  logger.log('🏢 Creating additional company:', request);
  
  try {
    // Auto-generate slug if not provided
    const companySlug = request.companySlug || generateSlug(request.companyName);
    
    const { data, error } = await supabase.rpc('create_additional_company', {
      company_name: request.companyName,
      company_slug: companySlug
    });

    if (error) {
      logger.error('❌ Error creating additional company:', error);
      throw error;
    }

    logger.log('✅ Additional company creation response:', data);
    
    // Fire-and-forget webhook for company creation
    const response = data as CreateCompanyResponse;
    if (response.success && response.company_id) {
      sendCompanyCreatedWebhook(
        response.company_id,
        response.company_name || request.companyName,
        response.company_slug || companySlug
      );
    }
    
    return response;
  } catch (error: any) {
    logger.error('❌ Failed to create additional company:', error);
    return {
      success: false,
      error: error.message || 'Failed to create additional company'
    };
  }
};

export const checkUserNeedsOnboarding = async (): Promise<boolean> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      logger.warn('⚠️ No authenticated user when checking onboarding.');
      return true;
    }

    // Primary: use unified RPC
    const { data: companies, error: rpcError } = await supabase.rpc('get_user_companies_via_company_members', {
      p_user_id: userId
    });

    if (rpcError) {
      logger.warn('⚠️ RPC failed, using fallback checks:', rpcError);
    }

    if (companies && companies.length > 0) {
      logger.log('🔍 Onboarding not needed via RPC:', { companiesCount: companies.length });
      return false;
    }

    // Fallback: direct membership checks in parallel
    const [cmRes, tmRes] = await Promise.all([
      supabase
        .from('company_members')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1),
      supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .limit(1)
    ]);

    const hasDirectCompany = (cmRes.data?.length || 0) > 0;
    const hasTeamMembership = (tmRes.data?.length || 0) > 0;

    const needsOnboarding = !(hasDirectCompany || hasTeamMembership);
    logger.log('🔍 Onboarding check (fallback):', { hasDirectCompany, hasTeamMembership, needsOnboarding });
    return needsOnboarding;
  } catch (error) {
    logger.error('❌ Error checking onboarding status:', error);
    return true; // Be safe: require onboarding if uncertain
  }
};
