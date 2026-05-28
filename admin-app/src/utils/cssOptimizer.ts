import { logger } from '@/utils/logger';

// CSS optimization utilities for runtime performance
export const removeUnusedCSS = () => {
  // Remove unused Tesla theme styles if not being used
  const unusedSelectors = [
    '.tesla-theme',
    '.tesla-gradient',
    '.tesla-card',
    '.tesla-button',
    '.space-theme',
    '.dark-space'
  ];

  // Only run in production
  if (process.env.NODE_ENV === 'production') {
    unusedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        // Remove unused CSS rules (this is a simplified approach)
        logger.log('🧹 Could remove unused CSS for:', selector);
      }
    });
  }
};

// Preload critical resources
export const preloadCriticalResources = () => {
  const criticalResources = [
    '/fonts/inter.woff2',
    // Add other critical resources
  ];

  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = resource.includes('.woff') ? 'font' : 'style';
    if (resource.includes('.woff')) {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  });
};
