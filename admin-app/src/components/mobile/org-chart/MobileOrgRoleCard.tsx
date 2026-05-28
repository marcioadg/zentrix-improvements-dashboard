/**
 * MobileOrgRoleCard — a single row card used in the hierarchy view and as
 * a "direct reports" row inside the detail sheet.
 *
 * Layout:
 *   [caret? (if hasChildren)] [color-dot] [title / assignees-summary] [child-count]? [chevron-right]
 *
 * Mirrors desktop's OrgChartListView row semantics:
 *  - "Unassigned" label (not "Open seat") when assignments[] is empty
 *  - Multi-assignment: shows up to 2 avatars + "+N" overflow, plus first
 *    assignee's name (or "N people" when 2+)
 *  - Optional depth-based indentation (24dp per level), capped at 4 levels
 *    so deep trees don't run off the right edge
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { OrgRole } from '@/hooks/useOrgChartOptimized';
import { MobileOrgColorDot } from './MobileOrgColorDot';

interface MobileOrgRoleCardProps {
  role: OrgRole;
  /** Tree depth (0 = root). Indents the row by 24px * min(depth, 4). */
  depth?: number;
  /** Number of direct children. Shown as a badge on the right. */
  childCount?: number;
  /** Whether this card is expandable (shows caret on the left). */
  expandable?: boolean;
  /** Current expanded state — drives caret rotation. */
  expanded?: boolean;
  /** Toggle expand/collapse — called when caret is tapped. */
  onToggle?: () => void;
  /** Tap the body — opens detail sheet, focus mode, etc. */
  onTap?: () => void;
  /** Long-press → opens move picker. Phase 6 wires this. */
  onLongPress?: () => void;
}

const MAX_INDENT_LEVELS = 4;
const INDENT_PX = 20;

export const MobileOrgRoleCard: React.FC<MobileOrgRoleCardProps> = ({
  role,
  depth = 0,
  childCount = 0,
  expandable = false,
  expanded = false,
  onToggle,
  onTap,
  onLongPress,
}) => {
  const assignees = role.assignments ?? [];
  const hasAssignees = assignees.length > 0;
  const firstAssignee = assignees[0]?.profile;
  const overflow = Math.max(0, assignees.length - 2);
  const indentPx = Math.min(depth, MAX_INDENT_LEVELS) * INDENT_PX;

  // Long-press detection via touch — 500ms threshold matches platform convention.
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = React.useRef(false);

  const startLongPress = () => {
    if (!onLongPress) return;
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      onLongPress();
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const handleTap = () => {
    // Suppress tap if long-press already fired.
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    onTap?.();
  };

  return (
    <div
      className="flex items-stretch"
      style={{ paddingLeft: indentPx }}
    >
      {/* Depth guides — thin vertical lines at each ancestor level */}
      {depth > 0 && (
        <span
          aria-hidden="true"
          className="border-l border-border/40"
          style={{ marginLeft: -8, marginRight: 4 }}
        />
      )}

      <div
        className={cn(
          'flex-1 bg-card border border-border/40 rounded-[12px]',
          'flex items-center gap-2 px-2.5 py-2',
          'transition-transform duration-150',
          onTap && 'active:scale-[0.99]',
        )}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
        onTouchMove={cancelLongPress}
      >
        {/* Caret (expand/collapse) */}
        {expandable ? (
          <button
            type="button"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform duration-150',
                expanded && 'rotate-90',
              )}
            />
          </button>
        ) : (
          <span className="w-6 h-6" aria-hidden="true" />
        )}

        {/* Color dot + role title + assignee info */}
        <button
          type="button"
          onClick={handleTap}
          className="flex-1 text-left min-w-0 flex items-center gap-2"
        >
          <MobileOrgColorDot color={role.personality_color} size={8} />
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate">
              {role.title}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              {hasAssignees ? (
                assignees.length === 1
                  ? firstAssignee?.full_name ?? 'Unknown'
                  : `${assignees.length} people`
              ) : (
                <span className="italic text-muted-foreground/80">Unassigned</span>
              )}
            </span>
          </div>
        </button>

        {/* Assignee avatars (up to 2 + "+N") */}
        {hasAssignees && (
          <div className="flex items-center -space-x-1.5 shrink-0">
            {assignees.slice(0, 2).map((a) => {
              const initials = getInitials(a.profile?.full_name);
              return (
                <Avatar
                  key={a.id}
                  className="h-6 w-6 ring-2 ring-card"
                >
                  <AvatarImage src={a.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                    {initials || '?'}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {overflow > 0 && (
              <span className="h-6 min-w-6 px-1 rounded-full bg-muted text-[9px] font-semibold text-muted-foreground flex items-center justify-center ring-2 ring-card">
                +{overflow}
              </span>
            )}
          </div>
        )}

        {/* Child-count chip */}
        {childCount > 0 && (
          <span className="text-[10px] font-semibold bg-muted/70 text-muted-foreground rounded-full px-2 py-0.5 shrink-0 tabular-nums">
            {childCount}
          </span>
        )}

        {/* Tap chevron */}
        {onTap && (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </div>
    </div>
  );
};

export default MobileOrgRoleCard;
