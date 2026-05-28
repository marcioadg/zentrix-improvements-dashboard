/**
 * MobileOrgFocusView — Variant B (Focus mode).
 *
 * Renders one role at a time as a hero card. Above: breadcrumb (tap a
 * parent to jump up). Below the hero: a 2-col grid of direct reports
 * (tap to focus on them). Floating pill at the bottom: sibling pager
 * (prev / next + "X of N").
 *
 * If no role is currently focused (e.g. no roles in the company), shows
 * an empty state. The parent owns focusedRoleId state; this component
 * is fully controlled.
 */
import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Move, Trash2, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { OrgRole } from '@/hooks/useOrgChartOptimized';
import { MobileOrgColorDot } from './MobileOrgColorDot';

interface MobileOrgFocusViewProps {
  roles: OrgRole[];
  focusedRoleId: string | null;
  onFocusRole: (roleId: string | null) => void;
  onEdit?: (roleId: string) => void;
  onMove?: (roleId: string) => void;
  onDelete?: (roleId: string) => void;
  /** Open Create-role with this role pre-set as the parent. */
  onAddReport?: (parentRoleId: string) => void;
}

/** Sort siblings by position_x → title — matches desktop's tree sort. */
function sortSiblings(roles: OrgRole[]): OrgRole[] {
  return [...roles].sort(
    (a, b) =>
      (a.position_x ?? 0) - (b.position_x ?? 0) ||
      a.title.localeCompare(b.title),
  );
}

function buildPath(roles: OrgRole[], roleId: string | null): OrgRole[] {
  if (!roleId) return [];
  const byId = new Map(roles.map((r) => [r.id, r]));
  const path: OrgRole[] = [];
  const seen = new Set<string>();
  let cur: OrgRole | undefined = byId.get(roleId);
  while (cur && !seen.has(cur.id)) {
    path.unshift(cur);
    seen.add(cur.id);
    cur = cur.reports_to_role_id ? byId.get(cur.reports_to_role_id) : undefined;
  }
  return path;
}

export const MobileOrgFocusView: React.FC<MobileOrgFocusViewProps> = ({
  roles,
  focusedRoleId,
  onFocusRole,
  onEdit,
  onMove,
  onDelete,
  onAddReport,
}) => {
  const role = useMemo(
    () => (focusedRoleId ? roles.find((r) => r.id === focusedRoleId) ?? null : null),
    [roles, focusedRoleId],
  );

  const path = useMemo(() => buildPath(roles, focusedRoleId), [roles, focusedRoleId]);
  const reports = useMemo(
    () => (role ? sortSiblings(roles.filter((r) => r.reports_to_role_id === role.id)) : []),
    [roles, role],
  );

  const siblings = useMemo(() => {
    if (!role) return [];
    const parentId = role.reports_to_role_id ?? null;
    return sortSiblings(roles.filter((r) => (r.reports_to_role_id ?? null) === parentId));
  }, [roles, role]);

  if (!role) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Pick a role from Hierarchy or Canvas to focus on it.
      </div>
    );
  }

  const assignees = role.assignments ?? [];
  const siblingIndex = siblings.findIndex((s) => s.id === role.id);
  const hasPrev = siblingIndex > 0;
  const hasNext = siblingIndex >= 0 && siblingIndex < siblings.length - 1;

  return (
    <div className="flex flex-col gap-4 pb-16">
      {/* Breadcrumb */}
      {path.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap text-[11px] text-muted-foreground">
          {path.slice(0, -1).map((p, i) => (
            <React.Fragment key={p.id}>
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
              <button
                type="button"
                onClick={() => onFocusRole(p.id)}
                className="px-1.5 py-0.5 rounded-[4px] bg-card border border-border/40 active:bg-muted/60 truncate max-w-[120px]"
              >
                {p.title}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Hero */}
      <div className="bg-card border border-border/40 rounded-[16px] p-5 relative overflow-hidden">
        <div className="flex flex-col items-center text-center gap-3">
          <AvatarStackLarge assignees={assignees} />
          <div>
            <div className="text-[23px] font-bold text-foreground leading-[1.15] tracking-[-0.4px]">
              {role.title}
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <MobileOrgColorDot color={role.personality_color} size={6} />
              <span className="text-[12px] text-muted-foreground">
                {assignees.length === 0
                  ? <span className="italic">Unassigned</span>
                  : assignees.length === 1
                    ? assignees[0].profile?.full_name ?? 'Unknown'
                    : `${assignees.length} people assigned`}
              </span>
            </div>
          </div>

          {assignees.length === 0 && (
            <div className="w-full mt-1 px-3 py-2 rounded-[10px] bg-warning/10 border border-warning/30 text-warning text-[11.5px] font-medium">
              This role is unassigned.
            </div>
          )}
        </div>

        {/* Responsibilities */}
        <div className="mt-4 pt-4 border-t border-border/40">
          <SectionLabel>Responsibilities</SectionLabel>
          <p className={cn(
            'text-[13px] leading-relaxed mt-1.5',
            role.responsibilities ? 'text-foreground whitespace-pre-line' : 'italic text-muted-foreground',
          )}>
            {role.responsibilities || 'No responsibilities documented yet.'}
          </p>
        </div>

        {/* Actions */}
        {onAddReport && (
          <Button
            type="button"
            className="w-full h-10 mt-4 text-[13px] font-semibold gap-1.5"
            onClick={() => onAddReport(role.id)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add report under this role
          </Button>
        )}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {onEdit && (
            <Button variant="outline" size="sm" className="h-9 text-[12px] gap-1.5" onClick={() => onEdit(role.id)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
          {onMove && (
            <Button variant="outline" size="sm" className="h-9 text-[12px] gap-1.5" onClick={() => onMove(role.id)}>
              <Move className="h-3.5 w-3.5" /> Move
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-[12px] gap-1.5 text-destructive border-destructive/30 hover:text-destructive"
              onClick={() => onDelete(role.id)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Direct reports — 2-col tile grid */}
      {reports.length > 0 && (
        <div>
          <SectionLabel>
            Direct reports
            <span className="font-medium normal-case tracking-normal text-muted-foreground/70 ml-2">
              {reports.length}
            </span>
          </SectionLabel>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {reports.map((c) => {
              const cAss = c.assignments ?? [];
              const grand = roles.filter((r) => r.reports_to_role_id === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onFocusRole(c.id)}
                  className="text-left bg-card border border-border/40 rounded-[12px] p-3 transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={cAss[0]?.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {cAss.length === 0
                          ? '?'
                          : getInitials(cAss[0].profile?.full_name) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {grand > 0 && (
                      <span className="text-[10px] font-semibold tabular-nums bg-muted/70 text-muted-foreground rounded-full px-2 py-0.5">
                        {grand}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MobileOrgColorDot color={c.personality_color} size={6} />
                    <div className="text-[12px] font-semibold text-foreground truncate">
                      {c.title}
                    </div>
                  </div>
                  <div className="text-[10.5px] text-muted-foreground truncate mt-0.5">
                    {cAss.length === 0
                      ? <span className="italic">Unassigned</span>
                      : cAss.length === 1
                        ? cAss[0].profile?.full_name ?? 'Unknown'
                        : `${cAss.length} people`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sibling pager — floating pill */}
      {siblings.length > 1 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[max(calc(env(safe-area-inset-bottom,0)+78px),84px)] z-10 flex items-center gap-1 bg-card border border-border/40 rounded-full shadow-lg px-2 py-1">
          <button
            type="button"
            disabled={!hasPrev}
            aria-label="Previous sibling"
            onClick={() => hasPrev && onFocusRole(siblings[siblingIndex - 1].id)}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              hasPrev ? 'text-foreground active:bg-muted/60' : 'text-muted-foreground/40',
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground px-1">
            {siblingIndex + 1} of {siblings.length}
          </span>
          <button
            type="button"
            disabled={!hasNext}
            aria-label="Next sibling"
            onClick={() => hasNext && onFocusRole(siblings[siblingIndex + 1].id)}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              hasNext ? 'text-foreground active:bg-muted/60' : 'text-muted-foreground/40',
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
    {children}
  </div>
);

const AvatarStackLarge: React.FC<{ assignees: OrgRole['assignments'] }> = ({
  assignees = [],
}) => {
  if (assignees.length === 0) {
    return (
      <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-warning/60 bg-warning/10 text-warning flex items-center justify-center text-2xl">
        ?
      </div>
    );
  }
  if (assignees.length === 1) {
    const a = assignees[0];
    const initials = getInitials(a.profile?.full_name);
    return (
      <Avatar className="h-[72px] w-[72px]">
        <AvatarImage src={a.profile?.avatar_url || undefined} />
        <AvatarFallback className="bg-muted text-muted-foreground text-xl">
          {initials || '?'}
        </AvatarFallback>
      </Avatar>
    );
  }
  return (
    <div className="flex items-center -space-x-3">
      {assignees.slice(0, 3).map((a) => {
        const initials = getInitials(a.profile?.full_name);
        return (
          <Avatar key={a.id} className="h-14 w-14 ring-4 ring-card">
            <AvatarImage src={a.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground text-base">
              {initials || '?'}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {assignees.length > 3 && (
        <div className="h-14 w-14 rounded-full bg-muted text-muted-foreground font-semibold ring-4 ring-card flex items-center justify-center text-sm">
          +{assignees.length - 3}
        </div>
      )}
    </div>
  );
};

export default MobileOrgFocusView;
