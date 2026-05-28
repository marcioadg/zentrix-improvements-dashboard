import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Copy, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ZentrixAIContext } from '@/services/zentrixAIDataService';
import ReactMarkdown from 'react-markdown';
import { logger } from '@/utils/logger';

interface AIContextViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatted: string;
  formattedForHuman: string;
  formattedByCategory: string;
  context: ZentrixAIContext | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const AIContextViewerDialog: React.FC<AIContextViewerDialogProps> = ({
  open,
  onOpenChange,
  formatted,
  formattedForHuman,
  formattedByCategory,
  context,
  onRefresh,
  isRefreshing
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'formatted' | 'json'>('formatted');

  // Parse markdown into sections based on ## headings
  const sections = useMemo(() => {
    const lines = formattedByCategory.split('\n');
    const parsedSections: Array<{ title: string; content: string; id: string }> = [];
    let currentSection: { title: string; content: string; id: string } | null = null;

    lines.forEach((line) => {
      if (line.startsWith('## ')) {
        // Save previous section
        if (currentSection) {
          parsedSections.push(currentSection);
        }
        // Start new section
        const title = line.replace('## ', '').trim();
        currentSection = {
          title,
          content: '',
          id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        };
      } else if (currentSection) {
        // Add line to current section
        currentSection.content += line + '\n';
      }
    });

    // Add last section
    if (currentSection) {
      parsedSections.push(currentSection);
    }

    return parsedSections;
  }, [formattedByCategory]);

  const contextSize = new Blob([formatted]).size;
  const contextSizeKB = (contextSize / 1024).toFixed(2);
  const contextSizeMB = (contextSize / (1024 * 1024)).toFixed(2);
  const displaySize = contextSize > 1024 * 100 ? `${contextSizeMB} MB` : `${contextSizeKB} KB`;

  const handleCopy = async () => {
    try {
      const textToCopy = activeTab === 'formatted' ? formattedByCategory : JSON.stringify(context, null, 2);
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: 'Copied!',
        description: 'Context data copied to clipboard',
      });
    } catch (error) {
      logger.error('Failed to copy:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(context, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `zentrix-ai-context-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: 'Exported!',
      description: 'Context data downloaded as JSON file',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            AI Context Data
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({formatted.length.toLocaleString()} characters · {displaySize})
            </span>
          </DialogTitle>
          <DialogDescription>
            View the business context data that the AI uses to generate responses
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2 py-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'formatted' | 'json')} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0 mb-2">
            <TabsTrigger value="formatted">Formatted View</TabsTrigger>
            <TabsTrigger value="json">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="formatted" className="h-full overflow-auto m-0 border rounded-lg bg-muted/30">
            <div className="p-4">
              <Accordion type="multiple" className="space-y-2">
                {sections.map((section) => (
                  <AccordionItem 
                    key={section.id} 
                    value={section.id}
                    className="border border-border rounded-lg bg-background"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg">
                      <span className="text-base font-semibold text-foreground">
                        {section.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />,
                            h4: ({node, ...props}) => <h4 className="text-base font-semibold mt-3 mb-2 text-foreground" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 text-foreground leading-relaxed" {...props} />,
                            ul: ({node, ...props}) => <ul className="mb-3 ml-4 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="mb-3 ml-4 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="text-foreground" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                            code: ({node, ...props}) => <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props} />
                          }}
                        >
                          {section.content}
                        </ReactMarkdown>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </TabsContent>

          <TabsContent value="json" className="h-full overflow-auto m-0 border rounded-lg bg-muted/30">
            <div className="p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {JSON.stringify(context, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>

        {contextSize > 50000 && (
          <div className="text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex-shrink-0">
            ⚠️ Context is large ({displaySize}). This may impact AI response quality.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
