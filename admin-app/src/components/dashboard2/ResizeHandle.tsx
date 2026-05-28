
import React, { useRef, useEffect, useCallback } from 'react';

interface ResizeHandleProps {
  onResizeStart: () => void;
  onResizeEnd: (newWidth: number, newHeight: number) => void;
  currentWidth: number;
  currentHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onResizeStart,
  onResizeEnd,
  currentWidth,
  currentHeight,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
}) => {
  const isResizingRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const onResizeEndRef = useRef(onResizeEnd);
  onResizeEndRef.current = onResizeEnd;

  const propsRef = useRef({ currentWidth, currentHeight, minWidth, minHeight, maxWidth, maxHeight });
  propsRef.current = { currentWidth, currentHeight, minWidth, minHeight, maxWidth, maxHeight };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    const { currentWidth: cw, currentHeight: ch, minWidth: minW, minHeight: minH, maxWidth: maxW, maxHeight: maxH } = propsRef.current;

    // Calculate new dimensions based on a grid system (assuming 150px per grid unit)
    const gridSize = 150;
    const newWidth = Math.max(minW, Math.min(maxW, Math.round((startSize.current.width * gridSize + deltaX) / gridSize)));
    const newHeight = Math.max(minH, Math.min(maxH, Math.round((startSize.current.height * gridSize + deltaY) / gridSize)));

    // Only update if dimensions changed
    if (newWidth !== cw || newHeight !== ch) {
      onResizeEndRef.current(newWidth, newHeight);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // Clean up listeners on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isResizingRef.current = true;
    onResizeStart();

    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: currentWidth, height: currentHeight };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="absolute bottom-0 right-0 w-4 h-4 bg-muted-foreground/40 hover:bg-muted-foreground/60 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100 cursor-se-resize"
      onMouseDown={handleMouseDown}
      style={{
        background: 'linear-gradient(-45deg, transparent 30%, var(--text-muted) 30%, var(--text-muted) 70%, transparent 70%)',
      }}
    />
  );
};
