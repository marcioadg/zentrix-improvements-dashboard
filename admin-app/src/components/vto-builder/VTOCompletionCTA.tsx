import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Rocket, CheckCircle2 } from 'lucide-react';
import { VTOData } from './VTOBuilderApp';
import { VTOPreviewPanel } from './VTOPreviewPanel';

interface Props {
  data: VTOData;
  leadData: { name: string; email: string; company: string };
  onExport: () => void;
  isBusy: boolean;
}

export const VTOCompletionCTA: React.FC<Props> = ({ data, leadData, onExport, isBusy }) => (
  <div className="min-h-screen bg-background">
    {/* Success header */}
    <div className="bg-gradient-to-b from-emerald-50 to-white px-6 pt-16 pb-10">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Your V/TO is ready, {leadData.name.split(' ')[0]}! 🎉
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Download your Vision/Traction Organizer and share it with your leadership team.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            onClick={onExport}
            disabled={isBusy}
            className="gap-2 bg-zinc-950 hover:bg-zinc-900 text-white px-8 h-12 text-base"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </Button>
        </div>
      </div>
    </div>

    {/* Preview of completed V/TO */}
    <div className="max-w-2xl mx-auto px-6 py-10 border border-border rounded-2xl my-8 mx-4 md:mx-auto">
      <VTOPreviewPanel data={data} companyName={leadData.company} />
    </div>

    {/* CTA to Zentrix */}
    <div className="bg-zinc-950 text-white py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Want to actually <span className="text-violet-400">run your business</span> with this?
        </h2>
        <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">
          Zentrix OS turns your V/TO into a living system — with goals tracking, meeting rhythms, scorecards, accountability charts, and AI-powered insights.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/signup">
            <Button className="gap-2 bg-white text-zinc-950 hover:bg-white/90 px-8 h-12 text-base font-bold">
              <Rocket className="w-5 h-5" />
              Start Free Trial
            </Button>
          </a>
          <a href="/" className="text-sm text-white/50 hover:text-white/80 underline underline-offset-4">
            Learn more about Zentrix OS
          </a>
        </div>
      </div>
    </div>
  </div>
);
