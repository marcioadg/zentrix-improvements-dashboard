/**
 * MobileMoveRolePicker — bottom sheet that picks a new parent role.
 *
 * Used to mirror desktop's drag-to-reorganize on touch: tapping "Move" on
 * a role opens this sheet showing all OTHER roles as candidate parents
 * (excluding self + descendants to prevent cycles). The picker calls
 * onMove(newParentId) where null means "make this role a root".
 *
 * Mutation wired by parent via useOrgChartOptimized().moveRole — same
 * call desktop uses.
 */
import React, { useMemo, useState } from 'react';
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

interface MobileMoveRolePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The role being moved. */
  role: OrgRole | null;
  /** All roles in the company. */
  allRoles: OrgRole[];
  saving?: boolean;
  /** Called with the new parent id (or null to make role a root). */
  onMove: (newParentId: string | null) => Promise<void> | void;
}

/** Returns the set of ids of `roleId` and all of its descendants. */
function collectDescendantIds(roles: OrgRole[], roleId: string): Set<string> {
  const ids = new Set<string>([roleId]);
  const queue = [roleId];
  while (queue.length > 0) {
    const next = queue.shift()!;
    for (const r of roles) {
      if (r.reports_to_role_id === next && !ids.has(r.id)) {
        ids.add(r.id);
        queue.push(r.id);
      }
    }
  }
  return ids;
}

export const MobileMoveRolePicker: React.FC<MobileMoveRolePickerProps> = ({
  open,
  onOpenChange,
  role,
  allRoles,
  saving = false,
  onMove,
}) => {
  const [query, setQuery] = useState('');
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);

  // Reset state when sheet opens.
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setPendingParentId(role?.reports_to_role_id ?? null);
    }
  }, [open, role]);

  const excludeIds = useMemo(
    () => (role ? collectDescendantIds(allRoles, role.id) : new Set<string>()),
    [allRoles, role],
  );

  const candidates = useMemo(() => {
    if (!role) return [];
    const lower = query.toLowerCase();
    return allRoles
      .filter((r) => !excludeIds.has(r.id))
      .filter((r) =>
        !lower ||
        r.title.toLowerCase().includes(lower) ||
        r.assignments?.some((a) =>
          a.profile?.full_name?.toLowerCase().includes(lower),
        ),
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allRoles, role, excludeIds, query]);

  if (!role) return null;

  const handleConfirm = async () => {
    await onMove(pendingParentId);
  };

  const currentParentId = role.reports_to_role_id ?? null;
  const wouldChange = pendingParentId !== currentParentId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="z-[101] rounded-t-[22px] max-h-[90vh] p-0 overflow-hidden flex flex-col"
      >
        <SheetHeader className="px-5 pt-4 pb-3 border-b border-border/40">
          <SheetTitle className="text-[17px] font-bold tracking-[-0.01em] text-left">
            Move "{role.title}" to…
          </SheetTitle>
          <div className="text-[11.5px] text-muted-foreground text-left">
            Pick a new parent role, or set to "No parent" to make it a root.
          </div>
        </SheetHeader>

        {/* Search */}
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

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <ParentOption
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
            onClick={handleConfirm}
            disabled={!wouldChange || saving}
            className="w-full h-11 text-[14px] font-semibold"
          >
            {saving ? 'Moving…' : wouldChange ? 'Move' : 'No change'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ParentOption: React.FC<{
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

export default MobileMoveRolePicker;
