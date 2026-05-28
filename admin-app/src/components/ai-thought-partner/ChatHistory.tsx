
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, MessageCircle, Trash2, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/logger';
import { safeStorage } from '@/utils/safeStorage';

interface ChatSession {
  id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatHistoryProps {
  currentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  onLoadSession: (messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ currentMessages, onLoadSession }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  // Load sessions from localStorage
  useEffect(() => {
    const savedSessions = safeStorage.getItem('chatSessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        })));
      } catch (error) {
        logger.error('Error loading chat sessions:', error);
      }
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    safeStorage.setItem('chatSessions', JSON.stringify(sessions));
  }, [sessions]);

  const saveCurrentSession = () => {
    if (currentMessages.length === 0) return;

    const title = currentMessages[0]?.content.slice(0, 50) + '...' || 'New Chat';
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title,
      messages: currentMessages,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSessions(prev => [newSession, ...prev.slice(0, 19)]); // Keep only last 20 sessions
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const loadSession = (session: ChatSession) => {
    onLoadSession(session.messages);
    setIsHistoryOpen(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsHistoryOpen(true)}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          Chat History
        </Button>
        
        {currentMessages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={saveCurrentSession}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Save Chat
          </Button>
        )}
      </div>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Chat History</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[60vh]">
            {/* Sessions List */}
            <div className="space-y-2">
              <h4 className="font-medium">Saved Conversations</h4>
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {sessions.map(session => (
                    <Card key={session.id} className="cursor-pointer hover:bg-state-hover">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm line-clamp-2">{session.title}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                            className="p-1 h-auto text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent 
                        className="pt-0"
                        onClick={() => setSelectedSession(session)}
                      >
                        <p className="text-xs text-muted-foreground">
                          {session.messages.length} messages • {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadSession(session);
                            }}
                          >
                            Load
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {sessions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No saved conversations yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Session Preview */}
            <div className="space-y-2">
              <h4 className="font-medium">Preview</h4>
              {selectedSession ? (
                <ScrollArea className="h-full">
                  <div className="space-y-3">
                    {selectedSession.messages.map((message, index) => (
                      <div key={index} className={`p-3 rounded-lg ${
                        message.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'
                      }`}>
                        <div className="text-xs text-muted-foreground mb-1">
                          {message.role === 'user' ? 'You' : 'AI'} • {message.timestamp.toLocaleTimeString()}
                        </div>
                        <div className="text-sm line-clamp-4">
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a conversation to preview
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
