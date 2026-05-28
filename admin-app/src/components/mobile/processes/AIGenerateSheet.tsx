import React, { useState } from 'react';
import { BottomSheet } from '@/components/ui/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useProcessMutations } from '@/hooks/mobile/processes/useProcessMutations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { logger } from '@/utils/logger';

interface AIGenerateSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIGenerateSheet: React.FC<AIGenerateSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const { bulkCreateProcesses } = useProcessMutations();
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [icp, setIcp] = useState('');
  const [processTypes, setProcessTypes] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!companyName.trim() || !industry.trim() || !processTypes.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsGenerating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('generate-business-processes', {
        body: {
          companyName: companyName.trim(),
          industry: industry.trim(),
          icp: icp.trim(),
          processTypes: processTypes.trim(),
          additionalContext: additionalContext.trim(),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate processes');
      }

      const { processes } = response.data;

      if (!processes || processes.length === 0) {
        throw new Error('No processes generated');
      }

      // Bulk create all generated processes
      await bulkCreateProcesses.mutateAsync(processes);

      toast.success(`Generated ${processes.length} process${processes.length > 1 ? 'es' : ''}`);
      handleClose();
    } catch (error) {
      logger.error('AI generation error:', error);
      toast.error((error as Error).message || 'Failed to generate processes');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setCompanyName('');
      setIndustry('');
      setIcp('');
      setProcessTypes('');
      setAdditionalContext('');
      onClose();
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate with AI"
      snapPoints={[90]}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 text-primary text-sm">
          <Sparkles className="h-5 w-5 shrink-0" />
          <p>AI will generate 3-7 major steps with detailed actions for each process type.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Acme Corp"
            className="h-12"
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry *</Label>
          <Input
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., SaaS, E-commerce, Healthcare"
            className="h-12"
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="icp">Ideal Customer Profile (ICP)</Label>
          <Input
            id="icp"
            value={icp}
            onChange={(e) => setIcp(e.target.value)}
            placeholder="e.g., Mid-market B2B companies"
            className="h-12"
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="processTypes">Process Types to Document *</Label>
          <Textarea
            id="processTypes"
            value={processTypes}
            onChange={(e) => setProcessTypes(e.target.value)}
            placeholder="e.g., Sales, Onboarding, Support (comma-separated for multiple)"
            rows={2}
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground">
            Separate multiple types with commas to generate multiple processes
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalContext">Additional Context</Label>
          <Textarea
            id="additionalContext"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Any specific requirements or focus areas..."
            rows={2}
            disabled={isGenerating}
          />
        </div>

        {/* Extra bottom padding to clear bottom nav bar */}
        <div className="flex gap-3 pt-4 pb-[calc(80px+env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
            className="flex-1 h-12"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!companyName.trim() || !industry.trim() || !processTypes.trim() || isGenerating}
            className="flex-1 h-12"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
