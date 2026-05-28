/**
 * MobileCustomSection — v2 mirror of the desktop renderer's custom_section
 * case. Renders the agenda item's title + sanitised rich-text description.
 */
import React from 'react';
import DOMPurify from 'dompurify';
import { MobileSectionShell } from './MobileSectionPrimitives';

interface MobileCustomSectionProps {
  title: string;
  description?: string;
  eyebrow?: React.ReactNode;
}

export const MobileCustomSection: React.FC<MobileCustomSectionProps> = ({
  title,
  description,
  eyebrow,
}) => (
  <MobileSectionShell eyebrow={eyebrow} title={title}>
    {description ? (
      <div
        className="text-[13px] leading-[1.55] text-muted-foreground [&_a]:text-primary [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
      />
    ) : (
      <div className="bg-card border border-dashed border-border rounded-xl py-6 text-center text-[12.5px] text-muted-foreground">
        No description for this section.
      </div>
    )}
  </MobileSectionShell>
);

export default MobileCustomSection;
