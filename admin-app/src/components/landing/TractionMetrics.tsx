import React from 'react';

const metrics = [
  { value: '10,000+', label: 'Active companies' },
  { value: '98%', label: 'Customer satisfaction' },
  { value: '2.5M+', label: 'Goals achieved' },
  { value: '50K+', label: 'Teams aligned' }
];

export const TractionMetrics: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-muted to-background py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <div className="mobile-h2 text-text-primary mb-2">
                {metric.value}
              </div>
              <div className="text-xs sm:text-sm md:text-base text-text-secondary">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
