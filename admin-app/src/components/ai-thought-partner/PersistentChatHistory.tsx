
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { History, MessageCircle, Trash2, BookOpen, Brain, BarChart3, Target, Users, AlertTriangle, Building } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  loadChatSessions, 
  deleteChatSession, 
  saveChatSession,
  ChatSession,
  ChatMessage as ChatMessageType
} from '@/services/aiChatHistoryService';
import { useToast } from '@/hooks/use-toast';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

interface PersistentChatHistoryProps {
  currentMessages: ChatMessageType[];
  onLoadSession: (messages: ChatMessageType[]) => void;
  currentSessionId?: string | null;
}

const sessionTypeIcons = {
  general: Brain,
  strategy: Target,
  metrics: BarChart3,
  goals: Target,
  tasks: Users,
  issues: AlertTriangle,
  org_chart: Building
};

const sessionTypeColors = {
  general: 'bg-primary/10 text-primary',
  strategy: 'bg-info/10 text-info',
  metrics: 'bg-accent/10 text-accent-foreground',
  goals: 'bg-success/10 text-success',
  tasks: 'bg-warning/10 text-warning',
  issues: 'bg-destructive/10 text-destructive',
  org_chart: 'bg-secondary text-secondary-foreground'
};

export const PersistentChatHistory: React.FC<PersistentChatHistoryProps> = ({ 
  currentMessages, 
  onLoadSession,
  currentSessionId 
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useMultiCompanyAccess();

  const loadSessions = async () => {
    setLoading(true);
    try {
      const loadedSessions = await loadChatSessions(currentCompany?.id);
      setSessions(loadedSessions);
    } catch (error) {
      logger.error('Error loading chat sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHistoryOpen) {
      loadSessions();
    }
  }, [isHistoryOpen, currentCompany?.id]);

  const handleSaveCurrentSession = async () => {
    if (currentMessages.length === 0) {
      toast({
        title: "No Messages",
        description: "Start a conversation before saving.",
        variant: "default"
      });
      return;
    }

    try {
      const title = currentMessages[0]?.content.slice(0, 50) + '...' || 'New Strategic Discussion';
      const sessionId = await saveChatSession(
        title,
        currentMessages,
        'general',
        `Saved ${new Date().toLocaleString()}`,
        undefined,
        undefined,
        currentCompany?.id
      );

      if (sessionId) {
        toast({
          title: "Session Saved",
          description: "Your conversation has been saved successfully.",
          variant: "default"
        });
        await loadSessions(); // Refresh the list
      } else {
        throw new Error('Failed to save session');
      }
    } catch (error) {
      logger.error('Error saving session:', error);
      toast({
        title: "Save Failed", 
        description: "Failed to save your conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const success = await deleteChatSession(sessionId);
      if (success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
        toast({
          title: "Session Deleted",
          description: "The conversation has been removed.",
          variant: "default"
        });
      } else {
        throw new Error('Delete operation failed');
      }
    } catch (error) {
      logger.error('Error deleting session:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLoadSession = (session: ChatSession) => {
    onLoadSession(session.messages);
    setIsHistoryOpen(false);
    toast({
      title: "Session Loaded",
      description: `Loaded "${session.title}"`,
      variant: "default"
    });
  };

  const groupSessionsByType = (sessions: ChatSession[]) => {
    const grouped = sessions.reduce((acc, session) => {
      const type = session.session_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(session);
      return acc;
    }, {} as Record<string, ChatSession[]>);

    return grouped;
  };

  const groupedSessions = groupSessionsByType(sessions);

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
          History ({sessions.length})
        </Button>
        
        {currentMessages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveCurrentSession}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Save
          </Button>
        )}
      </div>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Strategic Conversation History
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[60vh]">
            {/* Sessions List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Saved Conversations</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadSessions}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {Object.entries(groupedSessions).map(([type, typeSessions]) => {
                    const IconComponent = sessionTypeIcons[type as keyof typeof sessionTypeIcons];
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <IconComponent className="h-4 w-4" />
                          {type.replace('_', ' ').toUpperCase()}
                        </div>
                        
                        {typeSessions.map(session => (
                          <Card 
                            key={session.id} 
                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                              selectedSession?.id === session.id ? 'ring-2 ring-primary' : ''
                            }`}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-sm line-clamp-2 mb-1">
                                    {session.title}
                                  </CardTitle>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${sessionTypeColors[session.session_type as keyof typeof sessionTypeColors]}`}
                                    >
                                      {session.session_type}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {session.messages.length} msgs
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSession(session.id);
                                  }}
                                  className="p-1 h-auto text-destructive hover:text-destructive/80 ml-2"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent 
                              className="pt-0 cursor-pointer"
                              onClick={() => setSelectedSession(session)}
                            >
                              <p className="text-xs text-muted-foreground mb-2">
                                {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLoadSession(session);
                                  }}
                                  className="text-xs"
                                >
                                  Load
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSession(session);
                                  }}
                                  className="text-xs"
                                >
                                  Preview
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })}
                  
                  {sessions.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No saved conversations yet</p>
                      <p className="text-sm">Start a strategic discussion to save it here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Session Preview */}
            <div className="space-y-2">
              <h4 className="font-medium">Conversation Preview</h4>
              {selectedSession ? (
                <div className="h-full">
                  <div className="bg-muted/50 p-3 rounded-lg mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">{selectedSession.title}</h5>
                      <Badge 
                        className={`text-xs ${sessionTypeColors[selectedSession.session_type as keyof typeof sessionTypeColors]}`}
                      >
                        {selectedSession.session_type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedSession.messages.length} messages • 
                      Created {formatDistanceToNow(new Date(selectedSession.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[calc(100%-120px)]">
                    <div className="space-y-3">
                      {selectedSession.messages.map((message, index) => (
                        <div key={index} className={`p-3 rounded-lg ${
                          message.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted/50 mr-8'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-medium text-foreground/70">
                              {message.role === 'user' ? '👤 You' : '🤖 AI Strategist'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="text-sm line-clamp-6 text-foreground/80">
                            {message.content}
                          </div>
                          {message.context_used && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                📊 Business Data Used
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => handleLoadSession(selectedSession)}
                      className="flex-1"
                    >
                      Load This Conversation
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
