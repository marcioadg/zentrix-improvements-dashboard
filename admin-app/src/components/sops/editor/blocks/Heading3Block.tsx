import React from 'react';
import { Input } from '@/components/ui/input';
import { SopBlock } from '@/types/sops';

interface Heading3BlockProps {
  block: SopBlock;
  onChange: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export const Heading3Block: React.FC<Heading3BlockProps> = ({
  block,
  onChange,
  onKeyDown,
  inputRef,
}) => {
  return (
    <Input
      ref={inputRef}
      type="text"
      value={block.content.text || ''}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Heading 3"
      className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0"
    />
  );
};
