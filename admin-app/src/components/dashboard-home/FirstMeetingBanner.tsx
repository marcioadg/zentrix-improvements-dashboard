import React, { useState } from 'react';
import { Video, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FirstMeetingModal } from './FirstMeetingModal';

export const FirstMeetingBanner: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-[8px] border border-primary/20 bg-card mb-card group">
        {/* Decorative gradient washes */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-primary/[0.08] blur-3xl" />

        <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          {/* Icon block */}
          <div className="relative flex-shrink-0">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-[10px] shadow-md ring-1 ring-white/10"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark)) 100%)',
              }}
            >
              <Video className="h-6 w-6 text-white" strokeWidth={2.25} />
            </div>
            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-card ring-1 ring-primary/30">
              <Sparkles className="h-3 w-3 text-primary" />
            </div>
          </div>

          {/* Copy */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
              Recommended next step
            </p>
            <h3 className="mt-0.5 text-[15px] font-semibold leading-tight text-foreground">
              Run your first meeting
            </h3>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
              Goals, tasks and metrics fill themselves in as you talk. It takes about 2 minutes.
            </p>
          </div>

          {/* CTA */}
          <Button
            onClick={() => setModalOpen(true)}
            className="group/btn relative h-9 flex-shrink-0 self-stretch overflow-hidden px-4 text-sm font-medium text-white shadow-md transition-transform hover:translate-y-[-1px] hover:shadow-lg sm:self-auto"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark)) 100%)',
            }}
          >
            <Video className="mr-1.5 h-4 w-4" />
            Start meeting
            <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          </Button>
        </div>
      </div>

      <FirstMeetingModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
};
