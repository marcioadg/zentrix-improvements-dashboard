/**
 * MobileAnalyticsHeader — page header dedicated to /m/analytics.
 *
 * Built as a separate component (rather than extending MobilePageHeader) so
 * /m/analytics can have a distinct layout: Sparkle icon next to the title
 * AND a Settings button trailing on the right. MobilePageHeader supports only
 * a single right-side icon; rather than add a prop that affects every mobile
 * page that uses MobilePageHeader, we keep the layouts isolated.
 *
 * The header mirrors MobilePageHeader visually (typography, sticky behavior,
 * safe-area padding) so it feels like part of the same family.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileAnalyticsHeaderProps {
  title: string;
  subtitle?: string;
  /** Tap handler for the Settings button on the right. */
  onOpenSettings?: () => void;
  sticky?: boolean;
}

export const MobileAnalyticsHeader: React.FC<MobileAnalyticsHeaderProps> = ({
  title,
  subtitle,
  onOpenSettings,
  sticky = true,
}) => {
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Mirror MobilePageHeader: measure for the spacer when sticky/fixed.
  useEffect(() => {
    if (!sticky || !headerRef.current) return;
    const update = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [sticky, subtitle]);

  return (
    <>
      {sticky && (
        <div
          style={{ height: headerHeight || 'calc(env(safe-area-inset-top) + 80px)' }}
          aria-hidden="true"
        />
      )}
      <header
        ref={headerRef}
        className={cn(
          'bg-background backdrop-blur-md px-4 pb-3 transition-shadow duration-200',
          sticky && 'fixed top-0 left-0 right-0 z-20',
        )}
        style={{ paddingTop: 'max(env(safe-area-inset-top, 20px), 20px)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                'w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0',
                'bg-primary/10 text-primary',
              )}
              aria-hidden="true"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1
                className="text-[22px] font-bold leading-[1.1] text-foreground"
                style={{ letterSpacing: '-0.3px' }}
              >
                {title}
              </h1>
              {subtitle && (
                <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Analytics settings"
              className={cn(
                'w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0',
                'bg-muted/60 text-foreground border border-border/40',
                'transition-transform duration-150 active:scale-95',
              )}
            >
              <SettingsIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>
    </>
  );
};

export default MobileAnalyticsHeader;
