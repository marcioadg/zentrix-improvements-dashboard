import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { useOrgRoles, OrgRole } from './usePrototypeData';

interface TreeNode extends OrgRole {
  children: TreeNode[];
}

const buildTree = (roles: OrgRole[]): TreeNode[] => {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  roles.forEach(r => map.set(r.id, { ...r, children: [] }));

  roles.forEach(r => {
    const node = map.get(r.id)!;
    if (r.reports_to_role_id && map.has(r.reports_to_role_id)) {
      map.get(r.reports_to_role_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const OrgNode: React.FC<{
  node: TreeNode;
  depth: number;
  t: any;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
}> = ({ node, depth, t, expanded, toggleExpand }) => {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-[4px] transition-colors cursor-pointer group"
        style={{ marginLeft: depth * 24 }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => hasChildren && toggleExpand(node.id)}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown size={13} style={{ color: t.textMuted }} /> : <ChevronRight size={13} style={{ color: t.textMuted }} />
        ) : (
          <span className="w-[13px]" />
        )}
        {node.assigned_user_initials ? (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: t.avatarBg, color: t.accent }}>
            {node.assigned_user_initials}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 border border-dashed" style={{ borderColor: t.border, color: t.textMuted }}>
            ?
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium" style={{ color: t.textPrimary }}>{node.title}</div>
          <div className="text-[11px]" style={{ color: t.textMuted }}>
            {node.assigned_user || 'Vacant'}
            {node.children.length > 0 && ` · ${node.children.length} reports`}
          </div>
        </div>
      </div>
      {isExpanded && node.children.map(child => (
        <OrgNode key={child.id} node={child} depth={depth + 1} t={t} expanded={expanded} toggleExpand={toggleExpand} />
      ))}
    </div>
  );
};

const LinearOrgChart: React.FC = () => {
  const { roles, loading } = useOrgRoles();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(roles), [roles]);

  // Auto-expand first 2 levels on first load
  React.useEffect(() => {
    if (roles.length > 0 && expanded.size === 0) {
      const toExpand = new Set<string>();
      tree.forEach(root => {
        toExpand.add(root.id);
        root.children.forEach(child => toExpand.add(child.id));
      });
      setExpanded(toExpand);
    }
  }, [roles, tree]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(roles.map(r => r.id)));
  const collapseAll = () => setExpanded(new Set());

  const filledRoles = roles.filter(r => r.assigned_user).length;
  const vacantRoles = roles.filter(r => !r.assigned_user).length;

  return (
    <LinearLayout activeLabel="Org Chart" searchPlaceholder="Search roles...">
      {({ t }) => {
        if (loading) return <LoadingSkeleton t={t} rows={10} />;

        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Org Chart</h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>{roles.length} roles · {filledRoles} filled · {vacantRoles} vacant</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={expandAll} className="px-3 py-1.5 rounded-[5px] border text-[12px] transition-colors" style={{ borderColor: t.border, color: t.textSecondary }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  Expand All
                </button>
                <button onClick={collapseAll} className="px-3 py-1.5 rounded-[5px] border text-[12px] transition-colors" style={{ borderColor: t.border, color: t.textSecondary }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  Collapse All
                </button>
              </div>
            </div>

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-3 gap-px mb-6 rounded-[6px] overflow-hidden border" style={{ borderColor: t.border }}>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Total Roles</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.textPrimary }}>{roles.length}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Filled</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-emerald-400">{filledRoles}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Vacant</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-amber-400">{vacantRoles}</span>
              </div>
            </div>

            {/* ── Org tree ── */}
            <div className="rounded-[6px] border overflow-hidden" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
              <div className="p-2">
                {tree.length === 0 && (
                  <div className="text-center py-12 text-[13px]" style={{ color: t.textMuted }}>No roles defined yet</div>
                )}
                {tree.map(root => (
                  <OrgNode key={root.id} node={root} depth={0} t={t} expanded={expanded} toggleExpand={toggleExpand} />
                ))}
              </div>
            </div>

            <FooterHint t={t} />
          </>
        );
      }}
    </LinearLayout>
  );
};

export default LinearOrgChart;
