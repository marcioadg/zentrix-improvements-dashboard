
import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { PremiumLoadingScreen } from '@/components/ui/PremiumLoadingScreen';
import { useAppLoading } from '@/contexts/AppLoadingContext';
import { TasksSkeleton } from '@/components/tasks/TasksSkeleton';
import { SettingsPageSkeleton } from '@/components/settings/SettingsPageSkeleton';
import { SimpleAppSkeleton } from '@/components/skeletons/SimpleAppSkeleton';
import { MetricsPageLoadingState } from '@/components/dashboard/MetricsPageLoadingState';
import { OrgChartPageSkeleton } from '@/components/org-chart/OrgChartPageSkeleton';

interface PageSuspenseProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const getPageSkeleton = (pathname: string) => {
  if (pathname.startsWith('/tasks')) {
    return <TasksSkeleton taskCount={6} showFilters={true} showQuickAdd={true} />;
  }
  if (pathname.startsWith('/settings')) {
    return <SettingsPageSkeleton variant="desktop" />;
  }
  if (pathname === '/' || pathname.startsWith('/dashboard')) {
    return <SimpleAppSkeleton showSidebar={true} contentType="dashboard" />;
  }
  if (pathname.startsWith('/metrics')) {
    return <MetricsPageLoadingState />;
  }
  if (pathname.startsWith('/org-chart')) {
    return <OrgChartPageSkeleton rolesCount={6} variant="desktop" />;
  }
  // Default skeleton for other pages
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
             style={{ background: "var(--btn-bg, hsl(var(--primary)))" }}>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-[13px] text-muted-foreground">Loading...</div>
      </div>
    </div>
  );
};

export const PageSuspense: React.FC<PageSuspenseProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAppShellLoaded } = useAppLoading();
  const location = useLocation();

  const getFallback = () => {
    if (fallback) return fallback;
    
    // Show premium loading screen only if app shell is not loaded yet
    if (!isAppShellLoaded) {
      return <PremiumLoadingScreen variant="minimal" />;
    }
    
    // Show page-specific skeleton when navigating between pages
    return getPageSkeleton(location.pathname);
  };

  return (
    <Suspense fallback={getFallback()}>
      {children}
    </Suspense>
  );
};
