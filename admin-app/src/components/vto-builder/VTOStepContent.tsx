import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, X, Lightbulb } from 'lucide-react';
import { VTOData } from './VTOBuilderApp';

interface Step {
  id: string;
  label: string;
}

interface Props {
  step: Step;
  stepIndex: number;
  data: VTOData;
  setData: React.Dispatch<React.SetStateAction<VTOData>>;
}

const Tip: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200 mb-6">
    <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
    <span>{text}</span>
  </div>
);

const SectionHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
    <p className="text-muted-foreground leading-relaxed">{subtitle}</p>
  </div>
);

const ListInput: React.FC<{
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  maxItems?: number;
}> = ({ items, onChange, placeholder, maxItems = 10 }) => {
  const updateItem = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const addItem = () => {
    if (items.length < maxItems) onChange([...items, '']);
  };
  const removeItem = (i: number) => {
    if (items.length > 1) onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start group">
          <span className="text-sm text-muted-foreground mt-3 w-5 text-right shrink-0">{i + 1}.</span>
          <Input
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          {items.length > 1 && (
            <button
              onClick={() => removeItem(i)}
              className="opacity-0 group-hover:opacity-100 transition-opacity mt-3 text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      {items.length < maxItems && (
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium ml-7 mt-1"
        >
          <Plus className="w-4 h-4" /> Add another
        </button>
      )}
    </div>
  );
};

export const VTOStepContent: React.FC<Props> = ({ step, data, setData }) => {
  switch (step.id) {
    case 'core-values':
      return (
        <div>
          <SectionHeader
            title="Core Values"
            subtitle="What are the 3–7 guiding principles that define your company's culture? These should be non-negotiable traits that every team member must embody."
          />
          <Tip text="Example: Integrity, Do the Right Thing, Humbly Confident, Growth-Oriented" />
          <ListInput
            items={data.coreValues}
            onChange={(items) => setData(prev => ({ ...prev, coreValues: items }))}
            placeholder="e.g. Integrity"
            maxItems={7}
          />
        </div>
      );

    case 'core-focus':
      return (
        <div>
          <SectionHeader
            title="Core Focus"
            subtitle="Your Core Focus defines your company's purpose (WHY you exist) and your niche (WHAT you do best). Stay laser-focused on this."
          />
          <Tip text="Purpose example: 'To help entrepreneurs get what they want from their business.' Niche example: 'Operational tools for scaling companies.'" />
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-foreground">Purpose / Cause / Passion</Label>
              <Textarea
                value={data.purpose}
                onChange={(e) => setData(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Why does your company exist beyond making money?"
                className="mt-1.5 min-h-[80px]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">Niche</Label>
              <Textarea
                value={data.niche}
                onChange={(e) => setData(prev => ({ ...prev, niche: e.target.value }))}
                placeholder="What do you do best? Who do you serve?"
                className="mt-1.5 min-h-[80px]"
              />
            </div>
          </div>
        </div>
      );

    case '10-year-target':
      return (
        <div>
          <SectionHeader
            title="10-Year Target™"
            subtitle="What is your big, long-term goal? This is your BHAG (Big Hairy Audacious Goal) — the single ambitious target that excites and aligns the whole team."
          />
          <Tip text="Example: '$100M in revenue' or 'Become the #1 platform for SMBs in Latin America'" />
          <Textarea
            value={data.tenYearTarget}
            onChange={(e) => setData(prev => ({ ...prev, tenYearTarget: e.target.value }))}
            placeholder="Describe your 10-year target..."
            className="min-h-[120px]"
          />
        </div>
      );

    case 'marketing-strategy':
      return (
        <div>
          <SectionHeader
            title="Marketing Strategy"
            subtitle="Define who your ideal customer is, what makes you unique, your proven process, and your guarantee."
          />
          <Tip text="Being clear about your target market and differentiators drives focused growth." />
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-foreground">Target Market</Label>
              <Textarea
                value={data.marketingStrategy.target}
                onChange={(e) => setData(prev => ({ ...prev, marketingStrategy: { ...prev.marketingStrategy, target: e.target.value } }))}
                placeholder="Who is your ideal customer? Demographics, size, industry..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">3 Uniques™</Label>
              <Textarea
                value={data.marketingStrategy.uniques}
                onChange={(e) => setData(prev => ({ ...prev, marketingStrategy: { ...prev.marketingStrategy, uniques: e.target.value } }))}
                placeholder="What 3 things make you different from every competitor?"
                className="mt-1.5 min-h-[80px]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">Proven Process</Label>
              <Input
                value={data.marketingStrategy.process}
                onChange={(e) => setData(prev => ({ ...prev, marketingStrategy: { ...prev.marketingStrategy, process: e.target.value } }))}
                placeholder="What is the name of your signature process?"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">Guarantee</Label>
              <Input
                value={data.marketingStrategy.guarantee}
                onChange={(e) => setData(prev => ({ ...prev, marketingStrategy: { ...prev.marketingStrategy, guarantee: e.target.value } }))}
                placeholder="What guarantee do you offer your customers?"
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      );

    case '3-year-picture':
      return (
        <div>
          <SectionHeader
            title="3-Year Picture™"
            subtitle="Paint a vivid picture of what your company looks like in 3 years. Include measurables and a description of what success looks like."
          />
          <Tip text="Be specific: revenue, number of employees, locations, market position." />
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-foreground">Revenue Goal</Label>
                <Input
                  value={data.threeYearPicture.revenue}
                  onChange={(e) => setData(prev => ({ ...prev, threeYearPicture: { ...prev.threeYearPicture, revenue: e.target.value } }))}
                  placeholder="e.g. $10M"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Profit Goal</Label>
                <Input
                  value={data.threeYearPicture.profit}
                  onChange={(e) => setData(prev => ({ ...prev, threeYearPicture: { ...prev.threeYearPicture, profit: e.target.value } }))}
                  placeholder="e.g. $2M"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">What does it look like?</Label>
              <Textarea
                value={data.threeYearPicture.description}
                onChange={(e) => setData(prev => ({ ...prev, threeYearPicture: { ...prev.threeYearPicture, description: e.target.value } }))}
                placeholder="Describe your company in 3 years: team size, culture, market position, products..."
                className="mt-1.5 min-h-[120px]"
              />
            </div>
          </div>
        </div>
      );

    case '1-year-plan':
      return (
        <div>
          <SectionHeader
            title="1-Year Plan"
            subtitle="What must you achieve this year to stay on track for your 3-year picture? Set 3–7 concrete goals."
          />
          <Tip text="Make goals specific and measurable. Example: 'Launch product v2' or 'Reach $3M ARR'" />
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-foreground">Revenue Goal</Label>
                <Input
                  value={data.oneYearPlan.revenue}
                  onChange={(e) => setData(prev => ({ ...prev, oneYearPlan: { ...prev.oneYearPlan, revenue: e.target.value } }))}
                  placeholder="e.g. $5M"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Profit Goal</Label>
                <Input
                  value={data.oneYearPlan.profit}
                  onChange={(e) => setData(prev => ({ ...prev, oneYearPlan: { ...prev.oneYearPlan, profit: e.target.value } }))}
                  placeholder="e.g. $1M"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">Goals for this year</Label>
              <div className="mt-1.5">
                <ListInput
                  items={data.oneYearPlan.goals}
                  onChange={(goals) => setData(prev => ({ ...prev, oneYearPlan: { ...prev.oneYearPlan, goals } }))}
                  placeholder="e.g. Launch in 3 new markets"
                  maxItems={7}
                />
              </div>
            </div>
          </div>
        </div>
      );

    case 'quarterly-rocks':
      return (
        <div>
          <SectionHeader
            title="Quarterly Rocks"
            subtitle="Rocks are the 3–7 most important things that must get done this quarter. They are specific, measurable, and achievable in 90 days."
          />
          <Tip text="Keep it to 3–7 rocks. Each rock should have a clear owner. Example: 'Hire VP of Sales' or 'Launch customer onboarding v2'" />
          <ListInput
            items={data.quarterlyRocks}
            onChange={(items) => setData(prev => ({ ...prev, quarterlyRocks: items }))}
            placeholder="e.g. Hire VP of Sales"
            maxItems={7}
          />
        </div>
      );

    case 'issues-list':
      return (
        <div>
          <SectionHeader
            title="Issues List"
            subtitle="What are the biggest obstacles, challenges, or opportunities your company needs to address? List everything — don't filter."
          />
          <Tip text="This is your company's honest 'parking lot' of problems. Be brutally honest. Example: 'Sales process is inconsistent' or 'No clear hiring plan'" />
          <ListInput
            items={data.issuesList}
            onChange={(items) => setData(prev => ({ ...prev, issuesList: items }))}
            placeholder="e.g. Sales process is inconsistent"
            maxItems={20}
          />
        </div>
      );

    default:
      return null;
  }
};
