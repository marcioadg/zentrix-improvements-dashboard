import { useRef, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';

interface DragToScrollOptions {
  enabled?: boolean;
  cursor?: string;
  activeCursor?: string;
}

export const useDragToScroll = (options: DragToScrollOptions = {}) => {
  const {
    enabled = true,
    cursor = 'grab',
    activeCursor = 'grabbing'
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const scrollLeft = useRef(0);
  const scrollTop = useRef(0);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!elementRef.current || !enabled) return;
    
    // Only start drag if clicking on the container itself or background elements
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button, input, select, textarea, [role="button"], [draggable="true"]');
    
    if (isInteractiveElement) return;

    isDragging.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
    scrollLeft.current = elementRef.current.scrollLeft;
    scrollTop.current = elementRef.current.scrollTop;
    
    if (elementRef.current) {
      elementRef.current.style.cursor = activeCursor;
      elementRef.current.style.userSelect = 'none';
    }
  }, [enabled, activeCursor]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !elementRef.current) return;

    e.preventDefault();
    
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
    
    elementRef.current.scrollLeft = scrollLeft.current - deltaX;
    elementRef.current.scrollTop = scrollTop.current - deltaY;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!elementRef.current) return;
    
    isDragging.current = false;
    elementRef.current.style.cursor = cursor;
    elementRef.current.style.userSelect = '';
  }, [cursor]);

  const handleMouseLeave = useCallback(() => {
    if (!elementRef.current) return;
    
    isDragging.current = false;
    elementRef.current.style.cursor = cursor;
    elementRef.current.style.userSelect = '';
  }, [cursor]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.style.cursor = cursor;

    // Debug: log available scroll sizes
    logger.log('DragToScroll: container sizes', {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    });
    
    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, cursor, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave]);

  return elementRef;
};