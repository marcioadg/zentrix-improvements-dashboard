import React from 'react';
import { MessageSquareText, Layout, Download } from 'lucide-react';

export const VTOHowItWorks: React.FC = () => {
  const steps = [
    {
      icon: MessageSquareText,
      num: '01',
      title: 'Answer guided questions',
      description: 'Simple prompts walk you through each section of the V/TO — no prior experience needed.',
    },
    {
      icon: Layout,
      num: '02',
      title: 'Build your V/TO live',
      description: 'Watch your Vision/Traction Organizer take shape in real-time as you fill in each section.',
    },
    {
      icon: Download,
      num: '03',
      title: 'Download & share',
      description: 'Export a beautiful PDF document and share it with your leadership team instantly.',
    },
  ];

  return (
    <section className="py-20 px-6 bg-muted">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground">Three simple steps to strategic clarity.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((s) => (
            <div key={s.num} className="relative">
              <span className="text-6xl font-black text-muted/80 absolute -top-4 -left-2 select-none">
                {s.num}
              </span>
              <div className="relative pt-8">
                <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center mb-4">
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
