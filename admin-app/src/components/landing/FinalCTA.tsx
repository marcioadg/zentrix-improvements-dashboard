import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export const FinalCTA: React.FC = () => {
  return (
    <section className="max-w-4xl mx-auto px-4 md:px-6 pt-20 md:pt-40 pb-20 md:pb-32 text-center">
      <h2 className="mobile-h1 text-text-primary mb-6">
        Ready to transform
        <br />
        your business?
      </h2>
      <p className="text-base sm:text-lg md:text-xl text-text-secondary mb-8 md:mb-10 max-w-2xl mx-auto">
        Join thousands of companies already running better with Zentrix.
      </p>
      <Link to="/signup">
        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-base md:text-lg px-6 md:px-10 h-12 md:h-16 gap-2">
          Get started free
          <ArrowRight className="w-5 h-5" />
        </Button>
      </Link>
      <p className="text-sm text-text-muted mt-6">
        No credit card required · 14-day free trial
      </p>
    </section>
  );
};
