import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FeatureNews, FeatureArticle } from "@/components/ui/feature-news";
import { useDismissedAnnouncements } from "@/hooks/use-dismissed-announcements";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useIsMobile } from "@/hooks/use-mobile";

type FloatingFeatureAnnouncementsProps = {
  articles: FeatureArticle[];
  className?: string;
};

const FloatingFeatureAnnouncements = ({
  articles,
  className,
}: FloatingFeatureAnnouncementsProps) => {
  const { data: dismissedNews = [], isLoading } = useDismissedAnnouncements();
  const [isVisible, setIsVisible] = React.useState(true);
  const dismissAllRef = React.useRef<(() => void) | null>(null);
  
  // Check if onboarding widget is visible to adjust positioning
  const { isVisible: onboardingVisible } = useOnboarding();
  const isMobile = useIsMobile();

  // Calculate filtered articles that aren't dismissed
  const visibleArticles = articles.filter(({ href }) => !dismissedNews.includes(href));

  // Reset visibility when new articles arrive
  React.useEffect(() => {
    if (visibleArticles.length > 0) {
      setIsVisible(true);
    }
  }, [visibleArticles.length]);

  const handleAllDismissed = () => {
    setIsVisible(false);
  };
  
  // Don't render if loading, not visible, or no visible articles
  if (isLoading || !isVisible || visibleArticles.length === 0) {
    return null;
  }

  const handleDismissAll = () => {
    if (dismissAllRef.current) {
      dismissAllRef.current();
    }
  };

  // Calculate dynamic positioning based on onboarding widget visibility
  const getPositionClass = () => {
    if (isMobile) {
      // On mobile, stack vertically - onboarding widget is at bottom-6 right-[5.5rem]
      // Place feature announcements above it when both are visible
      return onboardingVisible ? "bottom-[26rem] right-6" : "bottom-8 right-6";
    } else {
      // On desktop, place side by side when both visible
      // Onboarding widget is at right-[5.5rem] (88px), it's 320px wide (w-80)
      // So it occupies from right-88px to right-408px
      // Place feature announcements to the left of it
      return onboardingVisible ? "bottom-8 right-[26rem]" : "bottom-8 right-24";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.6,
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: 0.1,
      }}
      className={cn("fixed z-40", getPositionClass(), className)}
    >
      <div className="min-w-[224px] max-w-[403px] w-fit bg-gradient-to-r from-purple-600 via-pink-500 via-orange-400 via-yellow-300 to-blue-400 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden animate-fade-in relative">
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-lg bg-white/10 p-[1px]">
          <div className="h-full w-full rounded-lg bg-white/95 backdrop-blur-xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-background/50 to-background/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full animate-pulse shadow-lg shadow-pink-500/50"></div>
              <h3 className="text-sm font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">What's New</h3>
            </div>
            <button
              type="button"
              onClick={handleDismissAll}
              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-all duration-75"
            >
              Dismiss
            </button>
          </div>
          <div className="px-6 pt-2 pb-3">
            <FeatureNews articles={articles} dismissAllRef={dismissAllRef} onAllDismissed={handleAllDismissed} />
          </div>
        </div>
        
        {/* Subtle glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-pink-500/20 rounded-lg blur-xl opacity-90 -z-10" />
      </div>
    </motion.div>
  );
};

export default FloatingFeatureAnnouncements;