import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Loader2, BarChart3, Brain, RefreshCw, History, Settings, TrendingUp, Target, AlertTriangle, Sparkles, Building2, User } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { EnhancedQuickPrompts } from './EnhancedQuickPrompts';
import { CustomPromptManager } from './CustomPromptManager';
import { CustomInstructionsManager } from './CustomInstructionsManager';
import { PersistentChatHistory } from './PersistentChatHistory';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStrategicBusinessData } from '@/hooks/useStrategicBusinessData';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useCustomInstructions } from '@/hooks/useCustomInstructions';
import { 
  saveChatSession, 
  detectSessionType, 
  generateSessionTitle,
  ChatMessage as ChatMessageType
} from '@/services/aiChatHistoryService';
import { useLocation } from 'react-router-dom';
import { isNativeApp } from '@/utils/platformDetection';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';
import { logger } from '@/utils/logger';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context_used?: boolean;
  page_context?: string;
}

export const ThoughtPartnerChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const [activeTab, setActiveTab] = useState('quick');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { toast } = useToast();
  
  const { 
    data: strategicData, 
    loading: dataLoading, 
    fetchStrategicData,
    refreshData,
    getFormattedDataForAI,
    currentCompany,
    userRole
  } = useStrategicBusinessData();

  const {
    getFormattedInstructions,
    hasInstructions
  } = useCustomInstructions();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Load initial strategic data
  useEffect(() => {
    fetchStrategicData();
  }, [fetchStrategicData]);

  const sendMessage = async (content: string, includeBusinessData: boolean = false) => {
    if (!content.trim() || isLoading) return;

    const currentRoute = location.pathname;
    const pageContext = detectPageContext(currentRoute);

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      context_used: includeBusinessData,
      page_context: pageContext
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowPrompts(false);

    try {
      let contextData = '';
      let freshStrategicData = strategicData;
      
      if (includeBusinessData) {
        // Refresh data before analysis
        freshStrategicData = await refreshData();
        if (freshStrategicData) {
          contextData = getFormattedDataForAI(freshStrategicData);
          logger.log('📊 Company-scoped strategic business data loaded for AI:', {
            company: freshStrategicData.company.name,
            userLevel: freshStrategicData.userContext.level,
            healthScore: freshStrategicData.metrics.healthScore,
            constraints: freshStrategicData.insights.topConstraints.length,
            accessibleTeams: freshStrategicData.userContext.accessibleTeams.length
          });
        } else {
          toast({
            title: "Limited Data Available",
            description: "Some business data may not be available for your current role level.",
            variant: "default"
          });
        }
      }

      // Get custom instructions
      const customInstructions = getFormattedInstructions({
        pageContext,
        currentRoute
      });

      // Enhanced system prompt with company scoping and role-based focus
      let systemPrompt = `You are a senior business strategist and AI thought partner for the Business Operating System (BOS). 

CURRENT USER CONTEXT:
- Company: ${currentCompany?.name || 'Unknown'}
- User Role: ${userRole?.role || 'member'} (${userRole?.level || 'member'} level)
- Page Context: ${pageContext}
- Data Scope: ${includeBusinessData ? 'Company-scoped business intelligence' : 'No business data - provide framework-based guidance'}

ROLE-BASED GUIDANCE:
${userRole?.level === 'executive' ? `
- Focus on strategic planning, organizational constraints, and growth levers
- Provide cross-functional insights and high-level recommendations
- Use Theory of Constraints methodology for strategic analysis
- Address leadership challenges and decision-making frameworks
` : userRole?.level === 'manager' ? `
- Focus on team performance, execution challenges, and tactical improvements
- Provide insights on team metrics, goal achievement, and issue resolution
- Address management challenges and team optimization
- Connect team performance to broader company objectives
` : `
- Focus on individual productivity, task management, and personal development
- Provide actionable advice for personal goal achievement
- Address individual challenges within team context
- Suggest ways to contribute effectively to team and company goals
`}

RESPONSE STYLE:
- Be concise but comprehensive (3-5 bullet points maximum)
- Bold key insights and metrics relevant to user's role level
- Ask ONE strategic question appropriate to user's authority level
- End with clear next action or recommendation within user's scope
- Tailor complexity and scope to user's role and access level`;

      // Add custom instructions if they exist
      if (customInstructions.trim()) {
        systemPrompt += `\\n\\n=== CUSTOM USER INSTRUCTIONS ===\\n${customInstructions}\\n=== END CUSTOM INSTRUCTIONS ===`;
        logger.log('✨ Custom instructions included in AI prompt');
      }

      // Add business data if included
      if (includeBusinessData && contextData) {
        systemPrompt += `\\n\\n=== COMPANY-SCOPED BUSINESS INTELLIGENCE ===\\n${contextData}\\n\\n=== END BUSINESS DATA ===`;
      }

      // Determine platform for Apple compliance headers (includes iPad browsers)
      const platformHeader = isNativeApp() ? 'ios' : (isMobileOrTabletDevice() ? 'mobile' : undefined);

      const { data, error } = await supabase.functions.invoke('ai-thought-partner', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          context: systemPrompt
        },
        headers: platformHeader ? { 'x-client-platform': platformHeader } : undefined
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        context_used: includeBusinessData,
        page_context: pageContext
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-save chat session after first exchange (company-scoped)
      if (messages.length === 0) {
        const sessionType = detectSessionType(currentRoute);
        const title = generateSessionTitle(content, sessionType);
        const sessionId = await saveChatSession(
          title,
          [userMessage, assistantMessage] as ChatMessageType[],
          sessionType,
          includeBusinessData ? contextData : undefined,
          undefined,
          undefined,
          currentCompany?.id
        );
        if (sessionId) {
          setCurrentSessionId(sessionId);
        }
      }

    } catch (error) {
      logger.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const detectPageContext = (pathname: string): string => {
    if (pathname.includes('/strategy')) return 'Strategy Planning';
    if (pathname.includes('/metrics')) return 'Metrics Dashboard';
    if (pathname.includes('/goals')) return 'Goals Management';
    if (pathname.includes('/tasks')) return 'Task Management';
    if (pathname.includes('/issues')) return 'Issues Tracking';
    if (pathname.includes('/org-chart')) return 'Organizational Chart';
    return 'AI Thought Partner';
  };

  const handleAnalyzeData = async () => {
    if (!userRole?.permissions.canViewStrategicInsights) {
      toast({
        title: "Access Limited",
        description: "Strategic analysis is available to management level and above.",
        variant: "default"
      });
      return;
    }

    const currentPage = detectPageContext(location.pathname);
    const analysisPrompt = `Analyze my current business performance with focus on ${currentPage.toLowerCase()}. Provide strategic insights appropriate to my ${userRole.level} level role and recommend specific actions within my scope.`;
    await sendMessage(analysisPrompt, true);
  };

  const handleConstraintAnalysis = async () => {
    if (!userRole?.permissions.canAccessConstraintAnalysis) {
      toast({
        title: "Access Limited",
        description: "Constraint analysis is available to executive level only.",
        variant: "default"
      });
      return;
    }

    const constraintPrompt = "Using Theory of Constraints methodology, analyze my current data and identify the #1 constraint limiting 10X profit growth. What specific actions should I take to elevate this constraint?";
    await sendMessage(constraintPrompt, true);
  };

  const handleTrendAnalysis = async () => {
    const trendPrompt = "Analyze the trends in my metrics over the past 13 weeks. What patterns do you see? Which metrics show concerning trends and what might be causing them?";
    await sendMessage(trendPrompt, true);
  };

  const handleHealthCheck = async () => {
    const healthPrompt = "Give me a comprehensive business health check across all areas. What's working well, what needs attention, and what are my top 3 strategic priorities?";
    await sendMessage(healthPrompt, true);
  };

  const regenerateResponse = async () => {
    if (messages.length === 0 || isLoading) return;
    
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    const messagesWithoutLastAssistant = messages.filter((m, index) => 
      !(index === messages.length - 1 && m.role === 'assistant')
    );
    
    setMessages(messagesWithoutLastAssistant);
    await sendMessage(lastUserMessage.content, lastUserMessage.context_used || false);
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    setShowPrompts(false);
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

  const clearChat = () => {
    setMessages([]);
    setShowPrompts(true);
    setCurrentSessionId(null);
  };

  const loadChatSession = (sessionMessages: ChatMessageType[]) => {
    const convertedMessages: Message[] = sessionMessages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    setMessages(convertedMessages);
    setShowPrompts(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Enhanced Status Bar with Company and Role Context */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 border-b p-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-medium">
              <Building2 className="h-4 w-4 text-primary" />
              {currentCompany?.name || 'No Company'}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4 text-primary dark:text-primary" />
              {userRole?.level || 'member'} level
            </span>
            {strategicData && (
              <>
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Health: <strong>{strategicData.metrics.healthScore.toFixed(0)}/100</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-success" />
                  Goals: <strong>{strategicData.goals.overallProgress.toFixed(0)}%</strong>
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Issues: <strong>{strategicData.issues.unresolved.length}</strong>
                </span>
              </>
            )}
            {hasInstructions() && (
              <span className="flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-primary dark:text-primary" />
                <strong>Custom Instructions Active</strong>
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Context: {detectPageContext(location.pathname)} | Teams: {strategicData?.userContext.accessibleTeams.length || 0}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {messages.length === 0 && showPrompts ? (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Strategic AI Thought Partner</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-2">
                  I analyze your company-scoped business intelligence to provide insights appropriate to your {userRole?.level || 'member'} level role.
                  {userRole && (
                    <span className="block mt-2 text-sm text-primary">
                      📊 Access Level: {userRole.level} | Company: {currentCompany?.name} | Teams: {strategicData?.userContext.accessibleTeams.length || 0}
                    </span>
                  )}
                </p>
                {hasInstructions() && (
                  <p className="text-primary dark:text-primary font-medium text-sm">
                    ✨ Your custom instructions are active and will guide all responses.
                  </p>
                )}
                
                {/* Role-appropriate Quick Action Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 mt-6">
                  {userRole?.permissions.canAccessConstraintAnalysis && (
                    <Button 
                      onClick={handleConstraintAnalysis}
                      disabled={dataLoading}
                      className="flex items-center gap-2 h-auto py-3 px-4 flex-col"
                      variant="default"
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-xs">10X Constraint Analysis</span>
                    </Button>
                  )}
                  {userRole?.permissions.canViewStrategicInsights && (
                    <Button 
                      onClick={handleTrendAnalysis}
                      disabled={dataLoading}
                      className="flex items-center gap-2 h-auto py-3 px-4 flex-col"
                      variant="outline"
                    >
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-xs">Trend Analysis</span>
                    </Button>
                  )}
                  <Button 
                    onClick={handleHealthCheck}
                    disabled={dataLoading}
                    className="flex items-center gap-2 h-auto py-3 px-4 flex-col"
                    variant="outline"
                  >
                    <Brain className="h-5 w-5" />
                    <span className="text-xs">Health Check</span>
                  </Button>
                  <Button 
                    onClick={handleAnalyzeData}
                    disabled={dataLoading}
                    className="flex items-center gap-2 h-auto py-3 px-4 flex-col"
                    variant="outline"
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-xs">{dataLoading ? 'Loading...' : 'Analyze Data'}</span>
                  </Button>
                </div>

                {/* Role-based Insights Preview */}
                {strategicData && strategicData.insights.topConstraints.length > 0 && (
                  <div className="bg-warning/10 border border-warning/30 dark:border-warning/20 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-warning-foreground dark:text-warning mb-2">
                      {userRole?.level === 'executive' ? '⚡ Top Strategic Constraint' :
                       userRole?.level === 'manager' ? '📋 Team Focus Area' : '✅ Your Focus Area'}
                    </h4>
                    <p className="text-sm text-warning-foreground dark:text-warning/80">{strategicData.insights.topConstraints[0]}</p>
                  </div>
                )}
              </div>
              
              {/* Tabbed Prompts Interface */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="quick">Strategic Prompts</TabsTrigger>
                  <TabsTrigger value="custom">Custom Prompts</TabsTrigger>
                  <TabsTrigger value="instructions" className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Instructions
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="quick">
                  <EnhancedQuickPrompts onPromptSelect={handlePromptSelect} />
                </TabsContent>
                <TabsContent value="custom">
                  <CustomPromptManager onPromptSelect={handlePromptSelect} />
                </TabsContent>
                <TabsContent value="instructions">
                  <CustomInstructionsManager />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <Card className="p-4 bg-background border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {dataLoading ? 'Analyzing your business intelligence...' : 'Thinking strategically...'}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Enhanced Input Area */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasInstructions() 
                ? "Ask me anything - your custom instructions will guide my responses..." 
                : "Ask me about strategy, constraints, trends, or any business challenge..."
              }
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <div className="flex flex-col gap-2">
              <Button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="px-4"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => sendMessage(input, true)}
                disabled={!input.trim() || isLoading}
                title="Send with full business intelligence"
                className="text-xs"
              >
                <BarChart3 className="h-3 w-3" />
              </Button>
            </div>
          </form>
          
          {/* Enhanced Control Buttons */}
          <div className="flex gap-2 mt-2 items-center justify-between">
            <div className="flex gap-2">
              {!showPrompts && messages.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPrompts(true)}
                    className="text-xs"
                  >
                    Show prompts
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleConstraintAnalysis}
                    disabled={dataLoading || isLoading}
                    className="text-xs"
                  >
                    🔍 Find constraint
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={regenerateResponse}
                    disabled={isLoading || messages.length === 0}
                    className="text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearChat}
                    className="text-xs"
                  >
                    Clear chat
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {strategicData && (
                <span className="text-xs text-muted-foreground">
                  📊 {strategicData.metrics.trends.length} metrics analyzed
                </span>
              )}
              {hasInstructions() && (
                <span className="text-xs text-primary dark:text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Custom instructions active
                </span>
              )}
              <PersistentChatHistory 
                currentMessages={messages as ChatMessageType[]}
                onLoadSession={loadChatSession}
                currentSessionId={currentSessionId}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
