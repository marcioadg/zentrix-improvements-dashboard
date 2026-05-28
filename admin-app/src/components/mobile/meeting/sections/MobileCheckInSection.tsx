/**
 * MobileCheckInSection — v2 mirror of the desktop QuarterlyCheckInSection.
 * Fully static prompt cards (copy matches the desktop section).
 */
import React from 'react';
import { MobileSectionShell, SectionTitleAccent } from './MobileSectionPrimitives';

const PROMPTS = [
  'Bests: Personal and Business.',
  "Update: What's working / not working?",
  'Expectations for this Session',
];

interface MobileCheckInSectionProps {
  eyebrow?: React.ReactNode;
}

export const MobileCheckInSection: React.FC<MobileCheckInSectionProps> = ({ eyebrow }) => (
  <MobileSectionShell
    eyebrow={eyebrow}
    title={<>Check <SectionTitleAccent>In.</SectionTitleAccent></>}
    sub="Start with positive reports and identify issues."
  >
    <div className="flex flex-col gap-2">
      {PROMPTS.map((p, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-3.5 flex items-start gap-3">
          <span className="text-[11px] font-bold text-muted-foreground/70 tabular-nums mt-0.5">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="text-[13px] font-medium text-foreground leading-snug">{p}</span>
        </div>
      ))}
    </div>
  </MobileSectionShell>
);

export default MobileCheckInSection;
