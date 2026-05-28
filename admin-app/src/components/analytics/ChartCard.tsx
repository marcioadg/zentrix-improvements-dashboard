import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  tooltip,
  children,
  className = '',
}) => {
  return (
    <Card className={`border-2 border-border/30 hover:border-border/60 transition-colors duration-200 rounded-[6px] overflow-hidden ${className}`}>
      <CardHeader className="card-padding-sm border-b border-border/20">
        <div className="stack-xs">
          <CardTitle className="text-h4">{title}</CardTitle>
          {subtitle && (
            <p className="text-caption">{subtitle}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="card-padding overflow-hidden">
        {children}
      </CardContent>
    </Card>
  );
};
