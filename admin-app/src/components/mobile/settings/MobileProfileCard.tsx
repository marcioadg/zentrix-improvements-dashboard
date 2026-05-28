import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MobileProfileCardProps {
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  roleLabel?: string;
  onClick?: () => void;
}

const getInitials = (name: string, email: string): string => {
  const source = (name?.trim() || email?.split('@')[0] || '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const MobileProfileCard: React.FC<MobileProfileCardProps> = ({
  fullName,
  email,
  avatarUrl,
  roleLabel,
  onClick,
}) => {
  const interactive = !!onClick;
  const Component = interactive ? 'button' : 'div';

  return (
    <Component
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border/40',
        interactive && 'transition-colors active:bg-muted/60 text-left',
      )}
    >
      <Avatar className="h-14 w-14 shrink-0 border border-border/40">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || email} />}
        <AvatarFallback className="text-[15px] font-semibold bg-primary/10 text-primary">
          {getInitials(fullName, email)}
        </AvatarFallback>
      </Avatar>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-semibold text-foreground truncate">
          {fullName || email?.split('@')[0] || 'Your profile'}
        </span>
        <span className="block text-[13px] text-muted-foreground truncate mt-0.5">
          {email}
        </span>
        {roleLabel && (
          <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium tracking-wide">
            {roleLabel}
          </span>
        )}
      </span>
      {interactive && (
        <ChevronRight className="shrink-0 h-5 w-5 text-muted-foreground/60" />
      )}
    </Component>
  );
};
