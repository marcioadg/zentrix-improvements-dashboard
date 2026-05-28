
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const createTestCompanies = async () => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Create a second test company
    const { data: testCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Test Company B',
        slug: 'test-company-b-' + Date.now()
      })
      .select()
      .single();

    if (companyError) throw companyError;

    // Give the current user access to this test company
    const { error: accessError } = await supabase
      .from('user_company_access')
      .insert({
        user_id: user.id,
        company_id: testCompany.id,
        role: 'member',
        access_type: 'direct'
      });

    if (accessError) throw accessError;

    logger.log('Test company created:', testCompany.name);
    return testCompany;
  } catch (error) {
    logger.error('Error creating test company:', error);
    throw error;
  }
};
