/**
 * MobileAssignMembersSheet — bottom sheet for picking who is assigned to a role.
 *
 * Mirrors desktop's MultiUserSelector behavior:
 *   - Active members of the current company (sourced from
 *     useOrgChartOptimized.profiles, which already filters company_members
 *     by status='active' inside the hook)
 *   - Multi-select (string[] of profile ids)
 *   - "Unassign all" button → empties the selection
 *
 * Pure picker (no mutation). Returns chosen ids via onApply. The page
 * passes them to createRole / updateRole with `intentional_assignment_update: true`
 * — the SAME shape desktop's RoleConfigModal sends (RoleConfigModal.tsx:411-422).
 * The hook diffs and updates the role_assignments table internally.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, Users, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CompanyProfile } from '@/hooks/useOrgChartOptimized';

interface MobileAssignMembersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The role's title, shown in the header for context. */
  roleTitle: string;
  /** Currently-assigned user ids (from role.assignments[].profile.id). */
  currentAssigneeIds: string[];
  /** All active company members eligible for assignment. */
  profiles: CompanyProfile[];
  profilesLoading?: boolean;
  applying?: boolean;
  /** When true, render at z-[102] (above a parent sheet at z-[101]). */
  nested?: boolean;
  /** Called when the user taps Save. Parent decides whether to close. */
  onApply: (assigneeIds: string[]) => Promise<void> | void;
}

export const MobileAssignMembersSheet: React.FC<MobileAssignMembersSheetProps> = ({
  open,
  onOpenChange,
  roleTitle,
  currentAssigneeIds,
  profiles,
  profilesLoading = false,
  applying = false,
  nested = false,
  onApply,
}) => {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>(currentAssigneeIds);

  // Reset state when the sheet opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setDraft(currentAssigneeIds);
    }
  }, [open, currentAssigneeIds]);

  const filtered = useMemo(() => {
    const lower = query.toLowerCase().trim();
    if (!lower) return profiles;
    return profiles.filter((p) =>
      (p.full_name ?? '').toLowerCase().includes(lower) ||
      (p.email ?? '').toLowerCase().includes(lower),
    );
  }, [profiles, query]);

  // Show selected first to make the "what's currently selected" obvious.
  const sorted = useMemo(() => {
    const selectedSet = new Set(draft);
    return [...filtered].sort((a, b) => {
      const aSel = selectedSet.has(a.id) ? 0 : 1;
      const bSel = selectedSet.has(b.id) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return (a.full_name ?? '').localeCompare(b.full_name ?? '');
    });
  }, [filtered, draft]);

  const toggle = (id: string) => {
    setDraft((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };

  // Detect whether the user has actually changed the assignment set —
  // matters because passing intentional_assignment_update with no change
  // would still trigger a delete-and-reinsert of role_assignments. We only
  // apply when there's an actual diff.
  const wouldChange = useMemo(() => {
    if (draft.length !== currentAssigneeIds.length) return true;
    const a = [...draft].sort();
    const b = [...currentAssigneeIds].sort();
    return a.some((id, i) => id !== b[i]);
  }, [draft, currentAssigneeIds]);

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
            Assign members
          </SheetTitle>
          <div className="text-[11.5px] text-muted-foreground text-left line-clamp-1">
            {roleTitle}
          </div>
        </SheetHeader>

        {/* Selected count + Unassign all */}
        <div className="px-5 py-2.5 flex items-center justify-between border-b border-border/40 bg-card">
          <span className="text-[11.5px] font-semibold text-muted-foreground tabular-nums">
            {draft.length === 0
              ? 'No one selected'
              : `${draft.length} selected`}
          </span>
          {draft.length > 0 && (
            <button
              type="button"
              onClick={() => setDraft([])}
              className="text-[11.5px] font-semibold text-destructive active:opacity-70"
            >
              Unassign all
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border/40">
          <div className="flex items-center gap-2 h-10 px-3 bg-muted/60 rounded-[10px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a teammate…"
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
          {profilesLoading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground text-[12px]">
              Loading teammates…
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Users className="h-8 w-8 opacity-40" />
              <span className="text-[12px]">
                {query ? 'No teammates match.' : 'No active teammates yet.'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {sorted.map((p) => {
                const selected = draft.includes(p.id);
                const initials = getInitials(p.full_name) || '?';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors',
                      selected
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'bg-card border border-border/40 active:bg-muted/60',
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">
                        {p.full_name || p.email}
                      </div>
                      {p.full_name && p.email && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {p.email}
                        </div>
                      )}
                    </div>
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md border flex items-center justify-center transition-colors',
                        selected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border/60 bg-card',
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom,16px),20px)] border-t border-border/40">
          <Button
            type="button"
            onClick={() => onApply(draft)}
            disabled={!wouldChange || applying}
            className="w-full h-11 text-[14px] font-semibold"
          >
            {applying ? 'Saving…' : wouldChange ? 'Save assignments' : 'No change'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileAssignMembersSheet;
