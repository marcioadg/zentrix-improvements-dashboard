import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Clock, MessageSquare, CheckCircle2, ListTodo, Star, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';

interface MeetingDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string | null;
  teamName: string;
  meetingType: string;
  meetingDate: string;
}

interface MeetingResult {
  headlines_created: any[];
  issues_resolved: any[];
  tasks_created: any[];
  goals_created: any[];
  meeting_ratings: Record<string, number>;
  section_durations: Record<string, number>;
  total_duration_seconds: number | null;
  attendees: any[];
}

interface SectionInfo {
  id: string;
  title: string;
  type: string;
}

// Default sections for weekly meetings (when no custom_agenda)
const DEFAULT_WEEKLY_SECTIONS: SectionInfo[] = [
  { id: '1', title: 'Good News', type: 'good_news' },
  { id: '2', title: 'Metrics', type: 'metrics' },
  { id: '3', title: 'Goals', type: 'goals' },
  { id: '4', title: 'Headlines', type: 'headlines' },
  { id: '5', title: 'Tasks', type: 'tasks' },
  { id: '6', title: 'Issues', type: 'issues' },
  { id: '7', title: 'Wrap Up', type: 'wrap_up' },
];

// Default sections for quarterly meetings
const DEFAULT_QUARTERLY_SECTIONS: SectionInfo[] = [
  { id: '1', title: 'Check-In', type: 'check_in' },
  { id: '2', title: 'Review Prior Quarter', type: 'review_prior_quarter' },
  { id: '3', title: 'Review Strategy/Execution', type: 'review_strategy' },
  { id: '4', title: 'Tools Review', type: 'tools_review' },
  { id: '5', title: 'Quarterly Goals', type: 'goals' },
  { id: '6', title: 'Issues', type: 'issues' },
  { id: '7', title: 'Next Steps', type: 'next_steps' },
  { id: '8', title: 'Wrap Up', type: 'wrap_up' },
];

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatDurationMs = (ms: number): string => {
  return formatDuration(Math.floor(ms / 1000));
};

export const MeetingDetailsModal = ({
  open,
  onOpenChange,
  meetingId,
  teamName,
  meetingType,
  meetingDate,
}: MeetingDetailsModalProps) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [sectionNames, setSectionNames] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open || !meetingId) {
      setResult(null);
      setMemberNames({});
      setSectionNames({});
      return;
    }

    const fetchMeetingDetails = async () => {
      setLoading(true);
      try {
        // Fetch meeting state for custom_agenda
        const { data: meetingState, error: stateError } = await supabase
          .from('meetings_state')
          .select('custom_agenda, meeting_type')
          .eq('id', meetingId)
          .single();

        if (!stateError && meetingState) {
          // Build section names from custom_agenda or defaults
          const names: Record<number, string> = {};
          
          if (meetingState.custom_agenda && Array.isArray(meetingState.custom_agenda)) {
            meetingState.custom_agenda.forEach((section: any, index: number) => {
              names[index] = section.title || `Section ${index + 1}`;
            });
          } else {
            // Use default sections based on meeting type
            const defaults = meetingState.meeting_type === 'quarterly' 
              ? DEFAULT_QUARTERLY_SECTIONS 
              : DEFAULT_WEEKLY_SECTIONS;
            
            defaults.forEach((section, index) => {
              names[index] = section.title;
            });
          }
          setSectionNames(names);
        }

        // Fetch meeting results
        const { data: meetingResult, error: resultError } = await supabase
          .from('meeting_results')
          .select('*')
          .eq('meeting_id', meetingId)
          .single();

        if (resultError) {
          logger.error('Error fetching meeting results:', resultError);
          setLoading(false);
          return;
        }

        setResult(meetingResult);

        // Collect all user IDs from the results
        const userIds = new Set<string>();
        
        meetingResult.headlines_created?.forEach((h: any) => {
          if (h.created_by) userIds.add(h.created_by);
        });
        
        meetingResult.issues_resolved?.forEach((i: any) => {
          if (i.created_by) userIds.add(i.created_by);
          if (i.owner_id) userIds.add(i.owner_id);
        });
        
        meetingResult.tasks_created?.forEach((t: any) => {
          if (Array.isArray(t.assigned_to)) {
            t.assigned_to.forEach((id: string) => userIds.add(id));
          } else if (t.assigned_to) {
            userIds.add(t.assigned_to);
          }
        });
        
        if (meetingResult.meeting_ratings) {
          Object.keys(meetingResult.meeting_ratings).forEach(id => userIds.add(id));
        }

        // Fetch profiles for all user IDs
        if (userIds.size > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', Array.from(userIds));

          if (!profilesError && profiles) {
            const names: Record<string, string> = {};
            profiles.forEach(p => {
              names[p.id] = p.full_name || p.email || 'Unknown';
            });
            setMemberNames(names);
          }
        }
      } catch (err) {
        logger.error('Error loading meeting details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingDetails();
  }, [open, meetingId]);

  const calculateAverageRating = (ratings: Record<string, number>): string => {
    const values = Object.values(ratings).filter(r => typeof r === 'number' && !isNaN(r));
    if (values.length === 0) return 'N/A';
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return avg.toFixed(2);
  };

  const getMeetingTypeLabel = (type: string) => {
    switch (type) {
      case 'weekly': return 'Weekly';
      case 'quarterly': return 'Quarterly';
      case 'annual': return 'Annual';
      default: return type;
    }
  };

  const formattedDate = meetingDate ? format(new Date(meetingDate), 'MM/dd/yyyy') : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            {formattedDate} {teamName} - Meeting Recap
          </DialogTitle>
          <Badge variant="outline" className="w-fit mt-2">
            {getMeetingTypeLabel(meetingType)}
          </Badge>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)]">
          <div className="px-6 py-4 space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-20 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : result ? (
              <>
                {/* Headlines Section */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide mb-3">
                    <MessageSquare className="h-4 w-4" />
                    Headlines
                  </h3>
                  {result.headlines_created?.length > 0 ? (
                    <ul className="space-y-2">
                      {result.headlines_created.map((h: any, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {memberNames[h.created_by] || 'Unknown'}:
                          </span>{' '}
                          {h.title || h.content || 'Untitled'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No headlines this meeting</p>
                  )}
                </section>

                <Separator />

                {/* Issues Resolved Section */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    Issues Solved
                  </h3>
                  {result.issues_resolved?.length > 0 ? (
                    <ul className="space-y-2">
                      {result.issues_resolved.map((i: any, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {memberNames[i.created_by] || memberNames[i.owner_id] || 'Unknown'}:
                          </span>{' '}
                          {i.title || 'Untitled'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No issues resolved this meeting</p>
                  )}
                </section>

                <Separator />

                {/* Stats Summary */}
                <section className="grid grid-cols-2 gap-4">
                  <div className="bg-accent/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {result.issues_resolved?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Issues Solved</div>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {result.tasks_created?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">To-Dos Created</div>
                  </div>
                </section>

                <Separator />

                {/* To-Dos Created Section */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide mb-3">
                    <ListTodo className="h-4 w-4" />
                    To-Dos Created
                  </h3>
                  {result.tasks_created?.length > 0 ? (
                    <ul className="space-y-2">
                      {result.tasks_created.map((t: any, idx: number) => {
                        const assignees = Array.isArray(t.assigned_to) 
                          ? t.assigned_to 
                          : (t.assigned_to ? [t.assigned_to] : []);
                        const assigneeNames = assignees
                          .map((id: string) => memberNames[id] || 'Unassigned')
                          .join(', ') || 'Unassigned';
                        
                        return (
                          <li key={idx} className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{assigneeNames}:</span>{' '}
                            {t.title || 'Untitled'}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No to-dos created this meeting</p>
                  )}
                </section>

                <Separator />

                {/* Meeting Ratings Section */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide mb-3">
                    <Star className="h-4 w-4" />
                    Meeting Ratings
                  </h3>
                  {result.meeting_ratings && Object.keys(result.meeting_ratings).length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Team Member</th>
                            <th className="px-4 py-2 text-center font-medium text-muted-foreground">Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(result.meeting_ratings).map(([memberId, rating]) => (
                            <tr key={memberId} className="border-t">
                              <td className="px-4 py-2 text-foreground">
                                {memberNames[memberId] || 'Unknown'}
                              </td>
                              <td className="px-4 py-2 text-center font-semibold">
                                {typeof rating === 'number' && !isNaN(rating) ? rating : 'N/A'}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t bg-muted">
                            <td className="px-4 py-2 font-semibold">Average Rating</td>
                            <td className="px-4 py-2 text-center font-bold text-primary">
                              {calculateAverageRating(result.meeting_ratings)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No ratings recorded</p>
                  )}
                </section>

                <Separator />

                {/* Section Durations */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide mb-3">
                    <Timer className="h-4 w-4" />
                    Section Durations
                  </h3>
                  {result.section_durations && Object.keys(result.section_durations).length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Section</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(result.section_durations).map(([sectionKey, durationMs]) => {
                            const sectionIndex = parseInt(sectionKey, 10);
                            const sectionName = sectionNames[sectionIndex] || `Section ${sectionIndex + 1}`;
                            
                            return (
                              <tr key={sectionKey} className="border-t">
                                <td className="px-4 py-2 text-foreground">{sectionName}</td>
                                <td className="px-4 py-2 text-right font-mono">
                                  {formatDurationMs(durationMs as number)} min
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t bg-muted">
                            <td className="px-4 py-2 font-semibold">Total Duration</td>
                            <td className="px-4 py-2 text-right font-bold font-mono text-primary">
                              {formatDuration(result.total_duration_seconds || 0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Total: {formatDuration(result.total_duration_seconds || 0)}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No meeting details available
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
