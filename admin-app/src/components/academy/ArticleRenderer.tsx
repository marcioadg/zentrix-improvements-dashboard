import React from 'react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';

interface ArticleRendererProps {
  content: string;
}

export const ArticleRenderer: React.FC<ArticleRendererProps> = ({ content }) => {
  return (
    <div className="article-content space-y-4">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-h2 font-bold mb-6 mt-8 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-h3 font-semibold mb-4 mt-6">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-h4 font-semibold mb-3 mt-5">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-body text-foreground leading-relaxed mb-4">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 ml-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-body text-foreground leading-relaxed">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 italic text-muted-foreground bg-muted/30 rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
        }}
      >
        {DOMPurify.sanitize(content)}
      </ReactMarkdown>
    </div>
  );
};