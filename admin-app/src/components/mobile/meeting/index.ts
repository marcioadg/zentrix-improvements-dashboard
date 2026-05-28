/**
 * Barrel exports for mobile meeting components.
 *
 * All components in this folder are mobile-only — paired with
 * src/pages/MeetingMobile.tsx. They have no shared code path with the
 * desktop meeting components under src/components/meeting/, by design
 * (strict isolation).
 */
export { MobileMeetingHeader } from './MobileMeetingHeader';
export { MobileMeetingPillStrip } from './MobileMeetingPillStrip';
export type { PillAgendaItem } from './MobileMeetingPillStrip';
export { MobileMeetingMiniBar } from './MobileMeetingMiniBar';
export { MobileMeetingTangentButton } from './MobileMeetingTangentButton';
export { MobileRoleSelectionSheet } from './MobileRoleSelectionSheet';
export type { MeetingRole } from './MobileRoleSelectionSheet';
export { MobileMeetingStartScreen } from './MobileMeetingStartScreen';
export { MobileMeetingAccessDeniedScreen } from './MobileMeetingAccessDeniedScreen';
