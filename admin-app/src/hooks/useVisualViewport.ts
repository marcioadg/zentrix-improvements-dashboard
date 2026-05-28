import { useState, useEffect, useRef } from 'react';

/**
 * Hook to track the visual viewport height, which changes when the mobile keyboard appears.
 * Uses the Visual Viewport API for accurate keyboard detection on iOS and Android.
 */
export function useVisualViewportHeight() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Capture a baseline "full" height once. On some mobile browsers, window.innerHeight
  // shrinks along with visualViewport.height when the keyboard opens, so comparing
  // against the current innerHeight can fail.
  const baselineInnerHeightRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;

    const updateHeight = () => {
      if (baselineInnerHeightRef.current == null) {
        baselineInnerHeightRef.current = window.innerHeight;
      }

      const fullHeight = baselineInnerHeightRef.current;
      const visualHeight = viewport.height;

      setViewportHeight(visualHeight);

      // Consider keyboard visible if viewport is significantly smaller than baseline.
      // Use a slightly lower threshold to catch more devices.
      setKeyboardVisible(fullHeight - visualHeight > 80);
    };

    viewport.addEventListener('resize', updateHeight);
    viewport.addEventListener('scroll', updateHeight);
    updateHeight();

    return () => {
      viewport.removeEventListener('resize', updateHeight);
      viewport.removeEventListener('scroll', updateHeight);
    };
  }, []);

  return { viewportHeight, keyboardVisible };
}
