import React, { useState, useEffect, useRef } from 'react';
import { BlockType } from '@/types/sops';
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3,
  List, 
  ListOrdered, 
  CheckSquare,
  ChevronRight,
  Quote,
  MessageSquare,
  Minus 
} from 'lucide-react';

interface SlashMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

const BLOCK_TYPES: Array<{ type: BlockType; label: string; icon: React.ReactNode; description: string }> = [
  { type: 'paragraph', label: 'Paragraph', icon: <Type className="h-4 w-4" />, description: 'Plain text' },
  { type: 'heading1', label: 'Heading 1', icon: <Heading1 className="h-4 w-4" />, description: 'Large heading' },
  { type: 'heading2', label: 'Heading 2', icon: <Heading2 className="h-4 w-4" />, description: 'Medium heading' },
  { type: 'heading3', label: 'Heading 3', icon: <Heading3 className="h-4 w-4" />, description: 'Small heading' },
  { type: 'bulletList', label: 'Bullet List', icon: <List className="h-4 w-4" />, description: 'Unordered list' },
  { type: 'numberedList', label: 'Numbered List', icon: <ListOrdered className="h-4 w-4" />, description: 'Ordered list' },
  { type: 'checkList', label: 'Check List', icon: <CheckSquare className="h-4 w-4" />, description: 'To-do list' },
  { type: 'toggleList', label: 'Toggle List', icon: <ChevronRight className="h-4 w-4" />, description: 'Collapsible list' },
  { type: 'quote', label: 'Quote', icon: <Quote className="h-4 w-4" />, description: 'Quotation block' },
  { type: 'callout', label: 'Callout', icon: <MessageSquare className="h-4 w-4" />, description: 'Highlighted box' },
  { type: 'divider', label: 'Divider', icon: <Minus className="h-4 w-4" />, description: 'Visual separator' },
];

export const SlashMenu: React.FC<SlashMenuProps> = ({ isOpen, position, onSelect, onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredBlocks = BLOCK_TYPES.filter(block =>
    block.label.toLowerCase().includes(filter.toLowerCase()) ||
    block.description.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredBlocks.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredBlocks.length) % filteredBlocks.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredBlocks[selectedIndex]) {
          onSelect(filteredBlocks[selectedIndex].type);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredBlocks, onSelect, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      <div className="max-h-80 overflow-y-auto">
        {filteredBlocks.map((block, index) => (
          <button
            key={block.type}
            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors ${
              index === selectedIndex ? 'bg-accent' : ''
            }`}
            onClick={() => onSelect(block.type)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="text-muted-foreground">{block.icon}</div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-foreground">{block.label}</div>
              <div className="text-xs text-muted-foreground">{block.description}</div>
            </div>
          </button>
        ))}
        {filteredBlocks.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No matching blocks
          </div>
        )}
      </div>
    </div>
  );
};
