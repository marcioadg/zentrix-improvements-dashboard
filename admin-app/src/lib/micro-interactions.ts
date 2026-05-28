/**
 * Micro-Interactions Standards Library
 * 
 * Defines standardized patterns for micro-interactions across the application
 * to ensure consistent, fast, and intentional user feedback.
 */

// Timing standards - fast = responsive feel
export const INTERACTION_TIMINGS = {
  instant: 100,    // Immediate feedback (hover)
  fast: 150,       // Button press
  base: 200,       // Standard transitions
  smooth: 300,     // Complex animations
} as const;

// Easing functions for natural feel
export const INTERACTION_EASINGS = {
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Material Design
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',       // Fast exit
  elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Overshoot
} as const;

// Standard interaction classes
export const HOVER_LIFT = 'hover:-translate-y-0.5 hover:shadow-md transition-all duration-200';
export const PRESS_SCALE = 'active:scale-[0.98] transition-transform duration-100';
export const ICON_BOUNCE = 'hover:scale-110 transition-transform duration-150';
export const FADE_IN = 'animate-fade-in';

// Ripple effect helper
export const createRipple = (
  event: React.MouseEvent<HTMLElement>,
  color: string = 'rgba(255, 255, 255, 0.5)'
) => {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.position = 'absolute';
  ripple.style.borderRadius = '50%';
  ripple.style.backgroundColor = color;
  ripple.style.transform = 'scale(0)';
  ripple.style.animation = 'ripple 600ms ease-out';
  ripple.style.pointerEvents = 'none';

  button.style.position = 'relative';
  button.style.overflow = 'hidden';
  button.appendChild(ripple);

  ripple.addEventListener('animationend', () => {
    ripple.remove();
  });
};

// Success feedback helper
export const createSuccessFeedback = (element: HTMLElement) => {
  element.classList.add('animate-success-pulse');
  setTimeout(() => {
    element.classList.remove('animate-success-pulse');
  }, 600);
};

// Error feedback helper
export const createErrorFeedback = (element: HTMLElement) => {
  element.classList.add('animate-error-shake');
  setTimeout(() => {
    element.classList.remove('animate-error-shake');
  }, 400);
};
