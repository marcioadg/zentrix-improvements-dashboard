import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSettingsRowProps {
  icon?: LucideIcon;
  iconTone?: 'neutral' | 'primary' | 'destructive';
  label: string;
  sublabel?: string;
  value?: React.ReactNode;
  trailing?: React.ReactNode;
  hideChevron?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

const toneClasses: Record<NonNullable<MobileSettingsRowProps['iconTone']>, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  destructive: 'bg-destructive/10 text-destructive',
};

export const MobileSettingsRow: React.FC<MobileSettingsRowProps> = ({
  icon: Icon,
  iconTone = 'neutral',
  label,
  sublabel,
  value,
  trailing,
  hideChevron = false,
  onClick,
  disabled = false,
  destructive = false,
}) => {
  const interactive = !!onClick && !disabled;
  const Component = interactive ? 'button' : 'div';

  return (
    <Component
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 text-left',
        'bg-card border-b border-border/40 last:border-b-0',
        interactive && 'transition-colors active:bg-muted/60',
        disabled && 'opacity-50',
      )}
    >
      {Icon && (
        <span
          className={cn(
            'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
            destructive ? toneClasses.destructive : toneClasses[iconTone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span
          className={cn(
            'block text-[15px] font-medium truncate',
            destructive ? 'text-destructive' : 'text-foreground',
          )}
        >
          {label}
        </span>
        {sublabel && (
          <span className="block text-[12.5px] text-muted-foreground truncate mt-0.5">
            {sublabel}
          </span>
        )}
      </span>
      {value !== undefined && (
        <span className="shrink-0 text-[13px] text-muted-foreground max-w-[45%] truncate">
          {value}
        </span>
      )}
      {trailing}
      {interactive && !hideChevron && (
        <ChevronRight className="shrink-0 h-4 w-4 text-muted-foreground/60" />
      )}
    </Component>
  );
};

interface MobileSettingsSectionProps {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const MobileSettingsSection: React.FC<MobileSettingsSectionProps> = ({
  title,
  children,
  footer,
}) => (
  <section className="mb-6">
    {title && (
      <h2 className="px-4 pb-2 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
        {title}
      </h2>
    )}
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      {children}
    </div>
    {footer && (
      <p className="px-4 pt-2 text-[12px] text-muted-foreground">{footer}</p>
    )}
  </section>
);
