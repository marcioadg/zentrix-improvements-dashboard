
import React from 'react';
import { Target, TrendingUp, CheckCircle2, AlertTriangle, Crosshair, Bell } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  // 'system' is rendered as a small event divider (used for scheduled-task
  // notifications), not a chat bubble.
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[]; // Base64 URLs for user-attached images
  // Tool failures captured during this assistant turn (Agent mode only).
  toolFailures?: Array<{ tool: string; error: string }>;
}

interface SimpleChatMessageProps {
  message: Message;
}

const getSectionIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('scope')) return <Crosshair className="w-4 h-4" />;
  if (lower.includes('reality') || lower.includes('current')) return <TrendingUp className="w-4 h-4" />;
  if (lower.includes('alignment') || lower.includes('goal')) return <Target className="w-4 h-4" />;
  if (lower.includes('action') || lower.includes('recommend')) return <CheckCircle2 className="w-4 h-4" />;
  if (lower.includes('risk') || lower.includes('blind')) return <AlertTriangle className="w-4 h-4" />;
  return null;
};

export const SimpleChatMessage: React.FC<SimpleChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // System messages = event-style dividers (e.g. "🔔 Scheduled task ran"),
  // NOT chat bubbles. Centered, muted, with a small icon. This is the
  // pattern Slack / Discord / Linear use for non-conversational events.
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-border/60 max-w-[80%]">
          <Bell className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{message.content}</span>
          <span className="text-muted-foreground/70 flex-shrink-0">·</span>
          <span className="text-muted-foreground/70 flex-shrink-0">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%]`}>
        <div
          className={`rounded-2xl ${
            isUser
              ? 'bg-muted text-foreground ml-auto px-5 py-3'
              : 'bg-card shadow-sm'
          }`}
        >
          {/* Tool failures for assistant turns — small inline warnings so
              users can see exactly which read/write attempt didn't work. */}
          {!isUser && message.toolFailures && message.toolFailures.length > 0 && (
            <div className="px-5 pt-3 pb-1 space-y-1.5">
              {message.toolFailures.map((failure, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-md px-3 py-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">Couldn't run {failure.tool}:</span>
                    <span className="ml-1 text-muted-foreground break-words">
                      {failure.error}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className={`${isUser ? 'text-sm' : 'text-base'} leading-relaxed`}>
            {isUser ? (
              <div className="space-y-3">
                {/* Display attached images */}
                {message.images && message.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {message.images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        alt={`Attached image ${idx + 1}`} 
                        className="max-w-xs max-h-48 rounded-lg object-cover border border-border"
                      />
                    ))}
                  </div>
                )}
                {/* Display text content (hide placeholder if only image) */}
                {message.content !== '[Image attached]' && (
                  <div className="whitespace-pre-wrap font-medium">
                    {message.content}
                  </div>
                )}
              </div>
            ) : (
              <ReactMarkdown
                components={{
                  p: ({ children }) => {
                    const text = String(children);
                    // Check if this is a section header (ends with :)
                    if (text.match(/^\*\*\d\.\s+\*\*(.*?)\*\*$/)) {
                      return null; // Skip, will be handled by strong
                    }
                    return <p className="mb-3 last:mb-0 text-foreground leading-relaxed">{children}</p>;
                  },
                  strong: ({ children }) => {
                    const text = String(children);
                    // Check if this is a numbered section header
                    const sectionMatch = text.match(/^(\d+)\.\s+(.+)$/);
                    
                    if (sectionMatch) {
                      const [, , title] = sectionMatch;
                      const icon = getSectionIcon(title);
                      
                      return (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-muted/30 mb-3 mt-4 first:mt-0">
                          {icon}
                          <span className="font-semibold text-base text-foreground">
                            {title}
                          </span>
                        </div>
                      );
                    }
                    
                    return <strong className="font-semibold text-foreground">{children}</strong>;
                  },
                  ul: ({ children }) => (
                    <ul className="space-y-2 mb-3 ml-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="space-y-2 mb-3 ml-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => {
                    return (
                      <li className="text-sm leading-relaxed pl-2 text-foreground">
                        <span className="inline-flex items-baseline gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 bg-muted-foreground" />
                          <span className="flex-1">{children}</span>
                        </span>
                      </li>
                    );
                  },
                  h3: ({ children }) => (
                    <h3 className="font-semibold text-lg mb-2 text-foreground mt-4">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="font-medium text-base mb-2 text-foreground mt-3">
                      {children}
                    </h4>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted border border-border px-2 py-0.5 rounded text-xs font-mono text-foreground">
                      {children}
                    </code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/50 italic text-muted-foreground my-3 rounded-r">
                      {children}
                    </blockquote>
                  ),
                  em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
                  a: ({ href, children }) => (
                    // Open every chat-rendered link in a new tab so OAuth
                    // connect flows (and any external link the agent emits)
                    // don't hijack the chat tab. noopener prevents the new
                    // tab from navigating us via window.opener — a side
                    // effect is that /oauth-result can't postMessage back,
                    // so the chat won't auto-refresh on connect; the user
                    // just asks the agent again and the saved token works.
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5 px-2 flex items-center gap-2">
          <span>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    </div>
  );
};
