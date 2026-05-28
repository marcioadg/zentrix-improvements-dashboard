import { logger } from '@/utils/logger';
export const playTangentAlertSound = () => {
  try {
    logger.log('🚨 TANGENT ALERT SOUND: Playing alert sound');
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playBeep = (frequency: number, duration: number, delay: number = 0) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      }, delay);
    };

    // Play alert pattern: High-Low-High beeps
    playBeep(800, 0.15, 0);    // High beep
    playBeep(400, 0.15, 200);  // Low beep  
    playBeep(800, 0.2, 400);   // High beep (longer)
    
  } catch (error) {
    logger.log('🚨 TANGENT ALERT SOUND: Audio not available');
  }
};