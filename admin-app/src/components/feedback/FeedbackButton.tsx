
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export const FeedbackButton: React.FC = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  const [onboardingWidgetVisible, setOnboardingWidgetVisible] = useState(false);
  
  // Check if onboarding widget is visible on dashboard
  useEffect(() => {
    if (isDashboard) {
      const checkOnboardingWidget = () => {
        const widget = document.querySelector('[data-onboarding-widget]');
        setOnboardingWidgetVisible(!!widget);
      };

      checkOnboardingWidget();
      // Re-check after a short delay to catch async-rendered widgets
      const timer = setTimeout(checkOnboardingWidget, 1000);

      return () => clearTimeout(timer);
    } else {
      setOnboardingWidgetVisible(false);
    }
  }, [isDashboard]);
  
  const handleFeedbackClick = () => {
    window.open('https://forms.clickup.com/90131958189/f/2ky4h2dd-933/IGX4MK35RB0DH551FH', '_blank');
  };

  // Keep feedback button in consistent position since widget is now to its left
  const rightPosition = '1.5rem';

  return (
    <Button
      onClick={handleFeedbackClick}
      variant="secondary"
      className="fixed bottom-6 z-40 h-14 w-14 rounded-full shadow-lg transition-all duration-300"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: rightPosition,
        zIndex: 40
      }}
      size="icon"
      aria-label="Send feedback"
    >
      <MessageSquare className="h-5 w-5" />
    </Button>
  );
};
