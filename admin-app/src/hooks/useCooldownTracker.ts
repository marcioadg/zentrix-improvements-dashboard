import { useState, useEffect } from 'react';

interface CooldownState {
  isInCooldown: boolean;
  remainingTime: number; // in seconds
  remainingMinutes: number; // in minutes (rounded up)
}

export const useCooldownTracker = (lastInvitedAt: string | null, cooldownMinutes: number = 5): CooldownState => {
  const [cooldownState, setCooldownState] = useState<CooldownState>({
    isInCooldown: false,
    remainingTime: 0,
    remainingMinutes: 0,
  });

  useEffect(() => {
    const calculateCooldown = () => {
      if (!lastInvitedAt) {
        setCooldownState({
          isInCooldown: false,
          remainingTime: 0,
          remainingMinutes: 0,
        });
        return;
      }

      const now = new Date();
      const invitedTime = new Date(lastInvitedAt);
      const timeDiffMs = now.getTime() - invitedTime.getTime();
      const timeDiffMinutes = timeDiffMs / (1000 * 60);
      
      if (timeDiffMinutes < cooldownMinutes) {
        const remainingMs = (cooldownMinutes * 60 * 1000) - timeDiffMs;
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        
        setCooldownState({
          isInCooldown: true,
          remainingTime: remainingSeconds,
          remainingMinutes: remainingMinutes,
        });
      } else {
        setCooldownState({
          isInCooldown: false,
          remainingTime: 0,
          remainingMinutes: 0,
        });
      }
    };

    // Calculate immediately
    calculateCooldown();

    // Update every 30 seconds to refresh the countdown
    const interval = setInterval(calculateCooldown, 30000);

    return () => clearInterval(interval);
  }, [lastInvitedAt, cooldownMinutes]);

  return cooldownState;
};