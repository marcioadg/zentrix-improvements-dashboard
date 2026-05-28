import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { OrgChartBuilderOptimized } from '@/components/org-chart/OrgChartBuilderOptimized';
import { OrgChartErrorBoundary } from '@/components/org-chart/OrgChartErrorBoundary';
import { ConnectionTest } from '@/components/debug/ConnectionTest';
import { useOrgChartOptimized } from '@/hooks/useOrgChartOptimized';
import { OrgChartPageSkeleton } from '@/components/org-chart/OrgChartPageSkeleton';
import { OrgChartSkeleton } from '@/components/org-chart/OrgChartSkeleton';
import { useOrgChartOnboarding } from '@/hooks/useOrgChartOnboarding';
import { VersionBanner } from '@/components/ui/VersionBanner';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';

const OrgChart = () => {
  const {
    fetchError,
    fetchRoles,
    isLoading,
    roles
  } = useOrgChartOptimized();
  // Hardware-based mobile detection - doesn't change with window resize
  const isMobile = isMobileOrTabletDevice();

  // Check for existing org chart roles and complete onboarding if found
  useOrgChartOnboarding();

  // Mobile detection is now hardware-based via isMobileOrTabletDevice()
  // No resize listener needed - device type doesn't change during session

  // Show full page skeleton while initial loading
  if (isLoading && roles.length === 0) {
    return <OrgChartPageSkeleton rolesCount={6} variant={isMobile ? 'mobile' : 'desktop'} className="animate-fade-in" />;
  }
  return <div className="h-full flex flex-col">
      <VersionBanner />
      
      <div className="px-6 py-6">
        <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Organizational Chart</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Visualize and manage your company's organizational structure
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {fetchError && fetchError.includes('Network connection failed') && <div className="mb-6">
            <ConnectionTest />
          </div>}
        
        {fetchError && !fetchError.includes('Network connection failed') ? (
          <div className="h-full flex items-center justify-center">
            <OrgChartSkeleton variant="error" />
          </div>
        ) : (
          <div className="h-full overflow-hidden rounded-[6px] border border-border">
            <OrgChartErrorBoundary>
              <OrgChartBuilderOptimized />
            </OrgChartErrorBoundary>
          </div>
        )}
      </div>
    </div>;
};
export default OrgChart;