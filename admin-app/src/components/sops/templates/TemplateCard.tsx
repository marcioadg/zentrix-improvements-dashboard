import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Copy, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  template: any;
  onPreview: () => void;
  onUse: () => void;
  isUsing?: boolean;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
  onUse,
  isUsing,
}) => {
  return (
    <div className="group border rounded-lg overflow-hidden hover:shadow-lg transition-all hover:border-primary/50">
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {template.template_thumbnail ? (
          <img
            src={template.template_thumbnail}
            alt={template.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{template.icon || '📄'}</span>
          </div>
        )}
        
        {/* Category Badge */}
        {template.template_category && (
          <Badge className="absolute top-2 right-2 bg-background/90 backdrop-blur">
            {template.template_category.icon} {template.template_category.name}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg line-clamp-1 flex items-center gap-2">
            {template.icon && <span>{template.icon}</span>}
            {template.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {template.template_description || 'No description'}
          </p>
        </div>

        {/* Use Count */}
        {template.template_use_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Used {template.template_use_count} times
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            size="sm"
            onClick={onUse}
            disabled={isUsing}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            {isUsing ? 'Using...' : 'Use Template'}
          </Button>
        </div>
      </div>
    </div>
  );
};
