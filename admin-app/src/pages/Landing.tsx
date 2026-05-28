import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trackFBPageView } from '@/utils/facebookTracking';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { ValueProps } from '@/components/landing/ValueProps';
import { TractionMetrics } from '@/components/landing/TractionMetrics';
import { TestimonialSection } from '@/components/landing/TestimonialSection';
import { PricingPreview } from '@/components/landing/PricingPreview';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { WhatsAppFloat } from '@/components/landing/WhatsAppFloat';

const Landing: React.FC = () => {
  // Force light theme on landing page - use layout effect for immediate application
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove dark mode
    root.classList.remove('dark');
    root.classList.add('light');
    
    // Force light color scheme
    root.style.colorScheme = 'light';
    root.setAttribute('data-theme', 'light');

    // Server-side FB PageView for better attribution
    trackFBPageView();
    
    return () => {
      root.classList.remove('light');
      root.style.colorScheme = '';
      root.removeAttribute('data-theme');
    };
  }, []);

  return (
    <div 
      className="landing-page min-h-screen bg-background text-text-primary"
      style={{
        colorScheme: 'light'
      }}
    >
      <LandingNav />
      <HeroSection />
      <div className="border-b border-border" />
      <ValueProps />
      <TractionMetrics />
      <div className="max-w-5xl mx-auto px-6 py-16">
        <img 
          src="/images/zentrix-dashboard.png" 
          alt="Zentrix Dashboard - Metrics tracking interface"
          className="w-full rounded-2xl shadow-2xl border border-border"
        />
      </div>
      <TestimonialSection />
      <PricingPreview />
      <FinalCTA />
      <WhatsAppFloat />
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-secondary">
          <div>© 2024 Zentrix. All rights reserved.</div>
          <div className="flex gap-8">
            <Link to="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
            <a href="/contact" className="hover:text-text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
