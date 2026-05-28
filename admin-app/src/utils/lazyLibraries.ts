import { lazy } from 'react';

/**
 * Lazy-loaded heavy libraries to reduce initial bundle size
 * Only load when actually needed
 */

// Recharts - Charts library (heavy ~50KB)
export const LazyLineChart = lazy(() => 
  import('recharts').then(module => ({ default: module.LineChart }))
);

export const LazyBarChart = lazy(() => 
  import('recharts').then(module => ({ default: module.BarChart }))
);

export const LazyAreaChart = lazy(() => 
  import('recharts').then(module => ({ default: module.AreaChart }))
);

export const LazyPieChart = lazy(() => 
  import('recharts').then(module => ({ default: module.PieChart }))
);

// Framer Motion - Animation library (heavy ~40KB)
export const LazyMotionDiv = lazy(() => 
  import('framer-motion').then(module => ({ 
    default: module.motion.div 
  }))
);

export const LazyAnimatePresence = lazy(() => 
  import('framer-motion').then(module => ({ 
    default: module.AnimatePresence 
  }))
);

// DND Kit - Drag and drop (heavy ~30KB)
export const LazyDndContext = lazy(() => 
  import('@dnd-kit/core').then(module => ({ 
    default: module.DndContext 
  }))
);

export const LazySortableContext = lazy(() => 
  import('@dnd-kit/sortable').then(module => ({ 
    default: module.SortableContext 
  }))
);

// Preload function for hover prefetching
export const preloadCharts = () => {
  import('recharts');
};

export const preloadMotion = () => {
  import('framer-motion');
};

export const preloadDnd = () => {
  import('@dnd-kit/core');
  import('@dnd-kit/sortable');
};
