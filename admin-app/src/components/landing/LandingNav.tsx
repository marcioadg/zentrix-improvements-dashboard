import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const LandingNav: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/1a8bdcf2-1d95-4a87-8596-e81f8c8dc773.png" 
            alt="Zentrix"
            className="h-5 md:h-6"
          />
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/login">
            <Button variant="ghost" className="text-text-secondary hover:text-text-primary text-sm md:text-base">
              Sign in
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-foreground hover:bg-foreground/90 text-background text-sm md:text-base">
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};
