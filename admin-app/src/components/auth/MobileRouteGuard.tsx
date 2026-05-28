import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';
import { logger } from '@/utils/logger';

/**
 * MobileRouteGuard - Apple App Store Compliance
 * 
 * This component ensures mobile app users (Capacitor native builds) can NEVER
 * access payment-related pages or desktop-only routes.
 * 
 * Desktop routes are mapped to their mobile equivalents for better UX.
 * Payment routes (/checkout) always redirect to /m/tasks.
 * This is critical for Apple App Store Guideline 3.1.1 compliance.
 */

// Public routes that should be accessible on any platform
// NOTE: /landing and /landing2 intentionally excluded for Apple App Store compliance
// (they contain pricing information that violates Guideline 3.1.1)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/landing3', // Compliant - pricing hidden on mobile via isMobilePlatform() check
  '/privacy',
  '/terms',
  '/science',
  '/blog',
  '/auth/callback',
  '/email-confirmation',
  '/email-verified', // Mobile browser email verification success page
  '/complete-invitation',
  '/accept-invitation',
  '/join',
  '/account-deactivated',
  '/account-deletion',
  '/onboarding',
  '/onboardingmobile',
  '/new-company',
  '/onboarding-demo',
  '/ad',
  '/ad2',
];

// Desktop to mobile route mapping for better UX
// Payment routes (/checkout) intentionally map to /m/tasks to block payment access
const DESKTOP_TO_MOBILE_ROUTES: Record<string, string> = {
  '/settings': '/m/settings',
  '/metrics': '/m/metrics',
  '/issues': '/m/issues',
  '/goals': '/m/goals',
  '/tasks': '/m/tasks',
  '/tasks2': '/m/tasks',
  '/dashboard': '/m/tasks',
  '/checkout': '/m/tasks', // BLOCKED: No payment access on mobile
  // BLOCKED: Landing pages with pricing/trial content (Apple App Store 3.1.1 compliance)
  '/landing': '/m/tasks',
  '/landing2': '/m/tasks',
  '/home-original': '/m/tasks',
  '/home2': '/m/tasks',
  '/home3': '/m/tasks',
  '/home4': '/m/tasks',
  '/home5': '/m/tasks',
  '/home6': '/m/tasks',
  '/home77': '/m/tasks',
};

// Check if a path matches any public route
const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || 
    pathname.startsWith(route + '/') ||
    pathname.startsWith('/blog/') // Allow blog post routes
  );
};

// Get the mobile equivalent route for a desktop route
const getMobileRoute = (pathname: string): string => {
  // Check exact match first
  if (DESKTOP_TO_MOBILE_ROUTES[pathname]) {
    return DESKTOP_TO_MOBILE_ROUTES[pathname];
  }
  
  // Check if pathname starts with any mapped route (handles query params)
  for (const [desktopRoute, mobileRoute] of Object.entries(DESKTOP_TO_MOBILE_ROUTES)) {
    if (pathname.startsWith(desktopRoute + '/') || pathname.startsWith(desktopRoute + '?')) {
      return mobileRoute;
    }
  }
  
  // Default fallback for any unmapped routes
  return '/m/tasks';
};

interface MobileRouteGuardProps {
  children: React.ReactNode;
}

export const MobileRouteGuard: React.FC<MobileRouteGuardProps> = ({ children }) => {
  const location = useLocation();
  const pathname = location.pathname;
  
  // Enforce restrictions on mobile platforms (native apps) AND mobile-sized viewports (iPads, tablets)
  // Desktop users (>1024px viewport) are NEVER affected by this guard
  if (!isMobileOrTabletDevice()) {
    return <>{children}</>;
  }
  
  // Allow public routes (login, landing, etc.)
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }
  
  // Allow mobile-specific routes (/m/*)
  if (pathname.startsWith('/m/')) {
    return <>{children}</>;
  }
  
  // Redirect desktop routes to their mobile equivalents
  const mobileRoute = getMobileRoute(pathname);
  logger.log('[MobileRouteGuard] Redirecting mobile user:', pathname, '→', mobileRoute);
  return <Navigate to={mobileRoute} replace />;
};
