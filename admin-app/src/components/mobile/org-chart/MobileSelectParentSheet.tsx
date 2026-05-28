/**
 * MobileSelectParentSheet — generic "pick a parent role" bottom sheet.
 *
 * Pure picker (no mutation). Returns the chosen parent id via onApply.
 * Used in two places:
 *   1. Inline inside MobileEditRoleSheet for the "Reports to" row.
 *   2. As the standalone "Move role" flow (where the page wires onApply
 *      to useOrgChartOptimized.moveRole).
 *
 * Cycle prevention: excludeIds should contain the role being edited +
 * all of its descendants — the picker drops them from the candidate list.
 *
 * Uses z-[101] to clear the MobileBottomNav (z-[100]) plus any parent
 * sheet (z-[101]). When opened ON TOP of another sheet, we bump to
 * z-[102] via the `nested` prop so the sub-sheet wins the stacking order.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OrgRole } from '@/hooks/useOrgChartOptimized';
import { MobileOrgColorDot } from './MobileOrgColorDot';

interface MobileSelectParentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  currentParentId: string | null;
  /** Role ids to exclude as candidates (self + descendants to prevent cycles). */
  excludeIds?: Set<string>;
  /** Candidate roles (typically all roles in the current company). */
  roles: OrgRole[];
  /** When true, render at z-[102] so we win the stacking order over a parent sheet. */
  nested?: boolean;
  applying?: boolean;
  applyLabel?: string;
  /** Called when the user taps the primary action. Sheet stays open until parent flips it. */
  onApply: (parentId: string | null) => Promise<void> | void;
}

export const MobileSelectParentSheet: React.FC<MobileSelectParentSheetProps> = ({
  open,
  onOpenChange,
  title,
  subtitle,
  currentParentId,
  excludeIds,
  roles,
  nested = false,
  applying = false,
  applyLabel = 'Apply',
  onApply,
}) => {
  const [query, setQuery] = useState('');
  const [pendingParentId, setPendingParentId] = useState<string | null>(currentParentId);

  // Reset draft state when sheet opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setPendingParentId(currentParentId);
    }
  }, [open, currentParentId]);

  const candidates = useMemo(() => {
    const lower = query.toLowerCase().trim();
    return roles
      .filter((r) => !excludeIds || !excludeIds.has(r.id))
      .filter((r) =>
        !lower ||
        r.title.toLowerCase().includes(lower) ||
        r.assignments?.some((a) =>
          a.profile?.full_name?.toLowerCase().includes(lower),
        ),
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [roles, excludeIds, query]);

  const wouldChange = pendingParentId !== currentParentId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'rounded-t-[22px] max-h-[90vh] p-0 overflow-hidden flex flex-col',
          nested ? 'z-[102]' : 'z-[101]',
        )}
      >
        <SheetHeader className="px-5 pt-4 pb-3 border-b border-border/40">
          <SheetTitle className="text-[17px] font-bold tracking-[-0.01em] text-left">
            {title}
          </SheetTitle>
          {subtitle && (
            <div className="text-[11.5px] text-muted-foreground text-left">
              {subtitle}
            </div>
          )}
        </SheetHeader>

        <div className="px-5 py-3 border-b border-border/40">
          <div className="flex items-center gap-2 h-10 px-3 bg-muted/60 rounded-[10px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a role…"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="p-1"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          <ParentRow
            label="No parent · make root"
            selected={pendingParentId === null}
            onClick={() => setPendingParentId(null)}
          />
          {candidates.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              No matching roles.
            </div>
          ) : (
            candidates.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setPendingParentId(r.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-left transition-colors mt-1',
                  pendingParentId === r.id
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : 'bg-card border border-border/40 active:bg-muted/60',
                )}
              >
                <MobileOrgColorDot color={r.personality_color} size={8} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate">
                    {r.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {(r.assignments?.length ?? 0) === 0
                      ? 'Unassigned'
                      : r.assignments![0].profile?.full_name ?? 'Unknown'}
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))
          )}
        </div>

        <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom,16px),20px)] border-t border-border/40">
          <Button
            type="button"
            onClick={() => onApply(pendingParentId)}
            disabled={!wouldChange || applying}
            className="w-full h-11 text-[14px] font-semibold"
          >
            {applying ? 'Saving…' : wouldChange ? applyLabel : 'No change'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ParentRow: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-left transition-colors',
      selected
        ? 'bg-primary/10 ring-1 ring-primary/30'
        : 'bg-card border border-border/40 active:bg-muted/60',
    )}
  >
    <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
    <span className="flex-1 text-[13px] font-medium text-foreground">{label}</span>
  </button>
);

export default MobileSelectParentSheet;
