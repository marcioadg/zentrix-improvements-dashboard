/**
 * MobileOrgHierarchyView — Variant A (Hierarchy list).
 *
 * Mirrors desktop's OrgChartListView (src/components/org-chart/
 * OrgChartListView.tsx) for tree shape semantics:
 *   - Sort siblings by position_x → title
 *   - Walk DFS from root (parent === null)
 *   - Orphans (parent missing) appended at depth 0
 *   - Search across title + responsibilities + assignee names
 *
 * Mobile-specific behavior:
 *   - Expand/collapse state per role (Set<string>)
 *   - When search is active, expand ALL ancestors of matches so they're
 *     visible
 *   - Toolbar w/ "Expand all" / "Collapse all" controls
 *
 * Rows are rendered via MobileOrgRoleCard. Tap → onSelectRole. Long-press
 * (built into the card) → onLongPressRole.
 */
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { OrgRole } from '@/hooks/useOrgChartOptimized';
import { MobileOrgRoleCard } from './MobileOrgRoleCard';

interface MobileOrgHierarchyViewProps {
  roles: OrgRole[];
  searchTerm?: string;
  onSelectRole?: (roleId: string) => void;
  onLongPressRole?: (roleId: string) => void;
}

interface TreeRow {
  role: OrgRole;
  depth: number;
  childIds: string[];
  parentChain: string[];
}

/** Build a DFS-ordered tree. Sort siblings by position_x → title (matches desktop). */
function buildTree(roles: OrgRole[]): TreeRow[] {
  const childrenMap = new Map<string | null, OrgRole[]>();
  for (const role of roles) {
    const parentId = role.reports_to_role_id ?? null;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(role);
  }
  // Sort siblings.
  for (const arr of childrenMap.values()) {
    arr.sort(
      (a, b) =>
        (a.position_x ?? 0) - (b.position_x ?? 0) ||
        a.title.localeCompare(b.title),
    );
  }

  const tracked = new Set<string>();
  const result: TreeRow[] = [];

  const visit = (parentId: string | null, depth: number, parentChain: string[]) => {
    const kids = childrenMap.get(parentId) ?? [];
    for (const role of kids) {
      const childIds = (childrenMap.get(role.id) ?? []).map((c) => c.id);
      result.push({ role, depth, childIds, parentChain });
      tracked.add(role.id);
      visit(role.id, depth + 1, [...parentChain, role.id]);
    }
  };
  visit(null, 0, []);

  // Orphans (parent not in roles): append at depth 0 — desktop's same pattern.
  const knownIds = new Set(roles.map((r) => r.id));
  for (const r of roles) {
    if (!tracked.has(r.id) && r.reports_to_role_id && !knownIds.has(r.reports_to_role_id)) {
      const childIds = (childrenMap.get(r.id) ?? []).map((c) => c.id);
      result.push({ role: r, depth: 0, childIds, parentChain: [] });
    }
  }

  return result;
}

export const MobileOrgHierarchyView: React.FC<MobileOrgHierarchyViewProps> = ({
  roles,
  searchTerm = '',
  onSelectRole,
  onLongPressRole,
}) => {
  // Expand/collapse state. Default expand: all root-level rows + everything
  // when there's an active search (so matches aren't hidden).
  const tree = useMemo(() => buildTree(roles), [roles]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Filter rows by search term across title / responsibilities / assignees.
  const filteredTree = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (!lower) return tree;
    return tree.filter(({ role }) => {
      if (role.title.toLowerCase().includes(lower)) return true;
      if ((role.responsibilities ?? '').toLowerCase().includes(lower)) return true;
      return (role.assignments ?? []).some((a) =>
        (a.profile?.full_name ?? '').toLowerCase().includes(lower),
      );
    });
  }, [tree, searchTerm]);

  // When searching, expand the ancestors of every match so users can see
  // where matches live in the tree.
  const effectiveExpanded = useMemo<Set<string>>(() => {
    if (!searchTerm.trim()) return expanded;
    const next = new Set(expanded);
    for (const row of filteredTree) {
      for (const ancestor of row.parentChain) next.add(ancestor);
    }
    return next;
  }, [expanded, filteredTree, searchTerm]);

  // Visible rows: a row is visible if every ancestor in its parentChain
  // is expanded (or if search is active and ancestors were auto-expanded).
  const visibleRows = useMemo(() => {
    const allFilteredIds = new Set(filteredTree.map((r) => r.role.id));
    return filteredTree.filter((row) => {
      // Always show roots.
      if (row.depth === 0) return true;
      // Only show if all ancestors are present in filtered set AND expanded.
      return row.parentChain.every(
        (id) => effectiveExpanded.has(id) && allFilteredIds.has(id),
      );
    });
  }, [filteredTree, effectiveExpanded]);

  const allExpandable = filteredTree.filter((r) => r.childIds.length > 0).map((r) => r.role.id);

  const expandAll = () => setExpanded(new Set(allExpandable));
  const collapseAll = () => setExpanded(new Set());
  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {visibleRows.length} of {filteredTree.length} visible
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-primary"
            onClick={expandAll}
          >
            Expand all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground"
            onClick={collapseAll}
          >
            Collapse all
          </Button>
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1.5">
        {visibleRows.map(({ role, depth, childIds }) => (
          <MobileOrgRoleCard
            key={role.id}
            role={role}
            depth={depth}
            childCount={childIds.length}
            expandable={childIds.length > 0}
            expanded={effectiveExpanded.has(role.id)}
            onToggle={() => toggle(role.id)}
            onTap={() => onSelectRole?.(role.id)}
            onLongPress={onLongPressRole ? () => onLongPressRole(role.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default MobileOrgHierarchyView;
