import { logger } from '@/utils/logger';

// Enhanced preload critical routes that users are likely to navigate to
export const preloadCriticalRoutes = () => {
  // Preload after initial load to improve subsequent navigation
  setTimeout(() => {
    logger.log('🚀 Preloading critical routes...');
    
    // Most commonly accessed pages - preload in order of priority
    const criticalRoutes = [
      () => import('@/pages/Tasks'),
      () => import('@/pages/Metrics'),
      () => import('@/pages/Meetings'),
      () => import('@/pages/People'),
    ];

    // Stagger preloading to avoid blocking main thread
    criticalRoutes.forEach((routeImport, index) => {
      setTimeout(() => {
        routeImport().then(() => {
          logger.log(`✅ Preloaded route ${index + 1}/${criticalRoutes.length}`);
        }).catch(logger.error);
      }, index * 500); // 500ms between each preload
    });
  }, 1000); // Start after 1 second
};

// Preload specific route on demand with performance tracking
export const preloadRoute = (routeName: string) => {
  const startTime = performance.now();
  
  const routeMap: Record<string, () => Promise<any>> = {
    'tasks': () => import('@/pages/Tasks'),
    'tasks2': () => import('@/pages/Tasks2'),
    'metrics': () => import('@/pages/Metrics'),
    'meetings': () => import('@/pages/Meetings'),
    'people': () => import('@/pages/People'),
    'goals': () => import('@/pages/Goals'),
    'issues': () => import('@/pages/Issues'),
    'strategy': () => import('@/pages/Strategy'),
    'process': () => import('@/pages/Process'),
    'org-chart': () => import('@/pages/OrgChart'),
    'tools': () => import('@/pages/Tools'),
  };

  const routeImport = routeMap[routeName];
  if (!routeImport) {
    logger.warn(`Route "${routeName}" not found in preload map`);
    return null;
  }

  logger.log(`🔄 Preloading route: ${routeName}`);
  
  return routeImport().then(() => {
    const loadTime = performance.now() - startTime;
    logger.log(`✅ Route preloaded: ${routeName} (${loadTime.toFixed(2)}ms)`);
  }).catch(error => {
    logger.error(`❌ Failed to preload route: ${routeName}`, error);
  });
};

// Intelligently preload routes based on user navigation patterns
export const smartPreloadRoutes = (currentRoute: string) => {
  const routeRelationships: Record<string, string[]> = {
    'tasks': ['metrics', 'meetings'],
    'tasks2': ['tasks', 'metrics'],
    'metrics': ['tasks', 'goals'],
    'meetings': ['tasks', 'people'],
    'people': ['meetings', 'org-chart'],
    'goals': ['metrics', 'strategy'],
  };

  const relatedRoutes = routeRelationships[currentRoute];
  if (relatedRoutes) {
    logger.log(`🎯 Smart preloading routes related to ${currentRoute}:`, relatedRoutes);
    
    relatedRoutes.forEach((route, index) => {
      setTimeout(() => {
        preloadRoute(route);
      }, index * 200);
    });
  }
};

// Preload all mobile pages after initial mobile page loads
export const preloadMobileRoutes = () => {
  // Wait for initial page to fully render
  setTimeout(() => {
    logger.log('📱 Preloading mobile routes in background...');
    
    const mobileRoutes = [
      { name: 'IssuesMobile', import: () => import('@/pages/IssuesMobile') },
      { name: 'GoalsMobile', import: () => import('@/pages/GoalsMobile') },
      { name: 'MetricsMobile', import: () => import('@/pages/MetricsMobile') },
      { name: 'MobileSettings', import: () => import('@/pages/MobileSettings') },
    ];

    // Stagger preloading to avoid blocking main thread
    mobileRoutes.forEach((route, index) => {
      setTimeout(() => {
        const startTime = performance.now();
        route.import()
          .then(() => {
            const loadTime = performance.now() - startTime;
            logger.log(`✅ Preloaded ${route.name} (${loadTime.toFixed(0)}ms)`);
          })
          .catch(err => logger.error(`❌ Failed to preload ${route.name}:`, err));
      }, index * 500); // 500ms between each preload
    });
  }, 1000); // Start after 1 second
};
