import * as React from "react"
import { isMobileOrTabletDevice } from "@/utils/mobileDetection"

/**
 * MOBILE DETECTION STANDARD
 * 
 * This hook uses hardware-based detection (NOT viewport-based).
 * Device type determines UI experience:
 * - Desktop browser = Desktop UI (even with small window)
 * - Mobile/Tablet = Mobile UI (even with large screen)
 * 
 * Uses isMobileOrTabletDevice() which checks:
 * - User Agent keywords (iphone, ipad, android, mobile, webos)
 * - Capacitor native app platform
 * - iPad in Desktop Mode (Macintosh UA + maxTouchPoints > 1)
 * - Touch-only devices (pointer: coarse + hover: none)
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => 
    isMobileOrTabletDevice()
  )

  React.useEffect(() => {
    // Device type doesn't change during session, but we check once on mount
    // to handle SSR hydration correctly
    setIsMobile(isMobileOrTabletDevice())
  }, [])

  return isMobile
}
