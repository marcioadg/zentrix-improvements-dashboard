import React from 'react';
import { cn } from '@/lib/utils';

interface BlockRendererProps {
  block: any;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ block }) => {
  const renderContent = () => {
    const text = block.content?.text || '';
    
    switch (block.type) {
      case 'heading1':
        return <h1 className="text-3xl font-bold">{text}</h1>;
      
      case 'heading2':
        return <h2 className="text-2xl font-bold">{text}</h2>;
      
      case 'heading3':
        return <h3 className="text-xl font-bold">{text}</h3>;
      
      case 'bulletList':
        return (
          <ul className="list-disc list-inside">
            <li>{text}</li>
          </ul>
        );
      
      case 'numberedList':
        return (
          <ol className="list-decimal list-inside">
            <li>{text}</li>
          </ol>
        );
      
      case 'checkList':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={block.content?.checked || false}
              readOnly
              className="rounded"
            />
            <span className={cn(block.content?.checked && 'line-through text-muted-foreground')}>
              {text}
            </span>
          </div>
        );
      
      case 'quote':
        return (
          <blockquote className="border-l-4 border-primary pl-4 italic">
            {text}
          </blockquote>
        );
      
      case 'callout':
        return (
          <div className={cn(
            'p-4 rounded-lg border-l-4',
            block.content?.calloutType === 'info' && 'bg-primary/5 border-blue-500 dark:bg-blue-950',
            block.content?.calloutType === 'warning' && 'bg-warning/5 border-yellow-500 dark:bg-yellow-950',
            block.content?.calloutType === 'success' && 'bg-success/5 border-green-500 dark:bg-green-950',
            block.content?.calloutType === 'error' && 'bg-destructive/5 border-red-500 dark:bg-red-950'
          )}>
            {block.content?.calloutIcon && (
              <span className="text-xl mr-2">{block.content.calloutIcon}</span>
            )}
            {text}
          </div>
        );
      
      case 'divider':
        return <hr className="border-t my-4" />;
      
      case 'paragraph':
      default:
        return <p>{text || '\u00A0'}</p>;
    }
  };

  return (
    <div className="py-1">
      {renderContent()}
    </div>
  );
};
