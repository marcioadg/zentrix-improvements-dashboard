/**
 * MobileEditRoleSheet — bottom sheet to create or edit an org role.
 *
 * Wraps `createRole` and `updateRole` from useOrgChartOptimized — the same
 * hook desktop uses (src/components/org-chart/RoleConfigModal.tsx is the
 * desktop equivalent). Mirrors desktop's full single-payload shape:
 *
 *   { title, responsibilities, personality_color,
 *     reports_to_role_id,
 *     assigned_user_ids,                       // new in this file
 *     intentional_assignment_update: true }    // flag the hook needs
 *
 * The hook handles the role_assignments side-table diff internally
 * (useOrgChartOptimized.ts:464-510) when intentional_assignment_update
 * is true. Same code path desktop uses.
 *
 * Sub-sheets:
 *   - "Reports to" row → MobileSelectParentSheet (nested z-[102])
 *   - "Assigned to" row → MobileAssignMembersSheet (nested z-[102])
 *
 * For the create flow, defaults reports_to_role_id from `defaultParentId`
 * (passed by the page based on currently-focused/detailed role) and
 * assigned_user_ids to empty. Both can be changed before saving.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Users, Network } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CompanyProfile, OrgRole } from '@/hooks/useOrgChartOptimized';
import { MobileOrgColorDot } from './MobileOrgColorDot';
import { MobileSelectParentSheet } from './MobileSelectParentSheet';
import { MobileAssignMembersSheet } from './MobileAssignMembersSheet';

export type OrgPersonalityColor = 'red' | 'yellow' | 'green' | 'blue';

export interface EditRoleDraft {
  title: string;
  responsibilities: string;
  personality_color: OrgPersonalityColor;
  reports_to_role_id: string | null;
  assigned_user_ids: string[];
}

interface MobileEditRoleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * When provided → editing this existing role (Save calls updateRole).
   * When null → creating a new role (Save calls createRole). For create,
   * reports_to_role_id defaults to `defaultParentId` and assigned_user_ids
   * defaults to []. Both can still be changed in the form.
   */
  role: OrgRole | null;
  /** All roles in the company — needed by the parent picker. */
  allRoles: OrgRole[];
  /** Active company members — needed by the assignment picker. */
  profiles: CompanyProfile[];
  profilesLoading?: boolean;
  /** For create flow: pre-select a parent role. */
  defaultParentId?: string | null;
  saving?: boolean;
  onSave: (draft: EditRoleDraft) => Promise<void> | void;
}

const COLOR_OPTIONS: Array<{
  value: OrgPersonalityColor;
  label: string;
  bgClass: string;
}> = [
  { value: 'red', label: 'Red · Dominance', bgClass: 'bg-destructive' },
  { value: 'yellow', label: 'Yellow · Influence', bgClass: 'bg-yellow-500' },
  { value: 'green', label: 'Green · Steadiness', bgClass: 'bg-green-500' },
  { value: 'blue', label: 'Blue · Conscientiousness', bgClass: 'bg-primary' },
];

const blankDraft: EditRoleDraft = {
  title: '',
  responsibilities: '',
  personality_color: 'green',
  reports_to_role_id: null,
  assigned_user_ids: [],
};

/** Build the set {role + all descendants} for cycle prevention in the parent picker. */
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

export const MobileEditRoleSheet: React.FC<MobileEditRoleSheetProps> = ({
  open,
  onOpenChange,
  role,
  allRoles,
  profiles,
  profilesLoading = false,
  defaultParentId,
  saving = false,
  onSave,
}) => {
  const [draft, setDraft] = useState<EditRoleDraft>(blankDraft);
  const [touched, setTouched] = useState(false);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);

  // Reset draft when sheet opens — to existing role's values (edit) or blanks
  // pre-filled with defaults (create).
  useEffect(() => {
    if (!open) return;
    if (role) {
      setDraft({
        title: role.title || '',
        responsibilities: role.responsibilities || '',
        personality_color: (role.personality_color as OrgPersonalityColor) || 'green',
        reports_to_role_id: role.reports_to_role_id ?? null,
        assigned_user_ids:
          role.assignments
            ?.map((a) => a.profile?.id)
            .filter((id): id is string => !!id) ?? [],
      });
    } else {
      setDraft({
        ...blankDraft,
        reports_to_role_id: defaultParentId ?? null,
      });
    }
    setTouched(false);
  }, [open, role, defaultParentId]);

  const canSave = draft.title.trim().length > 0 && !saving;

  const parentLabel = useMemo(() => {
    if (!draft.reports_to_role_id) return 'No parent · root role';
    const p = allRoles.find((r) => r.id === draft.reports_to_role_id);
    return p?.title ?? 'Unknown role';
  }, [draft.reports_to_role_id, allRoles]);

  const parentRole = useMemo(
    () => allRoles.find((r) => r.id === draft.reports_to_role_id) ?? null,
    [allRoles, draft.reports_to_role_id],
  );

  // For the parent picker, exclude self + descendants only when editing
  // (creating has no role to cycle against).
  const parentExcludeIds = useMemo(
    () => (role ? collectDescendantIds(allRoles, role.id) : undefined),
    [allRoles, role],
  );

  const selectedAssignees = useMemo(
    () => profiles.filter((p) => draft.assigned_user_ids.includes(p.id)),
    [profiles, draft.assigned_user_ids],
  );

  const handleSave = async () => {
    setTouched(true);
    if (!canSave) return;
    await onSave({
      ...draft,
      title: draft.title.trim(),
      responsibilities: draft.responsibilities.trim(),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="z-[101] rounded-t-[22px] max-h-[90vh] p-5 pb-[max(env(safe-area-inset-bottom,16px),20px)] overflow-y-auto"
      >
        <SheetHeader className="text-left mb-3">
          <SheetTitle className="text-[17px] font-bold tracking-[-0.01em]">
            {role ? 'Edit role' : 'New role'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label
              htmlFor="org-role-title"
              className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground"
            >
              Title
            </Label>
            <Input
              id="org-role-title"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g. VP Engineering"
              className="mt-1.5"
              autoFocus={!role}
            />
            {touched && !draft.title.trim() && (
              <p className="text-[11px] text-destructive mt-1">Title is required.</p>
            )}
          </div>

          <div>
            <Label
              htmlFor="org-role-resp"
              className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground"
            >
              Responsibilities
            </Label>
            <Textarea
              id="org-role-resp"
              value={draft.responsibilities}
              onChange={(e) =>
                setDraft((d) => ({ ...d, responsibilities: e.target.value }))
              }
              placeholder="What is this role accountable for?"
              className="mt-1.5 min-h-[100px] text-[13px]"
              rows={4}
            />
          </div>

          {/* Reports to */}
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
              Reports to
            </span>
            <button
              type="button"
              onClick={() => setParentPickerOpen(true)}
              className="mt-1.5 w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-card border border-border/40 text-left active:bg-muted/60 transition-colors"
            >
              <Network className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {parentRole ? (
                <MobileOrgColorDot color={parentRole.personality_color} size={6} />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
              )}
              <span className="flex-1 text-[13px] font-medium text-foreground truncate">
                {parentLabel}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Assigned to */}
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
              Assigned to
            </span>
            <button
              type="button"
              onClick={() => setAssignSheetOpen(true)}
              className="mt-1.5 w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-card border border-border/40 text-left active:bg-muted/60 transition-colors"
            >
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {selectedAssignees.length === 0 ? (
                <span className="flex-1 text-[13px] text-muted-foreground italic">
                  Unassigned · tap to add members
                </span>
              ) : (
                <>
                  <div className="flex items-center -space-x-1.5 shrink-0">
                    {selectedAssignees.slice(0, 3).map((p) => {
                      const initials = getInitials(p.full_name) || '?';
                      return (
                        <Avatar key={p.id} className="h-6 w-6 ring-2 ring-card">
                          <AvatarImage src={p.avatar_url || undefined} />
                          <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })}
                    {selectedAssignees.length > 3 && (
                      <span className="h-6 min-w-6 px-1 rounded-full bg-muted text-[9px] font-semibold text-muted-foreground flex items-center justify-center ring-2 ring-card">
                        +{selectedAssignees.length - 3}
                      </span>
                    )}
                  </div>
                  <span className="flex-1 text-[13px] font-medium text-foreground truncate">
                    {selectedAssignees.length === 1
                      ? selectedAssignees[0].full_name
                      : `${selectedAssignees.length} people`}
                  </span>
                </>
              )}
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
              Personality color
            </span>
            <div className="mt-1.5 flex flex-col gap-1">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, personality_color: opt.value }))
                  }
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors',
                    draft.personality_color === opt.value
                      ? 'bg-primary/10 ring-1 ring-primary/30'
                      : 'bg-card border border-border/40 active:bg-muted/60',
                  )}
                  aria-pressed={draft.personality_color === opt.value}
                >
                  <span className={cn('w-3 h-3 rounded-full', opt.bgClass)} />
                  <span
                    className={cn(
                      'text-[13px] font-medium',
                      draft.personality_color === opt.value ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full mt-5 h-11 text-[14px] font-semibold"
        >
          {saving ? 'Saving…' : role ? 'Save changes' : 'Create role'}
        </Button>
      </SheetContent>

      {/* Sub-sheet: parent picker (nested → z-[102]) */}
      <MobileSelectParentSheet
        open={parentPickerOpen}
        onOpenChange={setParentPickerOpen}
        title="Reports to…"
        subtitle="Pick a parent role or make this one a root."
        currentParentId={draft.reports_to_role_id}
        excludeIds={parentExcludeIds}
        roles={allRoles}
        nested
        applyLabel="Set parent"
        onApply={(parentId) => {
          setDraft((d) => ({ ...d, reports_to_role_id: parentId }));
          setParentPickerOpen(false);
        }}
      />

      {/* Sub-sheet: assignment multi-select (nested → z-[102]) */}
      <MobileAssignMembersSheet
        open={assignSheetOpen}
        onOpenChange={setAssignSheetOpen}
        roleTitle={draft.title || (role ? role.title : 'New role')}
        currentAssigneeIds={draft.assigned_user_ids}
        profiles={profiles}
        profilesLoading={profilesLoading}
        nested
        onApply={(ids) => {
          setDraft((d) => ({ ...d, assigned_user_ids: ids }));
          setAssignSheetOpen(false);
        }}
      />
    </Sheet>
  );
};

export default MobileEditRoleSheet;
