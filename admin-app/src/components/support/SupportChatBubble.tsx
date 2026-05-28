import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FileText, Download } from 'lucide-react';

interface SupportChatBubbleProps {
  content: string;
  senderType: 'customer' | 'admin';
  createdAt: string;
  senderName?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  /** When true, admin messages appear on the right and customer on the left (for admin view). */
  invertSides?: boolean;
}

export const SupportChatBubble: React.FC<SupportChatBubbleProps> = ({
  content,
  senderType,
  createdAt,
  senderName,
  attachmentUrl,
  attachmentName,
  attachmentType,
  invertSides = false,
}) => {
  const isRight = invertSides ? senderType === 'admin' : senderType === 'customer';
  const isImage = attachmentType?.startsWith('image/');

  return (
    <div className={cn('flex flex-col gap-1 max-w-[85%]', isRight ? 'self-end items-end' : 'self-start items-start')}>
      {senderName && !isRight && (
        <span className="text-[10px] text-muted-foreground font-medium px-1">{senderName}</span>
      )}
      <div
        className={cn(
          'rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words',
          isRight
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        {/* Attachment */}
        {attachmentUrl && (
          <div className="mb-1.5">
            {isImage ? (
              <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={attachmentUrl}
                  alt={attachmentName || 'Attachment'}
                  className="max-w-[240px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </a>
            ) : (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                  isRight
                    ? 'bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground'
                    : 'bg-background hover:bg-background/80 text-foreground'
                )}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate max-w-[160px]">{attachmentName || 'File'}</span>
                <Download className="h-3.5 w-3.5 shrink-0 ml-auto" />
              </a>
            )}
          </div>
        )}
        {content && <span className="whitespace-pre-wrap">{content}</span>}
      </div>
      <span className="text-[10px] text-muted-foreground px-1">
        {format(new Date(createdAt), 'HH:mm')}
      </span>
    </div>
  );
};
