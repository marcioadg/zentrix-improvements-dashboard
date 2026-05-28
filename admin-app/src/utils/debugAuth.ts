import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const debugAuthState = async () => {
  logger.log('🔍 Debug Auth State:');
  
  // Check frontend session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  logger.log('Frontend session:', {
    hasSession: !!sessionData.session,
    hasUser: !!sessionData.session?.user,
    userId: sessionData.session?.user?.id,
    tokenPresent: !!sessionData.session?.access_token,
    expiresAt: sessionData.session?.expires_at,
    isExpired: sessionData.session?.expires_at ? (sessionData.session.expires_at * 1000) < Date.now() : 'unknown',
    error: sessionError
  });

  // Test database auth context
  try {
    const { data: authTest, error: authError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);
    
    logger.log('Database query result:', {
      success: !authError,
      error: authError,
      dataCount: authTest?.length || 0
    });
  } catch (error) {
    logger.log('Database query failed:', error);
  }

  // Test with RPC function that uses auth.uid()
  try {
    const { data: rpcTest, error: rpcError } = await supabase.rpc('get_user_current_company');
    logger.log('RPC auth test:', {
      companyId: rpcTest,
      error: rpcError
    });
  } catch (error) {
    logger.log('RPC test failed:', error);
  }
};