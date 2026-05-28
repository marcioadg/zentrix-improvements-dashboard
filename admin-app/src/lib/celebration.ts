import confetti from 'canvas-confetti';
import { logger } from '@/utils/logger';

export const triggerConfetti = () => {
  // Launch multiple confetti bursts for extra celebration
  const count = 200;
  const defaults = {
    origin: { y: 0.7 }
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  // Multiple burst pattern for more excitement
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};

export const playCelebrationSound = () => {
  // Create celebration sound using Web Audio API
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextClass();
  
  const playNote = (frequency: number, duration: number, delay: number = 0) => {
    setTimeout(() => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    }, delay);
  };

  // Play a cheerful celebration melody
  playNote(523.25, 0.2, 0);    // C5
  playNote(659.25, 0.2, 100);  // E5
  playNote(783.99, 0.3, 200);  // G5
  playNote(1046.5, 0.4, 300);  // C6
};

// Debounce protection: prevent multiple celebrations within 2 seconds
let lastCelebrationTime = 0;
const CELEBRATION_COOLDOWN = 2000; // 2 seconds

export const celebrate = () => {
  const now = Date.now();
  if (now - lastCelebrationTime < CELEBRATION_COOLDOWN) {
    logger.debug('🎉 Celebration skipped (cooldown active)');
    return;
  }
  lastCelebrationTime = now;
  
  logger.debug('🎉 CONFETTI TRIGGER: lib/celebration.celebrate called');
  triggerConfetti();
  try {
    playCelebrationSound();
  } catch (error) {
    logger.debug('Audio not available, showing confetti only');
  }
};