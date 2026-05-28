import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, MessageCircle, Paperclip, Image as ImageIcon, Plus, ArrowLeft, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SupportChatBubble } from './SupportChatBubble';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSupportFileUpload } from '@/hooks/useSupportFileUpload';
import { useSupportUnread } from '@/hooks/useSupportUnread';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/logger';

interface Message {
  id: string;
  content: string;
  sender_type: 'customer' | 'admin';
  created_at: string;
  sender_id: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
}

interface Conversation {
  id: string;
  status: string;
  subject?: string;
  last_message_at?: string;
  created_at?: string;
}

interface SupportChatWidgetProps {
  open: boolean;
  onClose: () => void;
  unreadHook?: ReturnType<typeof useSupportUnread>;
}

type View = 'lobby' | 'chat';

export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({ open, onClose, unreadHook }) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>('lobby');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [pastConversations, setPastConversations] = useState<Conversation[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pendingFile, uploading, selectFile, clearFile, uploadFile, handlePaste } = useSupportFileUpload();

  const userId = session?.user?.id;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load past conversations for lobby
  useEffect(() => {
    if (!userId || !open) return;

    const loadConversations = async () => {
      setLoading(true);
      const { data: convos } = await supabase
        .from('support_conversations')
        .select('id, status, subject, last_message_at, created_at')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      setPastConversations((convos as Conversation[]) || []);
      setLoading(false);
    };

    loadConversations();
  }, [userId, open]);

  // Reset view when widget opens
  useEffect(() => {
    if (open) {
      setView('lobby');
      setConversation(null);
      setMessages([]);
    }
  }, [open]);

  // Realtime subscription
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`support-messages-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Skip our own messages — they're handled by optimistic updates
          if (newMsg.sender_id === userId) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const openConversation = async (convo: Conversation) => {
    setConversation(convo);
    setView('chat');
    setLoadingMessages(true);

    // Mark as read
    unreadHook?.markConversationRead(convo.id);

    const { data: msgs } = await supabase
      .from('support_messages')
      .select('id, content, sender_type, created_at, sender_id, attachment_url, attachment_name, attachment_type')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: true });

    setMessages((msgs as Message[]) || []);
    setLoadingMessages(false);
  };

  const startNewConversation = () => {
    setConversation(null);
    setMessages([]);
    setView('chat');
  };

  const goBackToLobby = async () => {
    setView('lobby');
    setConversation(null);
    setMessages([]);
    clearFile();
    setNewMessage('');
    // Refresh conversations list
    if (userId) {
      const { data: convos } = await supabase
        .from('support_conversations')
        .select('id, status, subject, last_message_at, created_at')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      setPastConversations((convos as Conversation[]) || []);
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !pendingFile) || !userId || sending || uploading) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      let convoId = conversation?.id;
      let isFirstMessage = false;

      // Create conversation if none exists
      if (!convoId) {
        isFirstMessage = true;
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', userId)
          .single();

        const { data: newConvo, error: convoError } = await supabase
          .from('support_conversations')
          .insert({
            user_id: userId,
            company_id: profile?.company_id || null,
            subject: content.substring(0, 100) || 'File attachment',
          })
          .select('id, status, subject, last_message_at, created_at')
          .single();

        if (convoError) throw convoError;
        convoId = (newConvo as Conversation).id;
        setConversation(newConvo as Conversation);
      } else {
        // Check if this conversation has any messages yet
        const { count } = await supabase
          .from('support_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convoId);
        isFirstMessage = (count ?? 0) === 0;
      }

      // Upload file if pending
      let attachment: { url: string; name: string; type: string } | null = null;
      if (pendingFile) {
        attachment = await uploadFile(userId);
      }

      // Optimistic update
      const optimisticMsg: Message = {
        id: crypto.randomUUID(),
        content,
        sender_type: 'customer',
        created_at: new Date().toISOString(),
        sender_id: userId,
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const { data: realMsg, error } = await supabase.from('support_messages').insert({
        conversation_id: convoId,
        sender_id: userId,
        sender_type: 'customer',
        content,
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
      }).select().single();

      if (error) throw error;

      if (realMsg) {
        setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? realMsg as Message : m));
      }

      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convoId);

      // Auto-reply only on the first message of a conversation
      if (isFirstMessage) {
        const autoReplyContent = 'The team will get back to you on this. Our usual reply time is under 15 minutes.';
        const { data: autoReplyMsg } = await supabase.from('support_messages').insert({
          conversation_id: convoId,
          sender_id: userId,
          sender_type: 'admin',
          content: autoReplyContent,
        }).select().single();

        if (autoReplyMsg) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (autoReplyMsg as Message).id)) return prev;
            return [...prev, autoReplyMsg as Message];
          });
        }

        // Fire-and-forget: generate AI title for the conversation
        supabase.functions.invoke('generate-conversation-title', {
          body: { conversation_id: convoId, message: content },
        }).then(({ data }) => {
          if (data?.title) {
            setConversation((prev) => prev ? { ...prev, subject: data.title } : prev);
          }
        }).catch((err) => logger.error('Title generation failed:', err));

        // Fire-and-forget: notify admin via email
        supabase.functions.invoke('notify-support-chat', {
          body: {
            user_id: userId,
            message: content,
            conversation_id: convoId,
          },
        }).catch((err) => logger.error('Admin email notification failed:', err));
      }
    } catch (err) {
      logger.error('Failed to send message:', err);
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-[400px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          {view === 'chat' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-white/20 -ml-1" onClick={goBackToLobby} aria-label="Back to conversations">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <MessageCircle className="h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">
              {view === 'lobby' ? 'Help & Support' : conversation?.subject || 'New Conversation'}
            </p>
            <p className="text-[10px] opacity-80">
              We're here to help
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-white/20" onClick={onClose} aria-label="Close support chat">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {view === 'lobby' ? (
        /* ===== LOBBY VIEW ===== */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Welcome section */}
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-center justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground text-center mb-1">
              How can we help?
            </h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Ask questions, report issues, or share feedback. We're here to help you get the most out of your experience.
            </p>
          </div>

          {/* New message button */}
          <div className="px-5 pb-4">
            <Button
              onClick={startNewConversation}
              className="w-full h-12 rounded-xl gap-2 text-sm font-semibold shadow-md hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Send us a message
            </Button>
          </div>

          {/* Past conversations */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          ) : pastConversations.length > 0 ? (
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Recent conversations
              </p>
              <div className="flex flex-col gap-2">
                {pastConversations.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => openConversation(convo)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border",
                      "bg-card hover:bg-accent/50 hover:border-primary/20 transition-all duration-200",
                      "text-left group cursor-pointer"
                    )}
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center shrink-0 relative",
                      convo.status === 'open' ? "bg-primary/10" : "bg-muted"
                    )}>
                      <MessageCircle className={cn(
                        "h-4 w-4",
                        convo.status === 'open' ? "text-primary" : "text-muted-foreground"
                      )} />
                      {unreadHook?.unreadMap[convo.id] && (
                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive border-2 border-card animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {convo.subject || 'Conversation'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">
                          {convo.last_message_at
                            ? formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true })
                            : convo.created_at
                              ? formatDistanceToNow(new Date(convo.created_at), { addSuffix: true })
                              : ''}
                        </p>
                        {convo.status === 'open' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary ml-1">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        /* ===== CHAT VIEW ===== */
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 px-6">
                <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Send us a message and we'll get back to you as soon as possible!
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <SupportChatBubble
                  key={msg.id}
                  content={msg.content}
                  senderType={msg.sender_type as 'customer' | 'admin'}
                  createdAt={msg.created_at}
                  senderName={msg.sender_type === 'admin' ? 'Support' : undefined}
                  attachmentUrl={msg.attachment_url}
                  attachmentName={msg.attachment_name}
                  attachmentType={msg.attachment_type}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* File preview */}
          {pendingFile && (
            <div className="px-3 pt-2 flex items-center gap-2">
              {pendingFile.previewUrl ? (
                <img src={pendingFile.previewUrl} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-border" />
              ) : (
                <div className="h-12 w-12 rounded-lg border border-border bg-muted flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <span className="text-xs text-muted-foreground truncate flex-1">{pendingFile.file.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clearFile} aria-label="Remove attachment">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Type your message..."
                autoResize
                className="min-h-[40px] max-h-[120px] text-sm border-0 bg-muted/50 focus-visible:ring-1"
                rows={1}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full"
                onClick={handleSend}
                disabled={(!newMessage.trim() && !pendingFile) || sending || uploading}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
