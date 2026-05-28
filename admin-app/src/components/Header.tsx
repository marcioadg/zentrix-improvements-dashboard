import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Header: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 tesla-glass border-b border-tesla-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/lovable-uploads/1a8bdcf2-1d95-4a87-8596-e81f8c8dc773.png" 
              alt="Company Logo" 
              className="h-4 w-auto"
              onError={(e) => {
                // Fallback if image doesn't load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4">
            <Link to="/login">
              <button className="text-tesla-light-gray hover:text-tesla-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-tesla-blue focus-visible:rounded transition-colors font-medium">
                Login
              </button>
            </Link>
            <Link to="/signup">
              <button className="tesla-button-primary px-4 py-2 font-medium rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-tesla-blue focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">
                Get started free
              </button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;