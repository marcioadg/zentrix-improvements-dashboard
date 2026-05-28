import React from 'react';
import { Target, Users, Zap } from 'lucide-react';

export const VTOSocialProof: React.FC = () => {
  const benefits = [
    {
      icon: Target,
      title: 'Crystal Clear Vision',
      description: 'Define where your company is going in 10 years, 3 years, and this year — all on one page.',
    },
    {
      icon: Users,
      title: 'Total Team Alignment',
      description: 'Get every team member pulling in the same direction with shared goals and priorities.',
    },
    {
      icon: Zap,
      title: 'Relentless Execution',
      description: 'Break your vision into quarterly rocks so nothing falls through the cracks.',
    },
  ];

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest mb-3">
            Inspired by the EOS® Methodology
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Your entire business strategy. One document.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The V/TO (Vision/Traction Organizer) is the single most important strategic document for growing companies.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((b) => (
            <div key={b.title} className="text-center group">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-5 group-hover:bg-violet-100 transition-colors">
                <b.icon className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{b.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
