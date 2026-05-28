import React, { useState, useRef } from 'react';
import { VTOStepSidebar } from './VTOStepSidebar';
import { VTOStepContent } from './VTOStepContent';
import { VTOPreviewPanel } from './VTOPreviewPanel';
import { VTOCompletionCTA } from './VTOCompletionCTA';
import { Button } from '@/components/ui/button';
import { Download, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { useVTOExport } from './useVTOExport';
import { logger } from '@/utils/logger';

export interface VTOData {
  coreValues: string[];
  purpose: string;
  niche: string;
  tenYearTarget: string;
  marketingStrategy: { target: string; uniques: string; process: string; guarantee: string };
  threeYearPicture: { revenue: string; profit: string; description: string };
  oneYearPlan: { revenue: string; profit: string; goals: string[] };
  quarterlyRocks: string[];
  issuesList: string[];
}

const INITIAL_DATA: VTOData = {
  coreValues: ['', '', ''],
  purpose: '',
  niche: '',
  tenYearTarget: '',
  marketingStrategy: { target: '', uniques: '', process: '', guarantee: '' },
  threeYearPicture: { revenue: '', profit: '', description: '' },
  oneYearPlan: { revenue: '', profit: '', goals: ['', '', ''] },
  quarterlyRocks: ['', '', ''],
  issuesList: ['', '', ''],
};

export const STEPS = [
  { id: 'core-values', label: 'Core Values', shortLabel: 'Values' },
  { id: 'core-focus', label: 'Core Focus', shortLabel: 'Focus' },
  { id: '10-year-target', label: '10-Year Target', shortLabel: '10-Year' },
  { id: 'marketing-strategy', label: 'Marketing Strategy', shortLabel: 'Marketing' },
  { id: '3-year-picture', label: '3-Year Picture', shortLabel: '3-Year' },
  { id: '1-year-plan', label: '1-Year Plan', shortLabel: '1-Year' },
  { id: 'quarterly-rocks', label: 'Quarterly Rocks', shortLabel: 'Rocks' },
  { id: 'issues-list', label: 'Issues List', shortLabel: 'Issues' },
];

interface Props {
  leadData: { name: string; email: string; company: string; companySize: string; role: string };
}

export const VTOBuilderApp: React.FC<Props> = ({ leadData }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<VTOData>(INITIAL_DATA);
  const [isComplete, setIsComplete] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const { exportPDF, isBusy } = useVTOExport(data, leadData);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsComplete(true);
      // Mark lead as completed in the database
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase
          .from('vto_leads')
          .update({ completed_vto: true, updated_at: new Date().toISOString() } as any)
          .eq('email', leadData.email)
          .then(({ error }) => {
            if (error) logger.warn('Failed to mark VTO lead as completed:', error.message);
          });
      }).catch((err) => {
        logger.warn('Failed to update VTO lead completion status:', err);
      });
    }
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (isComplete) {
    return <VTOCompletionCTA data={data} leadData={leadData} onExport={exportPDF} isBusy={isBusy} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-background border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-foreground">V/TO Builder</span>
          <span className="text-sm text-muted-foreground">— {leadData.company}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden md:block">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={exportPDF}
            disabled={isBusy}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ background: "var(--btn-bg, hsl(var(--primary)))", width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - step nav */}
        <VTOStepSidebar steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />

        {/* Center - input area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 max-w-2xl">
          <VTOStepContent
            step={STEPS[currentStep]}
            stepIndex={currentStep}
            data={data}
            setData={setData}
          />

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={currentStep === 0}
              className="gap-2 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              onClick={goNext}
              className="gap-2 bg-zinc-950 hover:bg-zinc-900 text-white px-8"
            >
              {currentStep === STEPS.length - 1 ? 'Finish' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </main>

        {/* Right panel - live preview */}
        <aside className="hidden lg:block w-[420px] border-l border-border bg-background overflow-y-auto">
          <div ref={previewRef} className="p-6">
            <VTOPreviewPanel data={data} companyName={leadData.company} />
          </div>
        </aside>
      </div>
    </div>
  );
};
