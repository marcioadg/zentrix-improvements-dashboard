import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { X } from 'lucide-react';

interface TourStep {
  target: string; // data-tour attribute value
  navigateTo: string; // route to navigate to
  tag: string; // e.g. "Step 1 of 5"
  title: string;
  body: string;
  buttonText: string;
  position: 'right' | 'bottom' | 'left';
}

export type SpotlightTourStep = TourStep;

const TOUR_STEPS: TourStep[] = [
  {
    target: 'nav-meetings',
    navigateTo: '/dashboard',
    tag: 'Step 1 of 5',
    title: 'Meetings',
    body: 'Your Meetings section is where everything happens — L10s, quarterly reviews, custom meetings. Start here.',
    buttonText: 'Next',
    position: 'right',
  },
  {
    target: 'meeting-grid',
    navigateTo: '/meetings',
    tag: 'Step 2 of 5',
    title: 'Meeting Types',
    body: 'You have four meeting types: Weekly (L10), Quarterly, Annual, and Custom. The Weekly Meeting is the backbone of EOS — most teams run it every week.',
    buttonText: 'Next',
    position: 'bottom',
  },
  {
    target: 'card-weekly',
    navigateTo: '/meetings',
    tag: 'Step 3 of 5',
    title: 'Weekly Meeting',
    body: 'Click "Weekly Meeting" to start your first L10. It launches immediately with a pre-built 90-min agenda — no setup needed.',
    buttonText: 'Next',
    position: 'bottom',
  },
  {
    target: 'task-section',
    navigateTo: '/tasks',
    tag: 'Step 4 of 5',
    title: 'Tasks',
    body: 'Tasks created during meetings show up here automatically. Every action item, owner, and due date is tracked in one place.',
    buttonText: 'Next',
    position: 'bottom',
  },
  {
    target: 'btn-invite',
    navigateTo: '/people',
    tag: 'Step 5 of 5',
    title: 'Invite Your Team',
    body: 'Invite your team so everyone joins the same meeting. They\'ll get an email link to set up their account and jump right in.',
    buttonText: 'Finish Tour',
    position: 'bottom',
  },
];

interface SpotlightTourOnboardingProps {
  onComplete: () => void;
  onDismiss: () => void;
  /** Optional override step list; defaults to the original 5-step generic tour. */
  steps?: TourStep[];
  /** sessionStorage key used to persist the current step across remounts. */
  storageKey?: string;
  /** Fired once each time a new step becomes active — used for tour_step_viewed telemetry. */
  onStepView?: (stepIndex: number, step: TourStep) => void;
}

export const SpotlightTourOnboarding: React.FC<SpotlightTourOnboardingProps> = ({
  onComplete,
  onDismiss,
  steps = TOUR_STEPS,
  storageKey = 'spotlight_tour_step',
  onStepView,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const rectStorageKey = `${storageKey}_rect`;
  const styleStorageKey = `${storageKey}_style`;

  const [currentStep, setCurrentStep] = useState(() => {
    const saved = sessionStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Restore the previous spotlight rect on mount so the cutout doesn't
  // collapse to a full-screen dim during the AppLayout remount that
  // happens between steps. The new step's findAndSpotlight will replace
  // it with the new rect, and the SVG mask transitions smoothly because
  // the SVG element stays mounted.
  const [targetRect, setTargetRect] = useState<DOMRect | null>(() => {
    try {
      const saved = sessionStorage.getItem(rectStorageKey);
      if (saved) {
        const { left, top, width, height } = JSON.parse(saved);
        return {
          left, top, width, height,
          right: left + width, bottom: top + height,
          x: left, y: top,
          toJSON: () => ({ left, top, width, height }),
        } as DOMRect;
      }
    } catch { /* ignore */ }
    return null;
  });

  // Restore the previous tooltip position on mount so the card animates
  // from the previous step's spot to the new one instead of teleporting
  // through the viewport center.
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>(() => {
    try {
      const saved = sessionStorage.getItem(styleStorageKey);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });

  const retryRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const step = steps[currentStep];

  // Persist step to sessionStorage so it survives AppLayout remounts
  useEffect(() => {
    sessionStorage.setItem(storageKey, String(currentStep));
  }, [currentStep, storageKey]);

  // Notify the parent each time the step changes so it can fire telemetry.
  // Includes the initial render — we want the very first step viewed to
  // be recorded too.
  const lastReportedStepRef = useRef<number>(-1);
  useEffect(() => {
    if (lastReportedStepRef.current === currentStep) return;
    lastReportedStepRef.current = currentStep;
    onStepView?.(currentStep, steps[currentStep]);
  }, [currentStep, steps, onStepView]);

  // Persist the latest rect/style so the next mount can start from here.
  useEffect(() => {
    if (!targetRect) return;
    try {
      sessionStorage.setItem(rectStorageKey, JSON.stringify({
        left: targetRect.left, top: targetRect.top,
        width: targetRect.width, height: targetRect.height,
      }));
    } catch { /* ignore */ }
  }, [targetRect, rectStorageKey]);

  useEffect(() => {
    if (!tooltipStyle || Object.keys(tooltipStyle).length === 0) return;
    try {
      sessionStorage.setItem(styleStorageKey, JSON.stringify(tooltipStyle));
    } catch { /* ignore */ }
  }, [tooltipStyle, styleStorageKey]);

  // Wipe the persisted positions when the tour ends so a fresh tour
  // doesn't start with stale coordinates.
  const clearPersistedPositions = () => {
    try {
      sessionStorage.removeItem(rectStorageKey);
      sessionStorage.removeItem(styleStorageKey);
    } catch { /* ignore */ }
  };

  // Find and spotlight the target element
  const findAndSpotlight = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      const raw = el.getBoundingClientRect();
      if (raw.width > 0 && raw.height > 0) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Bring the target into view so the spotlight cutout actually
        // lines up with what the user sees. Without this, a target near
        // the bottom of the page produces a cutout that's mostly off-screen.
        if (raw.top < 0 || raw.bottom > vh) {
          el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
        }

        // Re-read the rect after the scroll. Targets that fit comfortably
        // in the viewport keep the requested tooltip position. Targets
        // taller than the viewport get the cutout extended close to the
        // bottom of the viewport (so as much content as possible stays
        // highlighted) and the tooltip pinned to the bottom-right corner.
        const r = el.getBoundingClientRect();
        const visibleTop = Math.max(8, r.top);
        const NORMAL_RESERVE = 220; // room below cutout for tooltip + padding
        const FULL_VIEW_PADDING = 24; // when target is tall, leave just a thin margin
        const wouldOverflow = r.height > vh - visibleTop - NORMAL_RESERVE;
        const reserve = wouldOverflow ? FULL_VIEW_PADDING : NORMAL_RESERVE;
        const maxHeight = Math.max(120, vh - visibleTop - reserve);
        const clamped = {
          left: r.left,
          top: visibleTop,
          right: r.right,
          bottom: visibleTop + Math.min(r.height, maxHeight),
          width: r.width,
          height: Math.min(r.height, maxHeight),
        } as DOMRect;

        setTargetRect(clamped);

        // Position tooltip
        const pad = 16;
        const tooltipW = 320;
        let style: React.CSSProperties = { maxWidth: tooltipW };

        if (wouldOverflow) {
          // Tall target — the cutout fills the viewport. Park the tooltip
          // at the bottom-left of the target (after the sidebar) with
          // breathing room from the viewport edge, matching the natural
          // 'bottom' position so it doesn't feel like a different tour.
          style.left = Math.max(pad, clamped.left);
          style.top = vh - 240;
        } else if (step.position === 'right') {
          style.left = clamped.right + pad;
          style.top = clamped.top;
        } else if (step.position === 'bottom') {
          style.left = Math.max(pad, clamped.left);
          style.top = clamped.bottom + pad;
        } else if (step.position === 'left') {
          style.left = clamped.left - tooltipW - pad;
          style.top = clamped.top;
        }

        // Keep within viewport bounds
        if ((style.left as number) + tooltipW > vw - pad) {
          style.left = vw - tooltipW - pad;
        }
        if ((style.left as number) < pad) {
          style.left = pad;
        }
        // Reserve 40px of breathing room at the bottom of the viewport so
        // the tooltip never feels glued to the screen edge.
        const TOOLTIP_BOTTOM_PADDING = 40;
        const TOOLTIP_HEIGHT_GUESS = 200;
        const tooltipMaxTop = vh - TOOLTIP_HEIGHT_GUESS - TOOLTIP_BOTTOM_PADDING;
        if ((style.top as number) > tooltipMaxTop) {
          style.top = tooltipMaxTop;
        }

        // Visually connect the cutout to the tooltip when the tooltip
        // sits below the target with empty space in between. Without this,
        // a short target (e.g. dashboard grid) leaves a dim gap between
        // the highlight and the tooltip that feels disconnected.
        if (!wouldOverflow && step.position === 'bottom') {
          const tooltipTop = style.top as number;
          const desiredBottom = tooltipTop - pad;
          if (desiredBottom > clamped.bottom + 24) {
            const extended = {
              ...clamped,
              bottom: desiredBottom,
              height: desiredBottom - clamped.top,
            } as DOMRect;
            setTargetRect(extended);
            setTooltipStyle(style);
            return true;
          }
        }

        setTooltipStyle(style);
        return true;
      }
    }
    return false;
  }, [step]);

  // Navigate to the right page and find the target
  useEffect(() => {
    // Don't reset targetRect — keep old position until new target is found
    // This prevents the tooltip from jumping to center then back

    // Navigate if needed
    if (location.pathname !== step.navigateTo) {
      navigate(step.navigateTo);
    }

    // Retry finding the element — generous limit for lazy-loaded pages
    let attempts = 0;
    const maxAttempts = 50;

    const tryFind = () => {
      if (findAndSpotlight()) {
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        retryRef.current = setTimeout(tryFind, 200);
      }
    };

    retryRef.current = setTimeout(tryFind, 200);

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [currentStep, step.navigateTo, location.pathname, navigate, findAndSpotlight]);

  // Re-calculate on resize/scroll
  useEffect(() => {
    const handleResize = () => findAndSpotlight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [findAndSpotlight]);

  // Bottom-overflow guard: after each render, measure the actual tooltip
  // card and pull it up if its bottom edge is closer than 40px to the
  // viewport floor. The fallback positioning code can't know the real
  // height (long copy on some steps wraps to 4-5 lines and pushes the
  // card past 200px), so we self-correct here. The conditional setState
  // makes this safe — once the tooltip fits, the effect is a no-op.
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) return;

    const VIEWPORT_BOTTOM_PADDING = 40;
    const vh = window.innerHeight;
    const maxBottom = vh - VIEWPORT_BOTTOM_PADDING;

    if (rect.bottom > maxBottom + 1) {
      const correctedTop = Math.max(VIEWPORT_BOTTOM_PADDING, maxBottom - rect.height);
      setTooltipStyle(prev =>
        prev.top === correctedTop ? prev : { ...prev, top: correctedTop }
      );
    }
  }, [tooltipStyle, currentStep]);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tour complete
      sessionStorage.removeItem(storageKey);
      clearPersistedPositions();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq('id', user.id);
      }
      onComplete();
    }
  };

  const handleSkip = async () => {
    sessionStorage.removeItem(storageKey);
    clearPersistedPositions();
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);
    }
    onDismiss();
  };

  const pad = 10;
  const hasSpotlight = !!targetRect;
  const hasPersistedTooltipPosition = tooltipStyle.left !== undefined || tooltipStyle.top !== undefined;

  // Tooltip: positioned near target when found OR when we have a persisted
  // position from the previous step. Falls back to viewport-center only on
  // the very first render with no spotlight and no saved position.
  const resolvedTooltipStyle: React.CSSProperties = (hasSpotlight || hasPersistedTooltipPosition)
    ? { ...tooltipStyle, zIndex: 202 }
    : { zIndex: 202, maxWidth: 320, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Dark overlay — always visible */}
      {hasSpotlight ? (
        <svg
          className="fixed inset-0 w-full h-full pointer-events-auto"
          style={{ zIndex: 200 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect!.left - pad}
                y={targetRect!.top - pad}
                width={targetRect!.width + pad * 2}
                height={targetRect!.height + pad * 2}
                rx={8}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#spotlight-mask)"
            onClick={handleNext}
          />
        </svg>
      ) : (
        <div
          className="fixed inset-0 bg-black/55 pointer-events-auto"
          style={{ zIndex: 200 }}
          onClick={handleNext}
        />
      )}

      {/* Spotlight border glow (only when target found) */}
      {hasSpotlight && (
        <div
          className="fixed border-2 border-primary/40 rounded-lg pointer-events-none"
          style={{
            left: targetRect!.left - pad,
            top: targetRect!.top - pad,
            width: targetRect!.width + pad * 2,
            height: targetRect!.height + pad * 2,
            zIndex: 201,
            boxShadow: '0 0 0 4px rgba(94, 106, 210, 0.15)',
          }}
        />
      )}

      {/* Tooltip — always visible, smoothly transitions position */}
      <div
        ref={tooltipRef}
        className="fixed bg-card border border-border rounded-xl shadow-2xl p-5 pointer-events-auto"
        style={{
          ...resolvedTooltipStyle,
          transition: 'left 0.35s ease, top 0.35s ease, transform 0.35s ease',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-2">
          {step.tag}
        </div>
        <h3 className="text-sm font-bold text-foreground mb-1.5">{step.title}</h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
          {step.body}
        </p>
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
          <Button size="sm" onClick={handleNext} className="h-8 text-xs px-4">
            {step.buttonText} →
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-3 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-4 bg-primary' : i < currentStep ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
