import React from 'react';
import { VTOData } from './VTOBuilderApp';

interface Props {
  data: VTOData;
  companyName: string;
}

const PreviewSection: React.FC<{ title: string; children: React.ReactNode; isEmpty?: boolean }> = ({
  title,
  children,
  isEmpty,
}) => (
  <div className="mb-5">
    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{title}</h3>
    {isEmpty ? (
      <p className="text-sm text-muted-foreground/60 italic">Not yet filled</p>
    ) : (
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    )}
  </div>
);

export const VTOPreviewPanel: React.FC<Props> = ({ data, companyName }) => {
  const filledValues = data.coreValues.filter(Boolean);
  const filledRocks = data.quarterlyRocks.filter(Boolean);
  const filledIssues = data.issuesList.filter(Boolean);
  const filledGoals = data.oneYearPlan.goals.filter(Boolean);

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Live Preview</p>
        <h2 className="text-lg font-bold text-foreground">{companyName || 'Your Company'}</h2>
        <p className="text-xs text-muted-foreground">Vision/Traction Organizer</p>
      </div>

      <PreviewSection title="Core Values" isEmpty={filledValues.length === 0}>
        <ul className="space-y-1">
          {filledValues.map((v, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-violet-500 mt-0.5">•</span>
              {v}
            </li>
          ))}
        </ul>
      </PreviewSection>

      <PreviewSection title="Core Focus" isEmpty={!data.purpose && !data.niche}>
        {data.purpose && (
          <p className="mb-1"><span className="font-medium">Purpose:</span> {data.purpose}</p>
        )}
        {data.niche && (
          <p><span className="font-medium">Niche:</span> {data.niche}</p>
        )}
      </PreviewSection>

      <PreviewSection title="10-Year Target" isEmpty={!data.tenYearTarget}>
        <p>{data.tenYearTarget}</p>
      </PreviewSection>

      <PreviewSection title="Marketing Strategy" isEmpty={!data.marketingStrategy.target && !data.marketingStrategy.uniques}>
        {data.marketingStrategy.target && (
          <p className="mb-1"><span className="font-medium">Target:</span> {data.marketingStrategy.target}</p>
        )}
        {data.marketingStrategy.uniques && (
          <p className="mb-1"><span className="font-medium">3 Uniques:</span> {data.marketingStrategy.uniques}</p>
        )}
        {data.marketingStrategy.process && (
          <p className="mb-1"><span className="font-medium">Process:</span> {data.marketingStrategy.process}</p>
        )}
        {data.marketingStrategy.guarantee && (
          <p><span className="font-medium">Guarantee:</span> {data.marketingStrategy.guarantee}</p>
        )}
      </PreviewSection>

      <PreviewSection title="3-Year Picture" isEmpty={!data.threeYearPicture.revenue && !data.threeYearPicture.description}>
        {(data.threeYearPicture.revenue || data.threeYearPicture.profit) && (
          <p className="mb-1">
            {data.threeYearPicture.revenue && <span className="font-medium">Revenue: {data.threeYearPicture.revenue}</span>}
            {data.threeYearPicture.revenue && data.threeYearPicture.profit && ' | '}
            {data.threeYearPicture.profit && <span className="font-medium">Profit: {data.threeYearPicture.profit}</span>}
          </p>
        )}
        {data.threeYearPicture.description && <p>{data.threeYearPicture.description}</p>}
      </PreviewSection>

      <PreviewSection title="1-Year Plan" isEmpty={!data.oneYearPlan.revenue && filledGoals.length === 0}>
        {(data.oneYearPlan.revenue || data.oneYearPlan.profit) && (
          <p className="mb-1">
            {data.oneYearPlan.revenue && <span className="font-medium">Revenue: {data.oneYearPlan.revenue}</span>}
            {data.oneYearPlan.revenue && data.oneYearPlan.profit && ' | '}
            {data.oneYearPlan.profit && <span className="font-medium">Profit: {data.oneYearPlan.profit}</span>}
          </p>
        )}
        {filledGoals.length > 0 && (
          <ul className="space-y-1 mt-1">
            {filledGoals.map((g, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-violet-500 mt-0.5">•</span>{g}
              </li>
            ))}
          </ul>
        )}
      </PreviewSection>

      <PreviewSection title="Quarterly Rocks" isEmpty={filledRocks.length === 0}>
        <ol className="space-y-1 list-decimal list-inside">
          {filledRocks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </PreviewSection>

      <PreviewSection title="Issues List" isEmpty={filledIssues.length === 0}>
        <ul className="space-y-1">
          {filledIssues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">⚠</span>{issue}
            </li>
          ))}
        </ul>
      </PreviewSection>
    </div>
  );
};
