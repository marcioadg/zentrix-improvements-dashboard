import React, { useState, useEffect } from 'react';
import { MobileTasksPageWithUnifiedSubscriptions } from '@/components/tasks/MobileTasksPageWithUnifiedSubscriptions';
import { VersionBanner } from '@/components/ui/VersionBanner';
export default function TasksPage() {
  return (
    <>
      <VersionBanner />
      
      <div data-tour="task-section">
        <MobileTasksPageWithUnifiedSubscriptions />
      </div>
    </>
  );
}