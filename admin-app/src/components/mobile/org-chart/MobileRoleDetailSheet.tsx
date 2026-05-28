/**
 * MobileRoleDetailSheet — bottom sheet that shows the details for a single
 * role. Used by Variant A (Hierarchy) and Variant C (Canvas). Variant B's
 * Focus mode renders this same content inline as a full-screen hero, so it
 * does NOT open this sheet.
 *
 * Sections (top → bottom):
 *  - Drag handle + close button
 *  - Breadcrumb: root → … → parent (tappable to navigate up the tree)
 *  - Hero: avatar(s) + role title + color dot
 *  - "Unassigned" banner if assignments[] is empty (matches desktop)
 *  - Responsibilities text (single blob — that's the schema)
 *  - Direct reports list (tappable rows that recenter the sheet)
 *  - Quick actions: Edit · Move · Delete (opens edit/move/delete flows)
 *
 * KPIs intentionally absent: the org_roles table doesn't carry KPI data
 * (the prototype mocked it). When/if a real schema for role KPIs exists,
 * a new section can slot in here.
 */
import React, { useMemo } from 'react';
import { ChevronRight, Pencil, Move, Trash2, UserPlus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { OrgRole } from '@/hooks/useOrgChartOptimized';
import { MobileOrgColorDot } from './MobileOrgColorDot';

interface MobileRoleDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: OrgRole | null;
  /** All roles in the company — used to compute breadcrumb + direct reports. */
  allRoles: OrgRole[];
  /** Navigate to a different role inside the sheet (breadcrumb / direct-report tap). */
  onNavigateToRole?: (roleId: string) => void;
  /** Trigger edit flow for this role. */
  onEdit?: (roleId: string) => void;
  /** Trigger move-parent flow for this role. */
  onMove?: (roleId: string) => void;
  /** Trigger delete flow for this role. */
  onDelete?: (roleId: string) => void;
  /**
   * Open the Create-role flow with reports_to_role_id pre-set to THIS role.
   * Used by the "Add report" button.
   */
  onAddReport?: (parentRoleId: string) => void;
}

const buildPathTo = (roles: OrgRole[], roleId: string | null): OrgRole[] => {
  if (!roleId) return [];
  const byId = new Map(roles.map((r) => [r.id, r]));
  const path: OrgRole[] = [];
  let current: OrgRole | undefined = byId.get(roleId);
  // Walk parents to root, breaking on missing/cycles.
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    path.unshift(current);
    seen.add(current.id);
    current = current.reports_to_role_id ? byId.get(current.reports_to_role_id) : undefined;
  }
  return path;
};

export const MobileRoleDetailSheet: React.FC<MobileRoleDetailSheetProps> = ({
  open,
  onOpenChange,
  role,
  allRoles,
  onNavigateToRole,
  onEdit,
  onMove,
  onDelete,
  onAddReport,
}) => {
  const path = useMemo(
    () => (role ? buildPathTo(allRoles, role.id) : []),
    [allRoles, role],
  );
  const reports = useMemo(
    () => (role ? allRoles.filter((r) => r.reports_to_role_id === role.id) : []),
    [allRoles, role],
  );

  if (!role) return null;
  const assignees = role.assignments ?? [];
  const hasAssignees = assignees.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="z-[101] rounded-t-[22px] max-h-[85vh] p-0 overflow-hidden flex flex-col"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{role.title}</SheetTitle>
        </SheetHeader>

        {/* Hero */}
        <div className="px-5 pt-4 pb-4 border-b border-border/40">
          {/* Breadcrumb */}
          {path.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap mb-2 text-[11px] text-muted-foreground">
              {path.slice(0, -1).map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                  <button
                    type="button"
                    onClick={() => onNavigateToRole?.(p.id)}
                    className="px-1 py-0.5 rounded-[4px] hover:bg-muted/60 active:bg-muted truncate max-w-[120px]"
                  >
                    {p.title}
                  </button>
                </React.Fragment>
              ))}
              {path.length > 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
              <span className="font-semibold text-foreground truncate">{role.title}</span>
            </div>
          )}

          <div className="flex items-start gap-3">
            <AvatarStack assignees={assignees} size={48} />
            <div className="flex-1 min-w-0">
              <div className="text-[20px] font-bold text-foreground leading-[1.15] tracking-[-0.3px]">
                {role.title}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MobileOrgColorDot color={role.personality_color} size={6} />
                <span className="text-[12px] text-muted-foreground truncate">
                  {hasAssignees
                    ? assignees.length === 1
                      ? assignees[0].profile?.full_name ?? 'Unknown'
                      : `${assignees.length} people assigned`
                    : <span className="italic">Unassigned</span>}
                </span>
              </div>
            </div>
          </div>

          {!hasAssignees && (
            <div className="mt-3 px-3 py-2 rounded-[10px] bg-warning/10 border border-warning/30 text-warning text-[12px] font-medium">
              This role is unassigned.
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-[max(env(safe-area-inset-bottom,16px),20px)]">
          {/* Responsibilities */}
          <div className="mb-5">
            <SectionLabel>Responsibilities</SectionLabel>
            <div className="bg-card border border-border/40 rounded-[12px] p-3 mt-2">
              <p className={cn(
                'text-[13px] leading-relaxed',
                role.responsibilities ? 'text-foreground whitespace-pre-line' : 'italic text-muted-foreground',
              )}>
                {role.responsibilities || 'No responsibilities documented yet.'}
              </p>
            </div>
          </div>

          {/* Direct reports */}
          {reports.length > 0 && (
            <div className="mb-5">
              <SectionLabel>
                Direct reports
                <span className="font-medium normal-case tracking-normal text-muted-foreground/70 ml-2">
                  {reports.length}
                </span>
              </SectionLabel>
              <div className="flex flex-col gap-1.5 mt-2">
                {reports.map((c) => {
                  const cAssignees = c.assignments ?? [];
                  const childCount = allRoles.filter((r) => r.reports_to_role_id === c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onNavigateToRole?.(c.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 bg-card border border-border/40 rounded-[10px] text-left transition-transform active:scale-[0.99]"
                    >
                      <AvatarStack assignees={cAssignees} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-foreground truncate">
                          {c.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {cAssignees.length === 0
                            ? 'Unassigned'
                            : cAssignees.length === 1
                              ? cAssignees[0].profile?.full_name ?? 'Unknown'
                              : `${cAssignees.length} people`}
                          {childCount > 0 && ` · ${childCount} report${childCount === 1 ? '' : 's'}`}
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          {onAddReport && (
            <Button
              type="button"
              onClick={() => onAddReport(role.id)}
              className="w-full h-11 mt-2 text-[13px] font-semibold gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add report under this role
            </Button>
          )}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <ActionButton
              icon={<Pencil className="h-3.5 w-3.5" />}
              label="Edit"
              onClick={() => onEdit?.(role.id)}
            />
            <ActionButton
              icon={<Move className="h-3.5 w-3.5" />}
              label="Move"
              onClick={() => onMove?.(role.id)}
            />
            <ActionButton
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Delete"
              tone="destructive"
              onClick={() => onDelete?.(role.id)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
    {children}
  </div>
);

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  tone?: 'default' | 'destructive';
  onClick?: () => void;
}> = ({ icon, label, tone = 'default', onClick }) => (
  <Button
    type="button"
    variant={tone === 'destructive' ? 'outline' : 'outline'}
    size="sm"
    onClick={onClick}
    className={cn(
      'h-10 text-[12px] font-semibold gap-1.5',
      tone === 'destructive' && 'text-destructive hover:text-destructive border-destructive/30',
    )}
  >
    {icon}
    {label}
  </Button>
);

/**
 * AvatarStack — up to 3 stacked avatars; renders an "Unassigned" placeholder
 * dotted circle when assignments[] is empty (matches the design intent of
 * making absence visible).
 */
const AvatarStack: React.FC<{
  assignees: OrgRole['assignments'];
  size?: number;
}> = ({ assignees = [], size = 32 }) => {
  if (assignees.length === 0) {
    return (
      <div
        className="rounded-full border-2 border-dashed border-warning/60 bg-warning/10 text-warning flex items-center justify-center shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        ?
      </div>
    );
  }
  return (
    <div className="flex items-center -space-x-2 shrink-0">
      {assignees.slice(0, 3).map((a) => {
        const initials = getInitials(a.profile?.full_name);
        return (
          <Avatar
            key={a.id}
            className="ring-2 ring-card"
            style={{ width: size, height: size }}
          >
            <AvatarImage src={a.profile?.avatar_url || undefined} />
            <AvatarFallback
              className="bg-muted text-muted-foreground"
              style={{ fontSize: size * 0.35 }}
            >
              {initials || '?'}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {assignees.length > 3 && (
        <div
          className="rounded-full bg-muted text-muted-foreground font-semibold ring-2 ring-card flex items-center justify-center shrink-0"
          style={{ width: size, height: size, fontSize: size * 0.35 }}
        >
          +{assignees.length - 3}
        </div>
      )}
    </div>
  );
};

export default MobileRoleDetailSheet;
