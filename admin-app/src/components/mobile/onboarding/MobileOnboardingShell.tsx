import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { MobileStepId } from './MobileOnboardingContext';

const STEPS: { num: MobileStepId; label: string }[] = [
  { num: 1, label: 'COMPANY' },
  { num: 2, label: 'METRICS' },
  { num: 3, label: 'GOALS' },
  { num: 4, label: 'WORKSPACE' },
];

const HERO_GRADIENT =
  'radial-gradient(120% 80% at 100% 0%, #c66a8a 0%, rgba(198,106,138,0) 55%), linear-gradient(160deg, #0c0d12 0%, #1a1d2e 60%, #2a2e4a 100%)';

const PRIMARY_BTN_GRADIENT = 'linear-gradient(90deg, #1e2235 0%, #8b8ec5 100%)';

interface ShellProps {
  step: MobileStepId;
  eyebrow: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  heroExtra?: React.ReactNode;
  children: React.ReactNode;

  primaryLabel: string;
  primarySuffix?: React.ReactNode;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary: () => void;
  onBack?: () => void;
  backLabel?: string;
  footerHint?: React.ReactNode;
}

export const MobileOnboardingShell: React.FC<ShellProps> = ({
  step,
  eyebrow,
  title,
  subtitle,
  heroExtra,
  children,
  primaryLabel,
  primarySuffix,
  primaryDisabled,
  primaryLoading,
  onPrimary,
  onBack,
  backLabel = 'Back',
  footerHint,
}) => {
  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-[#fafafa] text-[#18181b]"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
    >
      {/* Dark hero header */}
      <div
        className="relative px-6 pt-8 pb-5 text-white overflow-hidden"
        style={{ background: HERO_GRADIENT }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Top bar: logo + step counter */}
        <div className="relative flex items-center justify-between">
          <div
            className="text-[18px] font-medium tracking-[0.18em]"
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.18em' }}
          >
            <span className="opacity-95">Z E N T R I X</span>
            <span className="font-semibold ml-1">OS</span>
          </div>
          <div
            className="text-[10px] tracking-[0.18em] uppercase opacity-70"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
          >
            SETUP · {step}/4
          </div>
        </div>

        {/* Eyebrow */}
        <div
          className="relative mt-6 text-[10.5px] tracking-[0.22em] uppercase opacity-75"
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
        >
          {eyebrow}
        </div>

        {/* Title */}
        <h1
          className="relative mt-2 text-[28px] leading-[1.08] font-semibold tracking-[-0.02em]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p className="relative mt-3 text-[13.5px] leading-[1.5] text-white/75 max-w-[34ch]">
          {subtitle}
        </p>

        {heroExtra && <div className="relative mt-5">{heroExtra}</div>}

        {/* Step nav */}
        <div className="relative mt-6">
          <div className="grid grid-cols-4 gap-1">
            {STEPS.map((s) => {
              const active = s.num === step;
              const past = s.num < step;
              return (
                <div key={s.num} className="flex flex-col items-start">
                  <div
                    className={`h-[2px] w-full rounded-full ${
                      active ? 'bg-white' : past ? 'bg-white/60' : 'bg-white/20'
                    }`}
                  />
                  <div
                    className={`mt-2 text-[9.5px] tracking-[0.18em] ${
                      active ? 'text-white' : 'text-white/55'
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                  >
                    {String(s.num).padStart(2, '0')} {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 pt-7 pb-[120px]">{children}</div>

      {/* Sticky footer */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e8e8eb] px-5 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {footerHint && (
          <div className="text-center text-[11px] text-[#71717a] mb-2">{footerHint}</div>
        )}
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="h-12 px-6 rounded-xl border border-[#e8e8eb] bg-white text-[#3f3f46] text-[14px] font-medium active:bg-[#f4f4f5] transition-colors"
            >
              {backLabel}
            </button>
          ) : null}
          <button
            type="button"
            disabled={primaryDisabled || primaryLoading}
            onClick={onPrimary}
            className="flex-1 h-12 rounded-xl text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: PRIMARY_BTN_GRADIENT }}
          >
            {primaryLoading ? (
              <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {primaryLabel}
                {primarySuffix !== undefined ? (
                  primarySuffix
                ) : (
                  <ArrowRight size={16} strokeWidth={2.4} />
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
