import React from 'react';

interface Scores {
  dominance?: number;
  extraversion?: number;
  patience?: number;
  formality?: number;
  objectivity?: number;
}

interface InsightsMiniChartProps {
  scores: Scores;
}

const TRAITS = [
  { key: 'dominance' as const, label: 'D', color: 'hsl(var(--chart-4))' },
  { key: 'extraversion' as const, label: 'C', color: 'hsl(var(--chart-5))' },
  { key: 'patience' as const, label: 'T', color: 'hsl(var(--chart-2))' },
  { key: 'formality' as const, label: 'O', color: 'hsl(var(--chart-1))' },
  { key: 'objectivity' as const, label: 'S', color: 'hsl(var(--chart-3))' },
];

const sigmaToPct = (v: number) =>
  Math.min(100, Math.max(0, Math.round(((v + 3) / 6) * 100)));

export const InsightsMiniChart: React.FC<InsightsMiniChartProps> = ({ scores }) => (
  <div className="space-y-1 w-full">
    {TRAITS.filter(t => scores[t.key] !== undefined).map(t => {
      const pct = sigmaToPct(scores[t.key]!);
      return (
        <div key={t.key} className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold w-3 text-muted-foreground">{t.label}</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: t.color }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-6 text-right">{pct}</span>
        </div>
      );
    })}
  </div>
);
