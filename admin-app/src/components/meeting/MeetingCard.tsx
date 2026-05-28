import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Star, Calendar, Trash2, Square, CheckCircle, Building2, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import type { MeetingWithTeam } from '@/types/meetingList';
import { formatElapsedTime, formatDuration, formatCompletedDate, renderRating } from '@/utils/meetingFormatters';
import { useCanEndMeeting } from '@/hooks/useCanEndMeeting';
import { useToast } from '@/hooks/use-toast';

interface MeetingCardProps {
  meeting: MeetingWithTeam;
  onJoin: (teamId: string, meetingType: string) => void;
  onDelete: (meeting: MeetingWithTeam) => void;
  onFinalize: (meeting: MeetingWithTeam) => void;
}
export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  onJoin,
  onDelete,
  onFinalize
}) => {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const { toast } = useToast();
  
  // Check if current user can end the meeting (scriber or director+)
  const { canEnd: canEndMeeting } = useCanEndMeeting(meeting.scriber_id);
  
  // Check if this is the currently active meeting the user is in
  const isCurrentMeeting = location.pathname.includes(`/meeting/${meeting.team_id}/${meeting.meeting_type}`);
  
  const handleEndClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!canEndMeeting) {
      toast({
        title: "Permission denied",
        description: "Only the scriber or company directors can end the meeting.",
        variant: "destructive",
      });
      return;
    }
    
    onFinalize(meeting);
  };
  return <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between bg-card border border-border rounded-[6px] p-4 transition-colors duration-150 hover:border-border/80 gap-3 sm:gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${isCurrentMeeting ? 'ring-2 ring-blue-200 dark:ring-blue-800 bg-primary/10/50 dark:bg-primary/50' : ''}`} onClick={() => setExpanded(v => !v)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v); } }} aria-expanded={expanded} role="button" tabIndex={0}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h4 className="text-[13px] font-medium text-foreground">
              {meeting.meeting_type === 'custom' && meeting.meeting_title 
                ? meeting.meeting_title 
                : meeting.team_name}
            </h4>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                meeting.meeting_type === 'custom' ? 'bg-warning/10 dark:bg-warning/20 text-warning' :
                meeting.meeting_type === 'quarterly' ? 'bg-info/10 dark:bg-info/20 text-info' :
                meeting.meeting_type === 'annual' ? 'bg-success/10 dark:bg-success/20 text-success' :
                'bg-primary/20 dark:bg-primary/40 text-primary'
              }`}>
                {meeting.meeting_type === 'custom' ? 'Custom' : 
                 meeting.meeting_type === 'quarterly' ? 'Quarterly' : 
                 meeting.meeting_type === 'annual' ? 'Annual' : 
                 'Weekly'}
              </span>
              
              {meeting.meeting_type === 'custom' && (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  {meeting.team_name}
                </span>
              )}
              
              {meeting.status === 'active' && <span className="inline-flex items-center gap-1 rounded-full bg-success/10 dark:bg-success/20 px-2 py-1 text-xs font-medium text-success">
                  <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                  Active
                </span>}
              {isCurrentMeeting && <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 dark:bg-primary/40 px-2 py-1 text-xs font-medium text-primary dark:text-primary">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Current
                </span>}
            </div>
          </div>
          
          
        </div>

        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          {meeting.status === 'active' ? <>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatElapsedTime(meeting.started_at)}</span>
              </div>
              <span>Section {meeting.current_section + 1}</span>
            </> : <>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatCompletedDate(meeting.ended_at!)}</span>
              </div>
              {meeting.total_duration_seconds && <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDuration(meeting.total_duration_seconds)}</span>
                </div>}
              {renderRating(meeting.average_rating)}
            </>}
        </div>

        {expanded && <div className="mt-4 p-4 rounded-md bg-muted/50 text-sm space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {meeting.status === 'active' ? <>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Started</div>
                    <div className="text-foreground mt-1">
                      {meeting.started_at ? new Date(meeting.started_at).toLocaleString() : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Section</div>
                    <div className="text-foreground mt-1">Section {meeting.current_section + 1}</div>
                  </div>
                </> : <>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</div>
                    <div className="text-foreground mt-1">
                      {meeting.ended_at ? new Date(meeting.ended_at).toLocaleString() : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</div>
                    <div className="text-foreground mt-1">
                      {meeting.total_duration_seconds ? formatDuration(meeting.total_duration_seconds) : '-'}
                    </div>
                  </div>
                </>}
            </div>
            {meeting.scriber_id && meeting.status === 'active' && <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scriber</div>
                <div className="text-foreground mt-1">Assigned</div>
              </div>}
          </div>}
      </div>

      <div className="flex items-center gap-1.5 sm:flex-shrink-0">
        {meeting.status === 'active' ? <>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleEndClick}
              disabled={!canEndMeeting}
              className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border-0 rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canEndMeeting ? 'Only the scriber or company directors can end the meeting' : 'End meeting'}
            >
              <Square className="h-3 w-3 mr-1.5" />
              End
            </Button>
            <Button size="sm" onClick={e => {
          e.stopPropagation();
          onJoin(meeting.team_id, meeting.meeting_type);
        }} className="h-7 px-3 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 border-0 rounded-md transition-all duration-150 shadow-none">
              <Play className="h-3 w-3 mr-1.5" />
              Join
            </Button>
          </> : <Button size="sm" variant="ghost" onClick={e => {
        e.stopPropagation();
        onDelete(meeting);
      }} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-all duration-150" aria-label="Delete meeting">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>}
      </div>
    </div>;
};