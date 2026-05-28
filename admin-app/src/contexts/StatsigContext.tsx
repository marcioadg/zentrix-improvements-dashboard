import React, { memo, useEffect } from 'react';
import { StatsigProvider, useStatsigClient, useClientAsyncInit } from '@statsig/react-bindings';
import { useAuth } from '@/contexts/AuthContext';
import { setStatsigClient } from '@/lib/statsigAnalytics';
import { logger } from '@/utils/logger';

const STATSIG_CLIENT_KEY = import.meta.env.VITE_STATSIG_CLIENT_KEY;

// Inner component that uses auth context to update Statsig user
const StatsigUserUpdater = memo(({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { client } = useStatsigClient();

  // Store client reference for non-hook usage
  useEffect(() => {
    if (client) {
      setStatsigClient(client);
    }
    return () => setStatsigClient(null);
  }, [client]);

  useEffect(() => {
    if (client && user) {
      client.updateUserAsync({
        userID: user.id,
        email: user.email || undefined,
        custom: {
          authProvider: user.app_metadata?.provider || 'email',
        },
      });
    }
  }, [client, user?.id, user?.email]);

  return <>{children}</>;
});

StatsigUserUpdater.displayName = 'StatsigUserUpdater';

// Main Statsig provider wrapper using useClientAsyncInit for proper plugin support (v2)
export const StatsigProviderWrapper = memo(({ children }: { children: React.ReactNode }) => {
  // Use useClientAsyncInit for async initialization
  const { client } = useClientAsyncInit(
    STATSIG_CLIENT_KEY || '',
    { userID: 'anonymous' },
    {
      networkConfig: {
        api: 'https://api.statsig.com/v1',
        logEventUrl: 'https://events.statsigapi.net/v1/rgstr',
        initializeUrl: 'https://api.statsig.com/v1/initialize',
      },
    }
  );

  if (!STATSIG_CLIENT_KEY) {
    logger.warn('Statsig client key not configured');
    return <>{children}</>;
  }

  return (
    <StatsigProvider client={client} loadingComponent={null}>
      <StatsigUserUpdater>
        {children}
      </StatsigUserUpdater>
    </StatsigProvider>
  );
});

StatsigProviderWrapper.displayName = 'StatsigProviderWrapper';
