import React, { useState, useEffect } from 'react';
import { useUnifiedTeamData } from '@/hooks/useUnifiedTeamData';
import { SharedGoalsView } from '@/components/shared/SharedGoalsView';
import { VersionBanner } from '@/components/ui/VersionBanner';
export const Goals = () => {
  const { teams, loading, refetch } = useUnifiedTeamData();

  // 🎯 Smart route-based refresh: Check for fresh team data when navigating to /goals
  React.useEffect(() => {
    const lastGoalsVisit = sessionStorage.getItem('lastGoalsVisit');
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    // Only refetch if it's been more than 5 minutes since last visit or first visit
    const shouldRefetch = !lastGoalsVisit || (now - parseInt(lastGoalsVisit)) > fiveMinutes;
    
    if (shouldRefetch) {
      // Background refresh without showing loading state to user
      refetch();
      sessionStorage.setItem('lastGoalsVisit', now.toString());
    }
  }, [refetch]);

  // Expose refresh function globally for AppLayout (maintain existing functionality) 
  React.useEffect(() => {
    (window as any).refreshGoals = () => {
      refetch();
    };
    return () => {
      delete (window as any).refreshGoals;
    };
  }, [refetch]);

  return (
    <>
      <VersionBanner />
      
      <SharedGoalsView
        teams={teams}
        loading={loading}
        showHeader={true}
      />
    </>
  );
};

export default Goals;