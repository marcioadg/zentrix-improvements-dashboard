import { useEffect, useState } from 'react';

export type ThumbZone = 'easy' | 'stretch' | 'difficult';

interface ThumbZoneConfig {
  easyZoneHeight: number; // Percentage from bottom (e.g., 40 = bottom 40%)
  stretchZoneHeight: number; // Additional percentage above easy zone
}

const defaultConfig: ThumbZoneConfig = {
  easyZoneHeight: 40, // Bottom 40% is easy to reach
  stretchZoneHeight: 30, // Next 30% requires stretching
  // Top 30% is difficult
};

export const useThumbZone = (config: Partial<ThumbZoneConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => setScreenHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getZoneForElement = (element: HTMLElement | null): ThumbZone => {
    if (!element) return 'difficult';

    const rect = element.getBoundingClientRect();
    const elementBottom = rect.bottom;
    const elementDistanceFromBottom = screenHeight - elementBottom;
    const percentageFromBottom = (elementDistanceFromBottom / screenHeight) * 100;

    if (percentageFromBottom <= finalConfig.easyZoneHeight) {
      return 'easy';
    } else if (
      percentageFromBottom <=
      finalConfig.easyZoneHeight + finalConfig.stretchZoneHeight
    ) {
      return 'stretch';
    } else {
      return 'difficult';
    }
  };

  const isInEasyZone = (y: number): boolean => {
    const distanceFromBottom = screenHeight - y;
    const percentage = (distanceFromBottom / screenHeight) * 100;
    return percentage <= finalConfig.easyZoneHeight;
  };

  const getRecommendedPlacement = (action: 'primary' | 'secondary' | 'tertiary'): string => {
    const placements = {
      primary: 'bottom-4 right-4', // FAB position - easiest to reach
      secondary: 'bottom-20 right-4', // Slightly above FAB
      tertiary: 'top-4 right-4', // Top of screen - requires stretch
    };
    return placements[action];
  };

  return {
    getZoneForElement,
    isInEasyZone,
    getRecommendedPlacement,
    easyZoneHeight: (screenHeight * finalConfig.easyZoneHeight) / 100,
    stretchZoneHeight: (screenHeight * finalConfig.stretchZoneHeight) / 100,
  };
};
