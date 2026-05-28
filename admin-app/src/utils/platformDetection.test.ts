import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the functions that depend on window/navigator.
// Import after mocks are set up via dynamic import won't help since
// BUILD_PLATFORM is evaluated at import time. We test the runtime functions.

describe('platformDetection', () => {
  // Since BUILD_PLATFORM is a module-level const from import.meta.env,
  // and defaults to 'web', we test the exported functions directly.

  beforeEach(() => {
    // Reset Capacitor mock
    delete (window as any).Capacitor;
  });

  it('isNativeApp returns false when no Capacitor', async () => {
    const { isNativeApp } = await import('./platformDetection');
    expect(isNativeApp()).toBe(false);
  });

  it('isNativeApp returns true when Capacitor.isNativePlatform returns true', async () => {
    (window as any).Capacitor = { isNativePlatform: () => true };
    const { isNativeApp } = await import('./platformDetection');
    expect(isNativeApp()).toBe(true);
  });

  it('isNativeApp returns true for non-web Capacitor platform', async () => {
    (window as any).Capacitor = { isNativePlatform: () => false, getPlatform: () => 'ios' };
    const { isNativeApp } = await import('./platformDetection');
    expect(isNativeApp()).toBe(true);
  });

  it('getCurrentPlatform returns web by default', async () => {
    const { getCurrentPlatform } = await import('./platformDetection');
    expect(getCurrentPlatform()).toBe('web');
  });

  it('isWebPlatform returns true when not native', async () => {
    const { isWebPlatform } = await import('./platformDetection');
    expect(isWebPlatform()).toBe(true);
  });

  it('getPlatformInfo returns structured info', async () => {
    const { getPlatformInfo } = await import('./platformDetection');
    const info = getPlatformInfo();
    expect(info).toHaveProperty('buildPlatform');
    expect(info).toHaveProperty('isNative');
    expect(info).toHaveProperty('currentPlatform');
    expect(info).toHaveProperty('userAgent');
  });
});
