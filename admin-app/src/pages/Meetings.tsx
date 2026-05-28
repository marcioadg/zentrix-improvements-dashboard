import React, { useEffect, useState } from 'react';
import { CreateDropdown } from '@/components/CreateDropdown';
import { QuickStartMeetings } from '@/components/meeting/QuickStartMeetings';
import { ActiveMeetingsList } from '@/components/meeting/ActiveMeetingsList';
import { PastMeetingsList } from '@/components/meeting/PastMeetingsList';
import { MeetingsLoadingSkeleton } from '@/components/meetings/MeetingsPageSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';
import { VersionBanner } from '@/components/ui/VersionBanner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
export const Meetings = () => {
  const [showPastMeetings, setShowPastMeetings] = useState(false);
  
  useEffect(() => {
    logger.debug('📅 Meetings page mounted');
  }, []);

  return <div className="min-h-screen bg-background">
      <VersionBanner />
      
      <div className="px-6 py-6">
        {/* Linear-style header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Meetings</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Start new meetings or join active ones</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPastMeetings(true)} className="text-[13px]">
            Past meetings
          </Button>
        </div>

        <ErrorBoundary>
          <div className="space-y-6">
            <QuickStartMeetings />
            <ActiveMeetingsList />
            <Dialog open={showPastMeetings} onOpenChange={setShowPastMeetings}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-[16px] font-semibold">Past Meetings</DialogTitle>
                </DialogHeader>
                <PastMeetingsList />
              </DialogContent>
            </Dialog>
          </div>
        </ErrorBoundary>
      </div>
    </div>;
};
export default Meetings;