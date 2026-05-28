/**
 * MobileRoleSelectionSheet — bottom sheet asking the user to pick their
 * role for the meeting (scriber vs participant).
 *
 * Mirrors desktop's NewRoleSelectionModal semantics. Scriber controls the
 * timer + section changes; participants follow along. A team can have one
 * scriber at a time — if someone else is already scribing, picking scriber
 * here takes over (same as desktop, broadcast via the scriber-broadcast
 * hook on the page).
 */
import React from 'react';
import { Crown, Eye } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export type MeetingRole = 'scriber' | 'participant';

interface MobileRoleSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently-scribing user's display name (if any). null if seat is open. */
  currentScriberName?: string | null;
  /** Whether the current user is currently the scriber. */
  isCurrentScriber: boolean;
  onSelect: (role: MeetingRole) => void;
  /** Optional: skip the role choice and join as a default. */
  onCancel?: () => void;
}

interface RoleOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  toneClass: string;
  badge?: string;
  onClick: () => void;
}

const RoleOption: React.FC<RoleOptionProps> = ({
  icon,
  title,
  description,
  toneClass,
  badge,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-start gap-3 px-4 py-3 rounded-[12px] bg-card border border-border/40 text-left transition-transform active:scale-[0.99]"
  >
    <div
      className={cn(
        'w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0',
        toneClass,
      )}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-semibold text-foreground">{title}</span>
        {badge && (
          <span className="text-[9.5px] font-bold uppercase bg-warning/10 text-warning px-1.5 py-0.5 rounded-md tabular-nums">
            {badge}
          </span>
        )}
      </div>
      <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
        {description}
      </p>
    </div>
  </button>
);

export const MobileRoleSelectionSheet: React.FC<MobileRoleSelectionSheetProps> = ({
  open,
  onOpenChange,
  currentScriberName,
  isCurrentScriber,
  onSelect,
  onCancel,
}) => {
  const scriberTaken = !!currentScriberName && !isCurrentScriber;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel?.();
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="bottom"
        className="z-[101] rounded-t-[22px] max-h-[85vh] p-5 pb-[max(env(safe-area-inset-bottom,16px),20px)] overflow-y-auto"
      >
        <SheetHeader className="text-left mb-3">
          <SheetTitle className="text-[17px] font-bold tracking-[-0.01em]">
            Pick your role
          </SheetTitle>
          <div className="text-[12px] text-muted-foreground">
            You can change this later from the meeting menu.
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-2 mt-2">
          <RoleOption
            icon={<Crown className="h-4 w-4" />}
            title="Scriber"
            description={
              scriberTaken
                ? `Currently ${currentScriberName}. Picking this takes over.`
                : 'Run the timer, advance sections, and pause/resume.'
            }
            toneClass="bg-primary/10 text-primary"
            badge={scriberTaken ? 'Take over' : undefined}
            onClick={() => onSelect('scriber')}
          />
          <RoleOption
            icon={<Eye className="h-4 w-4" />}
            title="Participant"
            description="Follow along — view sections, create tasks / issues / goals."
            toneClass="bg-muted/60 text-foreground"
            onClick={() => onSelect('participant')}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileRoleSelectionSheet;
