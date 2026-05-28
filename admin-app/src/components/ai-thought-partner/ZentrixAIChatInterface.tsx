import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Building2, ChevronLeft, Plus, Sparkles, ChevronDown, RotateCcw, Eye, AlertCircle } from 'lucide-react';
import { SimpleChatMessage } from './SimpleChatMessage';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEFAULT_ZENTRIX_SYSTEM_PROMPT } from '@/constants/aiPrompts';

import { ChatHistorySidebar } from './ChatHistorySidebar';
import { FileUploadPanel } from './FileUploadPanel';
import { PromptInputBox } from './PromptInputBox';
import { AIContextViewerDialog } from './AIContextViewerDialog';
import { SuperAdminUserSelector } from './SuperAdminUserSelector';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useZentrixAIContext } from '@/hooks/useZentrixAIContext';
import { usePersistedSystemPrompt } from '@/hooks/usePersistedSystemPrompt';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { ChatSession, saveChatSession, generateSessionTitle, detectSessionType, updateChatSession, loadMessagesForSession, markSessionRead } from '@/services/aiChatHistoryService';
import { useChatSessionPolling, type PolledMessage } from '@/hooks/useChatSessionPolling';
import { AttachedFile, formatFileContext, isAnalyzableImage, convertImageToBase64, uploadChatFile } from '@/services/fileUploadService';
import { isNativeApp } from '@/utils/platformDetection';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';
import { logger } from '@/utils/logger';

interface Message {
  // 'system' role is used for event-style messages like scheduled-task
  // notifications. Rendered as a small centered divider, not a chat
  // bubble — see SimpleChatMessage.
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[]; // Base64 URLs for user-attached images
  // Agent v1 PR-A: tool failures captured during this assistant turn,
  // rendered inline above the answer so users see what didn't work
  // instead of only catching it in a transient toast.
  toolFailures?: Array<{ tool: string; error: string }>;
}

interface ZentrixAIChatInterfaceProps {
  viewContext?: 'company' | 'team' | 'personal';
  entityId?: string;
  entityName?: string;
}

export const ZentrixAIChatInterface: React.FC<ZentrixAIChatInterfaceProps> = ({
  viewContext = 'company',
  entityId,
  entityName
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  // Agent v1: when on, routes to the /zentrix-agent edge function which uses
  // tools to read company data. Off (default) keeps the existing chat flow.
  const [agentMode, setAgentMode] = useState(true);
  const [agentStatus, setAgentStatus] = useState<string>('');

  // Surgical 1-minute polling: when this session has at least one
  // pending agent_scheduled_task, the hook polls ai_chat_messages for
  // new rows and appends them as they arrive. Otherwise it stays
  // dormant (zero queries). Lets the user see scheduled-task results
  // land in the open chat without refreshing.
  const handlePolledMessages = (newMessages: PolledMessage[]) => {
    if (newMessages.length === 0) return;
    // The user is actively viewing this session if polling fires for
    // it, so any newly-arrived messages are effectively read on render.
    // Mark read so the sidebar's unread dot clears on next refresh.
    if (currentSessionId) {
      void markSessionRead(currentSessionId).then(() => {
        sidebarRefreshRef.current?.();
      });
    }
    setMessages(prev => [
      ...prev,
      ...newMessages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    ]);
  };
  const { refresh: refreshPolling } = useChatSessionPolling({
    sessionId: currentSessionId,
    onNewMessages: handlePolledMessages,
  });

  // URL ↔ session sync: reflect the currently-open chat thread in the
  // browser URL as ?session=<uuid> so a refresh restores the thread
  // (instead of opening a fresh chat) and threads are shareable /
  // bookmarkable.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSessionId = searchParams.get('session') ?? undefined;
  const initialLoadDoneRef = useRef(false);

  // First mount: if URL has ?session=<id>, load that session's messages.
  useEffect(() => {
    if (initialLoadDoneRef.current) return;
    if (!urlSessionId) {
      initialLoadDoneRef.current = true;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const msgs = await loadMessagesForSession(urlSessionId);
        if (cancelled) return;
        setMessages(msgs);
        setCurrentSessionId(urlSessionId);
        // User actively landed on this thread — clear any stale unread state.
        void markSessionRead(urlSessionId);
      } catch (e) {
        logger.error('URL session load failed:', e);
      } finally {
        initialLoadDoneRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlSessionId]);

  // Whenever the active session changes (new chat, sidebar click, agent
  // function created a fresh session via X-Agent-Session-Id), reflect
  // it in the URL. Uses `replace` so the back button doesn't fill up
  // with a long history of thread switches in a single visit.
  useEffect(() => {
    if (!initialLoadDoneRef.current) return; // skip during initial mount
    const next = new URLSearchParams(searchParams);
    if (currentSessionId) {
      if (next.get('session') === currentSessionId) return;
      next.set('session', currentSessionId);
    } else {
      if (!next.has('session')) return;
      next.delete('session');
    }
    setSearchParams(next, { replace: true });
    // We intentionally exclude searchParams/setSearchParams from deps to
    // avoid loops; React Router gives them stable references in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]);

  const { systemPrompt, setSystemPrompt, resetToDefault, isDefault } = usePersistedSystemPrompt();
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [isContextViewerOpen, setIsContextViewerOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRefreshRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();
  const { currentCompany } = useMultiCompanyAccess();
  const { isSuperAdmin } = useCurrentUserPermissionLevel();
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const { context, loading: contextLoading, refresh, formatted, formattedForHuman, formattedByCategory } = useZentrixAIContext(viewContext, entityId, impersonatedUserId || undefined);

  // Beta gate: the tool-using agent is limited to allowlisted companies.
  // When the company isn't enabled, force the regular AI-partner chat and
  // hide the Agent toggle — regardless of the agentMode toggle state.
  const agentEnabled = !!currentCompany?.ai_agent_enabled;
  const effectiveAgentMode = agentMode && agentEnabled;

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // Note: a 30-second autosave used to run here but was removed because
  // it overwrites server-side appends (e.g. scheduled-task results
  // landing in the same session) with the user's stale in-memory copy.
  // Each message exchange already calls updateChatSession() explicitly
  // in handleSend / runAgentMode, so periodic autosave was redundant.

  // Agent v1 — calls the /zentrix-agent edge function and parses its
  // structured SSE events (status / tool_call / tool_result / delta / done).
  const runAgentMode = async (params: {
    accessToken: string | undefined;
    messages: Message[];
    sessionId: string | undefined;
    companyId: string | undefined;
    attachedFiles?: AttachedFile[];
  }) => {
    const { accessToken, messages: convoMessages, sessionId, companyId, attachedFiles: turnFiles } = params;

    if (!accessToken) {
      toast({
        title: 'Not signed in',
        description: 'Please sign in again to use Agent mode.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const fnUrl = `${SUPABASE_URL}/functions/v1/zentrix-agent`;
    setAgentStatus('Thinking…');

    try {
      // Attachments are tied to the latest user turn only. We pass the
      // storage paths (not the bytes) so a 25MB PDF doesn't have to round-
      // trip through the request body — the edge function downloads the
      // file server-side via the service-role storage client.
      const attachmentsPayload = (turnFiles ?? [])
        .filter(f => !!f.storagePath)
        .map(f => ({
          name: f.name,
          mime_type: f.type,
          storage_path: f.storagePath,
          extracted_text: f.extractedText,
        }));

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: convoMessages.map(m => ({ role: m.role, content: m.content })),
          session_id: sessionId,
          company_id: companyId,
          attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
        }),
      });

      if (res.status === 429) {
        toast({
          title: 'Daily agent limit reached',
          description: 'Your company has hit the per-day Agent message limit. Resets at midnight UTC.',
          variant: 'destructive',
        });
        setAgentStatus('');
        setIsLoading(false);
        return;
      }

      if (!res.ok || !res.body) {
        const errText = await res.text();
        throw new Error(`Agent error: ${errText}`);
      }

      // The agent edge function returns a fresh session_id in this header
      // when it created the session itself.
      const newSessionId = res.headers.get('X-Agent-Session-Id');
      if (newSessionId && !sessionId) {
        setCurrentSessionId(newSessionId);
      }

      // Insert empty assistant message we'll fill via deltas.
      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date() }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataPart = trimmed.slice(5).trim();
          if (!dataPart) continue;

          let event: any;
          try {
            event = JSON.parse(dataPart);
          } catch {
            continue;
          }

          if (event.type === 'status') {
            setAgentStatus(event.message || '');
          } else if (event.type === 'tool_call') {
            // Already announced via 'status'; nothing to render here.
          } else if (event.type === 'tool_result') {
            // Surface tool failures inline in the assistant's bubble so
            // the user can see exactly which read/write attempt errored,
            // instead of only catching it in a transient toast.
            if (event.ok === false && event.error) {
              const failure = {
                tool: String(event.tool ?? 'tool'),
                error: String(event.error),
              };
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  const existing = updated[lastIdx].toolFailures ?? [];
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    toolFailures: [...existing, failure],
                  };
                }
                return updated;
              });
            }
          } else if (event.type === 'delta') {
            assistantContent += (event.text || '');
            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                updated[lastIdx] = { ...updated[lastIdx], content: assistantContent };
              }
              return updated;
            });
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Agent error');
          } else if (event.type === 'done') {
            // No-op; reader will exit on stream close.
          }
        }
      }

      // Per-message persistence is now handled inside the zentrix-agent
      // edge function via append_chat_message — the function is the
      // sole writer for the agent path. The frontend used to overwrite
      // the whole messages array here, which raced with the worker.
      // Don't add any DB write here.
    } catch (err) {
      logger.error('Agent error:', err);
      toast({
        title: 'Agent error',
        description: err instanceof Error ? err.message : 'Failed to get response from Agent.',
        variant: 'destructive',
      });
    } finally {
      setAgentStatus('');
      setIsLoading(false);
      // The agent may have scheduled a new task in this turn. Kick the
      // polling hook so it re-checks for pending tasks and starts the
      // 1-minute loop immediately if needed.
      refreshPolling();
    }
  };

  const sendMessage = async (content: string, files?: File[]) => {
    const hasFiles = files && files.length > 0;
    
    logger.log('📥 [ZentrixAI] sendMessage received:', {
      contentLength: content.length,
      filesCount: files?.length || 0,
      fileNames: files?.map(f => f.name) || []
    });
    
    // Allow sending if there's text OR files
    if ((!content.trim() && !hasFiles) || isLoading || !context) {
      logger.log('⚠️ [ZentrixAI] Early return:', { 
        noContent: !content.trim() && !hasFiles, 
        isLoading, 
        noContext: !context 
      });
      return;
    }

    // Track AI chat events
    if (messages.length === 0) {
      import('@/lib/analytics').then(({ trackAIChatStarted }) => {
        trackAIChatStarted();
      });
    }
    import('@/lib/analytics').then(({ trackAIChatMessage }) => {
      trackAIChatMessage('user');
    });

    // Process attachments. Images are kept as inline base64 (so the legacy
    // chat path can still feed them multimodal). Non-image files (PDF, XLSX,
    // CSV, TXT) get uploaded to Storage here so the agent edge function can
    // download them server-side and feed them to Gemini.
    const imageDataUrls: string[] = [];
    const newlyUploadedFiles: AttachedFile[] = [];
    if (hasFiles) {
      logger.log('📎 [ZentrixAI] Processing', files!.length, 'attached file(s)…');
      // First-message uploads run before the agent has created a session, so
      // fall back to a stable client-generated id for the storage path. Same
      // id is reused for every file in this turn so they cluster together
      // in Storage instead of fanning out to per-file folders.
      const sessionForPath = currentSessionId ?? `pending-${crypto.randomUUID()}`;
      // Use the real auth user's id, NOT context.current_user.id — the
      // latter reflects super-admin impersonation, but the chat-files
      // bucket's RLS policy keys off auth.uid(), so impersonated IDs would
      // fail the row-level security check on insert.
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      logger.log('📁 [ZentrixAI] Upload context — userId:', userId, 'sessionForPath:', sessionForPath);

      for (const file of files!) {
        if (isAnalyzableImage(file.type)) {
          try {
            logger.log('🖼️ [ZentrixAI] Processing image:', file.name, 'type:', file.type);
            const base64 = await convertImageToBase64(file);
            imageDataUrls.push(base64);
            logger.log('✅ [ZentrixAI] Image converted successfully:', file.name, file.type === 'image/webp' ? '(WebP→PNG)' : '');
          } catch (err) {
            logger.error('❌ [ZentrixAI] Failed to convert image:', file.name, 'type:', file.type, err);
            toast({
              title: "Image conversion failed",
              description: `Could not process ${file.name}. Please try a different image format.`,
              variant: "destructive",
            });
          }
        } else if (userId) {
          // PDF / XLSX / CSV / TXT — push to Storage so the agent can read it.
          try {
            logger.log('📄 [ZentrixAI] Uploading file for agent:', file.name, file.type);
            const uploaded = await uploadChatFile(file, sessionForPath, userId);
            if (uploaded) {
              newlyUploadedFiles.push(uploaded);
              logger.log('✅ [ZentrixAI] File uploaded:', uploaded.storagePath);
            }
          } catch (err) {
            logger.error('❌ [ZentrixAI] Upload failed:', file.name, err);
            toast({
              title: "Upload failed",
              description: `Could not upload ${file.name}. ${err instanceof Error ? err.message : ''}`,
              variant: "destructive",
            });
          }
        } else {
          logger.warn('⚠️ [ZentrixAI] No user context — skipping non-image upload:', file.name);
        }
      }
      logger.log('✅ [ZentrixAI] Processed attachments — images:', imageDataUrls.length, 'uploads:', newlyUploadedFiles.length);
    }

    // Use placeholder text if only image is provided
    const messageContent = content.trim() || '[Image attached]';
    
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
    };

    const previousMessages = messages;
    const nextMessages = [...previousMessages, userMessage];

    setMessages(nextMessages);
    setIsLoading(true);

    // Images are already converted and stored in userMessage.images

    // Save session if this is the first message
    // In agent mode the edge function creates the session itself (and returns
    // its id via the X-Agent-Session-Id header), so skip the legacy
    // saveChatSession path to avoid creating two sessions for the same chat.
    if (previousMessages.length === 0 && !currentSessionId && !effectiveAgentMode) {
      setSaveStatus('saving');
      const sessionType = detectSessionType(window.location.pathname);
      const title = generateSessionTitle(content, sessionType);
      const companyId = currentCompany?.id;
      logger.log('💾 Creating new chat session:', { title, sessionType, messageCount: nextMessages.length });
      const sessionId = await saveChatSession(
        title,
        nextMessages,
        sessionType,
        formatted,
        undefined,
        attachedFiles,
        companyId
      );
      logger.log('💾 Chat session created:', sessionId);
      if (sessionId) {
        setCurrentSessionId(sessionId);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        // Trigger immediate sidebar refresh
        logger.log('🔄 Triggering sidebar refresh after session creation');
        setTimeout(() => {
          if (sidebarRefreshRef.current) {
            sidebarRefreshRef.current();
          }
        }, 100);
      } else {
        logger.error('❌ Failed to create chat session');
        setSaveStatus('idle');
      }
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      // Agent mode (v1): route to the new tool-using agent. Different SSE
      // event shape than the classic chat endpoint, so handle it here and
      // short-circuit out of the rest of the legacy branch.
      if (effectiveAgentMode) {
        // Merge any pre-attached files (legacy panel) with the files freshly
        // uploaded inline from the prompt-box paperclip in this turn.
        const turnAttachments = [...attachedFiles, ...newlyUploadedFiles];
        await runAgentMode({
          accessToken,
          messages: nextMessages,
          sessionId: currentSessionId,
          companyId: currentCompany?.id,
          attachedFiles: turnAttachments,
        });
        // Files were sent with this turn — clear pending uploads so the
        // next message doesn't accidentally re-attach them.
        setAttachedFiles([]);
        return;
      }

      const fnUrl = `${SUPABASE_URL}/functions/v1/zentrix-ai-partner`;

      // Add file context to the formatted context
      const fileContext = formatFileContext(attachedFiles);
      const fullContext = formatted + fileContext;

      // Check for images in the user message
      const hasImages = userMessage.images && userMessage.images.length > 0;

      // Build messages - convert last user message to multimodal if images present
      const formattedMessages = nextMessages.map((m, idx) => {
        // Only convert the last user message if we have images
        if (hasImages && m.role === 'user' && idx === nextMessages.length - 1 && m.images && m.images.length > 0) {
          const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
            { type: 'text', text: m.content }
          ];
          // Add images from the message
          for (const base64Url of m.images) {
            contentParts.push({
              type: 'image_url',
              image_url: { url: base64Url }
            });
          }
          return { role: m.role, content: contentParts };
        }
        return { role: m.role, content: m.content };
      });

      logger.log('📤 [ZentrixAI] Sending message to AI:', { hasImages, imageCount: userMessage.images?.length || 0 });

      // Determine platform for Apple compliance headers (includes iPad browsers)
      const platformHeader = isNativeApp() ? 'ios' : (isMobileOrTabletDevice() ? 'mobile' : undefined);

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          ...(platformHeader ? { 'x-client-platform': platformHeader } : {}),
        },
        body: JSON.stringify({
          messages: formattedMessages,
          context: fullContext,
          stream: true,
          customSystemPrompt: systemPrompt !== DEFAULT_ZENTRIX_SYSTEM_PROMPT ? systemPrompt : undefined,
          impersonated_user_id: impersonatedUserId,
        }),
      });

      // Handle rate limiting errors
      if (res.status === 429) {
        toast({
          title: 'Rate Limit Reached',
          description: 'Too many requests. Please wait a moment before trying again.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Handle payment required errors (Apple compliance: generic message on mobile/tablet)
      if (res.status === 402 || res.status === 503) {
        const isMobile = isMobileOrTabletDevice();
        toast({
          title: isMobile ? 'Feature Unavailable' : 'AI Credits Depleted',
          description: isMobile 
            ? 'This feature is temporarily unavailable.' 
            : 'Please add funds to your Lovable AI workspace to continue.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (!res.ok || !res.body) {
        const errText = await res.text();
        throw new Error(`Edge function error: ${errText}`);
      }

      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date() }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataPart = trimmed.slice(5).trim();
          if (dataPart === '{"done": true}') continue;
          try {
            const payload = JSON.parse(dataPart);
            if (payload.delta) {
              assistantContent += payload.delta;
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = { ...updated[lastIdx], content: assistantContent };
                }
                return updated;
              });
            }
          } catch (_) {
            // ignore non-JSON lines
          }
        }
      }

      // Update session with new messages
      if (currentSessionId) {
        const assistantMessage: Message = { 
          role: 'assistant' as const, 
          content: assistantContent, 
          timestamp: new Date() 
        };
        const updatedMessages = [...nextMessages, assistantMessage];
        logger.log('💾 Updating chat session:', { sessionId: currentSessionId, messageCount: updatedMessages.length });
        const updated = await updateChatSession(currentSessionId, updatedMessages);
        logger.log('💾 Chat session updated:', updated);
      } else {
        logger.warn('⚠️ No session ID available to update');
      }

      setIsLoading(false);
    } catch (error) {
      logger.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response from AI. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleLoadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setAttachedFiles(session.attached_files || []);
    // Keep the sidebar open on wide screens so the user can switch
    // between threads without losing the list. Auto-close only when
    // the viewport is too narrow for both columns to fit comfortably.
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    // Clear unread badge for this thread — fire-and-forget; sidebar
    // refresh on next tick will reflect the cleared state.
    void markSessionRead(session.id).then(() => {
      sidebarRefreshRef.current?.();
    });
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(undefined);
    setAttachedFiles([]);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const getScopeLabel = () => {
    if (viewContext === 'company') return `Company: ${context?.hierarchy?.company?.name || 'Loading...'}`;
    if (viewContext === 'team') return `Team: ${entityName || 'Unknown'}`;
    return 'Personal';
  };

  const getScopeIcon = () => {
    if (viewContext === 'company') return <Building2 className="h-4 w-4" />;
    if (viewContext === 'team') return <Building2 className="h-4 w-4" />;
    return <Building2 className="h-4 w-4" />;
  };

  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUserId();
  }, []);

  return (
    <div className="flex h-full w-full bg-background">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 w-full">
        {/* Minimal Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-card px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Zentrix AI</h1>
              <p className="text-[13px] text-muted-foreground hidden sm:block">Your AI thought partner</p>
              {saveStatus === 'saving' && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-xs text-success">✓ Saved</span>
              )}
              {impersonatedUserId && (
                <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Testing Mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <SuperAdminUserSelector
                  selectedUserId={impersonatedUserId}
                  onUserChange={setImpersonatedUserId}
                  currentCompanyId={currentCompany?.id}
                />
              )}
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsContextViewerOpen(true)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">View Context</span>
                </Button>
              )}
              {agentEnabled && (
                <Button
                  variant={agentMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAgentMode(prev => !prev)}
                  className="gap-2"
                  title={agentMode ? 'Agent mode is ON — replies use tools to read your data' : 'Switch to Agent mode (uses tools to read company data)'}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">{agentMode ? 'Agent · ON' : 'Agent'}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>
              {!isSidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(true)}
                  className="h-8 w-8"
                  aria-label="Open chat sidebar"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* System Prompt Editor - Super Admin Only */}
        {isSuperAdmin && (
          <Collapsible open={isPromptEditorOpen} onOpenChange={setIsPromptEditorOpen}>
            <div className="border-b border-border bg-muted/30">
              <div className="max-w-5xl mx-auto px-6 py-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">System Prompt</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isDefault 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-accent text-accent-foreground'
                      }`}>
                        {isDefault ? 'Default' : 'Custom'}
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isPromptEditorOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 pb-4">
                  <div className="space-y-3">
                    <Textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="min-h-[300px] font-mono text-xs bg-background border-border resize-y"
                      placeholder="Enter custom system prompt..."
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {systemPrompt.length} characters
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetToDefault}
                        className="gap-2"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset to Default
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </div>
          </Collapsible>
        )}

        {/* Chat Messages */}
        <div className="flex-1 px-4 sm:px-6 overflow-y-auto" ref={scrollAreaRef}>
          <div className={messages.length === 0 ? "flex items-start justify-center min-h-full pt-32" : "py-8 min-h-full"}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4">
                <h1 className="text-4xl font-semibold text-foreground mb-8">
                  What's on your mind today?
                </h1>
                
                {/* Input form for empty state */}
                <div className="w-full max-w-2xl">
                  <PromptInputBox
                    onSend={sendMessage}
                    isLoading={isLoading}
                    placeholder="Ask anything"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                {messages.map((message, index) => (
                  <SimpleChatMessage key={index} message={message} />
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 border border-border rounded-2xl px-5 py-4 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        {effectiveAgentMode
                          ? (agentStatus || 'Thinking…')
                          : 'Analyzing data and generating insights...'}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Only shown when messages exist */}
          {messages.length > 0 && (
            <div className="sticky bottom-0 z-10 border-t border-sidebar-border bg-background px-3 pt-2 pb-24 flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <PromptInputBox
                onSend={sendMessage}
                isLoading={isLoading}
                placeholder="Ask anything"
              />
            </div>
          </div>
        )}
      </div>

      {/* Chat History Sidebar */}
      {isSidebarOpen && (
        <ChatHistorySidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          currentSessionId={currentSessionId}
          onLoadSession={handleLoadSession}
          onNewChat={handleNewChat}
          companyId={currentCompany?.id ?? ''}
          onRefreshReady={(refreshFn) => {
            sidebarRefreshRef.current = refreshFn;
          }}
        />
      )}

      {/* AI Context Viewer Dialog */}
      <AIContextViewerDialog
        open={isContextViewerOpen}
        onOpenChange={setIsContextViewerOpen}
        formatted={formatted}
        formattedForHuman={formattedForHuman}
        formattedByCategory={formattedByCategory}
        context={context}
        onRefresh={refresh}
        isRefreshing={contextLoading}
      />
    </div>
  );
};
