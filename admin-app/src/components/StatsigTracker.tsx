import { memo, useEffect } from 'react';
import { useStatsigClient } from '@statsig/react-bindings';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';

/**
 * StatsigTracker - Updates Statsig user identity with company context
 * 
 * This component runs inside OptimizedProviders where MultiCompanyContext is available.
 * It updates the Statsig user with company information when it changes.
 * 
 * Note: Page views and clicks are automatically tracked by StatsigAutoCapturePlugin
 */
export const StatsigTracker = memo(() => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { client } = useStatsigClient();

  // Update Statsig user with company context
  useEffect(() => {
    if (!client || !user) return;

    client.updateUserAsync({
      userID: user.id,
      email: user.email || undefined,
      custom: {
        companyId: currentCompany?.id || null,
        companyName: currentCompany?.name || null,
        authProvider: user.app_metadata?.provider || 'email',
      },
    });
  }, [client, user?.id, currentCompany?.id]);

  // No UI to render - this is a tracking component
  return null;
});

StatsigTracker.displayName = 'StatsigTracker';
