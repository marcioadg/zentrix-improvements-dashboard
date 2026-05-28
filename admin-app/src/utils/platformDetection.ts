/**
 * Platform detection utility
 * Determines if the app is running as web or mobile (Capacitor)
 * 
 * Build-time detection: VITE_PLATFORM is set during the build process
 * - "web" for Lovable publishes (default)
 * - "mobile" for local mobile builds (npm run build:mobile)
 * 
 * Runtime detection: Checks for Capacitor native environment
 */

// Build-time platform from environment variable (defaults to 'web' for safety)
export const BUILD_PLATFORM: 'web' | 'mobile' = 
  (import.meta.env.VITE_PLATFORM as 'web' | 'mobile') || 'web';

/**
 * Runtime detection for Capacitor native environment
 * Returns true if running inside a native iOS/Android app
 */
export const isNativeApp = (): boolean => {
  try {
    // Primary check: Capacitor's isNativePlatform method
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      return true;
    }
    // Fallback: Check if Capacitor reports a non-web platform
    const platform = (window as any).Capacitor?.getPlatform?.();
    if (platform && platform !== 'web') {
      return true;
    }
    // Fallback for Despia cloud builds: detect via userAgent
    // Despia's native WebView sets "despia" in the userAgent string
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('despia')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Check if running on mobile platform
 * True if either:
 * - Built with VITE_PLATFORM=mobile
 * - Running inside Capacitor native shell
 */
export const isMobilePlatform = (): boolean => {
  return BUILD_PLATFORM === 'mobile' || isNativeApp();
};

/**
 * Check if running on web platform
 * True only if built for web AND not running in Capacitor
 */
export const isWebPlatform = (): boolean => {
  return BUILD_PLATFORM === 'web' && !isNativeApp();
};

/**
 * Get current platform string for logging/debugging
 */
export const getCurrentPlatform = (): 'web' | 'mobile' => {
  return isMobilePlatform() ? 'mobile' : 'web';
};

/**
 * Get detailed platform info for debugging
 */
export const getPlatformInfo = () => ({
  buildPlatform: BUILD_PLATFORM,
  isNative: isNativeApp(),
  currentPlatform: getCurrentPlatform(),
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
});
