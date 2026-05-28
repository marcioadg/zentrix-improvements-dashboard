import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="max-w-4xl mx-auto container-padding section-spacing-lg text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-tight px-4 py-2 rounded-full bg-secondary/50 text-purple-700 text-label-lg mb-8">
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
        Trusted by 10,000+ companies worldwide
      </div>

      {/* Headline */}
      <h1 className="text-display-md tracking-tight text-text-primary mb-6">
        Run your business
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
          like a pro
        </span>
      </h1>

      {/* Subheadline */}
      <p className="text-body-lg text-text-secondary mb-8 md:mb-12 max-w-2xl mx-auto">
        The all-in-one operating system for modern businesses. Align your team, track progress, and achieve your goals faster.
      </p>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-content mb-12">
        <Link to="/signup">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-body px-8 h-14 inline-flex gap-tight">
            Start free trial
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <Button 
          size="lg" 
          variant="outline" 
          className="text-body px-8 h-14 border-2 hover:bg-muted"
        >
          Watch demo
        </Button>
      </div>

      {/* Trust signals */}
      <div className="flex flex-wrap items-center justify-center gap-card text-body-sm text-text-secondary">
        <div className="flex items-center gap-tight">
          <CheckCircle2 className="w-4 h-4 text-success" />
          Free 14-day trial
        </div>
        <div className="flex items-center gap-tight">
          <CheckCircle2 className="w-4 h-4 text-success" />
          No credit card required
        </div>
        <div className="flex items-center gap-tight">
          <CheckCircle2 className="w-4 h-4 text-success" />
          Cancel anytime
        </div>
      </div>
    </section>
  );
};
