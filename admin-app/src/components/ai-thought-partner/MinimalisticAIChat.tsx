
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Database } from 'lucide-react';
import { SimpleChatMessage } from './SimpleChatMessage';
import { SimplePromptSuggestions } from './SimplePromptSuggestions';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBusinessData } from '@/hooks/useBusinessData';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useLocation } from 'react-router-dom';
import { loadUserInstructions, formatInstructionsForAI } from '@/services/aiCustomInstructionsService';
import { saveChatSession, updateChatSession, detectSessionType, generateSessionTitle } from '@/services/aiChatHistoryService';
import type { ChatMessage } from '@/services/aiChatHistoryService';
import { logger } from '@/utils/logger';

type Message = ChatMessage;

export const MinimalisticAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [model, setModel] = useState<string>('gpt-4.1-2025-04-14');
  const [tone, setTone] = useState<'neutral' | 'friendly' | 'direct' | 'analytical'>('neutral');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const sessionIdRef = useRef<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { data: businessData, loading: dataLoading, fetchBusinessData, getFormattedDataForAI } = useBusinessData();
  const { currentCompany } = useMultiCompanyAccess();
  const location = useLocation();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Load business context on mount and when company changes via useBusinessData internals
    if (!contextLoaded && !dataLoading) {
      logger.debug('🔄 Attempting to fetch business data...');
      fetchBusinessData().then((result) => {
        setContextLoaded(true);
        logger.debug('🎯 Company-scoped business context loaded for AI:', {
          success: !!result,
          companyName: result?.company?.name,
          metricsCount: result?.metrics?.current?.length || 0,
          tasksCount: (result?.tasks?.personal?.length || 0) + (result?.tasks?.team?.length || 0)
        });
      }).catch((error) => {
        logger.error('❌ Failed to fetch business data:', error);
        setContextLoaded(true); // Prevent infinite retries
      });
    }
  }, [fetchBusinessData, contextLoaded, dataLoading]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Load active custom instructions once
  useEffect(() => {
    (async () => {
        try {
          const active = await loadUserInstructions();
          if (active) {
            const formatted = formatInstructionsForAI(active, {});
            setCustomInstructions(formatted);
            logger.debug('🧩 Loaded custom instructions for AI');
          }
        } catch (e) {
          logger.warn('No custom instructions found or failed to load');
        }
    })();
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const previousMessages: ChatMessage[] = messages;
    const nextMessagesBase: ChatMessage[] = [...previousMessages, userMessage as ChatMessage];

    setMessages(nextMessagesBase);
    setInput('');
    setIsLoading(true);

    try {
      // Business context for AI
      const businessContext = businessData ? getFormattedDataForAI() : '';

      logger.debug('📊 Sending business context to AI:', {
        hasContext: !!businessContext,
        contextLength: businessContext.length,
        companyName: businessData?.company.name || 'Unknown',
      });

      // Auth token for calling the Edge Function directly (streaming)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const fnUrl = `${SUPABASE_URL}/functions/v1/ai-thought-partner`;

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          messages: nextMessagesBase.map(m => ({ role: m.role, content: m.content })),
          context: businessContext || 'No business data available yet.',
          model,
          tone,
          customInstructions,
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        throw new Error(`Edge function error: ${errText}`);
      }

      // Create a placeholder assistant message for streaming
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
          if (dataPart === '{"done": true}') {
            continue;
          }
          try {
            const payload = JSON.parse(dataPart);
            if (payload.delta) {
              assistantContent += payload.delta;
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = { ...updated[lastIdx], content: assistantContent } as Message;
                }
                return updated;
              });
            }
          } catch (_) {
            // ignore non-JSON lines
          }
        }
      }

      setIsLoading(false);

      const assistantMsg: ChatMessage = { role: 'assistant', content: assistantContent, timestamp: new Date() };
      const fullConversation: ChatMessage[] = [...nextMessagesBase, assistantMsg];

      // Persist chat history to Supabase
      try {
        if (!sessionIdRef.current) {
          const sessionType = detectSessionType(location.pathname);
          const title = generateSessionTitle(userMessage.content, sessionType);
          const id = await saveChatSession(
            title, 
            fullConversation, 
            sessionType, 
            businessContext || undefined,
            undefined,
            undefined,
            currentCompany?.id
          );
          if (id) sessionIdRef.current = id;
        } else {
          await updateChatSession(sessionIdRef.current, fullConversation);
        }
        } catch (persistErr) {
          logger.warn('Failed to persist chat session:', persistErr);
        }
      } catch (error) {
        logger.error('Error sending message:', error);
        // Remove the empty assistant placeholder if streaming failed before any content arrived
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last?.content === '') {
            return prev.slice(0, -1);
          }
          return prev;
        });
        toast({
          title: 'Error',
          description: 'Failed to get response from AI. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto px-0 sm:px-2">
      {/* Business Context Indicator */}
      {businessData && (
        <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-muted border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
            <Database className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">
              <strong className="hidden sm:inline">{businessData.company.name}</strong>
              <strong className="sm:hidden">{businessData.company.name.substring(0, 20)}{businessData.company.name.length > 20 ? '...' : ''}</strong>
              <span className="hidden sm:inline"> • {businessData.summary.redMetricsCount} critical metrics, 
              {businessData.summary.overdueTasksCount} overdue tasks, {businessData.summary.openIssuesCount} open issues</span>
              <span className="sm:hidden"> • {businessData.summary.redMetricsCount + businessData.summary.overdueTasksCount + businessData.summary.openIssuesCount} items</span>
            </span>
          </div>
        </div>
      )}

      {/* Chat Messages Area */}
      <ScrollArea className="flex-1 px-3 sm:px-4 lg:px-6" ref={scrollAreaRef}>
        <div className="py-4 sm:py-6 lg:py-8 min-h-full">
          {messages.length === 0 ? (
            <div className="text-center py-4 sm:py-6 lg:py-16">
              <div className="mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground mb-2 sm:mb-3">
                  {businessData ? `Ready to analyze ${businessData.company.name}` : 'How can I help you today?'}
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed">
                  {businessData 
                    ? `I have access to your company's metrics, tasks, and team data. Ask me anything about your business performance.`
                    : 'Start a conversation or choose from the suggestions below'
                  }
                </p>
              </div>
              <SimplePromptSuggestions 
                onPromptSelect={handlePromptSelect} 
                hasBusinessData={!!businessData}
              />
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <SimpleChatMessage key={index} message={message} />
              ))}
              {isLoading && (
                <div className="flex justify-start max-w-4xl mx-auto">
                  <div className="bg-muted rounded-2xl px-3 sm:px-4 py-2 sm:py-3 max-w-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      <span className="text-xs sm:text-sm whitespace-nowrap">
                        <span className="hidden sm:inline">Analyzing {businessData?.company.name || 'your business'} data...</span>
                        <span className="sm:hidden">Analyzing...</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto mb-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex gap-2 items-center">
            <label className="text-xs text-muted-foreground">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-8 rounded-md border border-border text-xs px-2"
            >
              <option value="gpt-4.1-2025-04-14">gpt-4.1</option>
              <option value="gpt-4.1-mini-2025-04-14">gpt-4.1-mini</option>
              <option value="gpt-4o">gpt-4o</option>
            </select>
            <label className="text-xs text-muted-foreground ml-3">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as any)}
              className="h-8 rounded-md border border-border text-xs px-2"
            >
              <option value="neutral">Neutral</option>
              <option value="friendly">Friendly</option>
              <option value="direct">Direct</option>
              <option value="analytical">Analytical</option>
            </select>
          </div>
          {customInstructions && (
            <div className="text-xs text-muted-foreground truncate">Custom instructions active</div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3 items-end max-w-4xl mx-auto">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={businessData ? `Ask about ${businessData.company.name}'s metrics, tasks, or business performance...` : "Message AI..."}
              className="min-h-[40px] sm:min-h-[44px] max-h-[200px] resize-none border-border focus:border-primary focus:ring-primary rounded-xl text-sm sm:text-base"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="h-10 sm:h-11 px-3 sm:px-4 bg-primary hover:bg-primary/90 rounded-[6px] flex-shrink-0"
          >
            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
