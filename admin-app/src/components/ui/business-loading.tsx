import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './loading-spinner';
import { TrendingUp, Target, Users, Lightbulb, Coffee, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessLoadingProps {
  isLoading: boolean;
  delay?: number;
  className?: string;
}

const businessQuotes = [
  { icon: TrendingUp, text: "Optimizing business metrics...", subtext: "Every second counts in business!" },
  { icon: Target, text: "Aligning strategic objectives...", subtext: "Focus brings results!" },
  { icon: Users, text: "Syncing team collaboration...", subtext: "Teamwork makes the dream work!" },
  { icon: Lightbulb, text: "Generating innovative solutions...", subtext: "Innovation never sleeps!" },
  { icon: Coffee, text: "Brewing excellence...", subtext: "Good things take time!" },
  { icon: Zap, text: "Energizing productivity...", subtext: "Efficiency is our middle name!" },
];

export const BusinessLoading: React.FC<BusinessLoadingProps> = ({
  isLoading,
  delay = 0,
  className
}) => {
  const [showFunLoading, setShowFunLoading] = useState(delay === 0);
  const [currentQuote, setCurrentQuote] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setShowFunLoading(false);
      return;
    }

    if (delay === 0) {
      setShowFunLoading(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowFunLoading(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  useEffect(() => {
    if (!showFunLoading) return;

    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % businessQuotes.length);
    }, 3000); // Increased interval to reduce blinking

    return () => clearInterval(interval);
  }, [showFunLoading]);

  if (!isLoading) return null;

  if (!showFunLoading) {
    return (
      <div className={cn("flex items-center justify-center py-4", className)}>
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const quote = businessQuotes[currentQuote];
  const IconComponent = quote.icon;

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6", className)}>
      <div className="relative mb-6">
        {/* Removed the blinking ping animation */}
        <IconComponent className="h-12 w-12 text-primary" />
      </div>
      
      <div className="text-center space-y-2 mb-6">
        {/* Removed animate-pulse to reduce blinking */}
        <h3 className="text-lg font-semibold text-foreground transition-opacity duration-500">
          {quote.text}
        </h3>
        <p className="text-sm text-secondary-foreground transition-opacity duration-500">
          {quote.subtext}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-muted-foreground">
          Processing your request...
        </span>
      </div>
      
      <div className="mt-6 text-xs text-muted-foreground text-center max-w-md">
        💡 Pro tip: While you wait, consider if this task aligns with your quarterly objectives!
      </div>
    </div>
  );
};