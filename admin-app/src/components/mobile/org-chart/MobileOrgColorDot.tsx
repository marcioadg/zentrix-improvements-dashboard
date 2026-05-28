/**
 * MobileOrgColorDot — small colored dot that mirrors the personality_color
 * accent used on desktop's OrgChartListView (src/components/org-chart/
 * OrgChartListView.tsx:121-124). Same color mapping, same semantics:
 *
 *   red    → bg-destructive
 *   yellow → bg-yellow-500
 *   green  → bg-green-500
 *   blue   → bg-primary
 *
 * `personality_color` is a personality-assessment color (DISC-style), NOT
 * a department indicator. Naming this "color dot" instead of "dept chip"
 * to avoid carrying over the prototype's wrong mental model.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export type OrgPersonalityColor = 'red' | 'yellow' | 'green' | 'blue';

interface MobileOrgColorDotProps {
  color?: OrgPersonalityColor | null;
  /** Size in pixels (square). Defaults to 8. */
  size?: number;
  className?: string;
}

const COLOR_BG: Record<OrgPersonalityColor, string> = {
  red: 'bg-destructive',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-primary',
};

export const MobileOrgColorDot: React.FC<MobileOrgColorDotProps> = ({
  color,
  size = 8,
  className,
}) => {
  if (!color) return null;
  return (
    <span
      className={cn('rounded-full shrink-0', COLOR_BG[color], className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
};

export default MobileOrgColorDot;
