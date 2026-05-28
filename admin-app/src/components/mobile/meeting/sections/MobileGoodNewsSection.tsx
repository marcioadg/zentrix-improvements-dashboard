/**
 * MobileGoodNewsSection — v2 mirror of the desktop GoodNewsSection.
 *
 * Fully static (no data) — two prompt cards (Personal + Professional Wins).
 * Prompt content matches the desktop GoodNewsSection.tsx verbatim so the two
 * views stay in step. Mobile-only; imports no desktop component.
 */
import React from 'react';
import { User, Briefcase } from 'lucide-react';
import {
  MobileSectionShell,
  MobileSectionCard,
  MobilePromptList,
  SectionTitleAccent,
} from './MobileSectionPrimitives';

const PERSONAL_PROMPTS = [
  'Health and fitness goals achieved',
  'Family milestones and celebrations',
  'Learning new skills or hobbies',
  'Travel experiences and adventures',
  'Personal growth achievements',
];

const PROFESSIONAL_PROMPTS = [
  'Project completions and successes',
  'Client feedback and testimonials',
  'Team collaboration achievements',
  'Process improvements implemented',
  'Recognition and career advancement',
];

interface MobileGoodNewsSectionProps {
  eyebrow?: React.ReactNode;
}

export const MobileGoodNewsSection: React.FC<MobileGoodNewsSectionProps> = ({ eyebrow }) => (
  <MobileSectionShell
    eyebrow={eyebrow}
    title={<>Good <SectionTitleAccent>News.</SectionTitleAccent></>}
    sub="Share personal and professional wins."
  >
    <MobileSectionCard
      accent
      icon={<User className="h-3.5 w-3.5" />}
      iconClassName="bg-success/10 text-success"
      title="Personal Wins"
      sub="Share personal achievements and milestones"
    >
      <MobilePromptList items={PERSONAL_PROMPTS} />
    </MobileSectionCard>

    <MobileSectionCard
      icon={<Briefcase className="h-3.5 w-3.5" />}
      iconClassName="bg-primary/10 text-primary"
      title="Professional Wins"
      sub="Celebrate work accomplishments"
    >
      <MobilePromptList items={PROFESSIONAL_PROMPTS} />
    </MobileSectionCard>
  </MobileSectionShell>
);

export default MobileGoodNewsSection;
