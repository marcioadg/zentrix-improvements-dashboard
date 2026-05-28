import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompanyHealthData } from '@/hooks/useCompanyHealth';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CompanyHealthCardProps {
  company: CompanyHealthData;
}

export const CompanyHealthCard = ({ company }: CompanyHealthCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return '[color:var(--success)] [background:color-mix(in_srgb,var(--success)_12%,transparent)] [border-color:color-mix(in_srgb,var(--success)_25%,transparent)]';
    if (score >= 55) return '[color:var(--warning)] [background:color-mix(in_srgb,var(--warning)_12%,transparent)] [border-color:color-mix(in_srgb,var(--warning)_25%,transparent)]';
    if (score >= 40) return '[color:var(--warning)] [background:color-mix(in_srgb,var(--warning)_12%,transparent)] [border-color:color-mix(in_srgb,var(--warning)_25%,transparent)]';
    return '[color:var(--error)] [background:color-mix(in_srgb,var(--error)_12%,transparent)] [border-color:color-mix(in_srgb,var(--error)_25%,transparent)]';
  };

  const getTrendIcon = () => {
    if (company.usage_trend === 'growing') return <TrendingUp className="h-4 w-4 [color:var(--success)]" />;
    if (company.usage_trend === 'declining') return <TrendingDown className="h-4 w-4 [color:var(--error)]" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-foreground mb-1">{company.company_name}</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getScoreColor(company.health_score.total)}>
                {company.health_score.total} - {company.health_score.grade}
              </Badge>
              {getTrendIcon()}
            </div>
          </div>
          {company.mrr > 0 && (
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">${company.mrr.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">MRR</div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Users:</span>
            <span className="text-foreground">{company.user_count}</span>
            {company.pending_count > 0 && (
              <span className="text-xs text-muted-foreground">({company.pending_count} pending)</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Usage (7d):</span>
            <span className="text-foreground">{company.usage_hours_7d.toFixed(1)}h</span>
          </div>

          {company.red_flags.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 [color:var(--error)] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium [color:var(--error)] mb-1">Red Flags:</div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {company.red_flags.slice(0, 2).map((flag, idx) => (
                      <li key={idx}>• {flag}</li>
                    ))}
                    {company.red_flags.length > 2 && (
                      <li className="text-muted-foreground">+ {company.red_flags.length - 2} more</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {company.suggested_actions.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-primary mb-1">Suggested Actions:</div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {company.suggested_actions.slice(0, 1).map((action, idx) => (
                  <li key={idx}>• {action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
