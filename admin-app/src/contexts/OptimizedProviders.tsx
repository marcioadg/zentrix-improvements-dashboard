
import React, { Component, memo, useMemo } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { MultiCompanyProvider } from '@/contexts/MultiCompanyContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { NewMeetingTimerProvider } from '@/contexts/NewMeetingTimerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ClarityBreakProvider } from '@/contexts/ClarityBreakContext';
import { StatsigProviderWrapper } from '@/contexts/StatsigContext';
import { StatsigTracker } from '@/components/StatsigTracker';
import { AmplitudeProvider } from '@/contexts/AmplitudeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeColorSync } from '@/components/ThemeColorSync';
import { logger } from '@/utils/logger';

// Error boundary that catches third-party SDK failures without crashing the app
class ThirdPartyErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Third-party provider error (non-fatal):', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render children anyway — app should work without third-party SDKs
      return this.props.children;
    }
    return this.props.children;
  }
}

// Memoized provider wrapper to prevent unnecessary re-renders
const OptimizedProviders = memo(({ children }: { children: React.ReactNode }) => {
  // Memoize the provider structure to prevent recreation on every render
  const providerTree = useMemo(() => (
    <AuthProvider>
      <ThirdPartyErrorBoundary>
        <AmplitudeProvider>
        <StatsigProviderWrapper>
          <SettingsProvider>
            <ThemeColorSync />
            <LanguageProvider>
              <ThemeProvider>
                <MultiCompanyProvider>
                  <GlobalDataProvider>
                    <NewMeetingTimerProvider>
                      <ClarityBreakProvider>
                        <StatsigTracker />
                        {children}
                      </ClarityBreakProvider>
                    </NewMeetingTimerProvider>
                  </GlobalDataProvider>
                </MultiCompanyProvider>
              </ThemeProvider>
            </LanguageProvider>
          </SettingsProvider>
        </StatsigProviderWrapper>
        </AmplitudeProvider>
      </ThirdPartyErrorBoundary>
    </AuthProvider>
  ), [children]);

  return providerTree;
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when children haven't changed
  return prevProps.children === nextProps.children;
});

OptimizedProviders.displayName = 'OptimizedProviders';

export { OptimizedProviders };
