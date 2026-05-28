/**
 * MobileToolsSection — v2 shell for the quarterly Tools Review section.
 *
 * Renders the real tool list from the desktop QuarterlyToolsSection (names +
 * descriptions) as a v2 review checklist. The tools' full sub-pages (Metrics,
 * Org Chart, etc.) stay on desktop — this is a review prompt, not a launcher.
 */
import React from 'react';
import { BarChart3, Users, ListChecks, Share2 } from 'lucide-react';
import { MobileSectionShell } from './MobileSectionPrimitives';

const TOOLS = [
  { name: 'Metrics', desc: 'Track and review key performance indicators', Icon: BarChart3 },
  { name: 'Org Chart', desc: 'Review organizational structure and roles', Icon: Users },
  { name: 'Delegate & Elevate', desc: 'Focus on what you love and delegate the rest', Icon: ListChecks },
  {
    name: 'Clarity Break Journal',
    desc: 'Reflect, solve, and gain insight with guided clarity breaks',
    Icon: Share2,
  },
];

interface MobileToolsSectionProps {
  eyebrow?: React.ReactNode;
}

export const MobileToolsSection: React.FC<MobileToolsSectionProps> = ({ eyebrow }) => (
  <MobileSectionShell eyebrow={eyebrow} title="Tools Review." sub="Review the team's core tools.">
    <div className="flex flex-col gap-2">
      {TOOLS.map((t) => (
        <div key={t.name} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
          <div className="w-[30px] h-[30px] rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <t.Icon className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-foreground">{t.name}</div>
            <div className="text-[11.5px] text-muted-foreground leading-[1.45] mt-0.5">{t.desc}</div>
          </div>
        </div>
      ))}
    </div>
  </MobileSectionShell>
);

export default MobileToolsSection;
