
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface ChatFolder {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
  user_id: string;
  company_id?: string;
  session_type: 'general' | 'strategy' | 'metrics' | 'goals' | 'tasks' | 'issues' | 'org_chart';
  context_snapshot?: string;
  folder_id?: string;
  is_pinned?: boolean;
  attached_files?: any[];
  /** Timestamp of the last time the current user opened this thread. */
  last_read_at?: string | null;
  /** Derived: true when at least one message has arrived after last_read_at. */
  has_unread?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context_used?: boolean;
  page_context?: string;
}

export const saveChatSession = async (
  title: string,
  messages: ChatMessage[],
  sessionType: ChatSession['session_type'] = 'general',
  contextSnapshot?: string,
  folderId?: string,
  attachedFiles?: any[],
  companyId?: string
): Promise<string | null> => {
  try {
    logger.log('💾 saveChatSession called:', { title, messageCount: messages.length, sessionType });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.error('❌ No authenticated user for chat history save');
      return null;
    }

    logger.log('👤 User authenticated:', user.id);

    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        title: title.slice(0, 100),
        messages: JSON.stringify(messages),
        user_id: user.id,
        company_id: companyId || null,
        session_type: sessionType,
        context_snapshot: contextSnapshot,
        folder_id: folderId || null,
        attached_files: attachedFiles ? JSON.stringify(attachedFiles) : '[]'
      })
      .select('id')
      .single();

    if (error) {
      logger.error('❌ Error saving chat session:', error);
      return null;
    }

    logger.log('✅ Chat session saved successfully:', data.id);
    return data.id;
  } catch (error) {
    logger.error('❌ Exception in saveChatSession:', error);
    return null;
  }
};

export const loadChatSessions = async (companyId?: string): Promise<ChatSession[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.log('No authenticated user for chat history load');
      return [];
    }

    let query = supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('user_id', user.id);
    
    // Filter by company if provided
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) {
      logger.error('Error loading chat sessions:', error);
      return [];
    }

    logger.log('📊 Raw sessions from DB:', data?.length || 0);

    // Pull per-message rows for these sessions in a single batched query.
    // For sessions that have rows in ai_chat_messages (e.g. agent threads),
    // these are the source of truth. For legacy sessions written before
    // the per-row migration, fall back to parsing the JSONB blob.
    const sessionIds = (data || []).map(s => s.id);
    const newMessagesMap = await loadMessagesForSessions(sessionIds);

    return (data || []).map(session => {
      try {
        const newRows = newMessagesMap.get(session.id);
        let parsedMessages: ChatMessage[];

        if (newRows && newRows.length > 0) {
          // Per-row storage wins when present.
          parsedMessages = newRows;
        } else {
          // Legacy fallback: parse the JSONB blob.
          // `messages` may be a JSON-encoded string (legacy chat writes it
          // that way) or already an array (early agent v1 sessions wrote
          // it unstringified). Handle both shapes.
          const rawMessages = session.messages;
          const messagesArray = Array.isArray(rawMessages)
            ? rawMessages
            : JSON.parse((rawMessages as string) || '[]');
          parsedMessages = messagesArray.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          }));
        }

        const rawFiles = session.attached_files;
        const parsedFiles = !rawFiles
          ? []
          : Array.isArray(rawFiles)
          ? rawFiles
          : JSON.parse((rawFiles as string) || '[]');

        // Unread = latest message arrived after the user last opened
        // this thread. Compares server-side last_read_at against the
        // newest message timestamp. New sessions (no messages) are not
        // unread. Sessions with no last_read_at (legacy / freshly
        // created) treat the latest message as unread so the user sees
        // something there's something to read.
        const lastMsg = parsedMessages.length > 0
          ? parsedMessages[parsedMessages.length - 1]
          : null;
        const lastReadAt = (session as { last_read_at?: string | null }).last_read_at;
        const hasUnread = !!lastMsg && (
          !lastReadAt || new Date(lastMsg.timestamp).getTime() > new Date(lastReadAt).getTime()
        );

        return {
          ...session,
          session_type: session.session_type as ChatSession['session_type'],
          messages: parsedMessages,
          attached_files: parsedFiles,
          last_read_at: lastReadAt ?? null,
          has_unread: hasUnread,
        };
      } catch (error) {
        logger.error('❌ Failed to parse session:', session.id, error);
        // Return session with empty messages instead of crashing
        return {
          ...session,
          session_type: session.session_type as ChatSession['session_type'],
          messages: [],
          attached_files: [],
          has_unread: false,
        };
      }
    });
  } catch (error) {
    logger.error('Error loading chat sessions:', error);
    return [];
  }
};

export const deleteChatSession = async (sessionId: string): Promise<boolean> => {
  try {
    // Best-effort: remove any files this session uploaded to Storage so we
    // don't leave orphans behind. Files live inside the chat-files bucket at
    //   <userId>/<sessionId>/*
    // Failures here are non-fatal — the session row delete is the source of
    // truth and runs regardless.
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (userId) {
        const prefix = `${userId}/${sessionId}`;
        const { data: files } = await supabase.storage
          .from('chat-files')
          .list(prefix);
        if (files && files.length > 0) {
          const paths = files.map((f) => `${prefix}/${f.name}`);
          await supabase.storage.from('chat-files').remove(paths);
        }
      }
    } catch (cleanupErr) {
      logger.warn('Chat-files cleanup failed (non-fatal):', cleanupErr);
    }

    const { error } = await supabase
      .from('ai_chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      logger.error('Error deleting chat session:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error deleting chat session:', error);
    return false;
  }
};

export const updateChatSession = async (
  sessionId: string,
  messages: ChatMessage[],
  title?: string,
  folderId?: string | null,
  isPinned?: boolean
): Promise<boolean> => {
  try {
    logger.log('🔄 updateChatSession called:', { sessionId, messageCount: messages.length });
    const updateData: any = {
      messages: JSON.stringify(messages),
      updated_at: new Date().toISOString()
    };

    if (title) {
      updateData.title = title.slice(0, 100);
    }
    if (folderId !== undefined) {
      updateData.folder_id = folderId;
    }
    if (isPinned !== undefined) {
      updateData.is_pinned = isPinned;
    }

    const { error } = await supabase
      .from('ai_chat_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      logger.error('❌ Error updating chat session:', error);
      return false;
    }

    logger.log('✅ Chat session updated successfully');
    return true;
  } catch (error) {
    logger.error('❌ Exception in updateChatSession:', error);
    return false;
  }
};

// ============= PER-MESSAGE STORAGE (ai_chat_messages) =============
//
// New storage model: each message is its own row, atomically inserted.
// Replaces the legacy "store the whole array as one JSONB blob" pattern,
// which caused race conditions when multiple writers (frontend +
// scheduled-task worker) tried to update the same session concurrently.
//
// New writes (agent path, scheduled-task worker, future Realtime) go
// through appendMessage(). Reads of agent-type sessions come from
// ai_chat_messages. Legacy non-agent chat continues to use the JSONB
// blob for now — both can coexist.

/**
 * Append a single message to a chat session. Inserts one row atomically;
 * concurrent calls can't collide on position because the Postgres
 * function locks the parent session briefly.
 */
export const appendMessage = async (
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: Record<string, unknown> | null,
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('append_chat_message', {
      p_session_id: sessionId,
      p_role: role,
      p_content: content,
      p_metadata: metadata ?? null,
    });
    if (error) {
      logger.error('appendMessage failed:', error);
      return null;
    }
    return data as string;
  } catch (e) {
    logger.error('appendMessage exception:', e);
    return null;
  }
};

/**
 * Load the messages for one session in chronological order.
 * Used when a user opens a chat thread from the sidebar.
 */
export const loadMessagesForSession = async (
  sessionId: string,
): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('position', { ascending: true });
  if (error) {
    logger.error('loadMessagesForSession failed:', error);
    return [];
  }
  return (data ?? []).map((m: { role: string; content: string; created_at: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: new Date(m.created_at),
  }));
};

/**
 * Batch-load messages for many sessions at once. Returns a map of
 * session_id → message array. Used by loadChatSessions so the sidebar
 * can populate without N+1 queries.
 */
export const loadMessagesForSessions = async (
  sessionIds: string[],
): Promise<Map<string, ChatMessage[]>> => {
  const result = new Map<string, ChatMessage[]>();
  if (sessionIds.length === 0) return result;

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('session_id, role, content, created_at, position')
    .in('session_id', sessionIds)
    .order('session_id', { ascending: true })
    .order('position', { ascending: true });
  if (error) {
    logger.error('loadMessagesForSessions failed:', error);
    return result;
  }

  for (const m of (data ?? []) as Array<{
    session_id: string;
    role: string;
    content: string;
    created_at: string;
  }>) {
    if (!result.has(m.session_id)) result.set(m.session_id, []);
    result.get(m.session_id)!.push({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: new Date(m.created_at),
    });
  }
  return result;
};

/**
 * Bump the current user's last_read_at on a session to "now". Called
 * when the user opens a thread or receives a new message while they're
 * actively viewing it, so the sidebar doesn't show an unread badge on
 * the thread the user is already looking at.
 *
 * Fire-and-forget: a failure here doesn't break the chat UX.
 */
export const markSessionRead = async (sessionId: string): Promise<void> => {
  const { error } = await supabase.rpc('mark_chat_session_read', {
    p_session_id: sessionId,
  });
  if (error) {
    logger.error('mark_chat_session_read failed:', error);
  }
};

export const detectSessionType = (currentRoute: string): ChatSession['session_type'] => {
  if (currentRoute.includes('/strategy')) return 'strategy';
  if (currentRoute.includes('/metrics')) return 'metrics';
  if (currentRoute.includes('/goals')) return 'goals';
  if (currentRoute.includes('/tasks')) return 'tasks';
  if (currentRoute.includes('/issues')) return 'issues';
  if (currentRoute.includes('/org-chart')) return 'org_chart';
  return 'general';
};

export const generateSessionTitle = (firstMessage: string, sessionType: ChatSession['session_type']): string => {
  const typePrefix = sessionType === 'general' ? '' : `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)}: `;
  const truncatedMessage = firstMessage.slice(0, 50);
  return `${typePrefix}${truncatedMessage}${firstMessage.length > 50 ? '...' : ''}`;
};

// ============= FOLDER MANAGEMENT =============

export const createFolder = async (
  name: string,
  companyId: string,
  color: string = '#3B82F6'
): Promise<ChatFolder | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('chat_folders')
      .insert({
        user_id: user.id,
        company_id: companyId,
        name: name.slice(0, 50),
        color,
        position: 0
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating folder:', error);
      return null;
    }

    return data as ChatFolder;
  } catch (error) {
    logger.error('Error creating folder:', error);
    return null;
  }
};

export const loadFolders = async (companyId: string): Promise<ChatFolder[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('chat_folders')
      .select('*')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .order('position', { ascending: true });

    if (error) {
      logger.error('Error loading folders:', error);
      return [];
    }

    return (data || []) as ChatFolder[];
  } catch (error) {
    logger.error('Error loading folders:', error);
    return [];
  }
};

export const updateFolder = async (
  folderId: string,
  updates: Partial<Pick<ChatFolder, 'name' | 'color' | 'position'>>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chat_folders')
      .update(updates)
      .eq('id', folderId);

    if (error) {
      logger.error('Error updating folder:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error updating folder:', error);
    return false;
  }
};

export const deleteFolder = async (folderId: string): Promise<boolean> => {
  try {
    // First, unlink all sessions from this folder
    await supabase
      .from('ai_chat_sessions')
      .update({ folder_id: null })
      .eq('folder_id', folderId);

    // Then delete the folder
    const { error } = await supabase
      .from('chat_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      logger.error('Error deleting folder:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error deleting folder:', error);
    return false;
  }
};

export const moveSessionToFolder = async (
  sessionId: string,
  folderId: string | null
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ai_chat_sessions')
      .update({ folder_id: folderId })
      .eq('id', sessionId);

    if (error) {
      logger.error('Error moving session to folder:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error moving session to folder:', error);
    return false;
  }
};
