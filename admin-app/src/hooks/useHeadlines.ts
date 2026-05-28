import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

export interface Headline {
  id: string;
  title: string;
  content: string;
  team_id?: string;
  meeting_id?: string;
  target_meeting_type?: 'weekly' | 'quarterly' | 'custom';
  created_by: string;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  archived_at?: string;
}

export const useHeadlines = (teamId?: string | null, meetingId?: string, availableTeams?: Array<{id: string; company_id: string}>) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentCompany } = useMultiCompany();
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);

  const pendingOps = useRef<Set<string>>(new Set());
  const eventBuffer = useRef<any[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user || !currentCompany) {
      setHeadlines([]);
      setLoading(false);
      return;
    }

    fetchHeadlines();
  }, [user, teamId, meetingId, currentCompany?.id, availableTeams]);

  useEffect(() => {
    if ((!teamId && !meetingId) || !currentCompany) return;

    const channelName = teamId ? `headlines_${teamId}` : `headlines_meeting_${meetingId}`;

    const flushEvents = () => {
      const events = [...eventBuffer.current];
      eventBuffer.current = [];
      if (events.length === 0) return;

      setHeadlines(prev => {
        let next = [...prev];
        for (const evt of events) {
          if (evt.eventType === 'INSERT') {
            const h = evt.new as Headline;
            if (!h.archived && !next.some(x => x.id === h.id)) {
              next = [h, ...next];
            }
          } else if (evt.eventType === 'UPDATE') {
            const h = evt.new as Headline;
            next = next.map(x => x.id === h.id ? h : x).filter(x => !x.archived);
          } else if (evt.eventType === 'DELETE') {
            next = next.filter(x => x.id !== evt.old.id);
          }
        }
        return next;
      });
    };

    const handleRealtimeUpdate = (payload: any) => {
      const id = (payload.new || payload.old)?.id;
      if (id && pendingOps.current.has(id)) return;

      eventBuffer.current.push(payload);
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(flushEvents, 300);
    };

    const channel = supabase.channel(channelName);

    if (meetingId) {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'headlines',
        filter: `meeting_id=eq.${meetingId}`,
      }, handleRealtimeUpdate);
    } else if (teamId) {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'headlines',
        filter: `team_id=eq.${teamId}`,
      }, handleRealtimeUpdate);
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.log('✅ [HEADLINES REALTIME] Subscribed:', channelName);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logger.error('❌ [HEADLINES REALTIME] Failed:', status, channelName);
      }
    });

    return () => {
      clearTimeout(debounceTimer.current);
      eventBuffer.current = [];
      supabase.removeChannel(channel);
    };
  }, [teamId, meetingId, currentCompany?.id]);

  const fetchHeadlines = async () => {
    try {
      if (!currentCompany) {
        setHeadlines([]);
        setLoading(false);
        return;
      }

      if (teamId) {
        // Check if teamId is valid for available teams when provided
        if (availableTeams && availableTeams.length > 0) {
          const team = availableTeams.find(t => t.id === teamId);
          if (!team || team.company_id !== currentCompany?.id) {
            logger.warn("[useHeadlines] User attempted fetch headlines for team outside company", { currentCompany, teamId });
            toast({
              title: "Access Denied",
              description: "You do not have access to this team's headlines.",
              variant: "destructive",
            });
            setHeadlines([]);
            setLoading(false);
            return;
          }
        }
      }

      let query = supabase
        .from('headlines')
        .select('*')
        .or('archived.is.null,archived.eq.false')
        .order('created_at', { ascending: false });

      // Meeting-first approach: Always use meeting_id when available
      if (meetingId) {
        query = query.eq('meeting_id', meetingId);
        logger.log('📊 useHeadlines: Fetching headlines for meeting:', meetingId);
      } else if (teamId) {
        query = query.eq('team_id', teamId);
      } else if (availableTeams && availableTeams.length > 0) {
        // Multi-team case
        const userTeamIds = availableTeams.map(t => t.id);
        query = query.in('team_id', userTeamIds);
      } else {
        // No filter criteria - return empty
        setHeadlines([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching headlines:', error);
        toast({
          title: "Error",
          description: "Failed to fetch headlines",
          variant: "destructive",
        });
        return;
      }

      logger.log('📊 useHeadlines: Fetched headlines:', data?.length, 'Sample headline:', data?.[0]);
      setHeadlines(data || []);
    } catch (error) {
      logger.error('Error fetching headlines:', error);
      toast({
        title: "Error",
        description: "Failed to fetch headlines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addHeadline = async (title: string, content: string, teamId?: string, meetingId?: string, targetMeetingType?: 'weekly' | 'quarterly' | 'custom') => {
    if (!user || !currentCompany) return;
    
    // Company validation when teams are available
    if (teamId && availableTeams && availableTeams.length > 0) {
      const team = availableTeams.find(t => t.id === teamId);
      if (!team || team.company_id !== currentCompany?.id) {
        logger.warn("[useHeadlines] User tried to add headline to team outside company", { currentCompany, teamId });
        toast({
          title: "Error",
          description: "You don't have permission to add headlines to this team.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate meeting ID if provided - accept active or in_progress meetings
    if (meetingId) {
      try {
        const { data: activeMeeting, error: meetingError } = await supabase
          .from('meetings_state')
          .select('id, status, team_id')
          .eq('id', meetingId)
          .in('status', ['active', 'in_progress'])
          .single();

        if (meetingError || !activeMeeting) {
          meetingId = undefined;
        } else if (activeMeeting.team_id !== teamId) {
          meetingId = undefined;
        }
      } catch {
        meetingId = undefined;
      }
    }

    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const tempHeadline: Headline = {
      id: tempId,
      title,
      content,
      team_id: teamId,
      meeting_id: meetingId,
      target_meeting_type: targetMeetingType,
      created_by: user.id,
      created_at: now,
      updated_at: now,
      archived: false,
    };

    pendingOps.current.add(tempId);
    setHeadlines(prev => [tempHeadline, ...prev]);

    try {
      const headlineData = {
        title,
        content,
        team_id: teamId !== undefined ? teamId : null,
        meeting_id: meetingId,
        target_meeting_type: targetMeetingType || null,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('headlines')
        .insert(headlineData)
        .select()
        .single();

      if (error) {
        pendingOps.current.delete(tempId);
        setHeadlines(prev => prev.filter(h => h.id !== tempId));
        toast({
          title: "Error",
          description: `Failed to add headline: ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }

      // Replace temp with real DB data, mark real ID as pending briefly
      pendingOps.current.delete(tempId);
      pendingOps.current.add(data.id);
      setHeadlines(prev => prev.map(h => h.id === tempId ? data : h));
      setTimeout(() => pendingOps.current.delete(data.id), 2000);

      toast({
        title: "Headline added",
        description: "Your headline has been created successfully.",
      });

      return data;
    } catch (error) {
      pendingOps.current.delete(tempId);
      setHeadlines(prev => prev.filter(h => h.id !== tempId));
      throw error;
    }
  };

  const updateHeadline = async (headlineId: string, title: string, content: string) => {
    if (!user || !currentCompany) return;

    const previousHeadlines = headlines;
    const now = new Date().toISOString();

    pendingOps.current.add(headlineId);
    setHeadlines(prev => prev.map(h =>
      h.id === headlineId ? { ...h, title, content, updated_at: now } : h
    ));

    try {
      const { data, error } = await supabase
        .from('headlines')
        .update({ title, content, updated_at: now })
        .eq('id', headlineId)
        .eq('created_by', user.id)
        .select()
        .single();

      if (error) {
        pendingOps.current.delete(headlineId);
        setHeadlines(previousHeadlines);
        toast({
          title: "Error",
          description: "Failed to update headline",
          variant: "destructive",
        });
        return;
      }

      setHeadlines(prev => prev.map(h => h.id === headlineId ? data : h));
      setTimeout(() => pendingOps.current.delete(headlineId), 2000);

      toast({
        title: "Headline updated",
        description: "Your headline has been updated successfully.",
      });

      return data;
    } catch (error) {
      pendingOps.current.delete(headlineId);
      setHeadlines(previousHeadlines);
      toast({
        title: "Error",
        description: "Failed to update headline",
        variant: "destructive",
      });
    }
  };

  const archiveHeadline = async (headlineId: string) => {
    if (!user || !currentCompany) return;

    const previousHeadlines = headlines;

    pendingOps.current.add(headlineId);
    setHeadlines(prev => prev.filter(h => h.id !== headlineId));

    try {
      const { error } = await supabase
        .from('headlines')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq('id', headlineId)
        .eq('created_by', user.id);

      if (error) {
        pendingOps.current.delete(headlineId);
        setHeadlines(previousHeadlines);
        toast({
          title: "Error",
          description: "Failed to archive headline",
          variant: "destructive",
        });
        return;
      }

      setTimeout(() => pendingOps.current.delete(headlineId), 2000);

      toast({
        title: "Headline archived",
        description: "Your headline has been archived.",
      });
    } catch (error) {
      pendingOps.current.delete(headlineId);
      setHeadlines(previousHeadlines);
      toast({
        title: "Error",
        description: "Failed to archive headline",
        variant: "destructive",
      });
    }
  };

  return {
    headlines,
    loading,
    addHeadline,
    updateHeadline,
    archiveHeadline,
    refetch: fetchHeadlines,
  };
};
