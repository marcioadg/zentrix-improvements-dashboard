import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Type 
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import DOMPurify from 'dompurify';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Add a description...',
  maxLength = 200,
  className
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = React.useState('paragraph');

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // SECURITY FIX: Sanitize HTML before setting innerHTML to prevent XSS
      // DOMPurify removes malicious scripts while preserving safe formatting
      const sanitizedValue = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'ul', 'ol', 'li', 'p', 'br', 'strong', 'em', 'span', 'div'],
        ALLOWED_ATTR: ['style', 'class'],
      });
      editorRef.current.innerHTML = sanitizedValue;
    }
  }, [value]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      const text = editorRef.current.innerText;
      
      if (text.length <= maxLength) {
        onChange(content);
      } else {
        // Prevent exceeding max length
        const truncated = text.substring(0, maxLength);
        editorRef.current.innerText = truncated;
        onChange(editorRef.current.innerHTML);
      }
    }
  };

  const handleFormat = (formatType: string) => {
    setFormat(formatType);
    
    switch (formatType) {
      case 'heading1':
        execCommand('formatBlock', '<h1>');
        break;
      case 'heading2':
        execCommand('formatBlock', '<h2>');
        break;
      case 'heading3':
        execCommand('formatBlock', '<h3>');
        break;
      case 'paragraph':
        execCommand('formatBlock', '<p>');
        break;
    }
  };

  const handleInput = () => {
    updateContent();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const currentLength = editorRef.current?.innerText.length || 0;

  return (
    <div className={cn('border-2 border-input rounded-md overflow-hidden hover:border-input/80 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-200', className)}>
      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/30 border-b border-border">
          <Select value={format} onValueChange={handleFormat}>
            <SelectTrigger className="w-32 h-8">
              <Type size={14} className="mr-1" />
              <SelectValue placeholder="Normal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Normal</SelectItem>
              <SelectItem value="heading1">Heading 1</SelectItem>
              <SelectItem value="heading2">Heading 2</SelectItem>
              <SelectItem value="heading3">Heading 3</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Bold"
                onClick={() => execCommand('bold')}
              >
                <Bold size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold (Ctrl+B)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Italic"
                onClick={() => execCommand('italic')}
              >
                <Italic size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic (Ctrl+I)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Underline"
                onClick={() => execCommand('underline')}
              >
                <Underline size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Underline (Ctrl+U)</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Bullet list"
                onClick={() => execCommand('insertUnorderedList')}
              >
                <List size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bullet List</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Numbered list"
                onClick={() => execCommand('insertOrderedList')}
              >
                <ListOrdered size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Numbered List</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-[120px] max-h-[200px] overflow-y-auto px-3 py-2 text-sm focus:outline-none"
        data-placeholder={placeholder}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
      />

      <div className="px-3 py-1 bg-muted/20 border-t border-border">
        <p className={cn(
          'text-xs transition-colors',
          currentLength > maxLength ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {currentLength}/{maxLength} characters
        </p>
      </div>

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          opacity: 0.6;
        }
        [contenteditable] h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0.5rem 0;
        }
        [contenteditable] h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.4rem 0;
        }
        [contenteditable] h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0.3rem 0;
        }
        [contenteditable] p {
          margin: 0.25rem 0;
        }
        [contenteditable] ul, [contenteditable] ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        [contenteditable] li {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
};
