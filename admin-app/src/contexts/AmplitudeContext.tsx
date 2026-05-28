import React, { memo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initAmplitude, identifyAmplitudeUser, resetAmplitudeUser } from '@/lib/amplitudeAnalytics';

/**
 * AmplitudeProvider initializes the Amplitude SDK and keeps
 * the identified user in sync with the auth state.
 *
 * Place this inside AuthProvider so useAuth() is available.
 */
export const AmplitudeProvider = memo(({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  // Initialize Amplitude once on mount
  useEffect(() => {
    initAmplitude();
  }, []);

  // Identify / reset user when auth state changes
  useEffect(() => {
    if (user) {
      identifyAmplitudeUser(user.id, {
        email: user.email || undefined,
        authProvider: user.app_metadata?.provider || 'email',
      });
    } else {
      resetAmplitudeUser();
    }
  }, [user?.id, user?.email]);

  return <>{children}</>;
});

AmplitudeProvider.displayName = 'AmplitudeProvider';
