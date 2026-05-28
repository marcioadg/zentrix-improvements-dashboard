
import React from 'react';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Users, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface MeetingListHeaderProps {
  meetingsCount: number;
  displayedCount: number;
  showAll: boolean;
  hasMoreMeetings: boolean;
  conflictingMeetingsCount: number;
  onToggleShowAll: () => void;
}

export const MeetingListHeader: React.FC<MeetingListHeaderProps> = ({
  meetingsCount,
  displayedCount,
  showAll,
  hasMoreMeetings,
  conflictingMeetingsCount,
  onToggleShowAll
}) => {
  return (
    <>
      <CardTitle className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Meetings ({showAll ? meetingsCount : `${displayedCount} of ${meetingsCount}`})
        </div>
        {hasMoreMeetings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleShowAll}
            className="flex items-center gap-2 text-sm"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show More
              </>
            )}
          </Button>
        )}
      </CardTitle>
      {conflictingMeetingsCount > 0 && (
        <div className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          Warning: Multiple active meetings detected for some teams
        </div>
      )}
    </>
  );
};
