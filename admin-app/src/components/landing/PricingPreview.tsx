import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export const PricingPreview: React.FC = () => {
  return (
    <section className="bg-muted py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="mobile-h2 text-text-primary mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-lg md:text-xl text-text-secondary mb-8 md:mb-12">
          Start free, scale as you grow
        </p>

        <div className="bg-white rounded-[6px] border-2 border-border p-6 md:p-10 max-w-md mx-auto">
          <div className="mb-6">
            <div className="text-4xl sm:text-5xl font-bold text-text-primary mb-2">
              $29
              <span className="text-xl text-text-secondary font-normal">/user/month</span>
            </div>
            <div className="text-text-secondary">Billed annually</div>
          </div>

          <Link to="/signup" className="block mb-8">
            <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 md:h-14 text-base md:text-lg">
              Start free trial
            </Button>
          </Link>

          <div className="space-y-3 text-left">
            {[
              'Unlimited users',
              'All core features',
              'Advanced analytics',
              'Priority support',
              '99.9% uptime SLA'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-success flex-shrink-0" />
                <span className="text-text-secondary">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
