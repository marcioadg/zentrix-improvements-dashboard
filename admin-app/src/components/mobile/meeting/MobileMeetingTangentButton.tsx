/**
 * MobileMeetingTangentButton — 44×44 floating button with a warning-tone
 * flag icon. Sits to the LEFT of the unified FAB (bottom-right of the
 * meeting room).
 *
 * v2: real tangent alert. Mirrors the desktop wiring exactly (see
 * MeetingLayout.tsx:69-79) so a tap from any device — mobile or desktop —
 * fires the same fullscreen overlay + sound on every other participant of
 * the team.
 *
 *  - useTangentAlert(teamId, handleAlert) subscribes to the team's
 *    'tangent-alert:<teamId>' realtime channel.
 *  - handleAlert reveals <TangentAlertOverlay/>, plays the alert sound,
 *    and auto-hides after 2.5s (same 2500ms desktop uses).
 *  - The button itself shows the remaining 15s cooldown as a tiny "Ns"
 *    label, matching TangentAlertButton.tsx behaviour.
 *
 * Desktop components are imported as-is and never modified — the realtime
 * channel is the integration point, so any device can flag and any device
 * receives.
 */
import React, { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { useTangentAlert } from '@/hooks/meeting/useTangentAlert';
import { playTangentAlertSound } from '@/utils/tangentAlertSound';
import { TangentAlertOverlay } from '@/components/meeting/TangentAlertOverlay';
import { cn } from '@/lib/utils';

interface MobileMeetingTangentButtonProps {
  /**
   * Team whose realtime channel we subscribe to. Pass null to disable —
   * the button still renders but won't fire alerts.
   */
  teamId: string | null;
  /**
   * Bottom offset in px. Default 50 to clear safe-area + leave room above
   * the FAB column.
   */
  bottomPx?: number;
  /** Right offset in px. Default 86 to sit just left of the 56dp FAB. */
  rightPx?: number;
}

export const MobileMeetingTangentButton: React.FC<MobileMeetingTangentButtonProps> = ({
  teamId,
  bottomPx = 50,
  rightPx = 86,
}) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Match desktop MeetingLayout.tsx:69-74: show overlay, play sound,
  // auto-hide after 2500ms.
  const handleAlert = () => {
    setShowOverlay(true);
    playTangentAlertSound();
    setTimeout(() => setShowOverlay(false), 2500);
  };

  const { triggerTangentAlert, isInCooldown, cooldownMs } = useTangentAlert(
    teamId,
    handleAlert,
  );

  // Local visual countdown for the button label (same pattern as
  // TangentAlertButton.tsx). The hook owns the real cooldown gate
  // (15s) — this just drives the "Ns" label.
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const interval = setInterval(() => {
      setCooldownLeft((prev) => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldownLeft > 0]);

  const handleTap = () => {
    if (isInCooldown()) return;
    const ok = triggerTangentAlert();
    if (ok) setCooldownLeft(cooldownMs);
  };

  const disabled = cooldownLeft > 0;

  return (
    <>
      <button
        type="button"
        aria-label="Flag tangent"
        title="Flag tangent"
        onClick={handleTap}
        disabled={disabled}
        className={cn(
          'fixed z-[45] w-11 h-11 rounded-full bg-card border border-border/40 shadow-lg flex items-center justify-center transition-transform active:scale-95',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
        style={{
          right: rightPx,
          bottom: `max(calc(env(safe-area-inset-bottom, 0px) + ${bottomPx - 10}px), ${bottomPx}px)`,
        }}
      >
        {disabled ? (
          <span className="text-[11px] font-bold tabular-nums text-warning">
            {Math.ceil(cooldownLeft / 1000)}s
          </span>
        ) : (
          <Flag className="h-4 w-4 text-warning" />
        )}
      </button>

      <TangentAlertOverlay isVisible={showOverlay} />
    </>
  );
};

export default MobileMeetingTangentButton;
