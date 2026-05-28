import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Check, X, Edit2, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useHeadlines } from '@/hooks/useHeadlines';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useProfiles } from '@/hooks/useProfiles';
import { UserAvatar } from '@/components/UserAvatar';
import { EditHeadlineModal } from '@/components/modals/EditHeadlineModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface HeadlinesSectionProps {
  teamId: string | null;
  meetingTeamId?: string | null; // The actual team_id from the meeting object
}

export const HeadlinesSection: React.FC<HeadlinesSectionProps> = ({ teamId, meetingTeamId }) => {
  const { meetingId, currentRole, triggerAutoCreateIssues } = useNewMeetingTimer();
  
  // Use the meeting's actual team_id (which is NULL for member custom meetings)
  // Only fallback to URL teamId if meeting team_id is not provided
  const effectiveTeamId = meetingTeamId !== undefined ? meetingTeamId : teamId;
  
  // Pre-trigger auto-create issues so they're ready when navigating to Issues section
  // Context-level tracking in NewMeetingTimerContext prevents duplicate triggers per meeting
  useEffect(() => {
    if (currentRole === 'scriber' && effectiveTeamId) {
      logger.log('📰 HeadlinesSection: Pre-triggering auto-create issues for scriber');
      triggerAutoCreateIssues(effectiveTeamId);
    }
  }, [currentRole, effectiveTeamId, triggerAutoCreateIssues]);
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHeadline, setNewHeadline] = useState({ title: '', content: '' });
  const [editingHeadline, setEditingHeadline] = useState<{ id: string; title: string; content: string; } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Use meeting-first approach: meetingId is primary filter
  // Pass effectiveTeamId which uses meeting's team_id (NULL for member custom meetings)
  const { headlines, addHeadline, updateHeadline, archiveHeadline, loading, refetch } = useHeadlines(effectiveTeamId, meetingId || undefined);

  // Remove duplicate real-time subscription - useHeadlines hook already handles this

  const handleAddHeadline = async () => {
    if (!newHeadline.title.trim()) return;

    logger.log('📊 HeadlinesSection: Adding headline with meeting ID:', meetingId);

    try {
      // Use effectiveTeamId to ensure correct team_id (NULL for member custom meetings)
      await addHeadline(newHeadline.title, newHeadline.content, effectiveTeamId, meetingId || undefined);
      setNewHeadline({ title: '', content: '' });
      setShowAddForm(false);
    } catch (error) {
      logger.error('📊 HeadlinesSection: Failed to add headline:', error);
      toast({
        title: "Error",
        description: "Failed to add headline. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setNewHeadline({ title: '', content: '' });
    setShowAddForm(false);
  };

  const handleEditHeadline = (headline: any) => {
    setEditingHeadline({
      id: headline.id,
      title: headline.title,
      content: headline.content,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (title: string, content: string) => {
    if (editingHeadline) {
      await updateHeadline(editingHeadline.id, title, content);
    }
  };

  const handleArchiveHeadline = async (headlineId: string) => {
    await archiveHeadline(headlineId);
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getUserProfile = (userId: string) => {
    return profiles.find(profile => profile.id === userId);
  };

  // Filter headlines to show only current meeting ones (or recent ones if no meeting)
  const filteredHeadlines = headlines.filter(headline => {
    if (meetingId) {
      // If we have an active meeting, only show headlines from this meeting
      const isFromMeeting = headline.meeting_id === meetingId;
      logger.log('📊 HeadlinesSection: Filtering headline:', {
        title: headline.title,
        headlineMeetingId: headline.meeting_id,
        currentMeetingId: meetingId,
        isFromMeeting
      });
      return isFromMeeting;
    }
    // If no active meeting, show recent headlines (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return new Date(headline.created_at) > twentyFourHoursAgo;
  });

  logger.log('📊 HeadlinesSection: Filtered headlines count:', filteredHeadlines.length);

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col overflow-hidden">
        <div className="space-y-6 flex-shrink-0">
          {/* Standardized header */}
          <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Headlines
          </h2>
          <p className="text-muted-foreground font-medium">
            Share important updates about clients or team members
          </p>
        </div>

          {/* Add headline inline form */}
          <div className="space-y-3">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full text-left p-4 border-2 border-dashed border-border hover:border-border/80 transition-colors bg-card"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">Add Headline</span>
                </div>
              </button>
            ) : (
              <div className="bg-card border border-border p-4 space-y-3">
                <div>
                  <Input
                    placeholder="Headline title..."
                    value={newHeadline.title}
                    onChange={(e) => setNewHeadline(prev => ({ ...prev, title: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newHeadline.title.trim()) {
                        e.preventDefault();
                        handleAddHeadline();
                      }
                    }}
                    className="font-medium"
                    autoFocus
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Content (optional)..."
                    value={newHeadline.content}
                    onChange={(e) => setNewHeadline(prev => ({ ...prev, content: e.target.value }))}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) && newHeadline.title.trim()) {
                        e.preventDefault();
                        handleAddHeadline();
                      }
                    }}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddHeadline}
                    disabled={!newHeadline.title.trim()}
                    size="sm"
                    className="gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Add
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Headlines list - flex-1 to fill remaining space */}
        <div className="flex-1 overflow-hidden mt-6">
          <ScrollArea className="h-full w-full">
            <div className="space-y-3 pr-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading headlines...</p>
          </div>
        ) : filteredHeadlines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{meetingId ? 'No headlines added to this meeting yet.' : 'No recent headlines.'}</p>
          </div>
        ) : (
          <>
            {filteredHeadlines.map((headline) => {
              const userProfile = getUserProfile(headline.created_by);
              const isOwner = user?.id === headline.created_by;
              
              return (
                <Card key={headline.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="px-3 py-2 text-sm md:text-base flex items-center">
                    <div className="flex justify-between items-center w-full">
                      <h4 className="font-semibold text-foreground flex-1">{headline.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground ml-4">
                        {isOwner && (
                          <div className="flex items-center gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditHeadline(headline)}
                              className="h-6 w-6 p-0 hover:bg-accent"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchiveHeadline(headline.id)}
                              className="h-6 w-6 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <span>{formatTimeAgo(headline.created_at)}</span>
                        <UserAvatar
                          userId={headline.created_by}
                          fullName={userProfile?.full_name}
                          email={userProfile?.email}
                          avatarUrl={userProfile?.avatar_url}
                          size="sm"
                        />
                      </div>
                    </div>
                    {headline.content && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{headline.content}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>

      {/* Edit Headline Modal */}
      <EditHeadlineModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSave={handleSaveEdit}
        headline={editingHeadline}
      />
    </Card>
  );
};
