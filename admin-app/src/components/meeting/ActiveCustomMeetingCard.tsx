import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, List, ArrowRight } from 'lucide-react';
import { formatElapsedTime } from '@/utils/meetingFormatters';

interface ActiveCustomMeetingCardProps {
  meeting: {
    id: string;
    team_id: string;
    team_name: string;
    meeting_title?: string;
    started_at: string;
    current_section: number;
    custom_agenda: any[];
  };
  onJoin: (teamId: string) => void;
}

export const ActiveCustomMeetingCard: React.FC<ActiveCustomMeetingCardProps> = ({
  meeting,
  onJoin,
}) => {
  const sectionCount = meeting.custom_agenda?.length || 0;
  const elapsedTime = formatElapsedTime(meeting.started_at);

  return (
    <Button
      variant="outline"
      className="w-full justify-start h-auto p-4 group hover:bg-accent border-green-500/30 bg-green-500/5"
      onClick={() => onJoin(meeting.team_id || meeting.id)}  // Defensive: fallback to meeting ID
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <div className="text-left">
            <div className="font-medium">
              {meeting.meeting_title || meeting.team_name}
            </div>
            <div className="text-sm text-muted-foreground">
              {meeting.meeting_title && <span>{meeting.team_name} • </span>}
              Section {meeting.current_section + 1} of {sectionCount}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{elapsedTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <List className="h-3.5 w-3.5" />
              <span>{sectionCount} sections</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </Button>
  );
};
