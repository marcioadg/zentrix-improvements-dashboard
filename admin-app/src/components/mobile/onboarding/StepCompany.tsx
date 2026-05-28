import React, { useMemo } from 'react';
import { MobileOnboardingShell } from './MobileOnboardingShell';
import { useMobileOnboarding } from './MobileOnboardingContext';

const INDUSTRY_OPTIONS = [
  'SaaS / Software',
  'E-commerce / Retail',
  'Marketplace',
  'Fintech / Financial Services',
  'Agency / Consulting',
  'Media / Content',
  'Education / EdTech',
  'Healthcare / HealthTech',
  'Manufacturing / Industrial',
  'Real Estate / PropTech',
  'Logistics / Supply Chain',
  'Hospitality / Food & Beverage',
  'Non-profit',
  'Other',
];

const COUNTRY_OPTIONS = [
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'OTHER', flag: '🌍', name: 'Other' },
];

const TEAM_SIZE_OPTIONS = ['1–10', '11–50', '51–200', '201–500', '500+', 'Just me'];

// The mobile design uses 3 simpler framework options. We map them to the
// existing eos_usage column so the data slots into the same lead_profiling
// taxonomy as /ad2.
const FRAMEWORK_OPTIONS = [
  { value: 'eos_with_software', label: 'Yes, with software', tag: 'EXISTING TOOL' },
  { value: 'eos_no_software', label: 'Yes, with spreadsheets', tag: 'MANUAL SETUP' },
  { value: 'what_is_eos', label: 'Not yet', tag: 'I WANT TO LEARN' },
];

const fieldLabel = 'block text-[13.5px] font-medium text-[#3f3f46] mb-1.5';

const StepCompany: React.FC = () => {
  const {
    companyName,
    setCompanyName,
    industry,
    setIndustry,
    country,
    setCountry,
    teamSize,
    setTeamSize,
    eosUsage,
    setEosUsage,
    next,
  } = useMobileOnboarding();

  const canContinue = useMemo(() => companyName.trim().length > 0 && !!eosUsage, [companyName, eosUsage]);

  return (
    <MobileOnboardingShell
      step={1}
      eyebrow="01 · FOUNDATION"
      title={
        <>
          Tell us about your <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 500 }}>company.</em>
        </>
      }
      subtitle="A few quick details. We use these to tailor your workspace and shape your first meeting."
      primaryLabel="Continue"
      primaryDisabled={!canContinue}
      onPrimary={() => canContinue && next()}
    >
      <section>
        <h2 className="text-[17px] font-semibold text-[#0c0d12] tracking-[-0.01em]">
          Your company details
        </h2>
        <p className="mt-1 text-[13px] text-[#71717a]">
          The only thing we strictly need is your company name.
        </p>

        {/* Company name */}
        <div className="mt-5">
          <label htmlFor="m-company-name" className={fieldLabel}>
            Company name <span className="text-[#dc2626]">*</span>
          </label>
          <input
            id="m-company-name"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your company name"
            autoCapitalize="words"
            autoComplete="organization"
            className="w-full h-12 px-4 rounded-xl bg-white border border-[#e8e8eb] text-[15px] text-[#18181b] placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#a1a1aa] focus:ring-1 focus:ring-[#d4d4d8]"
          />
        </div>

        {/* Industry + Country */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="m-industry" className={fieldLabel}>
              Industry
            </label>
            <select
              id="m-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full h-12 px-3 rounded-xl bg-white border border-[#e8e8eb] text-[15px] text-[#18181b] focus:outline-none focus:border-[#a1a1aa] focus:ring-1 focus:ring-[#d4d4d8] appearance-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: 32,
              }}
            >
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="m-country" className={fieldLabel}>
              Country
            </label>
            <select
              id="m-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-12 px-3 rounded-xl bg-white border border-[#e8e8eb] text-[15px] text-[#18181b] focus:outline-none focus:border-[#a1a1aa] focus:ring-1 focus:ring-[#d4d4d8] appearance-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: 32,
              }}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Team size */}
        <div className="mt-5">
          <div className={fieldLabel}>Team size</div>
          <div className="grid grid-cols-3 gap-2">
            {TEAM_SIZE_OPTIONS.map((size) => {
              const selected = teamSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setTeamSize(size)}
                  className={`h-12 rounded-xl text-[14px] font-medium transition-all ${
                    selected
                      ? 'bg-[#1e2235] text-white border border-[#1e2235] shadow-sm'
                      : 'bg-white border border-[#e8e8eb] text-[#3f3f46] active:bg-[#f4f4f5]'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        {/* Framework / EOS */}
        <div className="mt-6">
          <div className={fieldLabel}>Does your company currently run on a framework?</div>
          <div className="space-y-2">
            {FRAMEWORK_OPTIONS.map((opt) => {
              const selected = eosUsage === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEosUsage(opt.value)}
                  className={`w-full flex items-center justify-between px-4 h-[52px] rounded-xl border text-left transition-all ${
                    selected
                      ? 'bg-white border-[#1e2235] shadow-sm'
                      : 'bg-white border-[#e8e8eb] active:bg-[#f4f4f5]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`relative inline-flex h-[18px] w-[18px] rounded-full border-2 ${
                        selected ? 'border-[#1e2235]' : 'border-[#d4d4d8]'
                      } items-center justify-center`}
                    >
                      {selected && (
                        <span className="h-[8px] w-[8px] rounded-full bg-[#1e2235]" />
                      )}
                    </span>
                    <span className="text-[14.5px] text-[#18181b]">{opt.label}</span>
                  </span>
                  <span
                    className="text-[9.5px] tracking-[0.16em] text-[#a1a1aa] uppercase"
                    style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                  >
                    {opt.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </MobileOnboardingShell>
  );
};

export default StepCompany;
