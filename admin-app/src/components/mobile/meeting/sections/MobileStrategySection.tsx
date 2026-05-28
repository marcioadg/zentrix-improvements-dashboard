/**
 * MobileStrategySection — v2 shell for the quarterly Strategy / Execution
 * (V/TO) section.
 *
 * Limited-data shell (per product decision): the full V/TO lives in the
 * desktop Strategy page; this presents the V/TO framework as a v2 discussion
 * guide rather than fabricating data. The rich Strategy editor stays on
 * desktop.
 */
import React from 'react';
import { Heart, Eye, Target } from 'lucide-react';
import {
  MobileSectionShell,
  MobileSectionCard,
  SectionEyebrow,
  SectionTitleAccent,
} from './MobileSectionPrimitives';

interface MobileStrategySectionProps {
  eyebrow?: React.ReactNode;
}

export const MobileStrategySection: React.FC<MobileStrategySectionProps> = ({ eyebrow }) => (
  <MobileSectionShell
    eyebrow={eyebrow}
    title={<>Strategy & <SectionTitleAccent>Execution.</SectionTitleAccent></>}
    sub="Quick pulse on the V/TO. Full editing lives on desktop."
  >
    <MobileSectionCard
      icon={<Heart className="h-3.5 w-3.5" />}
      iconClassName="bg-primary/10 text-primary"
      title="Core Values"
      sub="Revisit the values that define how the team operates"
    >
      <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
        Read your core values aloud and confirm they still reflect how the team works today.
      </p>
    </MobileSectionCard>

    {/* 10-year vision — dark editorial card */}
    <div
      className="rounded-xl p-3.5 mb-2.5 text-white relative overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(160deg, #0c0d12 0%, #1a1d2e 70%, #2a2e4a 100%)' }}
    >
      <SectionEyebrow className="!text-white/70 mb-2">10-Year Vision</SectionEyebrow>
      <p className="text-[13px] leading-[1.5] text-white/90 font-medium m-0">
        Where is the company headed over the next decade? Align on the long-term picture before
        the quarter's work.
      </p>
    </div>

    <MobileSectionCard
      icon={<Target className="h-3.5 w-3.5" />}
      iconClassName="bg-success/10 text-success"
      title="1-Year Target"
      sub="What does success look like 12 months out?"
    >
      <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
        Confirm the annual target and how this quarter's rocks move you toward it.
      </p>
    </MobileSectionCard>
  </MobileSectionShell>
);

export default MobileStrategySection;
