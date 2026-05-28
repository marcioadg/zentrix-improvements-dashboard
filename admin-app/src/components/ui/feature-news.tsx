import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { debounce } from "@/utils/debounce";
import { useDismissedAnnouncements, useDismissAnnouncement } from "@/hooks/use-dismissed-announcements";
import { logger } from '@/utils/logger';

export interface FeatureArticle {
  href: string;
  title: string;
  summary: string;
  image?: string;
  type: 'feature' | 'update' | 'announcement';
  created_at: string;
}

const OFFSET_FACTOR = 4;
const SCALE_FACTOR = 0.03;
const OPACITY_FACTOR = 0.1;

export function FeatureNews({ articles, dismissAllRef, onAllDismissed }: { articles: FeatureArticle[]; dismissAllRef?: React.MutableRefObject<(() => void) | null>; onAllDismissed?: () => void; }) {
  const { data: dismissedNews = [], isLoading } = useDismissedAnnouncements();
  const dismissMutation = useDismissAnnouncement();
  const [frontCardHeight, setFrontCardHeight] = React.useState<number | null>(null);
  const frontCardRef = React.useRef<HTMLDivElement>(null);
  
  // Debug logging
  React.useEffect(() => {
    logger.log("📄 FeatureNews component loaded:", {
      articlesCount: articles.length,
      dismissedCount: dismissedNews.length,
      dismissedNews,
      isLoading
    });
  }, [articles.length, dismissedNews.length, isLoading]);
  
  // Filter out dismissed articles
  const cards = articles.filter(({ href }) => !dismissedNews.includes(href));
  const cardCount = cards.length;

  const dismissTopCard = () => {
    if (cards.length > 0) {
      const topCard = cards[0];
      dismissMutation.mutate(topCard.href);
      
      // Check if this was the last card
      const remainingCards = articles.filter(({ href }) => !dismissedNews.includes(href) && href !== topCard.href);
      if (remainingCards.length === 0) {
        onAllDismissed?.();
      }
    }
  };

  // Expose dismissTopCard function to parent via ref
  React.useEffect(() => {
    if (dismissAllRef) {
      dismissAllRef.current = dismissTopCard;
    }
  }, [cards, dismissedNews, dismissAllRef]);

  // Measure front card height with improved timing and debouncing
  React.useLayoutEffect(() => {
    if (frontCardRef.current && cardCount > 0) {
      const debouncedUpdateHeight = debounce(() => {
        if (frontCardRef.current) {
          try {
            const height = frontCardRef.current.getBoundingClientRect().height;
            setFrontCardHeight(height > 0 ? height : 120); // Fallback to 120px if measurement fails
          } catch (error) {
            logger.warn('Failed to measure card height:', error);
            setFrontCardHeight(120); // Fallback height
          }
        }
      }, 16); // ~60fps debouncing

      const resizeObserver = new ResizeObserver(debouncedUpdateHeight);
      
      resizeObserver.observe(frontCardRef.current);
      
      // Initial measurement
      debouncedUpdateHeight();
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [cardCount, cards]);

  return (!isLoading && cards.length) ? (
    <div
      className="group px-3 pt-2 min-h-fit"
      data-active={cardCount !== 0}
    >
      <div className="relative w-full min-h-fit">
        {cards.slice().reverse().map(({ href, title, summary, image, type }, idx) => (
          <div
            key={href}
            className={cn(
              "absolute left-0 top-0 w-full scale-[var(--scale)] transition-[opacity,transform] duration-200",
              cardCount - idx > 3
                ? [
                    "opacity-0 sm:group-hover:translate-y-[var(--y)] sm:group-hover:opacity-[var(--opacity)]",
                    "sm:group-has-[*[data-dragging=true]]:translate-y-[var(--y)] sm:group-has-[*[data-dragging=true]]:opacity-[var(--opacity)]",
                  ]
                : "translate-y-[var(--y)] opacity-[var(--opacity)]"
            )}
            style={
              {
                "--y": `-${(cardCount - (idx + 1)) * OFFSET_FACTOR}%`,
                "--scale": 1 - (cardCount - (idx + 1)) * SCALE_FACTOR,
                 "--opacity":
                   cardCount - (idx + 1) >= 6
                     ? 0
                     : idx === cardCount - 1 
                       ? 1 
                       : Math.max(0.15, 1 - (cardCount - (idx + 1)) * 0.25),
              } as React.CSSProperties
            }
            aria-hidden={idx !== cardCount - 1}
          >
            <FeatureCard
              title={title}
              description={summary}
              image={image}
              href={href}
              type={type}
              hideContent={cardCount - idx > 2}
              active={idx === cardCount - 1}
              maxHeight={idx !== cardCount - 1 ? frontCardHeight : undefined}
              ref={idx === cardCount - 1 ? frontCardRef : undefined}
              onDismiss={() => {
                logger.log("🔥 DISMISS CLICKED for href:", href);
                dismissMutation.mutate(href);
                
                // Check if this was the last card
                const remainingCards = articles.filter(({ href: articleHref }) => !dismissedNews.includes(articleHref) && articleHref !== href);
                if (remainingCards.length === 0) {
                  onAllDismissed?.();
                }
              }}
            />
          </div>
        ))}
        <div 
          className="pointer-events-none invisible" 
          aria-hidden
          style={frontCardHeight ? { height: `${frontCardHeight + 4}px` } : undefined}
        >
          <FeatureCard 
            title="Sample Title Text That Could Be Longer For Proper Height Calculation" 
            description="Sample description text that could span multiple lines to ensure proper height calculation for the container. This description should be quite long to accommodate feature announcements that contain substantial amounts of text content, allowing the cards to expand properly to show all the content without any truncation or cutting off. We want to make sure that even the longest announcements will display properly within the available space without being constrained by height limitations."
            type="feature" 
            image="placeholder" 
          />
        </div>
      </div>
    </div>
  ) : null;
}

const FeatureCard = React.forwardRef<HTMLDivElement, {
  title: string;
  description: string;
  image?: string;
  onDismiss?: () => void;
  hideContent?: boolean;
  href?: string;
  type: 'feature' | 'update' | 'announcement';
  active?: boolean;
  maxHeight?: number | null;
}>(({
  title,
  description,
  image,
  onDismiss,
  hideContent,
  href,
  type,
  active,
  maxHeight,
}, forwardedRef) => {
  const { isMobile } = useMediaQuery();

  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{
    start: number;
    delta: number;
    startTime: number;
    maxDelta: number;
  }>({
    start: 0,
    delta: 0,
    startTime: 0,
    maxDelta: 0,
  });
  const animation = React.useRef<Animation>();
  const [dragging, setDragging] = React.useState(false);

  const onDragMove = (e: PointerEvent) => {
    if (!ref.current) return;
    const { clientX } = e;
    const dx = clientX - drag.current.start;
    drag.current.delta = dx;
    drag.current.maxDelta = Math.max(drag.current.maxDelta, Math.abs(dx));
    ref.current.style.setProperty('--dx', dx.toString());
  };

  const dismiss = () => {
    if (!ref.current) return;

    const cardWidth = ref.current.getBoundingClientRect().width;
    const translateX = Math.sign(drag.current.delta) * cardWidth;

    // Dismiss card
    animation.current = ref.current.animate(
      { opacity: 0, transform: `translateX(${translateX}px)` },
      { duration: 150, easing: 'ease-in-out', fill: 'forwards' }
    );
    animation.current.onfinish = () => onDismiss?.();
  };

  const stopDragging = (cancelled: boolean) => {
    if (!ref.current) return;
    unbindListeners();
    setDragging(false);

    const dx = drag.current.delta;
    if (Math.abs(dx) > ref.current.clientWidth / (cancelled ? 2 : 3)) {
      dismiss();
      return;
    }

    // Animate back to original position
    animation.current = ref.current.animate(
      { transform: 'translateX(0)' },
      { duration: 150, easing: 'ease-in-out' }
    );
    animation.current.onfinish = () =>
      ref.current?.style.setProperty('--dx', '0');

    drag.current = { start: 0, delta: 0, startTime: 0, maxDelta: 0 };
  };

  const onDragEnd = () => stopDragging(false);
  const onDragCancel = () => stopDragging(true);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!active || !ref.current || animation.current?.playState === 'running')
      return;

    bindListeners();
    setDragging(true);
    drag.current.start = e.clientX;
    drag.current.startTime = Date.now();
    drag.current.delta = 0;
    ref.current.style.setProperty('--w', ref.current.clientWidth.toString());
  };

  const onClick = () => {
    if (!ref.current || !href) return;
    if (
      isMobile &&
      drag.current.maxDelta < ref.current.clientWidth / 10 &&
      (!drag.current.startTime || Date.now() - drag.current.startTime < 250)
    ) {
      // Touch user didn't drag far or for long, open the link
      window.open(href, '_blank');
    }
  };

  const bindListeners = () => {
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd);
    document.addEventListener('pointercancel', onDragCancel);
  };

  const unbindListeners = () => {
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
    document.removeEventListener('pointercancel', onDragCancel);
  };

  const getCardBackground = () => {
    const baseClasses = active 
      ? "bg-card/95 backdrop-blur-sm border border-border/50" // More solid background for active card
      : "bg-card/70 backdrop-blur-sm border border-border/30"; // More transparent for background cards
      
    switch (type) {
      case 'feature':
        return `${baseClasses} border-l-4 border-l-blue-500`;
      case 'update':
        return `${baseClasses} border-l-4 border-l-green-500`;
      case 'announcement':
        return `${baseClasses} border-l-4 border-l-orange-500`;
      default:
        return `${baseClasses} border-l-4 border-l-gray-500`;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'feature':
        return 'bg-gradient-to-r from-blue-500 to-cyan-400 text-primary-foreground border-0 shadow-lg shadow-blue-500/25';
      case 'update':
        return 'bg-gradient-to-r from-green-500 to-emerald-400 text-primary-foreground border-0 shadow-lg shadow-green-500/25';
      case 'announcement':
        return 'bg-gradient-to-r from-orange-500 to-pink-500 text-primary-foreground border-0 shadow-lg shadow-orange-500/25';
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-400 text-primary-foreground border-0 shadow-lg shadow-gray-500/25';
    }
  };

  // Use a combined ref that forwards to both internal ref and forwardedRef
  const combinedRef = React.useCallback((node: HTMLDivElement | null) => {
    ref.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  }, [forwardedRef]);

  return (
    <Card
      ref={combinedRef}
      className={cn(
        "relative select-none gap-2 p-3 text-[0.8125rem]",
        "translate-x-[calc(var(--dx)*1px)] rotate-[calc(var(--dx)*0.05deg)] opacity-[calc(1-max(var(--dx),-1*var(--dx))/var(--w)/2)]",
        "transition-shadow data-[dragging=true]:shadow-md",
        maxHeight && "overflow-hidden",
        getCardBackground()
      )}
      style={maxHeight ? { height: `${maxHeight}px`, minHeight: 'auto' } : { minHeight: 'auto' }}
      data-dragging={dragging}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div className={cn(hideContent && "invisible")}>
        {image && (
          <div className="relative mb-3 aspect-[16/9] w-full shrink-0 overflow-hidden rounded border bg-muted">
            <img
              src={image}
              alt=""
              className="rounded object-cover object-center w-full h-full"
              draggable={false}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground break-words">
              {title}
            </span>
            <span className={cn(
              "text-xs px-2 py-1 rounded-full border text-nowrap",
              getTypeColor()
            )}>
              {type}
            </span>
          </div>
          <p className="text-muted-foreground leading-5 break-words">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
});

function AnimatedLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1H15V12.9332C15.0001 12.9465 15.0002 12.9598 15.0003 12.9731C15.0003 12.982 15.0003 12.991 15.0003 13C15.0003 13.0223 15.0002 13.0445 15 13.0668V20H12V18.7455C10.8662 19.5362 9.48733 20 8.00016 20C4.13408 20 1 16.866 1 13C1 9.13401 4.13408 6 8.00016 6C9.48733 6 10.8662 6.46375 12 7.25452V1ZM8 16.9998C10.2091 16.9998 12 15.209 12 12.9999C12 10.7908 10.2091 9 8 9C5.79086 9 4 10.7908 4 12.9999C4 15.209 5.79086 16.9998 8 16.9998Z"
        stroke="currentColor"
        strokeDasharray="63"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="2500ms"
          values="63;0;0;0;63"
          fill="freeze"
        />
      </path>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17 6H20V13V13C20 14.0608 20.4215 15.0782 21.1716 15.8283C21.9217 16.5784 22.9391 16.9998 24 16.9998C25.0609 16.9998 26.0783 16.5784 26.8284 15.8283C27.5785 15.0782 28 14.0608 28 13C28 13 28 13 28 13V6H31V13H31.0003C31.0003 13.9192 30.8192 14.8295 30.4675 15.6788C30.1157 16.5281 29.6 17.2997 28.95 17.9497C28.3 18.5997 27.5283 19.1154 26.679 19.4671C25.8297 19.8189 24.9194 20 24.0002 20C23.0809 20 22.1706 19.8189 21.3213 19.4671C20.472 19.1154 19.7003 18.5997 19.0503 17.9497C18.4003 17.2997 17.8846 16.5281 17.5329 15.6788C17.1811 14.8295 17 13.9192 17 13V13V6Z"
        stroke="currentColor"
        strokeDasharray="69"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="2500ms"
          values="69;0;0;0;69"
          fill="freeze"
        />
      </path>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M33 1H36V7.25474C37.1339 6.46383 38.5128 6 40.0002 6C43.8662 6 47.0003 9.13401 47.0003 13C47.0003 16.866 43.8662 20 40.0002 20C36.1341 20 33 16.866 33 13V1ZM40 16.9998C42.2091 16.9998 44 15.209 44 12.9999C44 10.7908 42.2091 9 40 9C37.7909 9 36 10.7908 36 12.9999C36 15.209 37.7909 16.9998 40 16.9998Z"
        stroke="currentColor"
        strokeDasharray="60"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="2500ms"
          values="-60;0;0;0;-60"
          fill="freeze"
        />
      </path>
    </svg>
  );
}