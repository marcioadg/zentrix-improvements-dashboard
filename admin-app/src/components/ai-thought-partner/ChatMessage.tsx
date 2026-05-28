
import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  };
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <Avatar className="h-8 w-8 bg-primary">
          <AvatarFallback>
            <Brain className="h-4 w-4 text-primary-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <Card className={`max-w-[80%] p-4 ${
        isUser 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-background border border-border'
      }`}>
        <div className={`text-sm leading-relaxed ${
          isUser ? 'text-primary-foreground' : 'text-foreground'
        }`}>
          {isUser ? (
            <div className="whitespace-pre-wrap">
              {message.content}
            </div>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                h3: ({ children }) => <h3 className="font-semibold text-base mb-2">{children}</h3>,
                h4: ({ children }) => <h4 className="font-medium text-sm mb-1">{children}</h4>,
                code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                a: ({ href, children }) => (
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
        <div className={`text-xs mt-2 ${
          isUser ? 'text-primary-foreground' : 'text-muted-foreground'
        }`}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </Card>

      {isUser && (
        <Avatar className="h-8 w-8 bg-muted-foreground">
          <AvatarFallback>
            <User className="h-4 w-4 text-primary-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
