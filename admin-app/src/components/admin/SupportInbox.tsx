import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SupportChatBubble } from '@/components/support/SupportChatBubble';
import { Send, Search, MessageCircle, CheckCircle2, Circle, RefreshCw, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useSupportFileUpload } from '@/hooks/useSupportFileUpload';
import { logger } from '@/utils/logger';

interface Conversation {
  id: string;
  user_id: string;
  company_id: string | null;
  subject: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
  user_name?: string;
  company_name?: string;
  first_message?: string;
  first_message_at?: string;
  unread_count?: number;
  needs_reply?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_type: 'customer' | 'admin';
  sender_id: string;
  created_at: string;
  read_at: string | null;
  sender_name?: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
}

export const SupportInbox: React.FC = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pendingFile, uploading, selectFile, clearFile, uploadFile, handlePaste } = useSupportFileUpload();

  const userId = session?.user?.id;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversations
  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    let query = supabase
      .from('support_conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: convos } = await query;

    if (!convos) {
      if (!silent) setLoading(false);
      return;
    }

    const userIds = [...new Set(convos.map((c: any) => c.user_id))];
    const companyIds = [...new Set(convos.map((c: any) => c.company_id).filter(Boolean))];

    const [profilesRes, companiesRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').in('id', userIds),
      companyIds.length > 0
        ? supabase.from('companies').select('id, name').in('id', companyIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const companyMap = new Map(((companiesRes as any).data || []).map((c: any) => [c.id, c]));

    const enriched: Conversation[] = await Promise.all(
      convos.map(async (c: any) => {
        const profile = profileMap.get(c.user_id);
        const company = c.company_id ? companyMap.get(c.company_id) : null;

        const { data: firstMsg } = await supabase
          .from('support_messages')
          .select('content, sender_type, created_at')
          .eq('conversation_id', c.id)
          .eq('sender_type', 'customer')
          .order('created_at', { ascending: true })
          .limit(1);

        const [{ count }, { data: lastMsg }] = await Promise.all([
          supabase
            .from('support_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', c.id)
            .eq('sender_type', 'customer')
            .is('read_at', null),
          supabase
            .from('support_messages')
            .select('sender_type, content')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        // Find the last "real" message, ignoring the auto-reply
        const autoReplyText = 'The team will get back to you on this. Our usual reply time is under 15 minutes.';
        const lastRealMsg = lastMsg?.find(m => m.content?.trim() !== autoReplyText);
        const needsReply = c.status === 'open' && lastRealMsg?.sender_type === 'customer';

        return {
          ...c,
          user_name: profile?.full_name || profile?.email || 'Unknown',
          company_name: (company as any)?.name || null,
          first_message: firstMsg?.[0]?.content || null,
          first_message_at: firstMsg?.[0]?.created_at || null,
          unread_count: count || 0,
          needs_reply: needsReply,
        };
      })
    );

    setConversations(enriched);
    if (!silent) setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConvo) return;

    const loadMessages = async () => {
      const { data: msgs } = await supabase
        .from('support_messages')
        .select('id, content, sender_type, sender_id, created_at, read_at, attachment_url, attachment_name, attachment_type')
        .eq('conversation_id', selectedConvo)
        .order('created_at', { ascending: true });

      if (msgs) {
        const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds);

        const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

        setMessages(
          msgs.map((m: any) => ({
            ...m,
            sender_name: nameMap.get(m.sender_id) || (m.sender_type === 'admin' ? 'Support' : 'Customer'),
          }))
        );

        const unreadIds = msgs
          .filter((m: any) => m.sender_type === 'customer' && !m.read_at)
          .map((m: any) => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('support_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds);
        }
      }
    };

    loadMessages();
  }, [selectedConvo]);

  // Realtime for messages
  useEffect(() => {
    if (!selectedConvo) return;

    const channel = supabase
      .channel(`admin-support-${selectedConvo}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${selectedConvo}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newMsg.sender_id)
            .single();

          const enrichedMsg: Message = {
            ...newMsg,
            sender_name: profile?.full_name || (newMsg.sender_type === 'admin' ? 'Support' : 'Customer'),
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === enrichedMsg.id)) return prev;
            return [...prev, enrichedMsg];
          });

          if (newMsg.sender_type === 'customer') {
            await supabase
              .from('support_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConvo]);

  // Realtime for new conversations
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-convos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_conversations' },
        () => {
          loadConversations(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !pendingFile) || !userId || !selectedConvo || sending || uploading) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      // Upload file if pending
      let attachment: { url: string; name: string; type: string } | null = null;
      if (pendingFile) {
        attachment = await uploadFile(userId);
      }

      // Optimistic update
      const optimisticMsg: Message = {
        id: crypto.randomUUID(),
        content,
        sender_type: 'admin',
        sender_id: userId,
        created_at: new Date().toISOString(),
        read_at: null,
        sender_name: 'You',
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const { data: realMsg, error } = await supabase.from('support_messages').insert({
        conversation_id: selectedConvo,
        sender_id: userId,
        sender_type: 'admin',
        content,
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
      }).select().single();

      if (error) throw error;

      if (realMsg) {
        setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? { ...realMsg, sender_name: 'You' } as Message : m));
      }

      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConvo);
    } catch (err) {
      logger.error('Failed to send:', err);
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const toggleConvoStatus = async (convoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';
    await supabase.from('support_conversations').update({ status: newStatus }).eq('id', convoId);
    setSelectedConvo(null);
    setMessages([]);
    loadConversations();
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

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.user_name?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[500px] rounded-lg border border-border overflow-hidden bg-background">
      {/* Left panel - Conversation list */}
      <div className="w-[340px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {(['open', 'closed', 'all'] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs flex-1 capitalize"
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </Button>
            ))}
            <Button variant="ghost" size="icon" aria-label="Refresh conversations" className="h-7 w-7" onClick={() => loadConversations()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No conversations found</div>
          ) : (
            filteredConversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedConvo(c.id)}
                className={cn(
                  'w-full text-left p-3 border-b border-border/50 hover:bg-muted/50 transition-colors',
                  selectedConvo === c.id && 'bg-muted'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{c.user_name}</span>
                      {(c.unread_count || 0) > 0 && (
                        <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
                          {c.unread_count}
                        </Badge>
                      )}
                    </div>
                    {c.company_name && (
                      <p className="text-[11px] text-muted-foreground truncate">{c.company_name}</p>
                    )}
                    {c.subject && (
                      <p className="text-xs font-medium text-foreground/80 truncate mt-0.5">{c.subject}</p>
                    )}
                    {c.first_message && !c.subject && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.first_message}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(c.last_message_at || c.created_at), 'MMM d, HH:mm')}
                    </span>
                    {c.needs_reply ? (
                      <Circle className="h-2.5 w-2.5 text-destructive fill-destructive" />
                    ) : c.status === 'closed' ? (
                      <CheckCircle2 className="h-2.5 w-2.5 text-muted-foreground" />
                    ) : null}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel - Messages */}
      <div className="flex-1 flex flex-col">
        {!selectedConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p className="text-sm">Select a conversation to view messages</p>
          </div>
        ) : (
          <>
            {(() => {
              const convo = conversations.find((c) => c.id === selectedConvo);
              return convo ? (
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div>
                    <p className="text-sm font-semibold">{convo.user_name}</p>
                    {convo.company_name && (
                      <p className="text-xs text-muted-foreground">{convo.company_name}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggleConvoStatus(convo.id, convo.status)}
                  >
                    {convo.status === 'open' ? 'Close' : 'Reopen'}
                  </Button>
                </div>
              ) : null;
            })()}

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map((msg) => (
                <SupportChatBubble
                  key={msg.id}
                  content={msg.content}
                  senderType={msg.sender_type as 'customer' | 'admin'}
                  createdAt={msg.created_at}
                  senderName={msg.sender_name}
                  attachmentUrl={msg.attachment_url}
                  attachmentName={msg.attachment_name}
                  attachmentType={msg.attachment_type}
                  invertSides
                />
              ))}
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
                <Button variant="ghost" size="icon" aria-label="Remove file" className="h-6 w-6 shrink-0" onClick={clearFile}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Reply input */}
            <div className="border-t p-3">
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Attach file"
                  className="h-9 w-9 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
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
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Type your reply..."
                  autoResize
                  className="min-h-[40px] max-h-[120px] text-sm"
                  rows={1}
                />
                <Button
                  size="icon"
                  aria-label="Send reply"
                  className="h-9 w-9 shrink-0 rounded-full"
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && !pendingFile) || sending || uploading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
