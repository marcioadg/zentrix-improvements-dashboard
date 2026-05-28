

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FontPreloader } from '@/components/ui/font-preloader';
import './i18n/index'; // Initialize i18n (must be imported before App)
import { logger } from '@/utils/logger';
import { initTheme } from '@/lib/themeColors';

// Auto-reload on stale chunk errors (happens after deployments when browser has cached old JS)
// Capped at 3 retries to prevent infinite reload loops during prolonged outages
const handleChunkError = () => {
  try {
    const reloadKey = 'chunk_reload_ts';
    const countKey = 'chunk_reload_count';
    const lastReload = Number(sessionStorage.getItem(reloadKey) || '0');
    const reloadCount = Number(sessionStorage.getItem(countKey) || '0');
    const elapsed = Date.now() - lastReload;

    // Reset counter after 2 minutes of stability
    if (elapsed > 120000) {
      sessionStorage.setItem(countKey, '0');
    }

    // Allow reload if under 3 retries and at least 30s since last reload
    if (reloadCount < 3 && elapsed > 30000) {
      sessionStorage.setItem(reloadKey, String(Date.now()));
      sessionStorage.setItem(countKey, String(reloadCount + 1));
      window.location.reload();
    }
  } catch {
    // sessionStorage unavailable (private browsing, storage disabled) — reload once as best-effort
    window.location.reload();
  }
};

const isChunkError = (message: string) =>
  message.includes('Failed to fetch dynamically imported module') ||
  message.includes('Loading chunk') ||
  message.includes('Loading CSS chunk');

window.addEventListener('error', (event) => {
  if (event.message && isChunkError(event.message)) {
    handleChunkError();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason?.message || String(reason || '');
  if (isChunkError(message)) {
    event.preventDefault();
    handleChunkError();
  }
});

// Initialize Sentry for error tracking (safe async initialization)
const initializeSentry = async () => {
  try {
    if (import.meta.env.VITE_SENTRY_DSN) {
      const { init, browserTracingIntegration } = await import('@sentry/react');
      init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        integrations: [browserTracingIntegration()],
        sendDefaultPii: true,
        tracesSampleRate: 1.0,
        environment: import.meta.env.MODE,
      });
    }
  } catch (error) {
    logger.warn('⚠️ Failed to initialize Sentry:', error);
    // Don't let Sentry initialization failures break the app
  }
};

// Initialize Sentry but don't block app startup
initializeSentry();

// Apply saved theme color (defaults to Thunder)
initTheme();

// Apply colored sidebar — default is ON unless user explicitly disabled it
try {
  const sidebarPref = localStorage.getItem('zentrix-colored-sidebar');
  if (sidebarPref !== 'false') {
    document.documentElement.setAttribute('data-sidebar', 'colored');
  }
} catch { /* ignore */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FontPreloader />
    <App />
  </React.StrictMode>,
);
