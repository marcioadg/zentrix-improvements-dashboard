import React from 'react';
import { Target, TrendingUp, Users } from 'lucide-react';

const props = [
  {
    icon: Target,
    title: 'Align your team',
    description: 'Set clear goals and keep everyone on the same page with shared objectives and real-time progress tracking.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: TrendingUp,
    title: 'Track what matters',
    description: 'Monitor key metrics and KPIs in one place. Make data-driven decisions with beautiful, actionable dashboards.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: Users,
    title: 'Execute with clarity',
    description: 'Run effective meetings, resolve issues faster, and ensure accountability with built-in workflows.',
    color: 'from-orange-500 to-red-500'
  }
];

export const ValueProps: React.FC = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
        {props.map((prop, index) => {
          const Icon = prop.icon;
          return (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-muted to-background mb-6">
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br ${prop.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              </div>
              <h3 className="mobile-h4 text-foreground mb-3">
                {prop.title}
              </h3>
              <p className="mobile-body text-muted-foreground leading-relaxed">
                {prop.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
