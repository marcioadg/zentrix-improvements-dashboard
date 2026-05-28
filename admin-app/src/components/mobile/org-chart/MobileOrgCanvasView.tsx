/**
 * MobileOrgCanvasView — Variant C (pannable, pinch-zoom SVG canvas).
 *
 * Layout: classic "tidy tree" — children spread horizontally beneath each
 * parent. Subtree widths computed bottom-up, x positions assigned top-down.
 * No external layout library; pure trig.
 *
 * Interactions:
 *   - 1-finger drag → pan
 *   - 2-finger pinch → zoom (best-effort via Touch events; if a particular
 *     iOS Safari version blocks it, the +/- buttons remain functional)
 *   - +/- buttons → discrete zoom (0.6x .. 2.5x range)
 *   - Reset button → fit-to-screen and recenter on root
 *   - Tap any node → onSelectRole(roleId)
 *
 * Mini-map: top-right; tap to recenter on a region.
 *
 * Sort siblings by position_x → title (matches desktop tree sort).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { OrgRole } from '@/hooks/useOrgChartOptimized';
import { cn } from '@/lib/utils';

interface MobileOrgCanvasViewProps {
  roles: OrgRole[];
  onSelectRole?: (roleId: string) => void;
}

// Layout constants
const NODE_W = 132;
const NODE_H = 56;
const NODE_GAP_X = 16;
const NODE_GAP_Y = 80;

// Zoom bounds
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

const PERSONALITY_HEX: Record<string, string> = {
  red: 'hsl(0 80% 55%)',
  yellow: 'hsl(48 90% 50%)',
  green: 'hsl(140 60% 45%)',
  blue: 'hsl(231 56% 60%)',
};

interface LaidOutNode {
  role: OrgRole;
  x: number;
  y: number;
  subtreeWidth: number;
}

interface LaidOutEdge {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/**
 * Builds a tidy-tree layout. Returns laid-out nodes and orthogonal edges
 * connecting each parent to its children.
 */
function layoutTree(roles: OrgRole[]): {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
} {
  if (roles.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

  const childrenMap = new Map<string | null, OrgRole[]>();
  for (const role of roles) {
    const pid = role.reports_to_role_id ?? null;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(role);
  }
  for (const arr of childrenMap.values()) {
    arr.sort(
      (a, b) =>
        (a.position_x ?? 0) - (b.position_x ?? 0) ||
        a.title.localeCompare(b.title),
    );
  }

  // Phase 1: compute subtree widths bottom-up.
  const widthCache = new Map<string, number>();
  const knownIds = new Set(roles.map((r) => r.id));
  const computeWidth = (id: string): number => {
    if (widthCache.has(id)) return widthCache.get(id)!;
    const kids = childrenMap.get(id) ?? [];
    if (kids.length === 0) {
      widthCache.set(id, NODE_W);
      return NODE_W;
    }
    let total = 0;
    for (const kid of kids) total += computeWidth(kid.id);
    total += NODE_GAP_X * (kids.length - 1);
    const w = Math.max(NODE_W, total);
    widthCache.set(id, w);
    return w;
  };

  // Phase 2: lay out top-down. Roots are anything with parent === null OR
  // a parent that doesn't exist in our set (orphans).
  const roots: OrgRole[] = roles.filter(
    (r) => !r.reports_to_role_id || !knownIds.has(r.reports_to_role_id),
  );
  roots.sort(
    (a, b) =>
      (a.position_x ?? 0) - (b.position_x ?? 0) || a.title.localeCompare(b.title),
  );
  for (const r of roots) computeWidth(r.id);

  const nodes: LaidOutNode[] = [];
  const edges: LaidOutEdge[] = [];
  let cursorX = 0;
  const maxY = { value: 0 };

  const placeSubtree = (role: OrgRole, leftX: number, y: number) => {
    const w = widthCache.get(role.id) ?? NODE_W;
    const cx = leftX + w / 2;
    nodes.push({
      role,
      x: cx - NODE_W / 2,
      y,
      subtreeWidth: w,
    });
    maxY.value = Math.max(maxY.value, y + NODE_H);

    const kids = childrenMap.get(role.id) ?? [];
    if (kids.length === 0) return;

    let kidCursor = leftX;
    for (const kid of kids) {
      const kw = widthCache.get(kid.id) ?? NODE_W;
      const kidCenterX = kidCursor + kw / 2;
      // Orthogonal edge: down from parent, over, down to child.
      edges.push({
        fromX: cx,
        fromY: y + NODE_H,
        toX: kidCenterX,
        toY: y + NODE_GAP_Y,
      });
      placeSubtree(kid, kidCursor, y + NODE_GAP_Y);
      kidCursor += kw + NODE_GAP_X;
    }
  };

  for (const r of roots) {
    placeSubtree(r, cursorX, 0);
    cursorX += (widthCache.get(r.id) ?? NODE_W) + NODE_GAP_X * 2;
  }

  return {
    nodes,
    edges,
    width: Math.max(NODE_W, cursorX - NODE_GAP_X * 2),
    height: Math.max(NODE_H, maxY.value),
  };
}

export const MobileOrgCanvasView: React.FC<MobileOrgCanvasViewProps> = ({
  roles,
  onSelectRole,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 40 });

  const { nodes, edges, width: treeW, height: treeH } = useMemo(
    () => layoutTree(roles),
    [roles],
  );

  // Center the tree once we know its size and the container's size.
  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el || treeW === 0 || treeH === 0) return;
    const padding = 40;
    const sx = (el.clientWidth - padding * 2) / treeW;
    const sy = (el.clientHeight - padding * 2) / treeH;
    const scale = Math.min(Math.max(Math.min(sx, sy), MIN_ZOOM), 1);
    const tx = (el.clientWidth - treeW * scale) / 2;
    const ty = padding;
    setView({ scale, tx, ty });
  }, [treeW, treeH]);

  // Initial fit (after layout + first paint).
  useEffect(() => {
    fitToScreen();
  }, [fitToScreen]);

  // ── Touch gestures: 1-finger pan / 2-finger pinch ─────────────────────
  const gestureRef = useRef<{
    mode: 'idle' | 'pan' | 'pinch';
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
    pinchStartDist: number;
    pinchStartScale: number;
    pinchCenterX: number;
    pinchCenterY: number;
  }>({
    mode: 'idle',
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    pinchCenterX: 0,
    pinchCenterY: 0,
  });

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const g = gestureRef.current;
    if (e.touches.length === 1) {
      g.mode = 'pan';
      g.startX = e.touches[0].clientX;
      g.startY = e.touches[0].clientY;
      g.startTx = view.tx;
      g.startTy = view.ty;
    } else if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      g.mode = 'pinch';
      g.pinchStartDist = Math.hypot(dx, dy);
      g.pinchStartScale = view.scale;
      const rect = containerRef.current?.getBoundingClientRect();
      g.pinchCenterX = (a.clientX + b.clientX) / 2 - (rect?.left ?? 0);
      g.pinchCenterY = (a.clientY + b.clientY) / 2 - (rect?.top ?? 0);
      g.startTx = view.tx;
      g.startTy = view.ty;
    }
  };

  const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const g = gestureRef.current;
    if (g.mode === 'pan' && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - g.startX;
      const dy = e.touches[0].clientY - g.startY;
      setView((v) => ({ ...v, tx: g.startTx + dx, ty: g.startTy + dy }));
    } else if (g.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const newDist = Math.hypot(dx, dy);
      const factor = newDist / Math.max(1, g.pinchStartDist);
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.pinchStartScale * factor));
      // Keep the pinch midpoint stable on screen:
      // canvasPoint = (screen - tx) / scale  →  tx' = screen - canvasPoint * scale'
      const canvasX = (g.pinchCenterX - g.startTx) / g.pinchStartScale;
      const canvasY = (g.pinchCenterY - g.startTy) / g.pinchStartScale;
      setView({
        scale: next,
        tx: g.pinchCenterX - canvasX * next,
        ty: g.pinchCenterY - canvasY * next,
      });
    }
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length === 0) gestureRef.current.mode = 'idle';
    else if (e.touches.length === 1) {
      gestureRef.current.mode = 'pan';
      gestureRef.current.startX = e.touches[0].clientX;
      gestureRef.current.startY = e.touches[0].clientY;
      gestureRef.current.startTx = view.tx;
      gestureRef.current.startTy = view.ty;
    }
  };

  // Zoom helpers
  const zoomBy = (delta: number) => {
    const el = containerRef.current;
    if (!el) return;
    setView((v) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale + delta));
      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;
      const canvasX = (cx - v.tx) / v.scale;
      const canvasY = (cy - v.ty) / v.scale;
      return {
        scale: next,
        tx: cx - canvasX * next,
        ty: cy - canvasY * next,
      };
    });
  };

  if (roles.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Nothing to draw yet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100dvh-220px)] bg-muted/40 rounded-[12px] border border-border/40 overflow-hidden touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Dot grid background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle, hsl(var(--border) / 0.5) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Canvas — transformed group */}
      <svg
        width="100%"
        height="100%"
        style={{ overflow: 'visible', position: 'relative' }}
        aria-label="Org chart canvas"
        role="img"
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {/* Edges first (so they sit under nodes) */}
          {edges.map((e, i) => {
            const midY = (e.fromY + e.toY) / 2;
            return (
              <path
                key={i}
                d={`M ${e.fromX} ${e.fromY} V ${midY} H ${e.toX} V ${e.toY}`}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {/* Nodes */}
          {nodes.map(({ role, x, y }) => {
            const colorHex = PERSONALITY_HEX[role.personality_color || 'green'] ?? PERSONALITY_HEX.green;
            const assigneeName =
              (role.assignments?.[0]?.profile?.full_name) ||
              ((role.assignments?.length ?? 0) === 0 ? 'Unassigned' : `${role.assignments!.length} people`);
            return (
              <g
                key={role.id}
                transform={`translate(${x} ${y})`}
                onClick={() => onSelectRole?.(role.id)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
                {/* Color accent on left */}
                <rect width={3} height={NODE_H} rx={1} fill={colorHex} />
                <text
                  x={10}
                  y={22}
                  fontSize={12}
                  fontWeight={600}
                  fill="hsl(var(--foreground))"
                  fontFamily="Inter, sans-serif"
                >
                  {truncate(role.title, 16)}
                </text>
                <text
                  x={10}
                  y={40}
                  fontSize={10}
                  fill="hsl(var(--muted-foreground))"
                  fontFamily="Inter, sans-serif"
                  fontStyle={role.assignments?.length === 0 ? 'italic' : 'normal'}
                >
                  {truncate(assigneeName, 20)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls — bottom-right */}
      <div className="absolute right-2 bottom-2 z-10 flex flex-col gap-1.5">
        <CtrlBtn ariaLabel="Zoom in" onTap={() => zoomBy(ZOOM_STEP)}>
          <Plus className="h-3.5 w-3.5" />
        </CtrlBtn>
        <CtrlBtn ariaLabel="Zoom out" onTap={() => zoomBy(-ZOOM_STEP)}>
          <Minus className="h-3.5 w-3.5" />
        </CtrlBtn>
        <CtrlBtn ariaLabel="Fit to screen" onTap={fitToScreen}>
          <Maximize2 className="h-3.5 w-3.5" />
        </CtrlBtn>
      </div>

      {/* Zoom indicator — bottom-left */}
      <div className="absolute left-2 bottom-2 z-10 bg-card/80 backdrop-blur-sm border border-border/40 rounded-full px-2.5 py-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
        {Math.round(view.scale * 100)}%
      </div>

      {/* Mini-map — top-right */}
      <MiniMap
        treeW={treeW}
        treeH={treeH}
        view={view}
        containerSize={containerRef.current?.getBoundingClientRect()}
        onRecenter={(canvasX, canvasY) => {
          const el = containerRef.current;
          if (!el) return;
          setView((v) => ({
            scale: v.scale,
            tx: el.clientWidth / 2 - canvasX * v.scale,
            ty: el.clientHeight / 2 - canvasY * v.scale,
          }));
        }}
      />
    </div>
  );
};

const CtrlBtn: React.FC<{
  ariaLabel: string;
  onTap: () => void;
  children: React.ReactNode;
}> = ({ ariaLabel, onTap, children }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    onClick={onTap}
    className={cn(
      'w-8 h-8 rounded-[10px] bg-card/90 backdrop-blur-sm border border-border/40',
      'flex items-center justify-center text-foreground shadow-sm',
      'transition-transform duration-150 active:scale-95',
    )}
  >
    {children}
  </button>
);

const MiniMap: React.FC<{
  treeW: number;
  treeH: number;
  view: { scale: number; tx: number; ty: number };
  containerSize?: DOMRect;
  onRecenter: (canvasX: number, canvasY: number) => void;
}> = ({ treeW, treeH, view, containerSize, onRecenter }) => {
  const MM_W = 96;
  const MM_H = 56;
  if (treeW === 0 || treeH === 0) return null;
  const scale = Math.min(MM_W / treeW, MM_H / treeH);
  const treePxW = treeW * scale;
  const treePxH = treeH * scale;
  const offsetX = (MM_W - treePxW) / 2;
  const offsetY = (MM_H - treePxH) / 2;

  // Viewport rectangle within the mini-map
  const containerW = containerSize?.width ?? MM_W * 4;
  const containerH = containerSize?.height ?? MM_H * 4;
  const vpCanvasX = -view.tx / view.scale;
  const vpCanvasY = -view.ty / view.scale;
  const vpCanvasW = containerW / view.scale;
  const vpCanvasH = containerH / view.scale;
  const vpX = offsetX + vpCanvasX * scale;
  const vpY = offsetY + vpCanvasY * scale;
  const vpW = vpCanvasW * scale;
  const vpH = vpCanvasH * scale;

  return (
    <div
      className="absolute right-2 top-2 z-10 bg-card/90 backdrop-blur-sm border border-border/40 rounded-[8px] overflow-hidden shadow-sm"
      style={{ width: MM_W, height: MM_H }}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const localX = e.clientX - rect.left - offsetX;
        const localY = e.clientY - rect.top - offsetY;
        const canvasX = localX / scale;
        const canvasY = localY / scale;
        onRecenter(canvasX, canvasY);
      }}
    >
      <svg width={MM_W} height={MM_H}>
        <rect
          x={offsetX}
          y={offsetY}
          width={treePxW}
          height={treePxH}
          fill="hsl(var(--muted))"
          rx={3}
        />
        <rect
          x={Math.max(0, Math.min(MM_W - 1, vpX))}
          y={Math.max(0, Math.min(MM_H - 1, vpY))}
          width={Math.max(2, Math.min(MM_W - Math.max(0, vpX), vpW))}
          height={Math.max(2, Math.min(MM_H - Math.max(0, vpY), vpH))}
          fill="hsl(var(--primary) / 0.18)"
          stroke="hsl(var(--primary))"
          strokeWidth={1}
          rx={2}
        />
      </svg>
    </div>
  );
};

function truncate(s: string, max: number): string {
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export default MobileOrgCanvasView;
