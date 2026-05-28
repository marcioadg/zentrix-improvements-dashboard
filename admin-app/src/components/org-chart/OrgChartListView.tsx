import React from 'react';
import { Building, ChevronRight, User } from 'lucide-react';
import { OrgRole } from '@/hooks/useOrgChartOptimized';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

interface OrgChartListViewProps {
  roles: OrgRole[];
  searchTerm: string;
  onEditRole?: (roleId: string) => void;
}

const buildTree = (roles: OrgRole[]): Array<{ role: OrgRole; depth: number }> => {
  const childrenMap = new Map<string | null, OrgRole[]>();

  for (const role of roles) {
    const parentId = role.reports_to_role_id ?? null;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(role);
  }

  const result: Array<{ role: OrgRole; depth: number }> = [];

  const traverse = (parentId: string | null, depth: number) => {
    const children = childrenMap.get(parentId) ?? [];
    const sorted = [...children].sort((a, b) =>
      (a.position_x ?? 0) - (b.position_x ?? 0) || a.title.localeCompare(b.title)
    );
    for (const role of sorted) {
      result.push({ role, depth });
      traverse(role.id, depth + 1);
    }
  };

  traverse(null, 0);

  // Orphaned roles (parent missing)
  const trackedIds = new Set(result.map((r) => r.role.id));
  for (const role of roles) {
    if (!trackedIds.has(role.id)) {
      result.push({ role, depth: 0 });
    }
  }

  return result;
};

export const OrgChartListView: React.FC<OrgChartListViewProps> = ({
  roles,
  searchTerm,
  onEditRole,
}) => {
  const lowerSearch = searchTerm.toLowerCase();

  const filtered = searchTerm
    ? roles.filter(
        (r) =>
          r.title.toLowerCase().includes(lowerSearch) ||
          (r.responsibilities ?? '').toLowerCase().includes(lowerSearch) ||
          r.assignments?.some((a) =>
            a.profile?.full_name?.toLowerCase().includes(lowerSearch)
          )
      )
    : roles;

  const tree = buildTree(filtered);

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-muted-foreground">
        <Building className="h-10 w-10 opacity-30" />
        <p className="text-sm">
          {searchTerm ? 'No roles match your search.' : 'No roles yet. Add your first role to get started.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[35%]">Role</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[30%] hidden sm:table-cell">Responsibilities</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[25%]">Assigned To</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[10%] hidden sm:table-cell">Reports To</th>
          </tr>
        </thead>
        <tbody>
          {tree.map(({ role, depth }) => {
            const assignees = role.assignments ?? [];
            const reportsTo = roles.find((r) => r.id === role.reports_to_role_id);

            return (
              <tr
                key={role.id}
                className={cn(
                  'border-b border-border/50 transition-colors',
                  onEditRole && 'cursor-pointer hover:bg-muted/30'
                )}
                onClick={() => onEditRole?.(role.id)}
              >
                {/* Role title with indentation */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {/* Indentation chevrons */}
                    {depth > 0 && (
                      <span className="flex items-center gap-0.5 text-muted-foreground/40">
                        {Array.from({ length: depth }).map((_, i) => (
                          <ChevronRight key={i} className="h-3 w-3 shrink-0" />
                        ))}
                      </span>
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                      {role.personality_color && (
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            {
                              'bg-destructive': role.personality_color === 'red',
                              'bg-yellow-500': role.personality_color === 'yellow',
                              'bg-green-500': role.personality_color === 'green',
                              'bg-primary': role.personality_color === 'blue',
                            }
                          )}
                        />
                      )}
                      <span className="font-medium truncate">{role.title}</span>
                    </div>
                  </div>
                </td>

                {/* Responsibilities */}
                <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                  <span className="line-clamp-2 text-xs">
                    {role.responsibilities || '—'}
                  </span>
                </td>

                {/* Assignees */}
                <td className="px-4 py-2.5">
                  {assignees.length === 0 ? (
                    <span className="text-muted-foreground/60 text-xs italic">Unassigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {assignees.map((a) => (
                        <div key={a.id} className="flex items-center gap-1.5">
                          {a.profile ? (
                            <UserAvatar
                              userId={a.profile.id}
                              fullName={a.profile.full_name}
                              avatarUrl={a.profile.avatar_url}
                              size="sm"
                            />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-xs truncate max-w-[100px]">
                            {a.profile?.full_name ?? 'Unknown'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                {/* Reports to */}
                <td className="px-4 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
                  {reportsTo ? (
                    <span className="truncate block max-w-[120px]">{reportsTo.title}</span>
                  ) : (
                    <span className="italic opacity-50">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
