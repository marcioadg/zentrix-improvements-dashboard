/**
 * MobileChartCard — wraps any chart (line / bar / h-bar / etc.) inside a
 * tappable card with a title, optional subtitle, optional right-side legend
 * or stat, and a trailing chevron indicating "tap to drill down". The chart
 * is rendered via children.
 *
 * Used by AnalyticsMobile for both the featured chart (full-width) and the
 * smaller 2-col grid cards. Tap → opens MobileDrillDownSheet.
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileChartCardProps {
  title: string;
  subtitle?: string;
  /** Optional right-side adornment (legend pill, stat, etc.). */
  trailing?: React.ReactNode;
  /** Optional small variant for grid layout (slightly smaller padding/title). */
  size?: 'lg' | 'sm';
  onTap?: () => void;
  children: React.ReactNode;
}

export const MobileChartCard: React.FC<MobileChartCardProps> = ({
  title,
  subtitle,
  trailing,
  size = 'lg',
  onTap,
  children,
}) => {
  const isInteractive = !!onTap;
  const Wrapper: any = isInteractive ? 'button' : 'div';

  return (
    <Wrapper
      {...(isInteractive ? { type: 'button', onClick: onTap } : {})}
      className={cn(
        'w-full text-left bg-card border border-border/40 rounded-[14px]',
        size === 'lg' ? 'p-3.5' : 'p-3',
        'flex flex-col gap-2',
        isInteractive && 'transition-transform duration-150 active:scale-[0.99]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'font-semibold text-foreground tracking-[-0.01em] truncate',
              size === 'lg' ? 'text-[13.5px]' : 'text-[12px]',
            )}
          >
            {title}
          </div>
          {subtitle && (
            <div
              className={cn(
                'text-muted-foreground mt-0.5 line-clamp-1',
                size === 'lg' ? 'text-[11px]' : 'text-[10px]',
              )}
            >
              {subtitle}
            </div>
          )}
        </div>
        {trailing ? (
          <div className="shrink-0">{trailing}</div>
        ) : isInteractive ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        ) : null}
      </div>

      <div className="-mx-1">{children}</div>
    </Wrapper>
  );
};

export default MobileChartCard;
