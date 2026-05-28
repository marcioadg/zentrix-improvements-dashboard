import React, { useRef, useEffect, useState } from 'react';
import { SopBlock, BlockContent } from '@/types/sops';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Heading3Block } from './blocks/Heading3Block';
import { ToggleListBlock } from './blocks/ToggleListBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { CalloutBlock } from './blocks/CalloutBlock';

interface BlockProps {
  block: SopBlock;
  index: number;
  onChange: (content: BlockContent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSlashCommand: (position: { top: number; left: number }) => void;
  onTextSelect: (position: { top: number; left: number }) => void;
  autoFocus?: boolean;
}

export const Block: React.FC<BlockProps> = ({
  block,
  index,
  onChange,
  onKeyDown,
  onSlashCommand,
  onTextSelect,
  autoFocus
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const content = block.content || {};
  
  // Local state for smooth typing
  const [localContent, setLocalContent] = useState(content.text || '');

  // Sync external changes to local state
  useEffect(() => {
    setLocalContent(content.text || '');
  }, [content.text]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (value: string) => {
    setLocalContent(value); // Instant local update
    onChange({ ...content, text: value }); // Immediate parent update (will be debounced at hook level)

    // Detect slash command
    if (value.endsWith('/') && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      onSlashCommand({ top: rect.bottom + 4, left: rect.left });
    }
  };

  const handleSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0 && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const range = selection.getRangeAt(0);
      const rangeRect = range.getBoundingClientRect();
      onTextSelect({ top: rangeRect.top - 40, left: rangeRect.left });
    }
  };

  const commonClasses = "w-full border-0 bg-transparent focus:outline-none focus:ring-0 px-0";

  switch (block.type) {
    case 'heading1':
      return (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          className={`${commonClasses} text-3xl font-bold py-2`}
          value={localContent}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={onKeyDown}
          onSelect={handleSelect}
          placeholder="Heading 1"
        />
      );

    case 'heading2':
      return (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          className={`${commonClasses} text-2xl font-semibold py-2`}
          value={localContent}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={onKeyDown}
          onSelect={handleSelect}
          placeholder="Heading 2"
        />
      );

    case 'heading3':
      return (
        <Heading3Block
          block={block}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          inputRef={inputRef as React.RefObject<HTMLInputElement>}
        />
      );

    case 'bulletList':
      return (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground mt-2">•</span>
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className={`${commonClasses} resize-none`}
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={handleSelect}
            placeholder="List item"
            rows={1}
          />
        </div>
      );

    case 'numberedList':
      return (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground mt-2">{index + 1}.</span>
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className={`${commonClasses} resize-none`}
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={handleSelect}
            placeholder="List item"
            rows={1}
          />
        </div>
      );

    case 'checkList':
      return (
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={content.checked || false}
            onChange={(e) => onChange({ ...content, checked: e.target.checked })}
            className="mt-2"
          />
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className={`${commonClasses} resize-none ${content.checked ? 'line-through text-muted-foreground' : ''}`}
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={handleSelect}
            placeholder="To-do"
            rows={1}
          />
        </div>
      );

    case 'toggleList':
      return (
        <ToggleListBlock
          block={block}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onToggle={() => onChange({ ...content, collapsed: !content.collapsed })}
          inputRef={inputRef as React.RefObject<HTMLInputElement>}
        />
      );

    case 'quote':
      return (
        <QuoteBlock
          block={block}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
        />
      );

    case 'callout':
      return (
        <CalloutBlock
          block={block}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onTypeChange={(type) => onChange({ ...content, calloutType: type })}
          inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
        />
      );

    case 'divider':
      return <hr className="border-border my-4" />;

    case 'paragraph':
    default:
      return (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          className={`${commonClasses} resize-none`}
          value={localContent}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={onKeyDown}
          onSelect={handleSelect}
          placeholder="Type '/' for commands"
          rows={1}
        />
      );
  }
};
