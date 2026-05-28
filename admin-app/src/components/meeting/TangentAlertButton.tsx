import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface TangentAlertButtonProps {
  onTriggerAlert: () => boolean;
  isInCooldown: () => boolean;
  cooldownMs: number;
  className?: string;
}

export const TangentAlertButton: React.FC<TangentAlertButtonProps> = ({
  onTriggerAlert,
  isInCooldown,
  cooldownMs,
  className
}) => {
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);
  const [justTriggered, setJustTriggered] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (cooldownTimeLeft > 0) {
      interval = setInterval(() => {
        setCooldownTimeLeft(prev => Math.max(0, prev - 100));
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownTimeLeft > 0]);

  const handleClick = () => {
    logger.log('🚨 TANGENT ALERT BUTTON: Click attempt');

    if (isInCooldown()) {
      logger.log('🚨 TANGENT ALERT BUTTON: In cooldown, ignoring click');
      return;
    }

    const success = onTriggerAlert();
    if (success) {
      logger.log('🚨 TANGENT ALERT BUTTON: Alert triggered successfully');
      setCooldownTimeLeft(cooldownMs);
      setJustTriggered(true);
      setTimeout(() => setJustTriggered(false), 800);
    }
  };

  const disabled = cooldownTimeLeft > 0;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label="Flag tangent"
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium select-none transition-opacity duration-200",
        "bg-secondary text-secondary-foreground border border-border",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "opacity-70 hover:opacity-100 cursor-pointer",
        justTriggered && "opacity-100",
        className
      )}
    >
      <AlertTriangle className="w-3 h-3 shrink-0" />
      <span>
        {disabled ? `${Math.ceil(cooldownTimeLeft / 1000)}s` : 'Tangent'}
      </span>
    </button>
  );
};
