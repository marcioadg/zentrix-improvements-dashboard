import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { SopBlock } from '@/types/sops';

interface QuoteBlockProps {
  block: SopBlock;
  onChange: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  block,
  onChange,
  onKeyDown,
  inputRef,
}) => {
  return (
    <div className="border-l-4 border-primary pl-4 py-2 bg-muted/30">
      <Textarea
        ref={inputRef}
        value={block.content.text || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Quote"
        className="min-h-[60px] border-none shadow-none px-0 italic text-muted-foreground focus-visible:ring-0 resize-none"
      />
    </div>
  );
};
