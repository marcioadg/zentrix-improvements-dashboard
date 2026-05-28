import React from 'react';
import { ArrowDown } from 'lucide-react';

export const VTOHero: React.FC = () => {
  const scrollToCapture = () => {
    document.getElementById('vto-lead-capture')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-zinc-950 to-indigo-950 text-white">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/zentrix-logo.svg" alt="Zentrix" className="h-7" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />
          <span className="text-xl font-bold tracking-tight">Zentrix</span>
        </div>
        <a href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
          Sign in
        </a>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-white/80">Free tool — no credit card required</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
          Get Complete Clarity on{' '}
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            Your Business Strategy
          </span>{' '}
          in Under 15 Minutes
        </h1>

        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          Use our free V/TO Builder to define your vision, goals, and priorities — without spreadsheets or confusion. Inspired by the EOS® methodology.
        </p>

        <button
          onClick={scrollToCapture}
          className="group inline-flex items-center gap-3 bg-white text-zinc-950 px-8 py-4 rounded-xl text-lg font-bold hover:bg-white/90 transition-all hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          Start Building for Free
          <ArrowDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
        </button>

        <p className="mt-6 text-sm text-white/40">
          Most teams never document their vision — stand out from the 90%.
        </p>
      </div>

      {/* Fade to white */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
};
