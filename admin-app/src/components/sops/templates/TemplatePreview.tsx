import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, X, TrendingUp } from 'lucide-react';
import { BlockRenderer } from '@/components/sops/editor/BlockRenderer';

interface TemplatePreviewProps {
  templateId: string;
  onClose: () => void;
  onUse: () => void;
  isUsing?: boolean;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  templateId,
  onClose,
  onUse,
  isUsing,
}) => {
  const { data: template, isLoading } = useQuery({
    queryKey: ['sop-template-preview', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sop_pages')
        .select(`
          *,
          template_category:sop_template_categories(*),
          blocks:sop_blocks(*)
        `)
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading preview...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!template) {
    return null;
  }

  const blocks = template.blocks || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {template.icon && <span className="text-3xl">{template.icon}</span>}
              <div>
                <DialogTitle className="text-2xl">{template.title}</DialogTitle>
                {template.template_description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.template_description}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close preview">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-3">
            {template.template_category && (
              <Badge variant="secondary">
                {template.template_category.icon} {template.template_category.name}
              </Badge>
            )}
            {template.template_use_count > 0 && (
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Used {template.template_use_count} times
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Content Preview (Read-only) */}
        <div className="flex-1 overflow-y-auto py-4 border-t border-b">
          {blocks.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              This template is empty
            </div>
          ) : (
            <div className="space-y-2">
              {blocks
                .sort((a: any, b: any) => a.position - b.position)
                .map((block: any) => (
                  <div key={block.id} className="opacity-75 pointer-events-none">
                    <BlockRenderer block={block} />
                  </div>
                ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onUse} disabled={isUsing}>
            <Copy className="h-4 w-4 mr-2" />
            {isUsing ? 'Using Template...' : 'Use This Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
