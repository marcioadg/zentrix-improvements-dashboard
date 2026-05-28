/**
 * MobileTeamUpdatesSection — v2 shell for the Team Updates section.
 *
 * The desktop section is placeholder/mock with no persistence, so rather than
 * reproduce fake names this presents a v2 prompt + empty state. Wire to real
 * data if/when a team-updates feature exists.
 */
import React from 'react';
import { Megaphone } from 'lucide-react';
import { MobileSectionShell } from './MobileSectionPrimitives';

interface MobileTeamUpdatesSectionProps {
  eyebrow?: React.ReactNode;
}

export const MobileTeamUpdatesSection: React.FC<MobileTeamUpdatesSectionProps> = ({ eyebrow }) => (
  <MobileSectionShell
    eyebrow={eyebrow}
    title="Team Updates."
    sub="One short update per team — announcements, risks, notes."
  >
    <div className="bg-card border border-dashed border-border rounded-xl py-8 px-4 text-center">
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mx-auto mb-2.5">
        <Megaphone className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-[12.5px] font-medium text-foreground">No team updates yet</div>
      <div className="text-[11.5px] text-muted-foreground mt-1 leading-[1.45]">
        Each team shares a short update here during the meeting.
      </div>
    </div>
  </MobileSectionShell>
);

export default MobileTeamUpdatesSection;
