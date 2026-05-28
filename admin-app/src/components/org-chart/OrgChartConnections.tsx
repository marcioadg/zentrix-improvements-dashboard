import React, { useEffect, useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface ConnectionPoint {
  x: number;
  y: number;
}

interface RoleConnection {
  parentId: string;
  childId: string;
  parentPoint: ConnectionPoint;
  childPoint: ConnectionPoint;
}

interface OrgChartConnectionsProps {
  roles: any[];
  zoom: number;
  collapsedRoles: Set<string>;
  containerRef: React.RefObject<HTMLDivElement>;
  searchTerm?: string;
}

export const OrgChartConnections: React.FC<OrgChartConnectionsProps> = ({
  roles,
  zoom,
  collapsedRoles,
  containerRef,
  searchTerm
}) => {
  const [connections, setConnections] = useState<RoleConnection[]>([]);
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  const calculateConnections = useCallback(() => {
    if (!containerRef.current) return;

    const newConnections: RoleConnection[] = [];

    // Get all role elements
    const roleElements = new Map<string, HTMLElement>();
    roles.forEach(role => {
      const element = document.getElementById(`role-card-${role.id}`) as HTMLElement;
      if (element) {
        roleElements.set(role.id, element);
      }
    });

    // Use the inner (scaled) container as the coordinate space (unscaled layout metrics)
    const containerEl = containerRef.current as HTMLElement;

    // Helper to get element rect relative to the inner container using offset chain (ignores CSS transforms)
    const getRelativeRect = (el: HTMLElement, ancestor: HTMLElement) => {
      let x = 0;
      let y = 0;
      let cur: HTMLElement | null = el;
      while (cur && cur !== ancestor) {
        x += cur.offsetLeft;
        y += cur.offsetTop;
        cur = cur.offsetParent as HTMLElement | null;
      }
      return { left: x, top: y, width: el.offsetWidth, height: el.offsetHeight };
    };
    // Calculate connections for each parent-child relationship using unscaled layout metrics
    roles.forEach(role => {
      if (role.reports_to_role_id && !collapsedRoles.has(role.reports_to_role_id)) {
        const parentElement = roleElements.get(role.reports_to_role_id);
        const childElement = roleElements.get(role.id);

        if (parentElement && childElement) {
          const parentRel = getRelativeRect(parentElement, containerEl);
          const childRel = getRelativeRect(childElement, containerEl);

          const parentPoint: ConnectionPoint = {
            x: parentRel.left + parentRel.width / 2,
            y: parentRel.top + parentRel.height
          };

          const childPoint: ConnectionPoint = {
            x: childRel.left + childRel.width / 2,
            y: childRel.top
          };

          newConnections.push({
            parentId: role.reports_to_role_id,
            childId: role.id,
            parentPoint,
            childPoint
          });

          logger.log(`Connection for ${role.title} (zoom: ${zoom}):`, {
            parentPoint,
            childPoint,
            zoom
          });
        }
      }
    });

    // Set SVG dimensions to match the inner container's unscaled layout size
    setSvgDimensions({
      width: containerEl.offsetWidth,
      height: containerEl.offsetHeight
    });

    logger.log(`Calculated ${newConnections.length} connections, SVG dimensions:`, {
      width: containerEl.offsetWidth,
      height: containerEl.offsetHeight,
      zoom
    });

    setConnections(newConnections);
  }, [roles, zoom, collapsedRoles, containerRef]);

  // Recalculate connections when roles, zoom, or collapsed state changes
  useEffect(() => {
    // Use a longer timeout for zoom changes to ensure DOM has updated
    const timer = setTimeout(calculateConnections, 200);
    return () => clearTimeout(timer);
  }, [roles, zoom, collapsedRoles]);
  
  // Also recalculate on mount and when the calculate function changes
  useEffect(() => {
    calculateConnections();
  }, [calculateConnections]);

  useEffect(() => {
    const handleResize = () => {
      setTimeout(calculateConnections, 100); // Debounce resize
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateConnections]);


  // Observe role card size changes and DOM mutations to keep lines aligned
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(calculateConnections);
    });

    // Observe the container and all role cards
    ro.observe(container);
    const observeRoleCards = () => {
      const roleNodes = container.querySelectorAll('[id^="role-card-"]');
      roleNodes.forEach(node => ro.observe(node as Element));
    };
    observeRoleCards();

    // Watch for new/removed role cards
    const mo = new MutationObserver(() => {
      observeRoleCards();
      requestAnimationFrame(calculateConnections);
    });
    mo.observe(container, { childList: true, subtree: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [calculateConnections, containerRef]);

  // Hide connection lines when searching
  if (searchTerm) {
    return null;
  }

  // Group connections by parent to create proper hierarchy lines
  const connectionsByParent = connections.reduce((acc, conn) => {
    if (!acc[conn.parentId]) {
      acc[conn.parentId] = [];
    }
    acc[conn.parentId].push(conn);
    return acc;
  }, {} as Record<string, RoleConnection[]>);

  const renderConnectionLines = () => {
    const lines: JSX.Element[] = [];

    Object.entries(connectionsByParent).forEach(([parentId, childConnections]) => {
      if (childConnections.length === 0) return;

      const parentConnection = childConnections[0];
      const children = childConnections.map(c => c.childPoint);

      // If only one child, draw a straight vertical line from parent center
      if (children.length === 1) {
        const child = children[0];
        // Use parent's x-coordinate for both points to ensure vertical line
        const parentX = parentConnection.parentPoint.x;
        lines.push(
          <line
            key={`${parentId}-${parentConnection.childId}`}
            x1={parentX}
            y1={parentConnection.parentPoint.y}
            x2={parentX}
            y2={child.y}
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            strokeOpacity="0.6"
            strokeLinecap="round"
            className="transition-colors duration-200 hover:stroke-primary hover:stroke-opacity-80"
          />
        );
        return;
      }

      // For multiple children, create proper org chart lines
      const parentPoint = parentConnection.parentPoint;
      const minChildX = Math.min(...children.map(c => c.x));
      const maxChildX = Math.max(...children.map(c => c.x));
      const minChildY = Math.min(...children.map(c => c.y));
      const maxChildY = Math.max(...children.map(c => c.y));
      const avgChildY = children.reduce((sum, c) => sum + c.y, 0) / children.length;

      // Detect vertically stacked children (same X within small tolerance)
      const stackedTolerance = 4; // px
      const isVerticallyStacked = Math.abs(maxChildX - minChildX) <= stackedTolerance;

      if (isVerticallyStacked) {
        // Recompute anchors at left-center of each card and the parent
        const container = containerRef.current as HTMLElement | null;
        const getRelativeRect = (el: HTMLElement, ancestor: HTMLElement) => {
          let x = 0;
          let y = 0;
          let cur: HTMLElement | null = el;
          while (cur && cur !== ancestor) {
            x += cur.offsetLeft;
            y += cur.offsetTop;
            cur = cur.offsetParent as HTMLElement | null;
          }
          return { left: x, top: y, width: el.offsetWidth, height: el.offsetHeight };
        };

        if (!container) return;

        // Define anchor ratios for stacked case
        const HIGH_ANCHOR = 0.25; // children connect high-left
        const LOW_ANCHOR = 0.75;  // parent connects low-left
        const STROKE = 2;         // line stroke width
        const CAP = STROKE / 2;   // base half-cap length
        const capAdj = CAP / Math.max(zoom, 0.01); // scale-aware cap so end always reaches card
        const snap = (n: number) => Math.round(n); // snap to whole pixels for crisp lines

        // Parent low-left anchor
        const parentEl = document.getElementById(`role-card-${parentId}`) as HTMLElement | null;
        const parentRect = parentEl ? getRelativeRect(parentEl, container) : { left: parentPoint.x, top: parentPoint.y, width: 0, height: 0 };
        const parentLeftLow = {
          x: parentRect.left,
          y: parentRect.top + parentRect.height * LOW_ANCHOR
        };

        // Children high-left anchors
        const childAnchors = childConnections.map(conn => {
          const el = document.getElementById(`role-card-${conn.childId}`) as HTMLElement | null;
          if (!el) return { x: conn.childPoint.x, y: conn.childPoint.y };
          const r = getRelativeRect(el, container);
          return { x: r.left, y: r.top + r.height * HIGH_ANCHOR };
        });

        const minLeft = Math.min(...childAnchors.map(a => a.x));
        const minY = Math.min(...childAnchors.map(a => a.y));
        const maxY = Math.max(...childAnchors.map(a => a.y));

        // Draw a vertical trunk to the left and small horizontal stubs to each child
        const trunkGap = 24; // distance from children to trunk
        const trunkX = minLeft - trunkGap;
        // Ensure the trunk spans THROUGH the parent's low-left Y so the stub connects
        const trunkTopY = Math.min(minY, parentLeftLow.y);
        const trunkBottomY = Math.max(maxY, parentLeftLow.y);

        // Horizontal stub from trunk to parent's low-left (end exactly at card edge, cap-adjusted for zoom)
        lines.push(
          <line
            key={`${parentId}-trunk-to-parent`}
            x1={snap(trunkX)}
            y1={snap(parentLeftLow.y)}
            x2={parentLeftLow.x - capAdj}
            y2={snap(parentLeftLow.y)}
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            strokeOpacity="0.6"
            strokeLinecap="round"
            className="transition-colors duration-200 hover:stroke-primary hover:stroke-opacity-80"
          />
        );

        // Trunk connecting vertically stacked children (and passing by the parent Y)
        lines.push(
          <line
            key={`${parentId}-trunk`}
            x1={snap(trunkX)}
            y1={snap(trunkTopY)}
            x2={snap(trunkX)}
            y2={snap(trunkBottomY)}
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            strokeOpacity="0.6"
            strokeLinecap="round"
            className="transition-colors duration-200"
          />
        );

        // Small horizontal stubs from trunk to each child's high-left (end exactly at card edge, cap-adjusted for zoom)
        childAnchors.forEach((anchor, index) => {
          lines.push(
            <line
              key={`${parentId}-stub-${index}`}
              x1={snap(trunkX)}
              y1={snap(anchor.y)}
              x2={anchor.x - capAdj}
              y2={snap(anchor.y)}
              stroke="hsl(var(--foreground))"
              strokeWidth="2"
              strokeOpacity="0.6"
              strokeLinecap="round"
              className="transition-colors duration-200 hover:stroke-primary hover:stroke-opacity-80"
            />
          );
        });
        return; // done for stacked case
      }

      // Non-stacked: classic junction with horizontal bar
      const junctionY = parentPoint.y + (avgChildY - parentPoint.y) * 0.5;

      // Vertical line from parent to junction
      lines.push(
        <line
          key={`${parentId}-vertical`}
          x1={parentPoint.x}
          y1={parentPoint.y}
          x2={parentPoint.x}
          y2={junctionY}
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          strokeOpacity="0.6"
          strokeLinecap="round"
          className="transition-colors duration-200"
        />
      );

      // Horizontal line connecting all children at junction level
      if (minChildX !== maxChildX) {
        lines.push(
          <line
            key={`${parentId}-horizontal`}
            x1={minChildX}
            y1={junctionY}
            x2={maxChildX}
            y2={junctionY}
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            strokeOpacity="0.6"
            strokeLinecap="round"
            className="transition-colors duration-200"
          />
        );
      }

      // Vertical lines from junction to each child
      children.forEach((child, index) => {
        lines.push(
          <line
            key={`${parentId}-child-${index}`}
            x1={child.x}
            y1={junctionY}
            x2={child.x}
            y2={child.y}
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            strokeOpacity="0.6"
            strokeLinecap="round"
            className="transition-colors duration-200 hover:stroke-primary hover:stroke-opacity-80"
          />
        );
      });
    });

    return lines;
  };

  if (connections.length === 0) {
    return null;
  }

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        width: svgDimensions.width,
        height: svgDimensions.height,
        zIndex: 10 // Higher z-index to ensure lines appear above content
      }}
    >
      {renderConnectionLines()}
    </svg>
  );
};