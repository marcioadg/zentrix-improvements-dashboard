
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

interface EffectiveAuthReturn {
  user: User | null;
  effectiveUser: User | null;
  loading: boolean;
}

export const useEffectiveAuth = (): EffectiveAuthReturn => {
  const { user, loading } = useAuth();

  logger.log('🔧 useEffectiveAuth (simplified):', {
    userId: user?.id,
    loading
  });

  return {
    user, // Original authenticated user
    effectiveUser: user, // Same as user (no impersonation)
    loading,
  };
};
