
import { useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { logger } from '@/utils/logger';

// Singleton audio context for better performance
let globalAudioContext: AudioContext | null = null;
let isAudioEnabled = true;

// Check for reduced motion preference
const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const useCelebration = () => {
  const celebrationQueueRef = useRef<boolean>(false);

  const playSuccessSound = useCallback(() => {
    if (!isAudioEnabled || prefersReducedMotion()) return;

    try {
      // Reuse or create audio context
      if (!globalAudioContext) {
        globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Skip if context is not in running state
      if (globalAudioContext.state !== 'running') {
        globalAudioContext.resume().catch(() => {
          // Silently fail if audio can't be resumed
        });
        return;
      }

      // Create optimized success tone
      const oscillator = globalAudioContext.createOscillator();
      const gainNode = globalAudioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(globalAudioContext.destination);
      
      // Simplified, faster tone
      oscillator.frequency.setValueAtTime(523.25, globalAudioContext.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(783.99, globalAudioContext.currentTime + 0.08); // G5
      
      // Shorter, punchier envelope
      gainNode.gain.setValueAtTime(0, globalAudioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08, globalAudioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, globalAudioContext.currentTime + 0.15);
      
      oscillator.type = 'sine';
      oscillator.start(globalAudioContext.currentTime);
      oscillator.stop(globalAudioContext.currentTime + 0.15);
      
    } catch (error) {
      // Disable audio on error to prevent future attempts
      isAudioEnabled = false;
      logger.debug('🎉 Task completed! (Audio disabled due to error)');
    }
  }, []);

  const triggerConfetti = useCallback(() => {
    if (prefersReducedMotion()) {
      logger.debug('🎉 Task completed! (Animation disabled due to motion preference)');
      return;
    }

    // Prevent multiple simultaneous celebrations
    if (celebrationQueueRef.current) return;
    celebrationQueueRef.current = true;

    try {
      // Single, optimized confetti burst
      confetti({
        particleCount: 80, // Reduced from 200
        spread: 60,
        origin: { y: 0.7 },
        startVelocity: 45,
        gravity: 1.2, // Faster falling
        decay: 0.92,
        ticks: 120 // Shorter duration
      });

      // Reset queue after animation
      setTimeout(() => {
        celebrationQueueRef.current = false;
      }, 300);

    } catch (error) {
      celebrationQueueRef.current = false;
      logger.debug('🎉 Task completed! (Confetti not available)');
    }
  }, []);

  const triggerCelebration = useCallback(() => {
    logger.debug('🎉 CONFETTI TRIGGER: useCelebration.triggerCelebration called');
    // Immediate feedback - don't wait for anything
    playSuccessSound();
    triggerConfetti();
  }, [playSuccessSound, triggerConfetti]);

  const disableAudio = useCallback(() => {
    isAudioEnabled = false;
  }, []);

  const enableAudio = useCallback(() => {
    isAudioEnabled = true;
  }, []);

  return { 
    triggerCelebration, 
    disableAudio, 
    enableAudio,
    isAudioEnabled: () => isAudioEnabled
  };
};
