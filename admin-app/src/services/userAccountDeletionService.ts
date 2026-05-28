import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

/**
 * Deletes the current user's account
 * 
 * Flow:
 * 1. Calls Edge Function (which calls RPC to deactivate account)
 * 2. RPC function cleans up data (soft delete tasks, remove ownership, anonymize)
 * 3. Signs out user
 * 
 * Safety:
 * - Preserves organizational data (goals, metrics, issues)
 * - Soft deletes personal tasks
 * - Anonymizes audit trails
 * - Allows deletion even if user is sole owner (company may be orphaned but recoverable by super_admin)
 */
export const deleteUserAccount = async (): Promise<DeleteAccountResult> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  logger.log('🗑️ deleteUserAccount: Starting account deletion for user:', user.id);

  try {
    // Step 1: Call Edge Function (which calls RPC to deactivate account)
    // This uses a hybrid approach: anonymizes data and deactivates access
    // without deleting from auth.users (avoids FK/trigger issues)
    // Use fetch directly to access response body even on HTTP errors (400, 500, etc.)
    // Supabase client doesn't return body in 'data' when there's an HTTP error
    logger.log('🔐 deleteUserAccount: Calling Edge Function for account deactivation');
    
    const { SUPABASE_URL } = await import('@/integrations/supabase/client');
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcmxjaGtlZGVjYnlvYXFsYmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzI3MzMsImV4cCI6MjA4OTgwODczM30.YxCTWVRqmi-qFKR-w95EscQ5_dpJK5QZXSQHFT1CQ7c';
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    if (!accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({ userId: user.id })
    });

    // Parse response body regardless of status code
    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      // If response is not JSON, get text
      const text = await response.text();
      throw new Error(`Invalid response from server: ${text}`);
    }

    logger.log('📋 deleteUserAccount: Edge function response:', { status: response.status, data });

    // Check if request was successful
    if (!response.ok) {
      // Extract error message from response body
      const errorMsg = data?.error || `Server returned ${response.status}: ${response.statusText}`;
      logger.error('❌ deleteUserAccount: Edge function returned error:', { status: response.status, data });
      throw new Error(errorMsg);
    }

    // Check business logic
    if (!data || !data.success) {
      const errorMsg = data?.error || 'Unknown deletion error';
      logger.error('❌ deleteUserAccount: Edge function reported failure:', data);
      throw new Error(errorMsg);
    }

    logger.log('✅ deleteUserAccount: Account deletion successful');

    // Step 2: Sign out user (they're already deleted, but clear local session)
    await supabase.auth.signOut();
    
    return { success: true };
    
  } catch (error) {
    logger.error('💥 deleteUserAccount: Unexpected error:', error);
    throw error;
  }
};
