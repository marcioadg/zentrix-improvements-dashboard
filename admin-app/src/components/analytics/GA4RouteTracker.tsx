import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * GA4RouteTracker — Sends a page_view event to GA4 on every SPA route change.
 * 
 * Without this, GA4 only records the initial page load in a Single Page App,
 * causing sessions to appear as ~1 second with no engagement.
 */
export const GA4RouteTracker = () => {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the first render — GA4's send_page_view: true already handles that
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (typeof window.gtag === 'function') {
      (window.gtag as Function)('event', 'page_view', {
        page_location: window.location.origin + location.pathname + location.search,
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location.pathname, location.search]);

  return null;
};
