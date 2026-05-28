/**
 * MOBILE DETECTION STANDARD
 * ========================
 * 
 * This file provides DEVICE-BASED (NOT viewport-based) detection.
 * 
 * THE STANDARD: Use isMobileOrTabletDevice() for ALL mobile detection needs.
 * 
 * Device type determines UI experience:
 * - Desktop browser = Desktop UI (even with small window)
 * - Mobile/Tablet = Mobile UI (even with large screen)
 * 
 * Detection signals used (hardware-based, stable during session):
 * 1. User Agent keywords - iphone, ipad, android, mobile, webos
 * 2. Capacitor native app - isMobilePlatform() check
 * 3. iPad Desktop Mode - Macintosh UA + maxTouchPoints > 1
 * 4. Touch-only devices - (pointer: coarse) and (hover: none)
 * 
 * WHY NOT VIEWPORT-BASED?
 * - Desktop users resizing windows should NOT trigger mobile UI
 * - Mobile users with large screens should NOT see desktop UI
 * - Apple App Store compliance requires consistent mobile experience
 */

import { isMobilePlatform, isNativeApp } from './platformDetection';
import { logger } from '@/utils/logger';

/**
 * Detect if the user is on an actual mobile/tablet DEVICE (not just small viewport)
 * Used for compliance and routing - NOT for responsive UI
 * 
 * This does NOT trigger for:
 * - Desktop users who resize their browser window
 * - Touch-screen Windows laptops
 * - MacBooks with trackpads
 */
export const isActualMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent.toLowerCase();
  
  // 1. Standard mobile user agent keywords
  const mobileKeywords = ['iphone', 'ipad', 'android', 'mobile', 'webos'];
  const isMobileUA = mobileKeywords.some(keyword => ua.includes(keyword));
  if (isMobileUA) return true;
  
  // 2. iPad in "Desktop Mode" (reports as Macintosh but has multi-touch)
  // Real Macs have maxTouchPoints of 0 (no touch) or 1 (Force Touch trackpad)
  // iPads have maxTouchPoints of 5+
  const isIPadDesktopMode = /macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (isIPadDesktopMode) return true;
  
  // 3. Touch-only device - BUT exclude desktop operating systems
  // Windows/Linux/ChromeOS laptops can have touch screens but are NOT mobile
  const isDesktopOS = /windows|linux|cros|chromebook/.test(ua);
  if (!isDesktopOS) {
    const isTouchOnly = window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    if (isTouchOnly) return true;
  }
  
  return false;
};

/**
 * Check if device should be treated as mobile/tablet for compliance purposes
 * Returns true if:
 * - Running in native Capacitor app (isMobilePlatform)
 * - Actual mobile/tablet device (via UA, touch signals, NOT viewport)
 * 
 * Used for Apple App Store compliance - actual mobile devices
 * should have payment UI hidden
 */
export const isMobileOrTabletDevice = (): boolean => {
  return isMobilePlatform() || isActualMobileDevice();
};

/**
 * Stable device-class string for telemetry persistence
 * (profiles.first_device_type, user_activity_sessions.device_type).
 *
 * Returns 'mobile' for any actual mobile/tablet — browser OR native app —
 * which matches what humans expect when reading the column. Previously
 * the writers used getCurrentPlatform() from platformDetection, which
 * only returned 'mobile' for the Capacitor native build, so every
 * mobile-browser signup landed as 'web'.
 */
export const getDeviceTypeForTracking = (): 'mobile' | 'web' =>
  isMobileOrTabletDevice() ? 'mobile' : 'web';

export type AccessMode = 'native' | 'pwa' | 'web' | 'desktop';

/**
 * Granular access-mode for telemetry. Splits the 'mobile' bucket into:
 *   - 'native'  → Despia / Capacitor wrapped native iOS/Android app
 *   - 'pwa'     → installed PWA (Add-to-Home-Screen, standalone display-mode)
 *   - 'web'     → mobile browser tab
 *   - 'desktop' → desktop browser
 *
 * Persisted on user_activity_sessions.access_mode so we can answer
 * "is this user opening the app or the website?" in analytics queries —
 * something getDeviceTypeForTracking() (mobile/web only) can't answer
 * since installed PWAs share UA with the mobile browser.
 *
 * The 'native' check covers two cases:
 *   - Despia-wrapped builds (the current App Store / Play Store app), which
 *     send a literal `despia-iphone` / `despia-android` UA we can sniff.
 *   - Capacitor builds (future), via window.Capacitor.isNativePlatform().
 */
export const getAccessMode = (): AccessMode => {
  if (typeof window === 'undefined') return 'web';
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
  if (/despia/i.test(ua)) return 'native';
  if (isNativeApp()) return 'native';
  const isStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches);
  if (isStandalone) return 'pwa';
  return isMobileOrTabletDevice() ? 'web' : 'desktop';
};

/**
 * @deprecated Use isMobileOrTabletDevice() instead.
 * This viewport-based function is kept only for backwards compatibility.
 * It will be removed in a future version.
 * 
 * IMPORTANT: Do NOT use this for routing, compliance, or UI decisions.
 * Use isMobileOrTabletDevice() which checks actual device hardware.
 */
export const isMobileDevice = (): boolean => {
  if (import.meta.env.DEV) logger.warn('isMobileDevice() is deprecated. Use isMobileOrTabletDevice() instead.');
  return isMobileOrTabletDevice();
};

/**
 * Map desktop routes to their mobile equivalents
 */
export const getMobileRoute = (desktopRoute: string): string => {
  const mobileRouteMap: Record<string, string> = {
    '/dashboard': '/m/tasks',
    '/tasks': '/m/tasks',
    '/tasks2': '/m/tasks',
    '/goals': '/m/goals',
    '/issues': '/m/issues',
    '/metrics': '/m/metrics',
    '/settings': '/m/settings',
  };
  
  return mobileRouteMap[desktopRoute] || '/m/tasks';
};

/**
 * Get the appropriate redirect destination based on device type
 * Handles redirect parameters and maps desktop routes to mobile when needed
 */
export const getLoginRedirectDestination = (redirectParam: string | null): string => {
  // Use hardware detection (UA, touch) - NOT viewport width
  const isMobile = isActualMobileDevice();
  
  if (redirectParam) {
    // If already a mobile route, use it directly
    if (redirectParam.startsWith('/m/')) {
      return redirectParam;
    }
    
    // For mobile devices, map desktop routes to mobile equivalents
    if (isMobile) {
      return getMobileRoute(redirectParam);
    }
    
    // Desktop - use the redirect param as-is
    return redirectParam;
  }
  
  // No redirect param - use device-appropriate default
  return isMobile ? '/m/tasks' : '/dashboard';
};

/**
 * Detect if user is on a mobile BROWSER (not native app)
 * Used for email verification redirect logic
 * 
 * Returns true ONLY when:
 * - User is NOT in native app (Capacitor)
 * - User is on an actual mobile device (via UA, touch signals, NOT viewport)
 * 
 * This is safe because:
 * - Desktop users resizing browser: returns false (no mobile UA or touch signals)
 * - Touch-screen laptops: returns false (has pointer: fine)
 * - Native app users: isMobilePlatform() returns true, returns false
 * - Mobile browser users: returns true (these need /email-verified redirect)
 */
export const isMobileBrowser = (): boolean => {
  // Already in native app - not a mobile browser
  if (isMobilePlatform()) return false;
  
  // Check if actual mobile device (not viewport-based)
  return isActualMobileDevice();
};
