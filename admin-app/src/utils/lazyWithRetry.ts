import { lazy } from 'react';

function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
): React.LazyExoticComponent<T> {
  return lazy(() => retryImport(importFn, retries));
}

async function retryImport<T>(
  importFn: () => Promise<T>,
  retries: number,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (error) {
      if (i < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      } else {
        // All retries exhausted — hard reload once per session
        const reloadKey = 'lazy_retry_reload';
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
        }
        throw error;
      }
    }
  }
  // Unreachable, but satisfies TS
  return importFn();
}

export default lazyWithRetry;
